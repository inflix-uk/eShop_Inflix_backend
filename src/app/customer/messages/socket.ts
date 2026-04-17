import { io, Socket } from 'socket.io-client';

// Socket.IO client configuration
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL;

let socket: Socket | null = null;
let currentUserId: string | null = null;

/**
 * Initialize socket connection
 * @returns Socket instance
 */
export const initializeSocket = (): Socket => {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
      // Auto-join user room on connect
      if (currentUserId) {
        socket?.emit('join', currentUserId);
        console.log(`👤 Auto-joined user room on connect: user:${currentUserId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
      // Re-join user room on reconnect
      if (currentUserId) {
        socket?.emit('join', currentUserId);
        console.log(`👤 Re-joined user room on reconnect: user:${currentUserId}`);
      }
    });
  }

  return socket;
};

/**
 * Get current socket instance
 * @returns Socket instance or null
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentUserId = null;
    console.log('🔌 Socket disconnected manually');
  }
};

/**
 * Join user's personal room
 * @param userId - The user's ID
 */
export const joinUserRoom = (userId: string): void => {
  // Store userId for auto-join on connect/reconnect
  currentUserId = userId;

  if (socket && socket.connected) {
    socket.emit('join', userId);
    console.log(`👤 Joined user room: user:${userId}`);
  } else {
    console.log(`⏳ Socket not connected yet, will auto-join user:${userId} on connect`);
  }
};

/**
 * Join a conversation room
 * @param userId - The user's ID
 * @param orderId - The order ID (or 'general')
 */
export const joinConversation = (userId: string, orderId: string | null): void => {
  if (socket && socket.connected) {
    socket.emit('join-conversation', { userId, orderId: orderId || 'general' });
    const room = orderId && orderId !== 'general'
      ? `conversation:${userId}:${orderId}`
      : `conversation:${userId}:general`;
    console.log(`💬 Joined conversation room: ${room}`);
  }
};

/**
 * Leave a conversation room
 * @param userId - The user's ID
 * @param orderId - The order ID (or 'general')
 */
export const leaveConversation = (userId: string, orderId: string | null): void => {
  if (socket && socket.connected) {
    socket.emit('leave-conversation', { userId, orderId: orderId || 'general' });
    const room = orderId && orderId !== 'general'
      ? `conversation:${userId}:${orderId}`
      : `conversation:${userId}:general`;
    console.log(`👋 Left conversation room: ${room}`);
  }
};

/**
 * Listen for new messages
 * @param callback - Function to call when new message arrives
 * @returns Cleanup function to remove listener
 */
export const onNewMessage = (callback: (message: any) => void): (() => void) => {
  if (socket) {
    socket.on('new-message', callback);
    console.log('👂 Listening for new messages');

    // Return cleanup function
    return () => {
      socket?.off('new-message', callback);
      console.log('🔇 Stopped listening for new messages');
    };
  }

  return () => {}; // No-op if socket doesn't exist
};

/**
 * Listen for message updates
 * @param callback - Function to call when message is updated
 * @returns Cleanup function to remove listener
 */
export const onMessageUpdated = (callback: (message: any) => void): (() => void) => {
  // Initialize socket if needed
  if (!socket) {
    initializeSocket();
  }

  if (socket) {
    socket.on('message-updated', callback);
    console.log('👂 Listening for message updates');

    // Return cleanup function
    return () => {
      socket?.off('message-updated', callback);
      console.log('🔇 Stopped listening for message updates');
    };
  }

  return () => {}; // No-op if socket doesn't exist
};

/**
 * Listen for message deletions
 * @param callback - Function to call when message is deleted
 * @returns Cleanup function to remove listener
 */
export const onMessageDeleted = (callback: (data: { messageId: string; orderId: string | null }) => void): (() => void) => {
  // Initialize socket if needed
  if (!socket) {
    initializeSocket();
  }

  if (socket) {
    socket.on('message-deleted', callback);
    console.log('👂 Listening for message deletions');

    // Return cleanup function
    return () => {
      socket?.off('message-deleted', callback);
      console.log('🔇 Stopped listening for message deletions');
    };
  }

  return () => {}; // No-op if socket doesn't exist
};

const socketService = {
  initializeSocket,
  getSocket,
  disconnectSocket,
  joinUserRoom,
  joinConversation,
  leaveConversation,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted
};

export default socketService;
