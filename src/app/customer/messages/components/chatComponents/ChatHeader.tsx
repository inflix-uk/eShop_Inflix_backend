import type { FC } from 'react';
import { FiArrowLeft } from 'react-icons/fi';

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  onBackClick?: () => void;
  isReturnOrder?: boolean;
}

/**
 * ChatHeader Component
 * Displays the header of the chat window
 */
const ChatHeader: FC<ChatHeaderProps> = ({ title = 'Chat', subtitle, onBackClick, isReturnOrder = false }) => {
  return (
    <div className={`p-3 sm:p-4 border-b border-gray-300 flex items-center gap-3 ${isReturnOrder ? 'bg-red-50' : 'bg-gray-50'}`}>
      {onBackClick && (
        <button
          onClick={onBackClick}
          className="sm:hidden p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
          aria-label="Back to conversations"
        >
          <FiArrowLeft size={20} className="text-gray-700" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className={`text-lg sm:text-xl font-semibold truncate ${isReturnOrder ? 'text-red-800' : 'text-gray-800'}`}>{title}</h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>
        )}
      </div>
      {isReturnOrder && (
        <div className="flex-shrink-0">
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Return
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
