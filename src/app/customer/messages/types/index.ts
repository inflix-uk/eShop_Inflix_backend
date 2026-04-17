/**
 * TypeScript Interfaces for Customer Messages
 */

export interface Address {
  address: string;
  apartment: string;
  country: string;
  city: string;
  county: string;
  postalCode: string;
}

export interface UserDetails {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  dateofbirth: string | null;
  password: string;
  phoneNumber: string;
  address: Address;
  companyname: string;
  role: string;
  createdAt: string;
  __v: number;
  registerForApp: boolean;
}

export interface ImageInfo {
  filename: string;
  path: string;
}

export interface OrderItem {
  _id: string;
  productId: string;
  qty: number;
  Price: number;
  salePrice: number;
  productName: string;
  variantImages?: ImageInfo[];
  productthumbnail?: ImageInfo;
  name: string;
  metaDescription?: string;
  metaImage?: ImageInfo;
  metaTitle?: string;
  metaKeywords?: string;
  metaSchemas?: any[];
  Cost: number | null;
  Quantity: number;
  SKU: string;
  EIN: string;
  MPN: string | null;
  selectedSim: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discount_type: string;
  discount: number;
  usage: number;
  used: number;
  expiryDate: string;
  upto: number;
  status: number;
  __v: number;
}

export interface ShippingDetails {
  firstName: string;
  lastName: string;
  companyName: string;
  address: string;
  apartment: string;
  country: string;
  city: string;
  county: string;
  postalCode: string;
  phoneNumber: string;
  provider?: string;
  trackingNumber?: string;
}

export interface ContactDetails {
  email: string;
  userId: string;
}

export interface OrderID {
  _id: string;
  orderNumber: string;
  cart: OrderItem[];
  coupon?: Coupon[];
  shippingDetails: ShippingDetails;
  contactDetails: ContactDetails;
  status: string;
  isdeleted: boolean;
  totalOrderValue: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface RequestOrder {
  _id: string;
  userId: UserDetails;
  orderId: OrderID;
  status: string;
  reason: string;
  notes: string;
  files: ImageInfo[];
  createdAt: string;
  updatedAt: string;
  requestOrderNumber: string;
  __v: number;
}

export interface FileType {
  url: string;
  name: string;
  type: string;
}

export interface MessageAttachment {
  filename: string;
  path: string;
  mimetype: string;
  _id: string;
}

export interface MessageType {
  _id?: string;
  message?: string;
  files?: FileType[];
  attachments?: MessageAttachment[];
  requestOrder?: RequestOrder;
  readStatus?: boolean;
  isdeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sender?: string;
}

export interface ConversationType {
  conversationId: string;
  orderId?: string;
  orderNumber?: string;
  orderStatus?: string;
  returnOrderId?: string;
  returnOrderNumber?: string;
  returnOrderStatus?: string;
  isReturnOrder?: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  hasAttachments: boolean;
}

export interface ApiResponse {
  success: boolean;
  messages?: MessageType[];
  message?: string;
  conversations?: ConversationType[];
}

export interface UserOrder {
  _id: string;
  orderNumber: string;
  cart: OrderItem[];
  coupon?: Coupon[];
  shippingDetails?: ShippingDetails;
  contactDetails?: ContactDetails;
  status: string;
  isdeleted?: boolean;
  totalOrderValue: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UserReturnOrder {
  _id: string;
  returnOrderNumber: string;
  orderId: {
    _id: string;
    orderNumber: string;
    cart: OrderItem[];
    totalOrderValue: number;
  } | null;
  status: string;
  reason: string;
  notes?: string;
  files?: ImageInfo[];
  createdAt: string;
  updatedAt?: string;
}
