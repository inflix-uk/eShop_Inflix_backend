/**
 * Messages Service Index
 * Exports all service methods for easy importing
 */

export {
  fetchConversations,
  fetchMessagesByConversation,
  fetchMessages,
  sendMessage,
  mapMessageAttachments,
  sortMessagesByDate,
  hasNewMessages,
  default as messagesService
} from './messagesService';
