const PreloadedMessage = require('../models/preloadedMessage');

/**
 * Get all preloaded messages
 */
const getAllPreloadedMessages = async (req, res) => {
    try {
        const messages = await PreloadedMessage.find()
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 200,
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        console.error('Error fetching preloaded messages:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to fetch preloaded messages',
            error: error.message
        });
    }
};

/**
 * Get active preloaded messages only
 */
const getActivePreloadedMessages = async (req, res) => {
    try {
        const messages = await PreloadedMessage.find({ isActive: true })
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 200,
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        console.error('Error fetching active preloaded messages:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to fetch active preloaded messages',
            error: error.message
        });
    }
};

/**
 * Get a single preloaded message by ID
 */
const getPreloadedMessageById = async (req, res) => {
    try {
        const { id } = req.params;
        const message = await PreloadedMessage.findById(id);

        if (!message) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: 'Preloaded message not found'
            });
        }

        res.status(200).json({
            status: 200,
            success: true,
            message
        });
    } catch (error) {
        console.error('Error fetching preloaded message:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to fetch preloaded message',
            error: error.message
        });
    }
};

/**
 * Create a new preloaded message
 */
const createPreloadedMessage = async (req, res) => {
    try {
        const { message, isActive } = req.body;

        if (!message) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: 'Message is required'
            });
        }

        const newMessage = new PreloadedMessage({
            message,
            isActive: isActive !== undefined ? isActive : true
        });

        await newMessage.save();

        res.status(201).json({
            status: 201,
            success: true,
            message: 'Preloaded message created successfully',
            preloadedMessage: newMessage
        });
    } catch (error) {
        console.error('Error creating preloaded message:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to create preloaded message',
            error: error.message
        });
    }
};

/**
 * Update a preloaded message
 */
const updatePreloadedMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, isActive } = req.body;

        const existingMessage = await PreloadedMessage.findById(id);

        if (!existingMessage) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: 'Preloaded message not found'
            });
        }

        // Update fields
        if (message !== undefined) existingMessage.message = message;
        if (isActive !== undefined) existingMessage.isActive = isActive;
        existingMessage.updatedAt = Date.now();

        await existingMessage.save();

        res.status(200).json({
            status: 200,
            success: true,
            message: 'Preloaded message updated successfully',
            preloadedMessage: existingMessage
        });
    } catch (error) {
        console.error('Error updating preloaded message:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to update preloaded message',
            error: error.message
        });
    }
};

/**
 * Delete a preloaded message
 */
const deletePreloadedMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedMessage = await PreloadedMessage.findByIdAndDelete(id);

        if (!deletedMessage) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: 'Preloaded message not found'
            });
        }

        res.status(200).json({
            status: 200,
            success: true,
            message: 'Preloaded message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting preloaded message:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to delete preloaded message',
            error: error.message
        });
    }
};

/**
 * Toggle active status of a preloaded message
 */
const togglePreloadedMessageStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await PreloadedMessage.findById(id);

        if (!message) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: 'Preloaded message not found'
            });
        }

        message.isActive = !message.isActive;
        message.updatedAt = Date.now();
        await message.save();

        res.status(200).json({
            status: 200,
            success: true,
            message: `Preloaded message ${message.isActive ? 'activated' : 'deactivated'} successfully`,
            preloadedMessage: message
        });
    } catch (error) {
        console.error('Error toggling preloaded message status:', error);
        res.status(500).json({
            status: 500,
            success: false,
            message: 'Failed to toggle preloaded message status',
            error: error.message
        });
    }
};

module.exports = {
    getAllPreloadedMessages,
    getActivePreloadedMessages,
    getPreloadedMessageById,
    createPreloadedMessage,
    updatePreloadedMessage,
    deletePreloadedMessage,
    togglePreloadedMessageStatus
};
