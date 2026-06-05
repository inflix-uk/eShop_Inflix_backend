const mongoose = require('mongoose');
const CustomerNote = require('../models/customerNote');
const {
  buildCustomer360,
  listCustomers,
  assertCustomerUser,
} = require('../services/crm/buildCustomer360');

function getAdminActor(req) {
  const authorId = req.headers['x-admin-user-id'] || req.body?.authorId || null;
  const authorName =
    req.headers['x-admin-user-name'] ||
    req.body?.authorName ||
    'Admin';
  return {
    authorId:
      authorId && mongoose.Types.ObjectId.isValid(String(authorId))
        ? new mongoose.Types.ObjectId(String(authorId))
        : null,
    authorName: String(authorName).trim() || 'Admin',
  };
}

function canModifyNote(note, actorId) {
  if (!actorId || !note.authorId) return true;
  return String(note.authorId) === String(actorId);
}

const customer360Controller = {
  listCustomers: async (req, res) => {
    try {
      const { page, limit, search } = req.query;
      const result = await listCustomers({ page, limit, search });
      res.json({ status: 200, ...result });
    } catch (error) {
      console.error('[CRM] listCustomers:', error);
      res.status(500).json({ status: 500, message: 'Internal server error' });
    }
  },

  getCustomer360: async (req, res) => {
    try {
      const { userId } = req.params;
      const data = await buildCustomer360(userId);
      res.json({ status: 200, ...data });
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('[CRM] getCustomer360:', error);
      res.status(status).json({
        status,
        message: error.message || 'Internal server error',
      });
    }
  },

  listNotes: async (req, res) => {
    try {
      const { userId } = req.params;
      await assertCustomerUser(userId);
      const notes = await CustomerNote.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
      res.json({ status: 200, notes });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ status, message: error.message || 'Error' });
    }
  },

  createNote: async (req, res) => {
    try {
      const { userId } = req.params;
      const body = String(req.body?.body || '').trim();
      if (!body) {
        return res.status(400).json({ status: 400, message: 'Note body is required' });
      }

      await assertCustomerUser(userId);
      const { authorId, authorName } = getAdminActor(req);

      const note = await CustomerNote.create({
        userId,
        authorId,
        authorName,
        body,
      });

      res.status(201).json({ status: 201, note });
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('[CRM] createNote:', error);
      res.status(status).json({ status, message: error.message || 'Error' });
    }
  },

  updateNote: async (req, res) => {
    try {
      const { userId, noteId } = req.params;
      const body = String(req.body?.body || '').trim();
      if (!body) {
        return res.status(400).json({ status: 400, message: 'Note body is required' });
      }

      await assertCustomerUser(userId);
      const note = await CustomerNote.findOne({ _id: noteId, userId });
      if (!note) {
        return res.status(404).json({ status: 404, message: 'Note not found' });
      }

      const { authorId } = getAdminActor(req);
      if (!canModifyNote(note, authorId)) {
        return res.status(403).json({ status: 403, message: 'Not allowed to edit this note' });
      }

      note.body = body;
      await note.save();

      res.json({ status: 200, note });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ status, message: error.message || 'Error' });
    }
  },

  deleteNote: async (req, res) => {
    try {
      const { userId, noteId } = req.params;
      await assertCustomerUser(userId);

      const note = await CustomerNote.findOne({ _id: noteId, userId });
      if (!note) {
        return res.status(404).json({ status: 404, message: 'Note not found' });
      }

      const { authorId } = getAdminActor(req);
      if (!canModifyNote(note, authorId)) {
        return res.status(403).json({ status: 403, message: 'Not allowed to delete this note' });
      }

      await CustomerNote.deleteOne({ _id: noteId });
      res.json({ status: 200, message: 'Note deleted' });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ status, message: error.message || 'Error' });
    }
  },
};

module.exports = customer360Controller;
