// Mongoose audit plugin — automatic before/after change tracking.
//
// Registered GLOBALLY (mongoose.plugin) in server.js before any model compiles,
// so every schema gets it. For each create / update / delete it captures the
// document state before and after the write and records one entry in the
// AuditLog collection via auditLogService, tagged with the acting user pulled
// from the request-scoped audit context.
//
// Design rules:
//   * Best-effort — a logging failure NEVER breaks the underlying write.
//   * Recursion-safe — the AuditLog model itself is excluded.
//   * Bounded — sensitive fields are redacted and oversized docs are dropped.
//   * Opt-out — set AUDIT_DATA_CHANGES=false to disable, or list model names in
//     AUDIT_EXCLUDE_MODELS (comma-separated) to skip specific collections.
const auditLogService = require('../services/auditLogService');
const { getAuditContext } = require('../utils/auditContext');

const ENABLED = String(process.env.AUDIT_DATA_CHANGES).toLowerCase() !== 'false';

// Never audit these (recursion / pure noise). AuditLog is mandatory.
const EXCLUDED_MODELS = new Set(
  ['AuditLog', ...String(process.env.AUDIT_EXCLUDE_MODELS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)]
);

// Keys whose values must never be persisted to the audit trail.
const SENSITIVE_KEYS = new Set(
  ['password', 'newpassword', 'oldpassword', 'currentpassword', 'confirmpassword',
    'resettoken', 'resetpasswordtoken', 'passwordresettoken', 'passwordresetexpires',
    'token', 'refreshtoken', 'accesstoken', 'otp', 'secret', 'apikey',
    'stripesecretkey', 'clientsecret', '__v']
);

// Store full documents, or (default) only the fields that actually changed.
const FULL_SNAPSHOT = String(process.env.AUDIT_FULL_SNAPSHOT).toLowerCase() === 'true';
// Max serialized size of a single before/after doc; larger => stored as a marker.
const MAX_DOC_BYTES = Number(process.env.AUDIT_MAX_DOC_BYTES) > 0
  ? Number(process.env.AUDIT_MAX_DOC_BYTES) : 20000;
// For *Many operations, cap how many docs we snapshot to avoid runaway logs.
const MAX_MANY_DOCS = Number(process.env.AUDIT_MAX_MANY_DOCS) > 0
  ? Number(process.env.AUDIT_MAX_MANY_DOCS) : 50;

function isExcluded(modelName) {
  return !modelName || EXCLUDED_MODELS.has(modelName);
}

