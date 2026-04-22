const path = require('path');

/**
 * Lambda (/var/task) and Vercel use a read-only deploy root. Only /tmp is writable.
 */
function isServerlessReadOnlyRoot() {
  return Boolean(
    process.env.VERCEL === '1' ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
  );
}

/**
 * Directory where Google Merchant feed CSV files are written.
 */
function getFeedUploadPath() {
  if (isServerlessReadOnlyRoot()) {
    return path.join('/tmp', 'uploads', 'feed');
  }
  if (process.env.UPLOADS_DIR) {
    const root = path.isAbsolute(process.env.UPLOADS_DIR)
      ? process.env.UPLOADS_DIR
      : path.join(process.cwd(), process.env.UPLOADS_DIR);
    return path.join(root, 'feed');
  }
  return path.join(__dirname, '../../uploads/feed');
}

module.exports = {
  getFeedUploadPath,
  isServerlessReadOnlyRoot,
};
