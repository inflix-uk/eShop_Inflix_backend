require('dotenv').config();

/** Browser Origin has no trailing slash; env vars often mistakenly include one. */
function normalizeOriginUrl(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\/+$/, '');
}

const extraOrigins = String(process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map((s) => normalizeOriginUrl(s))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set(
    [
      ...extraOrigins,
      normalizeOriginUrl(process.env.FRONTEND_URL),
      normalizeOriginUrl(process.env.ADMINPANEL_URL),
    ].filter(Boolean)
  ),
];

const corsConfig = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);  
    }

    const normalizedRequestOrigin = normalizeOriginUrl(origin);
    if (allowedOrigins.includes(normalizedRequestOrigin)) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        console.warn(`⚠️ CORS: Origin ${origin} not in whitelist (dev mode - allowing)`);
        callback(null, true);
      }
    }  
  },

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-user-role',
    'x-role',
    'x-user-id',
  ],

  credentials: true,

  optionsSuccessStatus: 200,

  maxAge: 86400,
};

module.exports = {
  corsConfig,
  allowedOrigins,
};
