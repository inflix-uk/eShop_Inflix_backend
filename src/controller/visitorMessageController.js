// controller/visitorMessageController.js
const VisitorMessage = require('../models/visitorMessage');
const VisitorAutoReply = require('../models/visitorAutoReply');
const VisitorAwayStatus = require('../models/visitorAwayStatus');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists (use /tmp on Vercel since filesystem is read-only)
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? '/tmp/uploads/visitor-messages' : 'uploads/visitor-messages';
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('Could not create upload directory:', err.message);
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname || mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and documents are allowed'));
    }
};

// Multer upload configuration
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Export multer middleware
exports.uploadMiddleware = upload.array('files', 5); // Max 5 files

/**
 * Get all visitor conversations for admin panel
 */
exports.getAllVisitors = async (req, res) => {
    try {
        const visitors = await VisitorMessage.find({ status: { $ne: 'archived' } })
            .select('name email phoneNumber isOrderRelated orderNumber isRead lastMessage lastMessageAt unreadCount createdAt')
            .sort({ lastMessageAt: -1 });

        res.status(200).json({
            success: true,
            visitors
        });
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch visitor messages',
            error: error.message
        });
    }
};

/**
 * Get messages for a specific visitor conversation
 */
exports.getMessagesByVisitorId = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await VisitorMessage.findById(id);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        res.status(200).json({
            success: true,
            messages: visitor.messages,
            visitor: {
                name: visitor.name,
                email: visitor.email,
                phoneNumber: visitor.phoneNumber,
                isOrderRelated: visitor.isOrderRelated,
                orderNumber: visitor.orderNumber
            }
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

/**
 * Mark conversation as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await VisitorMessage.findByIdAndUpdate(
            id,
            { isRead: true, unreadCount: 0 },
            { new: true }
        );

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Marked as read'
        });
    } catch (error) {
        console.error('Error marking as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark as read',
            error: error.message
        });
    }
};

/**
 * Mark conversation as unread
 */
exports.markAsUnread = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await VisitorMessage.findByIdAndUpdate(
            id,
            { isRead: false, unreadCount: 1 },
            { new: true }
        );

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Marked as unread'
        });
    } catch (error) {
        console.error('Error marking as unread:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark as unread',
            error: error.message
        });
    }
};

/**
 * Send admin reply to visitor (with optional attachments)
 */
exports.sendReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const files = req.files || [];

        // Require either message or files
        if ((!message || !message.trim()) && files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message or files are required'
            });
        }

        const visitor = await VisitorMessage.findById(id);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        // Process attachments
        const attachments = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/visitor-messages/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
        }));

        // Add admin reply to messages
        const newMessage = {
            text: message ? message.trim() : '',
            sender: 'admin',
            attachments: attachments,
            createdAt: new Date()
        };

        visitor.messages.push(newMessage);
        visitor.lastMessage = message ? message.trim() : (attachments.length > 0 ? `Sent ${attachments.length} file(s)` : '');
        visitor.lastMessageAt = new Date();
        await visitor.save();

        res.status(200).json({
            success: true,
            message: 'Reply sent successfully',
            newMessage
        });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send reply',
            error: error.message
        });
    }
};

/**
 * Delete a visitor conversation
 */
exports.deleteConversation = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await VisitorMessage.findByIdAndDelete(id);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Conversation deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete conversation',
            error: error.message
        });
    }
};

/**
 * Create new visitor conversation (called from frontend chat widget)
 */
