const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000 // Keep timeout for better debugging
})
    .then(() => {
        console.log(`✅ Connected to MongoDB Database: ${mongoose.connection.name}`);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1); // Exit the process if connection fails
    });

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
    console.error('❌ MongoDB Connection Error (Runtime):', err);
});

module.exports = mongoose;
