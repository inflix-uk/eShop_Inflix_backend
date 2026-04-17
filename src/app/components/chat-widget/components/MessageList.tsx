"use client";

import type { RefObject } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

// Bot icon SVG component
const BotIcon = () => (
  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A1.5 1.5 0 006 14.5a1.5 1.5 0 001.5 1.5A1.5 1.5 0 009 14.5 1.5 1.5 0 007.5 13m9 0a1.5 1.5 0 00-1.5 1.5 1.5 1.5 0 001.5 1.5 1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-1.5-1.5M12 17a1 1 0 00-1 1 1 1 0 001 1 1 1 0 001-1 1 1 0 00-1-1z"/>
  </svg>
);

interface MessageListProps {
  messages: Message[];
  messagesEndRef: RefObject<HTMLDivElement>;
  isLoading?: boolean;
  isAdminTyping?: boolean;
  userName?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  messagesEndRef,
  isLoading = false,
  isAdminTyping = false,
  userName,
}) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <p className="text-sm text-gray-400">No messages yet</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble key={message.id} message={message} userName={userName} />
        ))
      )}

      {/* Admin Typing Indicator */}
      {isAdminTyping && (
        <div className="flex items-end gap-2 animate-fadeIn">
          {/* Bot Avatar */}
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <BotIcon />
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-500 text-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/80">Support is typing</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
