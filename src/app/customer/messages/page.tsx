"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
} from "react";
import { useAuth } from "@/app/context/Auth";
import { useSearchParams } from "next/navigation";
import axios from "axios";

// Layout Components
import Top from "@/app/customer/components/TopBar";
import Sidebar from "@/app/customer/components/Sidebar";

// Services
import {
  fetchConversations as fetchConversationsService,
  fetchMessagesByConversation as fetchMessagesByConversationService,
  sendMessage as sendMessageService,
  mapMessageAttachments,
  sortMessagesByDate,
  hasNewMessages as checkHasNewMessages,
} from "./service";

// Socket.IO
import {
  initializeSocket,
  disconnectSocket,
  joinUserRoom,
  joinConversation,
  leaveConversation,
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
} from "./socket";

// Utilities
import { playNotificationSound } from "./utils/notificationSound";

// Components
import {
  ChatHeader,
  MessageList,
  ChatInput,
  FilePreviewModal,
  OrderSelectionPanel,
  OrderDetailsBanner,
} from "./components/chatComponents";

import { ConversationList } from "./components/conversationComponents";

// Types
import type {
  MessageType,
  FileType,
  ConversationType,
  UserOrder,
} from "./types";

/**
 * Messages Component
 * Main page for customer messaging with conversation list
 */
