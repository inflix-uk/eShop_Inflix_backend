import axios from 'axios';
import type { ApiResponse, MessageType, FileType, ConversationType } from '../types';

// Get base URL from environment variable with fallback to localhost
// Ensure trailing slash for proper URL concatenation
const baseURL = process.env.NEXT_PUBLIC_API_URL ;

/**
 * Messages Service - Handles all API calls related to customer messages
 */

/**
 * Fetch all conversations for a customer
 * @param senderId - The customer's user ID
 * @returns Promise with conversations array
 */
export const fetchConversations = async (
  senderId: string
): Promise<{
  success: boolean;
  conversations?: ConversationType[];
  error?: string;
}> => {
  try {
    if (!senderId) {
      return {
        success: false,
        error: 'No sender ID available'
      };
    }

    const response = await axios.get<ApiResponse>(
      `${baseURL}/get/conversations/${senderId}`
    );

    if (response.data.success && response.data.conversations) {
      return {
        success: true,
        conversations: response.data.conversations
      };
    }

    return {
      success: false,
      error: 'Failed to fetch conversations'
    };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch conversations'
    };
  }
};

/**
 * Fetch messages for a specific conversation
 * @param senderId - The customer's user ID
 * @param orderId - The order ID (or 'general' for general chat)
 * @returns Promise with API response
 */
export const fetchMessagesByConversation = async (
  senderId: string,
  orderId: string
): Promise<{
  success: boolean;
  messages?: MessageType[];
  error?: string;
}> => {
  try {
    if (!senderId) {
      return {
        success: false,
        error: 'No sender ID available'
      };
    }

    const response = await axios.get<ApiResponse>(
      `${baseURL}/get/messages/${senderId}/${orderId}`
    );

    if (response.data.success && response.data.messages) {
      return {
        success: true,
        messages: response.data.messages
      };
    }

    return {
      success: false,
      error: 'Failed to fetch messages'
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch messages'
    };
  }
};

/**
 * Fetch messages for a customer (deprecated - use fetchMessagesByConversation)
 * @param senderId - The customer's user ID
 * @returns Promise with API response
 */
export const fetchMessages = async (
  senderId: string
): Promise<{
  success: boolean;
  messages?: MessageType[];
  error?: string;
}> => {
  try {
    if (!senderId) {
      return {
        success: false,
        error: 'No sender ID available'
      };
    }

    const response = await axios.get<ApiResponse>(
      `${baseURL}/get/messages/senderid/${senderId}`
    );

    if (response.data.success && response.data.messages) {
      return {
        success: true,
        messages: response.data.messages
      };
    }

    return {
      success: false,
      error: 'Failed to fetch messages'
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch messages'
    };
  }
};

/**
 * Send a message with optional file attachments and orderId
 * @param senderId - The customer's user ID
 * @param messageText - The message text
 * @param files - Array of files to attach
 * @param orderId - Optional order ID to link the message to
 * @returns Promise with API response
 */
export const sendMessage = async (
  senderId: string,
  messageText: string,
  files: File[] = [],
  orderId?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('message', messageText);
    formData.append('senderId', senderId);

    if (orderId) {
      formData.append('orderId', orderId);
    }

    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axios.post(
      `${baseURL}/send/messageFromUser/senderid/${senderId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return {
      success: response.data.success || true,
      message: response.data.message || 'Message sent successfully'
    };
  } catch (error) {
    console.error('Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send message'
    };
  }
};

/**
 * Get mimetype from file extension
 * @param filename - The filename or URL
 * @returns The mimetype string
 */
const getMimetypeFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Map message attachments to FileType format
 * @param messages - Array of messages
 * @returns Mapped messages with file URLs
 */
export const mapMessageAttachments = (
  messages: MessageType[]
): MessageType[] => {
  // Ensure proper URL construction (handle trailing/leading slashes)
  const cleanBaseURL = baseURL?.endsWith('/') ? baseURL.slice(0, -1) : baseURL;

  return messages.map((msg) => {
    // Handle attachments from API responses
    if (msg.attachments && msg.attachments.length > 0) {
      const files: FileType[] = msg.attachments.map((attachment) => {
        const filePath = attachment.path.startsWith('/') ? attachment.path : `/${attachment.path}`;
        return {
          url: `${cleanBaseURL}${filePath}`,
          name: attachment.filename,
          type: attachment.mimetype || getMimetypeFromExtension(attachment.filename)
        };
      });
      return { ...msg, files };
    }

    // Handle files from socket messages (could be full URLs or relative)
    if (msg.files && msg.files.length > 0) {
      const files: FileType[] = msg.files.map((file: FileType | string) => {
        // If file is a string (full URL from backend), convert to FileType
        if (typeof file === 'string') {
          const fileName = file.split('/').pop() || 'file';
          return {
            url: file,
            name: fileName,
            type: getMimetypeFromExtension(fileName)
          };
        }
        // If file.url is already a full URL, use it directly
        if (file.url.startsWith('http')) {
          return {
            ...file,
            type: file.type || getMimetypeFromExtension(file.name || file.url)
          };
        }
        // Otherwise, construct full URL
        const filePath = file.url.startsWith('/') ? file.url : `/${file.url}`;
        return {
          ...file,
          url: `${cleanBaseURL}${filePath}`,
          type: file.type || getMimetypeFromExtension(file.name || file.url)
        };
      });
      return { ...msg, files };
    }

    return msg;
  });
};

/**
 * Sort messages by creation time
 * @param messages - Array of messages
 * @returns Sorted messages
 */
export const sortMessagesByDate = (messages: MessageType[]): MessageType[] => {
  return messages.sort(
    (a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
};

/**
 * Check if there are new messages
 * @param currentMessages - Current messages array
 * @param newMessages - New messages array
 * @returns Boolean indicating if there are new messages
 */
export const hasNewMessages = (
  currentMessages: MessageType[],
  newMessages: MessageType[]
): boolean => {
  const currentMessagesIds = currentMessages.map((msg) => msg._id);
  return newMessages.some((msg) => !currentMessagesIds.includes(msg._id));
};

// Default export containing all service methods
const messagesService = {
  fetchConversations,
  fetchMessagesByConversation,
  fetchMessages,
  sendMessage,
  mapMessageAttachments,
  sortMessagesByDate,
  hasNewMessages
};

export default messagesService;
