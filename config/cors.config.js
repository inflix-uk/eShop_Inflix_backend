const allowedOrigins = [
  'https://zextons.co.uk',
  'https://www.zextons.co.uk',
  'https://zextons-frontend.vercel.app',
  'https://green.zextons.co.uk',
  'https://admin.zextons.co.uk',
  'https://zextonsadminpanel-new-beta.vercel.app',
  'https://zextonsadminpanel-new-phi.vercel.app',
  'https://zextons-admin-pannel.vercel.app',
  'https://zextonswebsite-new-weld.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://aromadesire.co.uk',
  'https://aromadesire.com',
  'https://admin.aromadesire.com',
];

const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, reject unknown origins
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        // In development, log and allow
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
  
  optionsSuccessStatus: 200, // Legacy browser support
  
  maxAge: 86400, // Cache preflight for 24 hours
};

module.exports = {
  corsConfig,
  allowedOrigins,
};