export default function Messages() {
  const auth = useAuth();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConversationListOpen, setIsConversationListOpen] = useState(false);

  // Conversation state
  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Message state
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);

  // Order selection state
  const [showOrderSelection, setShowOrderSelection] = useState(false);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedOrderIdRef = useRef<string | null>(null);

  /**
   * Scroll to the bottom of the message container
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /**
   * Fetch all conversations
   */
  const fetchConversations = useCallback(async () => {
    try {
      const senderId = auth?.user?._id;
      if (!senderId) {
        console.error("No sender ID available");
        return;
      }

      setIsLoadingConversations(true);
      const result = await fetchConversationsService(senderId);

      if (result.success && result.conversations) {
        setConversations(result.conversations);

        // Auto-select conversation from URL params or first conversation
        const orderIdParam = searchParams?.get("orderId");
        if (orderIdParam && result.conversations.length > 0) {
          const matchingConversation = result.conversations.find(
            (conv) => conv.orderId === orderIdParam
          );
          if (matchingConversation) {
            setSelectedConversationId(matchingConversation.conversationId);
            setSelectedOrderId(matchingConversation.orderId || null);
          } else {
            // If the order doesn't have a conversation yet, create a new conversation
            setSelectedOrderId(orderIdParam);
            setSelectedConversationId(orderIdParam); // Use orderId as conversationId for new conversations
          }
        } else if (result.conversations.length > 0 && !selectedConversationId) {
          // Select first conversation if none selected
          const firstConv = result.conversations[0];
          setSelectedConversationId(firstConv.conversationId);
          setSelectedOrderId(firstConv.orderId || null);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [auth?.user?._id, searchParams, selectedConversationId]);

  /**
   * Fetch user orders for order selection
   */
  const fetchUserOrders = useCallback(async () => {
    try {
      const userId = auth?.user?._id;
      if (!userId) return;

      setIsLoadingOrders(true);
      const response = await axios.post(`${auth.ip}get/order/user`, { userId });

      if (response.data.status === 201 && response.data.orders) {
        // Sort orders by date (newest first)
        const sortedOrders = response.data.orders.sort(
          (a: UserOrder, b: UserOrder) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setUserOrders(sortedOrders);
      }
    } catch (error) {
      console.error("Error fetching user orders:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [auth?.user?._id, auth?.ip]);

  /**
   * Fetch messages for selected conversation
   */
  const fetchMessages = useCallback(
    async (showLoading = true) => {
      try {
        const senderId = auth?.user?._id;
        if (!senderId || !selectedConversationId) {
          return;
        }

        if (showLoading) {
          setIsFetching(true);
        }

        const result = await fetchMessagesByConversationService(
          senderId,
          selectedOrderId || "general"
        );

        if (result.success && result.messages) {
          // Sort and map attachments
          let processedMessages = sortMessagesByDate(result.messages);
          processedMessages = mapMessageAttachments(processedMessages);

          // Check if we have new messages to avoid unnecessary re-renders
          const hasNew = checkHasNewMessages(messages, processedMessages);

          if (hasNew || messages.length !== processedMessages.length) {
            setMessages(processedMessages);
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        if (showLoading) {
          setIsFetching(false);
        }
      }
    },
    [auth?.user?._id, selectedConversationId, selectedOrderId, messages]
  );

  /**
   * Handle conversation selection
   */
  const handleConversationSelect = (conversationId: string) => {
    const conversation = conversations.find(
      (c) => c.conversationId === conversationId
    );
    if (conversation) {
      setShowOrderSelection(false); // Hide order selection panel
      setSelectedConversationId(conversationId);
      setSelectedOrderId(conversation.orderId || null);
      // Find order details from userOrders if available
      const order = userOrders.find((o) => o._id === conversation.orderId);
      setSelectedOrder(order || null);
      setMessages([]); // Clear messages when switching conversation
      setIsConversationListOpen(false); // Close conversation list on mobile after selection
    }
  };

  /**
   * Handle new chat - show order selection panel
   */
  const handleNewChat = () => {
    setShowOrderSelection(true);
    setSelectedConversationId(null);
    setSelectedOrderId(null);
    setMessages([]);
    fetchUserOrders();
    setIsConversationListOpen(false); // Close conversation list on mobile
  };

  /**
   * Handle order selection from order panel
   */
  const handleOrderSelect = (order: UserOrder) => {
    setShowOrderSelection(false);
    setSelectedConversationId(order._id);
    setSelectedOrderId(order._id);
    setSelectedOrder(order);
    setMessages([]);
    setIsConversationListOpen(false); // Close conversation list on mobile
  };

  /**
   * Handle starting general chat from order panel
   */
  const handleStartGeneralChat = () => {
    setShowOrderSelection(false);
    setSelectedConversationId("general");
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setMessages([]);
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    }
  };

  /**
   * Send message to backend
   */
  const handleSendMessage = async () => {
    if (!newMessageText.trim() && selectedFiles.length === 0) return;

    setIsLoading(true);

    try {
      const senderId = auth?.user?._id;
      if (!senderId) {
        console.error("No sender ID available");
        return;
      }

      // Create optimistic message with temp ID prefix
      const tempId = `temp_${Date.now()}`;
      const tempMessage: MessageType = {
        _id: tempId,
        message: newMessageText,
        sender: senderId,
        createdAt: new Date().toISOString(),
        files: selectedFiles.map((file) => ({
          url: URL.createObjectURL(file),
          name: file.name,
          type: file.type,
        })),
      };

      // Optimistically update UI
      setMessages((prev) => [...prev, tempMessage]);
      setNewMessageText("");
      setSelectedFiles([]);

      // Send to backend with orderId
      const result = await sendMessageService(
        senderId,
        newMessageText,
        selectedFiles,
        selectedOrderId || undefined
      );

      if (!result.success) {
        console.error("Failed to send message:", result.error);
        // Remove temp message if sending failed
        setMessages((prev) =>
          prev.filter((msg) => msg._id && msg._id !== tempId)
        );
      } else {
        // Message sent successfully
        // Keep optimistic message - socket will deliver real message
        // Socket listener will remove temp messages and add real one
        await fetchConversations();
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle file preview
   */
  const handlePreview = (file: FileType) => {
    setPreviewFile(file);
  };

  /**
   * Close preview modal
   */
  const closePreview = () => {
    setPreviewFile(null);
  };

  /**
   * Remove selected file
   */
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial conversation fetch
  useEffect(() => {
    if (auth?.user?._id) {
      fetchConversations();
    }
  }, [auth?.user?._id, fetchConversations]);

  // Keep ref updated with latest selectedOrderId
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
  }, [selectedOrderId]);

  // Initialize Socket.IO and set up real-time messaging
  useEffect(() => {
    const userId = auth?.user?._id;
    if (!userId) return;

    // Initialize socket connection
    initializeSocket();

    // Join user's personal room
    joinUserRoom(userId);

    // Listen for new messages
    const cleanup = onNewMessage((newMessage) => {
      console.log("📨 Received new message:", newMessage);

      // Play notification sound if message is from admin (not from self)
      if (newMessage.sender !== userId) {
        playNotificationSound();
      }

      // Check if message belongs to current conversation (use ref for latest value)
      const messageOrderId = newMessage.orderId || "general";
      const currentOrderId = selectedOrderIdRef.current || "general";

      if (messageOrderId === currentOrderId) {
        // Remove temp messages and add real message
        setMessages((prevMessages) => {
          // Remove any temp messages (optimistic updates)
          const withoutTemp = prevMessages.filter(
            (msg) => msg._id && !msg._id.startsWith("temp_")
          );

          // Check if real message already exists
          const exists = withoutTemp.some(
            (msg) => msg._id && msg._id === newMessage._id
          );
          if (!exists) {
            // Process attachments to get full URLs
            const processedMessages = mapMessageAttachments([
              ...withoutTemp,
              newMessage,
            ]);
            return sortMessagesByDate(processedMessages);
          }
          return withoutTemp;
        });
      }

      // Refresh conversations to update last message and unread counts
      fetchConversations();
    });

    // Listen for message updates
    const cleanupUpdates = onMessageUpdated((updatedMessage) => {
      console.log("📝 Received message update:", updatedMessage);

      // Update the message in the current conversation
      setMessages((prevMessages) =>
        prevMessages.map((msg) => {
          // Compare _id as strings to handle ObjectId
          const msgId = msg._id?.toString() || msg._id;
          const updatedId =
            updatedMessage._id?.toString() || updatedMessage._id;

          if (msgId === updatedId) {
            return {
              ...msg,
              message: updatedMessage.message,
              edited: true,
              editedAt: updatedMessage.editedAt,
            };
          }
          return msg;
        })
      );
    });

    // Listen for message deletions
    const cleanupDeletes = onMessageDeleted((data) => {
      console.log("🗑️ Received message deletion:", data);

      // Remove the message from the current conversation
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => {
          const msgId = msg._id?.toString() || msg._id;
          return msgId !== data.messageId;
        })
      );

      // Refresh conversations to update last message
      fetchConversations();
    });

    // Cleanup on unmount
    return () => {
      cleanup();
      cleanupUpdates();
      cleanupDeletes();
      disconnectSocket();
    };
  }, [auth?.user?._id, fetchConversations]);

  // Fetch messages and join conversation when conversation changes
  useEffect(() => {
    const userId = auth?.user?._id;
    if (selectedConversationId && userId) {
      // Fetch initial messages
      fetchMessages();

      // Leave previous conversation and join new one
      if (selectedOrderId) {
        joinConversation(userId, selectedOrderId);

        // Cleanup: leave conversation when component unmounts or conversation changes
        return () => {
          leaveConversation(userId, selectedOrderId);
        };
      }
    }
  }, [selectedConversationId, selectedOrderId, auth?.user?._id, fetchMessages]);

  const getSelectedConversation = () => {
    if (!selectedConversationId) return null;
    return conversations.find(
      (c) => c.conversationId === selectedConversationId
    );
  };

  const selectedConversation = getSelectedConversation();

  return (
    <>
      <Sidebar
        selectedPage="Messages"
        setSelectedPage={() => null}
        isSidebarOpen={isSidebarOpen}
        closeSidebar={() => setIsSidebarOpen(false)}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className={`lg:pl-72 ${isSidebarOpen ? "pl-0" : ""}`}>
        <Top
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          selectedPage="Messages"
          setSelectedPage={() => null}
        />

        <main className="py-3 sm:py-5 px-3 sm:px-5">
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden h-[calc(100vh-7rem)] sm:h-[70vh] flex relative">
            {/* Left Sidebar - Conversation List */}
            <div
              className={`
              absolute sm:relative inset-0 sm:inset-auto
              w-full sm:w-80 flex-shrink-0 overflow-hidden
              bg-white z-50 sm:z-auto
              transform transition-transform duration-300 ease-in-out
              ${
                isConversationListOpen
                  ? "translate-x-0"
                  : "-translate-x-full sm:translate-x-0"
              }
            `}
            >
              <ConversationList
                conversations={conversations}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleConversationSelect}
                onNewChat={handleNewChat}
                isLoading={isLoadingConversations}
                onClose={() => setIsConversationListOpen(false)}
              />
            </div>

            {/* Overlay for mobile when conversation list is open */}
            {isConversationListOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
                onClick={() => setIsConversationListOpen(false)}
              />
            )}

            {/* Right Side - Chat Window */}
            <div className="flex-1 flex flex-col min-w-0">
              {showOrderSelection ? (
                <OrderSelectionPanel
                  orders={userOrders}
                  isLoading={isLoadingOrders}
                  onSelectOrder={handleOrderSelect}
                  onStartGeneralChat={handleStartGeneralChat}
                />
              ) : selectedConversationId ? (
                <>
                  {selectedOrder ? (
                    <OrderDetailsBanner
                      order={selectedOrder}
                      onBackClick={() => setIsConversationListOpen(true)}
                    />
                  ) : (
                    <ChatHeader
                      title={
                        selectedConversation?.orderNumber
                          ? `Order #${selectedConversation.orderNumber}`
                          : "General Chat"
                      }
                      onBackClick={() => setIsConversationListOpen(true)}
                    />
                  )}

                  <MessageList
                    messages={messages}
                    currentUserId={auth?.user?._id}
                    isFetching={isFetching}
                    onPreview={handlePreview}
                    messagesEndRef={messagesEndRef}
                  />

                  <ChatInput
                    messageText={newMessageText}
                    onMessageChange={setNewMessageText}
                    onSend={handleSendMessage}
                    onFileSelect={handleFileSelect}
                    selectedFiles={selectedFiles}
                    onRemoveFile={removeSelectedFile}
                    onPreview={handlePreview}
                    isLoading={isLoading}
                    fileInputRef={fileInputRef}
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
                  <div className="text-center">
                    <svg
                      className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">
                      No conversation selected
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-gray-500">
                      Choose a conversation from the list or start a new one
                    </p>
                    <button
                      onClick={() => setIsConversationListOpen(true)}
                      className="mt-4 sm:hidden inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                    >
                      View Conversations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <FilePreviewModal file={previewFile} onClose={closePreview} />
        </main>
      </div>
    </>
  );
}
