const { TOKEN_COOKIE_NAME, getCookieOptions } = require('../../config/auth.config');
const { signAuthToken } = require('./jwtAuth');
const { toSafeUser } = require('./safeUser');

function buildJwtPayload(user) {
  return {
    userId: String(user._id),
    role: user.role,
    roleId: user.roleId ? String(user.roleId._id || user.roleId) : null,
  };
}

function setAuthCookie(res, user) {
  const token = signAuthToken(buildJwtPayload(user));
  res.cookie(TOKEN_COOKIE_NAME, token, getCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, getCookieOptions());
}

function sendLoginSuccess(res, user, message = 'Login successful') {
  setAuthCookie(res, user);
  return res.status(200).json({
    success: true,
    message,
    user: toSafeUser(user),
  });
}

module.exports = {
  buildJwtPayload,
  setAuthCookie,
  clearAuthCookie,
  sendLoginSuccess,
};
