/**
 * Visitor Message Socket Handler
 * Handles real-time communication between customer chat widget and admin panel
 */

const VisitorMessage = require('../src/models/visitorMessage');
const VisitorAutoReply = require('../src/models/visitorAutoReply');

/**
 * Helper function to check if current UK time is OUTSIDE business hours (auto-reply active)
 * Start = business hours start, End = business hours end
 * Auto-reply is active OUTSIDE these hours
 */
const isOutsideBusinessHours = (startTime, endTime) => {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));

  const currentHours = ukTime.getHours();
  const currentMinutes = ukTime.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

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
const checkAndSendAutoReply = async (conversationId, visitorNamespace) => {
  try {
    const autoReplySettings = await VisitorAutoReply.findOne({ isEnabled: true });

    if (!autoReplySettings) {
      console.log('⚠️ Auto-reply: No enabled settings found');
      return null;
    }

    console.log(`🕐 Auto-reply settings: Business hours=${autoReplySettings.startTime} to ${autoReplySettings.endTime}`);

    // Get current UK time for logging
    const now = new Date();
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    console.log(`🕐 Current UK time: ${ukTime.getHours()}:${ukTime.getMinutes()}`);

    if (!isOutsideBusinessHours(autoReplySettings.startTime, autoReplySettings.endTime)) {
      console.log('⚠️ Auto-reply: Current time is within business hours - no auto-reply needed');
      return null;
    }

    console.log('✅ Auto-reply: Outside business hours, sending reply...');

    // Get the visitor conversation
    const visitor = await VisitorMessage.findById(conversationId);
    if (!visitor) {
      return null;
    }

    // Create auto-reply message
    const autoReplyMessage = {
      text: autoReplySettings.message,
      sender: 'bot',
      isAutoReply: true,
      createdAt: new Date()
    };

    // Save to database
    visitor.messages.push(autoReplyMessage);
    visitor.lastMessage = autoReplySettings.message;
    visitor.lastMessageAt = new Date();
    await visitor.save();

    // Emit auto-reply to the visitor
    visitorNamespace.to(`conversation:${conversationId}`).emit('admin:new-message', {
      conversationId,
      message: autoReplySettings.message,
      sender: 'bot',
      isAutoReply: true,
      createdAt: new Date()
    });

    // Also notify admins
    visitorNamespace.to('admin-room').emit('admin:new-message', {
      conversationId,
      message: autoReplySettings.message,
      sender: 'bot',
      isAutoReply: true,
      createdAt: new Date()
    });

    console.log(`🤖 Auto-reply sent to conversation: ${conversationId}`);
    return autoReplyMessage;
  } catch (error) {
    console.error('Error sending auto-reply:', error);
    return null;
  }
};

