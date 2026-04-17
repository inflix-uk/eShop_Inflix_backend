"use client";

import { MessageCircle } from "lucide-react";

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed sm:bottom-6 bottom-20 right-6 z-[999] w-16 h-16 bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-indigo-700 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 group animate-float ${
        isOpen ? "hidden sm:flex" : "flex"
      }`}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
      {!isOpen && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-400 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-lg">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative">1</span>
        </span>
      )}
    </button>
  );
};
