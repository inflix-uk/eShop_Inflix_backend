const User = require('../src/models/user');
const { TOKEN_COOKIE_NAME } = require('../config/auth.config');
const { extractTokenFromRequest, verifyAuthToken } = require('../src/utils/jwtAuth');
const { SENSITIVE_USER_FIELDS } = require('../src/utils/safeUser');
const {
  updateAuditContext,
  auditIdentityFromUser,
} = require('../src/utils/auditContext');

/**
 * Attaches req.user when a valid JWT cookie/header is present; does not fail otherwise.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractTokenFromRequest(req, TOKEN_COOKIE_NAME);
    if (!token) {
      return next();
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch {
      return next();
    }

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
      return next();
    }

    const user = await User.findById(userId)
      .select(SENSITIVE_USER_FIELDS)
      .populate('roleId')
      .lean();

    if (!user) {
      return next();
    }

    req.user = {
      _id: user._id,
      id: String(user._id),
      userId: String(user._id),
      role: user.role,
      roleId: user.roleId,
      email: user.email,
      pricingGroup: user.pricingGroup || null,
      firstname: user.firstname,
      lastname: user.lastname,
    };
    req.auth = decoded;

    // Upgrade the audit context now that the real identity is known — it was
    // established before any auth ran, so until here it only had headers.
    updateAuditContext(auditIdentityFromUser(req.user));
  } catch (error) {
    console.error('optionalAuth error:', error);
  }

  return next();
}

module.exports = optionalAuth;
