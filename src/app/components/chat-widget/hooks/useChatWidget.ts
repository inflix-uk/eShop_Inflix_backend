"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Message, FormData, FormErrors } from "../types";
import {
  createConversation,
  addMessage as addMessageApi,
  getMessages,
  transformMessages,
  visitorSocketService,
} from "../service";
import { validateForm, hasErrors } from "../utils/validation";
import {
  getSessionId,
  saveConversationId,
  getConversationId,
  clearChatSession,
} from "../utils/session";
import { useAuth } from "@/app/context/Auth";

const initialFormData: FormData = {
  isOrderRelated: "",
  orderNumber: "",
  name: "",
  phoneNumber: "",
  email: "",
};

export const useChatWidget = () => {
  // Get authenticated user
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);

  // Data State
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [formData, setFormData] = useState<FormData>(() => {
    // Pre-populate with user data if logged in
    if (user) {
      return {
        ...initialFormData,
        name: `${user.firstname || ""} ${user.lastname || ""}`.trim(),
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
      };
    }
    return initialFormData;
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Update form data when user changes (logs in/out)
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: `${user.firstname || ""} ${user.lastname || ""}`.trim(),
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
      }));
    }
  }, [user]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when form is complete
  useEffect(() => {
    if (isOpen && isFormComplete && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isFormComplete]);

  // Scroll to last message when input is focused (keyboard appears)
  useEffect(() => {
    if (isOpen && isFormComplete && inputRef.current && typeof window !== "undefined") {
      const handleFocus = () => {
        // Wait for keyboard animation to complete, then scroll to last message
        const scrollToLastMessage = () => {
          if (messagesEndRef.current) {
            // Use scrollIntoView with better options for mobile
            messagesEndRef.current.scrollIntoView({ 
              behavior: "smooth", 
              block: "nearest",
              inline: "nearest"
            });
          }
        };

        // Try multiple times as keyboard animation can vary
        setTimeout(scrollToLastMessage, 200);
        setTimeout(scrollToLastMessage, 400);
        setTimeout(scrollToLastMessage, 600);
      };

      // Handle visual viewport changes (keyboard appearance)
      const handleViewportChange = () => {
        if (messagesEndRef.current) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: "smooth", 
              block: "nearest" 
            });
          }, 100);
        }
      };

      const input = inputRef.current;
      input.addEventListener("focus", handleFocus);
      
      // Listen for viewport resize (keyboard show/hide)
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleViewportChange);
      }

      return () => {
        input.removeEventListener("focus", handleFocus);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", handleViewportChange);
        }
      };
    }
  }, [isOpen, isFormComplete, messages]);

  // Lock body scroll on mobile when chat is open
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    if (isOpen) {
      // Check if mobile (screen width < 640px which is Tailwind's sm breakpoint)
      const isMobile = window.innerWidth < 640;
      
      if (isMobile) {
        const originalOverflow = window.getComputedStyle(document.body).overflow;
        const originalPosition = window.getComputedStyle(document.body).position;
        const originalTop = window.getComputedStyle(document.body).top;
        const originalWidth = window.getComputedStyle(document.body).width;
        
        // Prevent body scroll
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = "0";
        document.body.style.width = "100%";
        
        // Prevent iOS bounce scroll
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.position = "fixed";
        document.documentElement.style.width = "100%";
        
        return () => {
          document.body.style.overflow = originalOverflow;
          document.body.style.position = originalPosition;
          document.body.style.top = originalTop;
          document.body.style.width = originalWidth;
          document.documentElement.style.overflow = "";
          document.documentElement.style.position = "";
          document.documentElement.style.width = "";
        };
      }
    }
  }, [isOpen]);

  // Connect to socket when chat opens
  useEffect(() => {
    if (isOpen) {
      visitorSocketService.connect();

      // Set up callbacks for admin messages
      visitorSocketService.onAdminMessage((message) => {
        setMessages((prev) => {
          // Prevent duplicates - check by text, sender, and approximate time
          const messageTime = new Date(message.timestamp).getTime();
          const exists = prev.some((m) => {
            const existingTime = new Date(m.timestamp).getTime();
            const timeDiff = Math.abs(messageTime - existingTime);
            // Same text, sender, and within 5 seconds = duplicate
            return m.text === message.text &&
                   m.sender === message.sender &&
                   timeDiff < 5000;
          });
          if (exists) return prev;
          return [...prev, message];
        });
      });

      // Set up callback for admin typing indicator
      visitorSocketService.onAdminTyping((isTyping) => {
        setIsAdminTyping(isTyping);
      });
    }

    return () => {
      if (!isOpen) {
        // Don't disconnect immediately - user might reopen
      }
    };
  }, [isOpen]);

  // Join conversation room when we have a conversationId
  useEffect(() => {
    if (conversationId && isFormComplete) {
      visitorSocketService.setVisitorInfo(formData.name, formData.email);
      visitorSocketService.joinConversation(conversationId);
    }
  }, [conversationId, isFormComplete, formData.name, formData.email]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const savedConversationId = getConversationId();
      if (savedConversationId) {
        setIsLoading(true);
        const response = await getMessages(savedConversationId);
        if (response.success && response.messages) {
          setConversationId(savedConversationId);
          setMessages(transformMessages(response.messages));
          setIsFormComplete(true);
          if (response.visitor) {
            setFormData({
              name: response.visitor.name || "",
              email: response.visitor.email || "",
              phoneNumber: response.visitor.phoneNumber || "",
              isOrderRelated: response.visitor.isOrderRelated || "no",
              orderNumber: response.visitor.orderNumber || "",
            });
          }
        }
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  // Toggle chat open/close
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Close chat
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Reset chat completely
  const resetChat = useCallback(() => {
    setFormData(initialFormData);
    setMessages([]);
    setErrors({});
    setIsFormComplete(false);
    setInputValue("");
    setConversationId(null);
    clearChatSession();
    visitorSocketService.disconnect();
  }, []);

  // Update form field
  const updateFormField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }, []);

  // Add a message locally
  const addLocalMessage = useCallback((text: string, sender: "bot" | "user" | "admin") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Handle input change with typing indicator
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);

      // Emit typing event
      if (value.trim()) {
        visitorSocketService.emitTyping(value);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          visitorSocketService.emitStopTyping();
        }, 2000);
      } else {
        visitorSocketService.emitStopTyping();
      }
    },
    []
  );

  // Start conversation (submit form)
  const startConversation = useCallback(async () => {
    const validationErrors = validateForm(formData, isLoggedIn);
    setErrors(validationErrors);

    if (hasErrors(validationErrors)) {
      return false;
    }

    setIsLoading(true);

    try {
      const sessionId = getSessionId();
      const response = await createConversation(formData, undefined, sessionId);

      if (response.success && response.conversationId) {
        setConversationId(response.conversationId);
        saveConversationId(response.conversationId);
        setIsFormComplete(true);

        // Set visitor info for socket
        visitorSocketService.setVisitorInfo(formData.name, formData.email);

        // Emit new conversation event via socket
        visitorSocketService.emitNewConversation(response.conversationId, {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
        });

        if (response.messages) {
          setMessages(transformMessages(response.messages));
        } else {
          addLocalMessage(
            `Hi ${formData.name}! Thank you for providing your information. How can we help you today?`,
            "bot"
          );
        }
        return true;
      } else {
        setErrors({ form: response.message || "Failed to start conversation" });
        return false;
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      setErrors({ form: "Something went wrong. Please try again." });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [formData, isLoggedIn, addLocalMessage]);

  // Send a message (with optional files)
  const sendMessage = useCallback(async () => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || !conversationId) return;

    const messageText = inputValue.trim();
    const filesToSend = [...uploadedFiles];
    setInputValue("");
    setUploadedFiles([]);
    setIsSending(true);

    // Stop typing indicator
    visitorSocketService.emitStopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const response = await addMessageApi(conversationId, messageText, "user", filesToSend);

      if (response.success && response.messages) {
        // Get the new message from response (last one with attachments)
        const newMessage = response.newMessage;

        // Emit via socket with attachments for OTHER receivers (admin panel)
        visitorSocketService.emitMessage(messageText, newMessage?.attachments || []);

        // Update with server response to sync state (includes attachments)
        setMessages(transformMessages(response.messages));
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, conversationId, uploadedFiles]);

  // Handle key press in input
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return {
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
    resetChat,
    updateFormField,
    setInputValue: handleInputChange, // Use the new handler with typing events
    setUploadedFiles,
    startConversation,
    sendMessage,
    handleKeyPress,
  };
};
