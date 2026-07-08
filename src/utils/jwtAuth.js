const jwt = require('jsonwebtoken');
const { getJwtSecret, JWT_EXPIRES_IN } = require('../../config/auth.config');

function signAuthToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function extractTokenFromRequest(req, cookieName = 'token') {
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return extractBearerToken(req);
}

module.exports = {
  signAuthToken,
  verifyAuthToken,
  extractBearerToken,
  extractTokenFromRequest,
};
