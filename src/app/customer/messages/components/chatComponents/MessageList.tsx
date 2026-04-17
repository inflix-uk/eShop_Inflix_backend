import type { FC } from 'react';
import type { MessageType, FileType } from '../../types';
import { MessageBubble } from '../messageComponents';

interface MessageListProps {
  messages: MessageType[];
  currentUserId?: string;
  isFetching: boolean;
  onPreview: (file: FileType) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

/**
 * MessageList Component
 * Displays the list of messages in the chat
 */
const MessageList: FC<MessageListProps> = ({
  messages,
  currentUserId,
  isFetching,
  onPreview,
  messagesEndRef
}) => {
  if (isFetching) {
    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin scrollbar-webkit">
        <p className="text-center text-sm sm:text-base text-gray-500 mt-4">Loading messages...</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 scrollbar-thin scrollbar-webkit">
        <p className="text-center text-sm sm:text-base text-gray-500 mt-4">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 scrollbar-thin scrollbar-webkit">
      {messages.map((msg) => (
        <MessageBubble
          key={msg._id}
          message={msg.message}
          files={msg.files}
          createdAt={msg.createdAt}
          isUser={msg.sender === currentUserId}
          onPreview={onPreview}
          requestOrder={msg.requestOrder}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
