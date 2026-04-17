import type { FormData, ConversationResponse, ApiMessage } from "../types";

const BACKEND_URL =  `${process.env.NEXT_PUBLIC_API_URL}`;

/**
 * Create a new conversation or add to existing one
 */
export const createConversation = async (
  formData: FormData,
  message?: string,
  sessionId?: string
): Promise<ConversationResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/visitor-messages/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        isOrderRelated: formData.isOrderRelated,
        orderNumber: formData.isOrderRelated === "yes" ? formData.orderNumber : null,
        message,
        sessionId,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating conversation:", error);
    return {
      success: false,
      message: "Failed to start conversation. Please try again.",
    };
  }
};

/**
 * Add a message to an existing conversation (with optional files)
 */
export const addMessage = async (
  conversationId: string,
  message: string,
  sender: "user" | "bot" = "user",
  files: File[] = []
): Promise<ConversationResponse> => {
  try {
    const formData = new window.FormData();
    formData.append("message", message);
    formData.append("sender", sender);

    // Append files if any
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(`${BACKEND_URL}/visitor-messages/${conversationId}/message`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error adding message:", error);
    return {
      success: false,
      message: "Failed to send message. Please try again.",
    };
  }
};

/**
 * Get conversation by session ID (to resume existing chat)
 */
export const getConversationBySession = async (
  sessionId: string
): Promise<ConversationResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/visitor-messages/session/${sessionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return {
      success: false,
      message: "No active conversation found.",
    };
  }
};

/**
 * Get messages for a specific conversation
 */
export const getMessages = async (conversationId: string): Promise<ConversationResponse> => {
  try {
    const response = await fetch(`${BACKEND_URL}/visitor-messages/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return {
      success: false,
      message: "Failed to load messages.",
    };
  }
};

/**
 * Transform API messages to frontend Message format
 */
export const transformMessages = (apiMessages: ApiMessage[]) => {
  return apiMessages.map((msg, index) => ({
    id: msg._id || `msg-${index}-${Date.now()}`,
    text: msg.text,
    sender: msg.sender,
    timestamp: new Date(msg.createdAt),
    attachments: msg.attachments || [],
  }));
};
