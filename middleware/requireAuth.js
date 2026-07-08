const User = require('../src/models/user');
const { TOKEN_COOKIE_NAME } = require('../config/auth.config');
const { extractTokenFromRequest, verifyAuthToken } = require('../src/utils/jwtAuth');
const { SENSITIVE_USER_FIELDS } = require('../src/utils/safeUser');

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
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        status: 401,
      });
    }

    const userId = decoded.userId || decoded.sub || decoded.id;
    if (!userId) {
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
