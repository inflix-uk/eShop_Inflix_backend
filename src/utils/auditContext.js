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

module.exports = { storage, runWithAuditContext, getAuditContext };
