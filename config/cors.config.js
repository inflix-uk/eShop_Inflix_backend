require('dotenv').config();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ADMINPANEL_URL,

].filter(Boolean);

const corsConfig = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
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
  ],

  credentials: true,

  optionsSuccessStatus: 200,

  maxAge: 86400,
};

module.exports = {
  corsConfig,
  allowedOrigins,
};