// Recursively replace sensitive values with a marker. Returns a safe copy.
function redact(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    // Leave special BSON-ish values (ObjectId, Date, Buffer) as-is.
    if (value._bsontype || value instanceof Date || Buffer.isBuffer(value)) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

// Redact + size-guard a document snapshot before it goes into the log.
function prepareDoc(doc) {
  if (doc == null) return doc;
  const safe = redact(doc);
  try {
    if (JSON.stringify(safe).length > MAX_DOC_BYTES) {
      return { _id: doc._id, __truncated: true, __reason: 'document exceeds AUDIT_MAX_DOC_BYTES' };
    }
  } catch {
    return { _id: doc?._id, __truncated: true, __reason: 'not serializable' };
  }
  return safe;
}

// Top-level keys whose value differs between before and after.
function changedKeys(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changed = [];
  for (const k of keys) {
    if (k === '__v') continue;
    let a; let b;
    try { a = JSON.stringify(before ? before[k] : undefined); } catch { a = '∅'; }
    try { b = JSON.stringify(after ? after[k] : undefined); } catch { b = '∅'; }
    if (a !== b) changed.push(k);
  }
  return changed;
}

// Reduce a doc to only the given keys (used for delta-style storage).
function pick(doc, keys) {
  if (doc == null) return doc;
  const out = {};
  if (doc._id !== undefined) out._id = doc._id;
  for (const k of keys) if (k in doc) out[k] = doc[k];
  return out;
}

// Build metadata + fire the audit write. Never throws, never awaited by callers.
function record({ modelName, op, id, before, after }) {
  try {
    const ctx = getAuditContext();
    const changed = op === 'update' ? changedKeys(before, after) : undefined;

    let beforeOut = prepareDoc(before);
    let afterOut = prepareDoc(after);
    // Default (delta) mode: for updates, keep only changed fields to stay lean.
    if (!FULL_SNAPSHOT && op === 'update' && changed && !beforeOut?.__truncated && !afterOut?.__truncated) {
      beforeOut = pick(beforeOut, changed);
      afterOut = pick(afterOut, changed);
    }

    auditLogService.logDataChange({
      level: 'info',
      action: `${modelName}.${op}`,
      category: 'data',
      message: `${op} ${modelName}${id ? ` ${id}` : ''}${changed ? ` (${changed.length} field(s))` : ''}`,
      metadata: {
        model: modelName,
        op,
        id: id != null ? String(id) : undefined,
        changed,
        before: beforeOut,
        after: afterOut,
      },
      // "who / where" from the request-scoped context (empty for cron/startup).
      userId: ctx.userId,
      userRole: ctx.userRole,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      method: ctx.method,
      route: ctx.route,
    });
  } catch (err) {
    console.error('[auditPlugin] failed to record change:', err.message);
  }
}

// Same as record() but for *Many operations that touch several documents.
function recordMany({ modelName, op, before, after }) {
  try {
    const ctx = getAuditContext();
    const afterById = new Map((after || []).map((d) => [String(d._id), d]));
    const items = (before || []).slice(0, MAX_MANY_DOCS).map((b) => {
      const a = afterById.get(String(b._id));
      const changed = op === 'update' ? changedKeys(b, a) : undefined;
      return {
        id: String(b._id),
        changed,
        before: FULL_SNAPSHOT || op !== 'update' ? prepareDoc(b) : prepareDoc(pick(b, changed || [])),
        after: op === 'delete' ? null
          : FULL_SNAPSHOT ? prepareDoc(a) : prepareDoc(pick(a, changed || [])),
      };
    });

    auditLogService.logDataChange({
      level: 'info',
      action: `${modelName}.${op}Many`,
      category: 'data',
      message: `${op}Many ${modelName} — ${(before || []).length} matched`,
      metadata: {
        model: modelName,
        op: `${op}Many`,
        matched: (before || []).length,
        truncated: (before || []).length > MAX_MANY_DOCS,
        items,
      },
      userId: ctx.userId,
      userRole: ctx.userRole,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      method: ctx.method,
      route: ctx.route,
    });
  } catch (err) {
    console.error('[auditPlugin] failed to record bulk change:', err.message);
  }
}

module.exports = function auditPlugin(schema) {
  if (!ENABLED) return;

  // ---- Document create / update (Model#save, Model.create) ----
  schema.pre('save', async function preSaveAudit() {
    if (isExcluded(this.constructor?.modelName)) return;
    if (this.isNew) { this.$locals.__auditBefore = null; return; } // create
    try {
      this.$locals.__auditBefore = await this.constructor.findById(this._id).lean();
    } catch {
      this.$locals.__auditBefore = undefined; // couldn't read; log without "before"
    }
  });

  schema.post('save', function postSaveAudit(doc) {
    if (isExcluded(doc?.constructor?.modelName)) return;
    const before = this.$locals.__auditBefore;
    record({
      modelName: doc.constructor.modelName,
      op: before === null ? 'create' : 'update',
      id: doc._id,
      before,
      after: typeof doc.toObject === 'function' ? doc.toObject() : doc,
    });
  });

  // ---- Query updates (findOneAndUpdate, updateOne, update) ----
  schema.pre(['findOneAndUpdate', 'updateOne', 'update'], async function preUpdateAudit() {
    if (isExcluded(this.model?.modelName)) return;
    try {
      this._auditBefore = await this.model.findOne(this.getFilter()).lean();
    } catch {
      this._auditBefore = undefined;
    }
  });

  schema.post(['findOneAndUpdate', 'updateOne', 'update'], function postUpdateAudit() {
    if (isExcluded(this.model?.modelName)) return;
    const before = this._auditBefore;
    // Fetch the fresh state in the background so we never delay the caller.
    (async () => {
      let after;
      try {
        const id = before?._id;
        after = id != null
          ? await this.model.findById(id).lean()
          : await this.model.findOne(this.getFilter()).lean();
      } catch { /* after stays undefined */ }
      record({ modelName: this.model.modelName, op: 'update', id: before?._id, before, after });
    })();
  });

  // ---- Query deletes (findOneAndDelete, deleteOne) ----
  schema.pre(['findOneAndDelete', 'deleteOne'], async function preDeleteAudit() {
    if (isExcluded(this.model?.modelName)) return;
    try {
      this._auditBefore = await this.model.findOne(this.getFilter()).lean();
    } catch {
      this._auditBefore = undefined;
    }
  });

  schema.post(['findOneAndDelete', 'deleteOne'], function postDeleteAudit() {
    if (isExcluded(this.model?.modelName)) return;
    if (this._auditBefore === undefined || this._auditBefore === null) return; // nothing matched
    record({
      modelName: this.model.modelName,
      op: 'delete',
      id: this._auditBefore._id,
      before: this._auditBefore,
      after: null,
    });
  });

  // ---- Bulk updates / deletes (updateMany, deleteMany) ----
  schema.pre('updateMany', async function preUpdateManyAudit() {
    if (isExcluded(this.model?.modelName)) return;
    try {
      this._auditBeforeMany = await this.model.find(this.getFilter()).limit(MAX_MANY_DOCS).lean();
    } catch {
      this._auditBeforeMany = [];
    }
  });

  schema.post('updateMany', function postUpdateManyAudit() {
    if (isExcluded(this.model?.modelName)) return;
    const before = this._auditBeforeMany || [];
    if (!before.length) return;
    (async () => {
      let after = [];
      try {
        after = await this.model.find({ _id: { $in: before.map((d) => d._id) } }).lean();
      } catch { /* after stays empty */ }
      recordMany({ modelName: this.model.modelName, op: 'update', before, after });
    })();
  });

  schema.pre('deleteMany', async function preDeleteManyAudit() {
    if (isExcluded(this.model?.modelName)) return;
    try {
      this._auditBeforeMany = await this.model.find(this.getFilter()).limit(MAX_MANY_DOCS).lean();
    } catch {
      this._auditBeforeMany = [];
    }
  });

  schema.post('deleteMany', function postDeleteManyAudit() {
    if (isExcluded(this.model?.modelName)) return;
    const before = this._auditBeforeMany || [];
    if (!before.length) return;
    recordMany({ modelName: this.model.modelName, op: 'delete', before, after: [] });
  });
};