exports.createConversation = async (req, res) => {
    try {
        const { name, email, phoneNumber, isOrderRelated, orderNumber, message, sessionId } = req.body;

        // Validate required fields
        if (!name || !email || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone number are required'
            });
        }

        // Check if there's an existing active conversation for this email/session
        let visitor = await VisitorMessage.findOne({
            $or: [
                { email: email, status: 'active' },
                { sessionId: sessionId, status: 'active' }
            ]
        });

        let isNewConversation = false;

        if (visitor) {
            // Add message to existing conversation
            if (message) {
                visitor.messages.push({
                    text: message,
                    sender: 'user',
                    createdAt: new Date()
                });
                visitor.lastMessage = message;
                visitor.lastMessageAt = new Date();
                visitor.unreadCount += 1;
                visitor.isRead = false;
            }
            await visitor.save();
        } else {
            // Create new conversation
            isNewConversation = true;
            const initialMessages = [];

            // Add bot greeting
            initialMessages.push({
                text: `Hello ${name}! Thank you for contacting us. How can we help you today?`,
                sender: 'bot',
                createdAt: new Date()
            });

            // Add user's first message if provided
            if (message) {
                initialMessages.push({
                    text: message,
                    sender: 'user',
                    createdAt: new Date()
                });
            }

            visitor = new VisitorMessage({
                name,
                email,
                phoneNumber,
                isOrderRelated: isOrderRelated || 'no',
                orderNumber: isOrderRelated === 'yes' ? orderNumber : null,
                messages: initialMessages,
                lastMessage: message || `Hello ${name}! Thank you for contacting us.`,
                lastMessageAt: new Date(),
                unreadCount: message ? 1 : 0,
                sessionId
            });

            await visitor.save();
        }

        // Get io from req.app if available (set in app.js)
        const io = req.app.get('io');

        // Emit socket event to notify admin panel
        if (io) {
            const visitorNamespace = io.of('/visitor-chat');

            // Get connected sockets in admin-room for debugging
            const adminRoom = visitorNamespace.adapter.rooms.get('admin-room');
            console.log(`🔍 DEBUG createConversation: Admin room sockets count: ${adminRoom ? adminRoom.size : 0}`);

            // Emit new conversation event if this is a brand new conversation
            if (isNewConversation) {
                visitorNamespace.to('admin-room').emit('visitor:new-conversation', {
                    conversationId: visitor._id,
                    visitor: { name, email, phoneNumber },
                    createdAt: new Date()
                });
                console.log(`🆕 Emitted visitor:new-conversation to admin-room for: ${visitor._id}`);
            }

            // Notify admin room about new message (for both new and existing conversations)
            if (message) {
                visitorNamespace.to('admin-room').emit('visitor:new-message', {
                    conversationId: visitor._id,
                    message: message,
                    visitorName: name,
                    visitorEmail: email,
                    sender: 'user',
                    attachments: [],
                    createdAt: new Date()
                });
                console.log(`📩 Emitted visitor:new-message to admin-room for: ${visitor._id}`);
            }
        }

        // Check and send away message or auto-reply for user's message
        let autoReplyMessage = null;
        let awayMessage = null;
        if (message) {
            // First check away status (takes priority - manual override)
            awayMessage = await checkAndSendAwayMessage(visitor, io);

            // If not away, check auto-reply (time-based)
            if (!awayMessage) {
                autoReplyMessage = await checkAndSendAutoReply(visitor, io);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Conversation created/updated successfully',
            conversationId: visitor._id,
            messages: visitor.messages,
            autoReplyMessage,
            awayMessage
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation',
            error: error.message
        });
    }
};

/**
 * Add message to existing conversation (from frontend, with optional attachments)
 */
