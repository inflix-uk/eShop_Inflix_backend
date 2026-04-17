// Types for ChatWidget

export interface Attachment {
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface Message {
  id: string;
  text: string;
  sender: "bot" | "user" | "admin";
  timestamp: Date;
  createdAt?: Date;
  attachments?: Attachment[];
}

export interface FormData {
  isOrderRelated: string;
  orderNumber: string;
  name: string;
  phoneNumber: string;
  email: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface VisitorInfo {
  name: string;
  email: string;
  phoneNumber: string;
  isOrderRelated?: string;
  orderNumber?: string;
}

export interface ConversationResponse {
  success: boolean;
  message?: string;
  conversationId?: string;
  messages?: ApiMessage[];
  visitor?: VisitorInfo;
  newMessage?: ApiMessage;
}

export interface ApiMessage {
  _id?: string;
  text: string;
  sender: "bot" | "user" | "admin";
  createdAt: string | Date;
  attachments?: Attachment[];
}

export interface ChatState {
  isOpen: boolean;
  isFormComplete: boolean;
  isLoading: boolean;
  isSending: boolean;
  conversationId: string | null;
  messages: Message[];
  formData: FormData;
  errors: FormErrors;
  inputValue: string;
}

export type ChatAction =
  | { type: "TOGGLE_OPEN" }
  | { type: "CLOSE" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SENDING"; payload: boolean }
  | { type: "SET_FORM_COMPLETE"; payload: boolean }
  | { type: "SET_CONVERSATION_ID"; payload: string }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_FORM"; payload: Partial<FormData> }
  | { type: "SET_ERRORS"; payload: FormErrors }
  | { type: "CLEAR_ERROR"; payload: string }
  | { type: "SET_INPUT"; payload: string }
  | { type: "RESET" };
