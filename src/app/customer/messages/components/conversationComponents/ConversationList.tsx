import type { FC } from 'react';
import type { ConversationType } from '../../types';
import ConversationItem from './ConversationItem';

interface ConversationListProps {
  conversations: ConversationType[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  isLoading?: boolean;
  onClose?: () => void;
}

/**
 * ConversationList Component
 * Displays the sidebar with all conversations and a "New Chat" button
 */
const ConversationList: FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  isLoading = false,
  onClose
}) => {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-300">
      {/* Header with New Chat Button */}
      <div className="p-3 sm:p-4 border-b border-gray-300 bg-gray-50">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {onClose && (
              <button
                onClick={onClose}
                className="sm:hidden p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                aria-label="Close conversations"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Messages</h2>
          </div>
          <button
            onClick={onNewChat}
            className="inline-flex items-center px-2.5 sm:px-3 py-1.5 bg-green-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 flex-shrink-0"
            title="Start a new conversation"
          >
            <svg className="w-4 h-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Start Chat</span>
          </button>
        </div>
        <p className="text-xs text-gray-600 hidden sm:block">
          Select a conversation or start a new one
        </p>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No conversations yet
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Start a new conversation with us
            </p>
            <button
              onClick={onNewChat}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
            >
              Start Chatting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.conversationId}
                conversation={conversation}
                isSelected={conversation.conversationId === selectedConversationId}
                onClick={() => onSelectConversation(conversation.conversationId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with total count */}
      {conversations.length > 0 && (
        <div className="p-2 sm:p-3 border-t border-gray-300 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ConversationList;
