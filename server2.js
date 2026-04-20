const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const http = require('http'); // Import HTTP module
const { Server } = require('socket.io'); // Import Socket.IO
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000; // Set port from environment variable or default to 4000

// Create an HTTP server and integrate with Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(logger('dev')); // Logging middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for JSON payloads
app.use(express.urlencoded({ limit: '50mb', extended: false })); // Increased limit for URL-encoded payloads
app.use(cookieParser()); // Parse cookies
app.use(cors()); // Enable CORS for all origins

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Listen for private messages
  socket.on('privateMessage', ({ recipient, message }) => {
    if (recipient && message) {
      console.log(`📨 Sending message from ${socket.id} to ${recipient}`);
      io.to(recipient).emit('message', { sender: socket.id, message }); // Emit message to the recipient
    } else {
      console.error('Recipient or message missing in privateMessage event');
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.json({ error: err.message });
});

// Start the server
server.listen(port, () => {
  console.log(`✅ Server is running at: http://localhost:${port}`);
});
