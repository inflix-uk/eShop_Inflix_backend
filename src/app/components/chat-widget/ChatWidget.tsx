"use client";

import { useChatWidget } from "./hooks";
import {
  ChatButton,
  ChatHeader,
  ChatForm,
  MessageList,
  ChatInput,
} from "./components";

const ChatWidget: React.FC = () => {
  const {
    // State
    isOpen,
    isFormComplete,
    isLoading,
    isSending,
    isAdminTyping,
    isLoggedIn,
    messages,
    formData,
    errors,
    inputValue,
    uploadedFiles,
    // Refs
    messagesEndRef,
    inputRef,
    // Actions
    toggleOpen,
    handleClose,
    updateFormField,
    setInputValue,
    setUploadedFiles,
    startConversation,
    sendMessage,
    handleKeyPress,
  } = useChatWidget();

  return (
    <>
      {/* Floating Chat Button */}
      <ChatButton isOpen={isOpen} onClick={toggleOpen} />

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Mobile: Full Screen Overlay */}
          <div className="mobile-chat-container fixed inset-0 z-[9999] sm:hidden bg-white flex flex-col overflow-hidden animate-slideUpMobile">
            {/* Header - Fixed at top */}
            <div className="flex-shrink-0">
              <ChatHeader onClose={handleClose} />
            </div>

            {/* Content Area - Scrollable, adjusts when keyboard appears */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
              {!isFormComplete ? (
                <ChatForm
                  formData={formData}
                  errors={errors}
                  isLoading={isLoading}
                  isLoggedIn={isLoggedIn}
                  onFieldChange={updateFormField}
                  onSubmit={startConversation}
                />
              ) : (
                <MessageList
                  messages={messages}
                  messagesEndRef={
                    messagesEndRef as React.RefObject<HTMLDivElement>
                  }
                  isLoading={isLoading}
                  isAdminTyping={isAdminTyping}
                  userName={formData.name}
                />
              )}
            </div>

            {/* Input Area - Fixed at bottom, stays above keyboard */}
            {isFormComplete && (
              <div className="flex-shrink-0">
                <ChatInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={sendMessage}
                  onKeyPress={handleKeyPress}
                  inputRef={inputRef as React.RefObject<HTMLInputElement>}
                  isSending={isSending}
                  uploadedFiles={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                />
              </div>
            )}
          </div>

          {/* Desktop: Fixed Window */}
          <div className="hidden sm:flex fixed bottom-24 right-6 z-50 w-full max-w-md h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex-col overflow-hidden transform transition-all duration-300 ease-out animate-slideUp border border-gray-100">
            {/* Header */}
            <ChatHeader onClose={handleClose} />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white">
              {!isFormComplete ? (
                <ChatForm
                  formData={formData}
                  errors={errors}
                  isLoading={isLoading}
                  isLoggedIn={isLoggedIn}
                  onFieldChange={updateFormField}
                  onSubmit={startConversation}
                />
              ) : (
                <div className="flex-1 flex flex-col h-full">
                  <MessageList
                    messages={messages}
                    messagesEndRef={
                      messagesEndRef as React.RefObject<HTMLDivElement>
                    }
                    isLoading={isLoading}
                    isAdminTyping={isAdminTyping}
                    userName={formData.name}
                  />
                </div>
              )}
            </div>

            {/* Input Area (only shown after form is complete) */}
            {isFormComplete && (
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSend={sendMessage}
                onKeyPress={handleKeyPress}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
                isSending={isSending}
                uploadedFiles={uploadedFiles}
                onFilesChange={setUploadedFiles}
              />
            )}
          </div>
        </>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideUpMobile {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
            max-height: 0;
          }
          to {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        .animate-slideUpMobile {
          animation: slideUpMobile 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        /* Prevent layout shift when keyboard appears on mobile */
        @media (max-width: 640px) {
          .mobile-chat-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            /* Use dvh (dynamic viewport height) which adjusts when keyboard appears */
            height: 100vh;
            height: 100dvh;
            max-height: 100vh;
            max-height: 100dvh;
            /* Prevent browser from scrolling the page */
            overscroll-behavior: contain;
            /* Prevent iOS bounce effect */
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
          }
          /* Ensure content area can shrink properly */
          .mobile-chat-container .flex-1 {
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            /* Smooth scrolling on iOS */
            scroll-behavior: smooth;
          }
          /* Keep header always visible */
          .mobile-chat-container > div:first-child {
            position: relative;
            z-index: 10;
            flex-shrink: 0;
          }
          /* Keep input always visible above keyboard */
          .mobile-chat-container > div:last-child {
            position: relative;
            z-index: 10;
            flex-shrink: 0;
            background: white;
          }
        }
      `}</style>
    </>
  );
};

export default ChatWidget;
