// Order Types for My Orders Module

export interface OrderItem {
  _id: string;
  productId?: string;
  qty: number;
  Price: number;
  salePrice: number;
  productName: string;
  name: string;
  variantImages?: { path: string }[];
  productthumbnail?: { path: string };
  metaDescription?: string;
  SKU?: string;
  EIN?: string;
  selectedSim?: string;
  image?: string;
}

export interface ShippingDetails {
  provider?: string;
  trackingNumber?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface ReturnOrderLabel {
  _id: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
}

export interface Order {
  _id: string;
  createdAt: string;
  orderNumber: string;
  cart: OrderItem[];
  status: OrderStatus;
  coupon?: string[];
  totalOrderValue: number;
  shippingDetails?: ShippingDetails;
  // Return tracking fields
  returnRequestInitiated?: boolean;
  returnRequestId?: string;
  returnRequestInitiatedAt?: string;
  returnOrderId?: string;
  returnOrderConvertedAt?: string;
  returnOrderLabel?: ReturnOrderLabel;
}

export type OrderStatus =
  | 'Pending'
  | 'Approved'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded'
  | 'Failed';

export interface ImageFile {
  id: string;
  file: File;
}

// API Response types
export interface GetOrdersResponse {
  status: number;
  orders: Order[];
  message?: string;
}

export interface ReturnItemResponse {
  status: number;
  message: string;
  requestOrder?: {
    _id: string;
    requestOrderNumber: string;
  };
}

// Utility types for order calculations
export interface OrderCalculations {
  regularItems: OrderItem[];
  totalItems: number;
  saleAmount: number;
  datePlaced: string;
  timePlaced: string;
}
