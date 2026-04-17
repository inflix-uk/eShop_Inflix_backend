import type { FC } from 'react';
import type { ConversationType } from '../../types';

interface ConversationItemProps {
  conversation: ConversationType;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * ConversationItem Component
 * Individual conversation item in the sidebar list
 */
const ConversationItem: FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick
}) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    });
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const isReturnOrder = conversation.isReturnOrder || !!conversation.returnOrderNumber;

  // Determine avatar color based on conversation type
  const getAvatarColor = () => {
    if (isReturnOrder) return 'bg-red-500';
    if (conversation.orderNumber) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  // Determine the title to display
  const getTitle = () => {
    if (isReturnOrder && conversation.returnOrderNumber) {
      return `Return #${conversation.returnOrderNumber}`;
    }
    if (conversation.orderNumber) {
      return `Order #${conversation.orderNumber}`;
    }
    return 'General Chat';
  };

  // Get status to display
  const getStatus = () => {
    if (isReturnOrder && conversation.returnOrderStatus) {
      return conversation.returnOrderStatus;
    }
    return conversation.orderStatus;
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-start p-3 sm:p-4 cursor-pointer border-b border-gray-200
        transition-colors duration-150 touch-manipulation active:bg-gray-100
        ${isSelected
          ? isReturnOrder
            ? 'bg-red-50 border-l-4 border-l-red-600'
            : 'bg-green-50 border-l-4 border-l-green-600'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
        }
      `}
    >
      {/* Icon/Avatar */}
      <div className="flex-shrink-0 mr-2 sm:mr-3">
        <div className={`
          w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold
          ${getAvatarColor()}
        `}>
          {isReturnOrder ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
            </svg>
          ) : conversation.orderNumber ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <h3 className={`text-xs sm:text-sm font-semibold truncate ${
            isSelected
              ? isReturnOrder ? 'text-red-700' : 'text-green-700'
              : 'text-gray-900'
          }`}>
            {getTitle()}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(conversation.lastMessageTime)}
          </span>
        </div>

        {getStatus() && (
          <p className="text-xs text-gray-500 mb-1 hidden sm:block">
            Status: <span className="font-medium">{getStatus()}</span>
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-gray-600 truncate flex-1">
            {conversation.hasAttachments && (
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
            {truncateMessage(conversation.lastMessage || 'No messages yet', 40)}
          </p>

          {conversation.unreadCount > 0 && (
            <span className="bg-green-600 text-white text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0 min-w-[20px] text-center">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
