import { io, Socket } from "socket.io-client";
import type { Message, Attachment } from "../types";

const BACKEND_URL = `${process.env.NEXT_PUBLIC_API_URL}`;

class VisitorSocketService {
  private socket: Socket | null = null;
  private conversationId: string | null = null;
  private visitorName: string = "";
  private visitorEmail: string = "";

  // Callbacks
  private onAdminMessageCallback: ((message: Message) => void) | null = null;
  private onAdminTypingCallback: ((isTyping: boolean) => void) | null = null;

  /**
   * Connect to the socket server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(`${BACKEND_URL}/visitor-chat`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🟢 Connected to visitor chat socket");
      // Rejoin conversation if we have one
      if (this.conversationId) {
        this.joinConversation(this.conversationId);
      }
    });

    this.socket.on("disconnect", () => {
      console.log("🔴 Disconnected from visitor chat socket");
    });

    // Listen for admin messages (with attachments)
    this.socket.on("admin:new-message", (data) => {
      console.log("📩 Admin message received:", data);
      if (this.onAdminMessageCallback && data.conversationId === this.conversationId) {
        const message: Message = {
          id: `msg-${Date.now()}`,
          text: data.message,
          sender: "admin",
          timestamp: new Date(data.createdAt),
          attachments: data.attachments || [],
        };
        this.onAdminMessageCallback(message);
      }
    });

    // Listen for admin typing
    this.socket.on("admin:typing", (data) => {
      if (this.onAdminTypingCallback && data.conversationId === this.conversationId) {
        this.onAdminTypingCallback(true);
      }
    });

    this.socket.on("admin:stop-typing", (data) => {
      if (this.onAdminTypingCallback && data.conversationId === this.conversationId) {
        this.onAdminTypingCallback(false);
      }
    });
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Set visitor info
   */
  setVisitorInfo(name: string, email: string): void {
    this.visitorName = name;
    this.visitorEmail = email;
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.conversationId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit("visitor:join", conversationId);
    }
  }

  /**
   * Notify about new conversation
   */
  emitNewConversation(conversationId: string, visitor: { name: string; email: string; phoneNumber: string }): void {
    this.conversationId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit("visitor:new-conversation", {
        conversationId,
        visitor,
      });
    }
  }

  /**
   * Emit typing event with the text being typed
   */
  emitTyping(text: string): void {
    if (this.socket?.connected && this.conversationId) {
      this.socket.emit("visitor:typing", {
        conversationId: this.conversationId,
        text,
        visitorName: this.visitorName,
      });
    }
  }

  /**
   * Emit stop typing event
   */
  emitStopTyping(): void {
    if (this.socket?.connected && this.conversationId) {
      this.socket.emit("visitor:stop-typing", {
        conversationId: this.conversationId,
      });
    }
  }

  /**
   * Emit new message (with optional attachments)
   */
  emitMessage(message: string, attachments: Attachment[] = []): void {
    if (this.socket?.connected && this.conversationId) {
      this.socket.emit("visitor:new-message", {
        conversationId: this.conversationId,
        message,
        visitorName: this.visitorName,
        visitorEmail: this.visitorEmail,
        attachments,
      });
    }
  }

  /**
   * Set callback for admin messages
   */
  onAdminMessage(callback: (message: Message) => void): void {
    this.onAdminMessageCallback = callback;
  }

  /**
   * Set callback for admin typing indicator
   */
  onAdminTyping(callback: (isTyping: boolean) => void): void {
    this.onAdminTypingCallback = callback;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Export singleton instance
export const visitorSocketService = new VisitorSocketService();
