const User = require('../src/models/user');
const { TOKEN_COOKIE_NAME } = require('../config/auth.config');
const { extractTokenFromRequest, verifyAuthToken } = require('../src/utils/jwtAuth');
const { SENSITIVE_USER_FIELDS } = require('../src/utils/safeUser');
const {
  updateAuditContext,
  auditIdentityFromUser,
} = require('../src/utils/auditContext');
const { auditAccessDenied } = require('../src/services/audit/authAudit');

async function requireAuth(req, res, next) {
  try {
    const token = extractTokenFromRequest(req, TOKEN_COOKIE_NAME);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        status: 401,
      });
    }

    let decoded;
    try {
      decoded = verifyAuthToken(token);
    } catch {
      // A token was presented and rejected. Unlike a simply-absent cookie
      // (ordinary for an anonymous visitor or an expired tab) this is worth a
      // line: it is what a replayed or forged token looks like.
      auditAccessDenied({
        req,
        action: 'auth.token.rejected',
        message: 'Rejected a presented session token',
        metadata: { reason: 'invalid_or_expired_token' },
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        status: 401,
      });
    }

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
      auditAccessDenied({
        req,
        action: 'auth.token.rejected',
        message: 'Rejected a session token with no subject',
        metadata: { reason: 'invalid_token_payload' },
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token payload',
        status: 401,
      });
    }

    const user = await User.findById(userId)
      .select(SENSITIVE_USER_FIELDS)
      .populate('roleId')
      .lean();

    if (!user) {
      // Signature checked out but the account is gone — a token outliving a
      // deleted user is exactly the case worth being able to look up later.
      auditAccessDenied({
        req,
        action: 'auth.token.rejected',
        message: 'Valid session token for an account that no longer exists',
        metadata: { reason: 'user_not_found', tokenUserId: String(userId) },
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found',
        status: 401,
      });
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

    return next();
  } catch (error) {
    console.error('requireAuth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication failed',
      status: 401,
    });
  }
}

module.exports = requireAuth;
