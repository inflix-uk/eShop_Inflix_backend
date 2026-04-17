"use client";

import type { RefObject, KeyboardEvent, ChangeEvent } from "react";
import { useRef } from "react";
import { Send, Paperclip, X, FileText, Image } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement>;
  isSending?: boolean;
  disabled?: boolean;
  uploadedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  inputRef,
  isSending = false,
  disabled = false,
  uploadedFiles = [],
  onFilesChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFilesChange) {
      onFilesChange([...uploadedFiles, ...files]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    if (onFilesChange) {
      const newFiles = uploadedFiles.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    }
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  const canSend = value.trim() || uploadedFiles.length > 0;

  return (
    <div 
      className="border-t border-gray-200 bg-white p-3 sm:p-4"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {/* File Preview Area */}
      {uploadedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="relative group bg-gray-100 rounded-lg p-2 flex items-center gap-2"
            >
              {isImage(file) ? (
                <div className="w-10 h-10 rounded overflow-hidden">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div className="max-w-[80px]">
                <p className="text-xs text-gray-700 truncate">{file.name}</p>
                <p className="text-[10px] text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-1 -right-1 w-5 h-5 sm:w-4 sm:h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                aria-label="Remove file"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="p-2.5 text-gray-500 hover:text-gray-700 active:bg-gray-200 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Type your message..."
          disabled={disabled || isSending}
          className="flex-1 px-3.5 py-2.5 text-base sm:text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all shadow-sm hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={onSend}
          disabled={!canSend || disabled || isSending}
          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 active:from-green-800 active:to-green-700 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[56px] hover:shadow-lg shadow-sm disabled:hover:shadow-sm touch-manipulation"
          aria-label="Send message"
        >
          {isSending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
