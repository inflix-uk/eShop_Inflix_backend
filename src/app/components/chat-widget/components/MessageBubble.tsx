"use client";

import type { Message } from "../types";
import { formatMessageTime } from "../utils/session";
import { FileText, Download } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

interface MessageBubbleProps {
  message: Message;
  userName?: string;
}

// Bot icon SVG component
const BotIcon = () => (
  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A1.5 1.5 0 006 14.5a1.5 1.5 0 001.5 1.5A1.5 1.5 0 009 14.5 1.5 1.5 0 007.5 13m9 0a1.5 1.5 0 00-1.5 1.5 1.5 1.5 0 001.5 1.5 1.5 1.5 0 001.5-1.5 1.5 1.5 0 00-1.5-1.5M12 17a1 1 0 00-1 1 1 1 0 001 1 1 1 0 001-1 1 1 0 00-1-1z"/>
  </svg>
);

// User icon SVG component
const UserIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, userName }) => {
  const isUser = message.sender === "user";
  const isAdmin = message.sender === "admin";
  const isBot = message.sender === "bot";
  const attachments = message.attachments || [];

  // Get initials from user name
  const getInitials = (name?: string) => {
    if (!name) return null;
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(userName);

  // Check if file is an image
  const isImage = (mimetype?: string) => mimetype?.startsWith("image/");

  // Get full URL for attachment
  const getAttachmentUrl = (path: string) => `${BACKEND_URL}${path}`;

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fadeIn`}>
      <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
        {/* Admin/Bot Avatar */}
        {(isAdmin || isBot) && (
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <BotIcon />
          </div>
        )}

        {/* User Avatar */}
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {initials || <UserIcon />}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
            isUser
              ? "bg-gray-100 text-gray-900 border border-gray-200 rounded-br-sm"
              : "bg-gradient-to-br from-green-600 to-green-500 text-white rounded-bl-sm"
          }`}
        >
          {/* Text content */}
          {message.text && (
            <p className="text-sm leading-relaxed">{message.text}</p>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className={`${message.text ? "mt-2" : ""} space-y-2`}>
              {attachments.map((attachment, index) => (
                <div key={index}>
                  {isImage(attachment.mimetype) ? (
                    <a
                      href={getAttachmentUrl(attachment.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={getAttachmentUrl(attachment.path)}
                        alt={attachment.originalName}
                        className="max-w-[180px] rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ) : (
                    <a
                      href={getAttachmentUrl(attachment.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        isUser
                          ? "bg-gray-200 hover:bg-gray-300"
                          : "bg-white/20 hover:bg-white/30"
                      } transition-colors`}
                    >
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs truncate max-w-[120px]">
                        {attachment.originalName}
                      </span>
                      <Download className="w-3 h-3 flex-shrink-0 ml-auto" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timestamp below bubble */}
      <p className={`text-[10px] mt-1 text-gray-400 ${isUser ? "mr-10" : "ml-10"}`}>
        {formatMessageTime(message.timestamp)}
      </p>
    </div>
  );
};
