import type { FC } from 'react';
import type { FileType, RequestOrder } from '../../types';
import ReturnRequestDetails from './ReturnRequestDetails';
import FileAttachment from './FileAttachment';

interface MessageBubbleProps {
  message?: string;
  files?: FileType[];
  isUser: boolean;
  requestOrder?: RequestOrder;
  onPreview: (file: FileType) => void;
  createdAt?: string;
}

/**
 * MessageBubble Component
 * Displays a single message bubble
 */
const MessageBubble: FC<MessageBubbleProps> = ({
  message,
  files,
  isUser,
  onPreview,
  createdAt,
  requestOrder
}) => {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleString()
    : '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-xs md:max-w-md px-4 py-2 rounded-lg shadow
          ${
            isUser
              ? 'bg-green-600 text-white rounded-tr-none'
              : 'bg-gray-200 text-gray-800 rounded-tl-none'
          }
        `}
      >
        {/* Display text message if present */}
        {message && <div className="whitespace-pre-wrap mb-2">{message}</div>}

        {/* Return Request Details */}
        {requestOrder && (
          <ReturnRequestDetails
            requestOrder={requestOrder}
          />
        )}

        {/* File Attachments */}
        {files && files.length > 0 && (
          <FileAttachment files={files} onPreview={onPreview} />
        )}

        {/* Timestamp */}
        {createdAt && (
          <div
            className={`text-xs mt-2 ${
              isUser ? 'text-gray-100' : 'text-gray-500'
            }`}
          >
            {formattedDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
