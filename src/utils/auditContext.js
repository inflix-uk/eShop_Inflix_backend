// Request-scoped audit context.
//
// The Mongoose audit plugin (src/audit/mongooseAuditPlugin.js) runs deep inside
// model hooks where the Express `req` is not available. AsyncLocalStorage lets
// us stash "who is doing this write" once per request and read it back from
// anywhere in the async call chain — no need to thread `req` through services.
//
// Outside of a request (cron jobs, startup scripts) there is simply no store,
// and getAuditContext() returns {} — the plugin still logs the change, just
// without a user/route attached.
const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

// Run `fn` with `ctx` available to every async continuation underneath it.
function runWithAuditContext(ctx, fn) {
  return storage.run(ctx || {}, fn);
}

// Read the current request context (or {} if we're not inside a request).
function getAuditContext() {
  return storage.getStore() || {};
}

// Merge late-resolved fields into the ACTIVE context.
//
// The context is established at the very top of the middleware chain, before
// any auth guard has run, so at that point the only identity available is the
// (spoofable, often absent) x-user-* headers. Once a guard has verified the JWT
// and built `req.user`, it calls this to upgrade the context in place — the
// store is a plain object shared by every continuation below it, so the
// Mongoose plugin then attributes writes to the real authenticated user.
//
// No-op outside a request. Only defined values overwrite existing ones, so a
// guard can never blank out identity that was already established.
function updateAuditContext(patch) {
  const store = storage.getStore();
  if (!store || !patch || typeof patch !== 'object') return;
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && value !== null) store[key] = value;
  }
}

// Build the identity half of the context from a resolved `req.user`.
function auditIdentityFromUser(user) {
  if (!user) return {};
  const userId = user._id || user.id || user.userId;
  return {
    userId: userId || undefined,
    userRole: user.role ? String(user.role) : undefined,
  };
}

module.exports = {
  storage,
  runWithAuditContext,
  getAuditContext,
  updateAuditContext,
  auditIdentityFromUser,
};
