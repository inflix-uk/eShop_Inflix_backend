export interface OrderItem {
  _id: string;
  qty: number;
  Price: number;
  salePrice: number;
  productName: string;
  variantImages?: { path: string }[];
  productthumbnail?: { path: string };
  name: string;
  metaDescription?: string;
}

export interface Order {
  _id: string;
  createdAt: string;
  orderNumber: string;
  cart: OrderItem[];
  status: string;
  coupon?: string[];
  totalOrderValue: number;
  shippingDetails?: {
    provider?: string;
    trackingNumber?: string;
  };
  contactDetails?: {
    userId: string;
    email: string;
  };
}
