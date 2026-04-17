const SESSION_KEY = "zextons_chat_session";
const CONVERSATION_KEY = "zextons_chat_conversation";

/**
 * Generate a unique session ID
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Get or create a session ID
 */
export const getSessionId = (): string => {
  if (typeof window === "undefined") return generateSessionId();

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Save conversation ID to session storage
 */
export const saveConversationId = (conversationId: string): void => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CONVERSATION_KEY, conversationId);
  }
};

/**
 * Get saved conversation ID
 */
export const getConversationId = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CONVERSATION_KEY);
};

/**
 * Clear chat session data
 */
export const clearChatSession = (): void => {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(CONVERSATION_KEY);
  }
};

/**
 * Format message time for display
 */
export const formatMessageTime = (date: Date | string): string => {
  const messageDate = new Date(date);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
