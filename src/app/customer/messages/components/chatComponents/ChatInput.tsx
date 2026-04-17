import type { FC, ChangeEvent, KeyboardEvent } from 'react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import type { FileType } from '../../types';
import SelectedFilesList from './SelectedFilesList';

interface ChatInputProps {
  messageText: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  onPreview: (file: FileType) => void;
  isLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

/**
 * ChatInput Component
 * Input area for typing and sending messages
 */
const ChatInput: FC<ChatInputProps> = ({
  messageText,
  onMessageChange,
  onSend,
  onFileSelect,
  selectedFiles,
  onRemoveFile,
  onPreview,
  isLoading,
  fileInputRef
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      onSend();
    }
  };

  const isDisabled =
    isLoading || (!messageText.trim() && selectedFiles.length === 0);

  return (
    <div className="p-3 sm:p-4 border-t border-gray-300 bg-gray-50">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex items-center gap-2 w-full">
          <label className="cursor-pointer p-2 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileSelect}
              accept="image/*,.pdf,.doc,.docx,.txt"
              multiple
            />
            <FiPaperclip
              size={20}
              className="text-gray-500 hover:text-gray-700"
            />
          </label>
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>
        <button
          onClick={onSend}
          className={`p-2.5 sm:p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center touch-manipulation min-w-[60px] sm:min-w-auto ${
            isDisabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isDisabled}
          aria-label="Send message"
        >
          <FiSend size={20} />
          <span className="text-white text-sm sm:text-lg font-normal ml-1.5 sm:ml-0 block sm:hidden">
            Send
          </span>
        </button>
      </div>

      <SelectedFilesList
        files={selectedFiles}
        onRemove={onRemoveFile}
        onPreview={onPreview}
      />
    </div>
  );
};

export default ChatInput;
