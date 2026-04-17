"use client";

import { X, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  onClose: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onClose }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between relative overflow-hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]"></div>
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base sm:text-base tracking-tight">Customer Support</h3>
          <p className="text-xs text-indigo-100 font-medium hidden sm:block">
            We&apos;re online and ready to help
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="hover:bg-white/20 active:bg-white/30 rounded-xl p-2 transition-all duration-200 relative z-10 backdrop-blur-sm touch-manipulation"
        aria-label="Close chat"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};