exports.addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, sender = 'user' } = req.body;
        const files = req.files || [];

        // Require either message or files
        if ((!message || !message.trim()) && files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message or files are required'
            });
        }

        const visitor = await VisitorMessage.findById(id);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Process attachments
        const attachments = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/visitor-messages/${file.filename}`,
            mimetype: file.mimetype,
            size: file.size
        }));

        const newMessage = {
            text: message ? message.trim() : '',
            sender: sender,
            attachments: attachments,
            createdAt: new Date()
        };

        visitor.messages.push(newMessage);
        visitor.lastMessage = message ? message.trim() : (attachments.length > 0 ? `Sent ${attachments.length} file(s)` : '');
        visitor.lastMessageAt = new Date();

        // If message is from user, increment unread count
        if (sender === 'user') {
            visitor.unreadCount += 1;
            visitor.isRead = false;
        }

        await visitor.save();

        // Get io from req.app if available (set in app.js)
        const io = req.app.get('io');
        console.log(`🔍 DEBUG: io available: ${!!io}, sender: ${sender}`);

        // Emit socket event to notify admin panel about new message
        if (io && sender === 'user') {
            const visitorNamespace = io.of('/visitor-chat');

            // Get connected sockets in admin-room for debugging
            const adminRoom = visitorNamespace.adapter.rooms.get('admin-room');
            console.log(`🔍 DEBUG: Admin room sockets count: ${adminRoom ? adminRoom.size : 0}`);

            const emitData = {
                conversationId: id,
                message: message ? message.trim() : '',
                visitorName: visitor.name,
                visitorEmail: visitor.email,
                sender: 'user',
                attachments: attachments,
                createdAt: newMessage.createdAt
            };

            // Notify admin room about new message from visitor
            visitorNamespace.to('admin-room').emit('visitor:new-message', emitData);

            console.log(`📩 Emitted visitor:new-message to admin-room for conversation: ${id}`);
            console.log(`📩 Emit data:`, JSON.stringify(emitData, null, 2));
        } else {
            console.log(`⚠️ WARNING: Could not emit socket event. io: ${!!io}, sender: ${sender}`);
        }

        // Check and send away message or auto-reply if message is from user
        let autoReplyMessage = null;
        let awayMessage = null;
        if (sender === 'user') {
            // First check away status (takes priority - manual override)
            awayMessage = await checkAndSendAwayMessage(visitor, io);

            // If not away, check auto-reply (time-based)
            if (!awayMessage) {
                autoReplyMessage = await checkAndSendAutoReply(visitor, io);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Message added successfully',
            newMessage,
            autoReplyMessage,
            awayMessage,
            messages: visitor.messages
        });
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add message',
            error: error.message
        });
    }
};

/**
 * Get conversation by session ID (for frontend to resume chat)
 */
exports.getConversationBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const visitor = await VisitorMessage.findOne({
            sessionId: sessionId,
            status: 'active'
        });

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'No active conversation found'
            });
        }

        res.status(200).json({
            success: true,
            conversationId: visitor._id,
            messages: visitor.messages,
            visitor: {
                name: visitor.name,
                email: visitor.email,
                phoneNumber: visitor.phoneNumber
            }
        });
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation',
            error: error.message
        });
    }
};

/**
 * Get unread count for admin badge
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await VisitorMessage.countDocuments({
            isRead: false,
            status: 'active'
        });

        res.status(200).json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message
        });
    }
};

// ========================================================================
// AUTO-REPLY FUNCTIONALITY
// ========================================================================

/**
 * Helper function to check if current UK time is OUTSIDE business hours
 * Start = business hours start, End = business hours end
 * businessDays = array of days when business is OPEN (0=Sun, 1=Mon, ..., 6=Sat)
 * Auto-reply is active OUTSIDE these hours OR on non-business days
 */
const isOutsideBusinessHours = (startTime, endTime, businessDays = [1, 2, 3, 4, 5]) => {
    // Get current time in UK London timezone
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));

    const currentDay = ukTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHours = ukTime.getHours();
    const currentMinutes = ukTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // First check: Is today a business day?
    // If today is NOT in businessDays, auto-reply should be active
    if (!businessDays.includes(currentDay)) {
        return true; // It's a non-business day, send auto-reply
    }

    // Second check: Is current time outside business hours?
    // Parse start and end times
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Check if current time is OUTSIDE business hours
    // Business hours: startTime to endTime
    // Auto-reply active: before startTime OR after endTime
    return currentTotalMinutes < startTotalMinutes || currentTotalMinutes >= endTotalMinutes;
};

/**
 * Check and send auto-reply if applicable
 */
const checkAndSendAutoReply = async (visitor, io) => {
    try {
        // Get the auto-reply settings
        const autoReplySettings = await VisitorAutoReply.findOne({ isEnabled: true });

        if (!autoReplySettings) {
            return null;
        }

        // Check if current UK time is OUTSIDE business hours (also checks days)
        const businessDays = autoReplySettings.businessDays || [1, 2, 3, 4, 5];
        if (!isOutsideBusinessHours(autoReplySettings.startTime, autoReplySettings.endTime, businessDays)) {
            return null;
        }

        // Create auto-reply message
        const autoReplyMessage = {
            text: autoReplySettings.message,
            sender: 'bot',
            isAutoReply: true,
            createdAt: new Date()
        };

        // Add to visitor's messages
        visitor.messages.push(autoReplyMessage);
        visitor.lastMessage = autoReplySettings.message;
        visitor.lastMessageAt = new Date();
        await visitor.save();

        // Emit via socket if available
        if (io) {
            io.to(`visitor_${visitor._id}`).emit('new_message', {
                conversationId: visitor._id,
                message: autoReplySettings.message,
                sender: 'bot',
                isAutoReply: true,
                createdAt: new Date()
            });

            // Also notify admin panel
            io.emit('admin_new_message', {
                conversationId: visitor._id,
                message: autoReplySettings.message,
                sender: 'bot',
                isAutoReply: true,
                createdAt: new Date()
            });
        }

        return autoReplyMessage;
    } catch (error) {
        console.error('Error sending auto-reply:', error);
        return null;
    }
};

/**
 * Get auto-reply settings
 */
exports.getAutoReplySettings = async (req, res) => {
    try {
        let settings = await VisitorAutoReply.findOne();

        if (!settings) {
            // Return default settings if none exist
            settings = {
                isEnabled: false,
                businessDays: [1, 2, 3, 4, 5], // Monday to Friday
                startTime: '09:00',
                endTime: '18:00',
                message: 'Thank you for your message. Our team is currently away but we will get back to you as soon as possible during our business hours (9 AM - 6 PM UK time, Monday to Friday).'
            };
        }

        res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error fetching auto-reply settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch auto-reply settings',
            error: error.message
        });
    }
};

/**
 * Save/Update auto-reply settings
 */
exports.saveAutoReplySettings = async (req, res) => {
    try {
        const { isEnabled, businessDays, startTime, endTime, message } = req.body;

        // Validate required fields
        if (!startTime || !endTime || !message) {
            return res.status(400).json({
                success: false,
                message: 'Start time, end time, and message are required'
            });
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:mm format (e.g., 18:00)'
            });
        }

        // Validate businessDays if provided
        const validDays = businessDays || [1, 2, 3, 4, 5];
        if (!Array.isArray(validDays) || !validDays.every(day => day >= 0 && day <= 6)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid business days. Days must be between 0 (Sunday) and 6 (Saturday)'
            });
        }

        // Find existing settings or create new
        let settings = await VisitorAutoReply.findOne();

        if (settings) {
            settings.isEnabled = isEnabled;
            settings.businessDays = validDays;
            settings.startTime = startTime;
            settings.endTime = endTime;
            settings.message = message;
            await settings.save();
        } else {
            settings = new VisitorAutoReply({
                isEnabled,
                businessDays: validDays,
                startTime,
                endTime,
                message
            });
            await settings.save();
        }

        res.status(200).json({
            success: true,
            message: 'Auto-reply settings saved successfully',
            settings
        });
    } catch (error) {
        console.error('Error saving auto-reply settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save auto-reply settings',
            error: error.message
        });
    }
};

/**
 * Toggle auto-reply enabled/disabled
 */
exports.toggleAutoReply = async (req, res) => {
    try {
        let settings = await VisitorAutoReply.findOne();

        if (!settings) {
            return res.status(404).json({
                success: false,
                message: 'No auto-reply settings found. Please configure settings first.'
            });
        }

        settings.isEnabled = !settings.isEnabled;
        await settings.save();

        res.status(200).json({
            success: true,
            message: `Auto-reply ${settings.isEnabled ? 'enabled' : 'disabled'}`,
            isEnabled: settings.isEnabled
        });
    } catch (error) {
        console.error('Error toggling auto-reply:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle auto-reply',
            error: error.message
        });
    }
};

// Export the helper function for use in socket handlers
exports.checkAndSendAutoReply = checkAndSendAutoReply;

// ========================================================================
// TRANSFER TO MESSAGES FUNCTIONALITY
// ========================================================================

const User = require('../models/user');
const Message = require('../models/message');

/**
 * Check if a visitor's email belongs to a registered user
 */
exports.checkUserByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find user by email (case-insensitive)
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        }).select('_id firstname lastname email phoneNumber');

        if (user) {
            res.status(200).json({
                success: true,
                isRegistered: true,
                user: {
                    _id: user._id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    phoneNumber: user.phoneNumber
                }
            });
        } else {
            res.status(200).json({
                success: true,
                isRegistered: false,
                user: null
            });
        }
    } catch (error) {
        console.error('Error checking user by email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check user',
            error: error.message
        });
    }
};

/**
 * Transfer visitor conversation to order messages (general chat)
 * This moves all messages from a visitor conversation to the Message collection
 * as a general chat with the matched registered user
 */
exports.transferToMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = "66cdf5f6dec61c826428d298";

        // Find the visitor conversation
        const visitor = await VisitorMessage.findById(id);

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor conversation not found'
            });
        }

        // Find the registered user by email
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${visitor.email}$`, 'i') }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'No registered user found with this email. Transfer is only allowed for registered users.'
            });
        }

        const userId = user._id.toString();

        // Transfer each message from the visitor conversation
        const transferredMessages = [];

        for (const msg of visitor.messages) {
            // Skip bot messages (greetings, auto-replies)
            if (msg.sender === 'bot') continue;

            // Determine sender and receiver based on original sender
            const isFromUser = msg.sender === 'user';
            const sender = isFromUser ? userId : adminId;
            const receiver = isFromUser ? adminId : userId;

            // Create new message in Message collection
            const newMessage = new Message({
                sender: sender,
                receiver: receiver,
                participants: [adminId, userId],
                message: msg.text || '',
                attachments: msg.attachments || [],
                orderId: null, // General chat has no orderId
                returnOrderId: null,
                readStatus: true, // Mark as read since admin is transferring
                createdAt: msg.createdAt || new Date(),
                updatedAt: msg.createdAt || new Date()
            });

            await newMessage.save();
            transferredMessages.push(newMessage);
        }

        // Delete the visitor conversation after successful transfer
        await VisitorMessage.findByIdAndDelete(id);

        // Emit socket event to notify about the transfer
        if (global.io) {
            // Notify admin panel to refresh
            global.io.emit('visitor:conversation-transferred', {
                visitorId: id,
                userId: userId,
                userName: `${user.firstname} ${user.lastname}`,
                messageCount: transferredMessages.length
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully transferred ${transferredMessages.length} message(s) to general chat`,
            transferredCount: transferredMessages.length,
            userId: userId,
            userName: `${user.firstname} ${user.lastname}`
        });
    } catch (error) {
        console.error('Error transferring messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to transfer messages',
            error: error.message
        });
    }
};

// ========================================================================
// AWAY STATUS FUNCTIONALITY
// ========================================================================

/**
 * Get away status settings
 */
exports.getAwayStatus = async (req, res) => {
    try {
        const settings = await VisitorAwayStatus.getSettings();

        res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('Error fetching away status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch away status',
            error: error.message
        });
    }
};

/**
 * Save/Update away status settings
 */
exports.saveAwayStatus = async (req, res) => {
    try {
        const { isAway, message } = req.body;
console.log(isAway, message);
        // Validate message
        if (!message || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Away message is required'
            });
        }

        // Find existing settings or create new
        let settings = await VisitorAwayStatus.findOne();

        if (settings) {
            settings.isAway = isAway;
            settings.message = message.trim();
            settings.updatedAt = new Date();
            await settings.save();
        } else {
            settings = new VisitorAwayStatus({
                isAway,
                message: message.trim()
            });
            await settings.save();
        }

        // Emit socket event to notify about away status change
        const io = req.app.get('io');
        if (io) {
            const visitorNamespace = io.of('/visitor-chat');
            visitorNamespace.to('admin-room').emit('away-status-changed', {
                isAway: settings.isAway,
                message: settings.message
            });
        }

        res.status(200).json({
            success: true,
            message: `Away status ${isAway ? 'enabled' : 'disabled'} successfully`,
            settings
        });
    } catch (error) {
        console.error('Error saving away status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save away status',
            error: error.message
        });
    }
};

/**
 * Toggle away status on/off
 */
exports.toggleAwayStatus = async (req, res) => {
    try {
        let settings = await VisitorAwayStatus.findOne();

        if (!settings) {
            settings = new VisitorAwayStatus({});
            await settings.save();
        }

        settings.isAway = !settings.isAway;
        settings.updatedAt = new Date();
        await settings.save();

        // Emit socket event to notify about away status change
        const io = req.app.get('io');
        if (io) {
            const visitorNamespace = io.of('/visitor-chat');
            visitorNamespace.to('admin-room').emit('away-status-changed', {
                isAway: settings.isAway,
                message: settings.message
            });
        }

        res.status(200).json({
            success: true,
            message: `Away status ${settings.isAway ? 'enabled' : 'disabled'}`,
            isAway: settings.isAway
        });
    } catch (error) {
        console.error('Error toggling away status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle away status',
            error: error.message
        });
    }
};

/**
 * Helper function to check and send away message
 */
const checkAndSendAwayMessage = async (visitor, io) => {
    try {
        const awaySettings = await VisitorAwayStatus.findOne({ isAway: true });

        if (!awaySettings) {
            return null;
        }

        // Create away message
        const awayMessage = {
            text: awaySettings.message,
            sender: 'bot',
            isAwayMessage: true,
            createdAt: new Date()
        };

        // Save to visitor's messages
        visitor.messages.push(awayMessage);
        visitor.lastMessage = awaySettings.message;
        visitor.lastMessageAt = new Date();
        await visitor.save();

        // Emit via socket if available
        if (io) {
            const visitorNamespace = io.of('/visitor-chat');

            // Send to the visitor
            visitorNamespace.to(`conversation:${visitor._id}`).emit('admin:new-message', {
                conversationId: visitor._id,
                message: awaySettings.message,
                sender: 'bot',
                isAwayMessage: true,
                createdAt: new Date()
            });

            // Also notify admin panel
            visitorNamespace.to('admin-room').emit('admin:new-message', {
                conversationId: visitor._id,
                message: awaySettings.message,
                sender: 'bot',
                isAwayMessage: true,
                createdAt: new Date()
            });
        }

        console.log(`☕ Away message sent to conversation: ${visitor._id}`);
        return awayMessage;
    } catch (error) {
        console.error('Error sending away message:', error);
        return null;
    }
};

// Export the helper function
exports.checkAndSendAwayMessage = checkAndSendAwayMessage;