/**
 * Initialize visitor message socket events
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
const initVisitorSocketHandler = (io) => {
  // Create a namespace for visitor messages
  const visitorNamespace = io.of('/visitor-chat');

  visitorNamespace.on('connection', (socket) => {
    console.log(`🟢 Visitor socket connected: ${socket.id}`);

    /**
     * Admin joins the admin room to receive all visitor updates
     */
    socket.on('admin:join', () => {
      socket.join('admin-room');
      console.log(`👨‍💼 Admin joined admin-room: ${socket.id}`);
    });

    /**
     * Visitor joins their conversation room
     */
    socket.on('visitor:join', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        socket.conversationId = conversationId;
        console.log(`👤 Visitor joined conversation: ${conversationId}`);
      }
    });

    /**
     * Admin joins a specific conversation to view it
     */
    socket.on('admin:join-conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
        console.log(`👨‍💼 Admin joined conversation: ${conversationId}`);
      }
    });

    /**
     * Admin leaves a conversation room
     */
    socket.on('admin:leave-conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        console.log(`👨‍💼 Admin left conversation: ${conversationId}`);
      }
    });

    /**
     * Visitor is typing - broadcast to admin
     */
    socket.on('visitor:typing', (data) => {
      const { conversationId, text, visitorName } = data;

      // Broadcast to admin room
      socket.to('admin-room').emit('visitor:typing', {
        conversationId,
        text,
        visitorName,
        isTyping: true
      });

      // Also broadcast to specific conversation room (for focused admin)
      socket.to(`conversation:${conversationId}`).emit('visitor:typing', {
        conversationId,
        text,
        visitorName,
        isTyping: true
      });
    });

    /**
     * Visitor stopped typing
     */
    socket.on('visitor:stop-typing', (data) => {
      const { conversationId } = data;

      socket.to('admin-room').emit('visitor:stop-typing', { conversationId });
      socket.to(`conversation:${conversationId}`).emit('visitor:stop-typing', { conversationId });
    });

    /**
     * Visitor sends a new message (with optional attachments)
     */
    socket.on('visitor:new-message', async (data) => {
      const { conversationId, message, visitorName, visitorEmail, attachments = [] } = data;

      try {
        // Notify admin room about new message
        socket.to('admin-room').emit('visitor:new-message', {
          conversationId,
          message,
          visitorName,
          visitorEmail,
          sender: 'user',
          attachments,
          createdAt: new Date()
        });

        // Also emit to specific conversation room
        socket.to(`conversation:${conversationId}`).emit('visitor:new-message', {
          conversationId,
          message,
          sender: 'user',
          attachments,
          createdAt: new Date()
        });

        // Clear typing indicator
        socket.to('admin-room').emit('visitor:stop-typing', { conversationId });

        console.log(`📩 New message from visitor in conversation: ${conversationId}`);

        // Note: Auto-reply is handled by the API controller, not here
        // to avoid duplicate auto-replies
      } catch (error) {
        console.error('Error handling new message:', error);
      }
    });

    /**
     * New conversation started by visitor
     */
    socket.on('visitor:new-conversation', (data) => {
      const { conversationId, visitor } = data;

      // Join the conversation room
      socket.join(`conversation:${conversationId}`);
      socket.conversationId = conversationId;

      // Notify all admins about new conversation
      socket.to('admin-room').emit('visitor:new-conversation', {
        conversationId,
        visitor,
        createdAt: new Date()
      });

      console.log(`🆕 New conversation started: ${conversationId}`);

      // Note: Auto-reply is handled by the API controller, not here
    });

    /**
     * Admin is typing - broadcast to visitor
     */
    socket.on('admin:typing', (data) => {
      const { conversationId } = data;

      socket.to(`conversation:${conversationId}`).emit('admin:typing', {
        conversationId,
        isTyping: true
      });
    });

    /**
     * Admin stopped typing
     */
    socket.on('admin:stop-typing', (data) => {
      const { conversationId } = data;

      socket.to(`conversation:${conversationId}`).emit('admin:stop-typing', {
        conversationId
      });
    });

    /**
     * Admin sends a reply (with optional attachments)
     */
    socket.on('admin:new-message', async (data) => {
      const { conversationId, message, attachments = [] } = data;

      try {
        // Notify the visitor in the conversation
        socket.to(`conversation:${conversationId}`).emit('admin:new-message', {
          conversationId,
          message,
          sender: 'admin',
          attachments,
          createdAt: new Date()
        });

        // Also notify other admins viewing the conversation
        socket.to('admin-room').emit('admin:new-message', {
          conversationId,
          message,
          sender: 'admin',
          attachments,
          createdAt: new Date()
        });

        console.log(`📤 Admin replied to conversation: ${conversationId}`);
      } catch (error) {
        console.error('Error handling admin message:', error);
      }
    });

    /**
     * Refresh visitors list for all admins
     */
    socket.on('refresh:visitors', () => {
      visitorNamespace.to('admin-room').emit('refresh:visitors');
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', () => {
      // If visitor was typing, notify admin they stopped
      if (socket.conversationId) {
        socket.to('admin-room').emit('visitor:stop-typing', {
          conversationId: socket.conversationId
        });
        socket.to(`conversation:${socket.conversationId}`).emit('visitor:disconnected', {
          conversationId: socket.conversationId
        });
      }
      console.log(`🔴 Visitor socket disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Visitor Socket Handler initialized on /visitor-chat namespace');

  return visitorNamespace;
};

module.exports = { initVisitorSocketHandler };
