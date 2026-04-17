import axios from 'axios';
import { User, Coupon, ShippingInformation, ContactInfo, ProductItem } from '../../../../../types';


const API_URL: string = (process.env.NEXT_PUBLIC_API_URL || '').trim();

if (!API_URL) {
  console.error('NEXT_PUBLIC_API_URL is not defined in environment variables');
} else {
  console.log('API URL configured:', API_URL);
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  user: User;
  message?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  companyname: string;
  address: {
    address: string;
    apartment: string;
    country: string;
    city: string;
    county: string;
    postalCode: string;
  };
}

export interface RegisterResponse {
  status: number;
  message: string;
  user?: User;
}

// Coupon Types
export interface GetCouponsResponse {
  status: number;
  coupon: Coupon[];
  message?: string;
}

// Order Types
export interface ShippingMethodData {
  name: string;
  price: number;
  estimatedDays: string;
  methodId: string;
}

export interface CreateOrderRequest {
  cart: ProductItem[];
  shippingInformation: ShippingInformation;
  contactInformation: ContactInfo;
  coupon?: Coupon | null;
  orderNumber?: string | null;
  status: string;
  shippingMethod?: ShippingMethodData | null;
}

export interface CreateOrderResponse {
  status: number;
  message: string;
  order?: any;
  orderNumber?: string;
}

export interface CreateCheckoutSessionRequest {
  cartproducts: ProductItem[];
  paymentIntentId?: string | null;
  amount: number;
  coupondata?: Coupon | null;
  shippingInformation: ShippingInformation;
  contactInformation: ContactInfo;
}

export interface CreateCheckoutSessionResponse {
  url: string;
  clientSecret: string;
  paymentIntentId?: string;
}

// Payment Types
export interface StripeConfigResponse {
  publishableKey: string;
}

export interface RetrievePaymentDetailsRequest {
  sessionId: string;
}

export interface RetrievePaymentDetailsResponse {
  paymentIntentId: string;
  paymentMethodId?: string | null;
  cardDetails?: any;
}

export interface UpdateCheckoutSessionRequest {
  cartproducts: any[];
  paymentIntentId: string;
  coupondata?: any;
  shippingInformation: any;
  contactInformation: any;
}

export interface UpdateCheckoutSessionResponse {
  clientSecret: string;
  paymentIntentId?: string;
}

// Embedded Payment Intent Types
export interface CreatePaymentIntentRequest {
  cartproducts: ProductItem[];
  coupondata?: Coupon | null;
  shippingInformation: ShippingInformation;
  contactInformation: ContactInfo;
  orderNumber: string;
  isExpressCheckout?: boolean; // When true, backend skips setting shipping (allows Apple Pay/Google Pay)
  shippingMethod?: ShippingMethodData | null; // Selected shipping method with price
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  customerId: string;
  amount: number;
}

export interface RetrievePaymentIntentDetailsResponse {
  paymentIntentId: string;
  paymentMethodId?: string | null;
  status: string;
  amount: number;
  paymentType: string;
  cardDetails?: any;
}

export interface UpdatePaymentIntentMetadataRequest {
  paymentIntentId: string;
  orderNumber: string;
  email?: string;
  phoneNumber?: string;
  customerName?: string;
  shippingAddress?: string;
  shippingMethod?: {
    name: string;
    price: number;
    estimatedDays: string;
    methodId: string;
  } | null;
}

export interface UpdatePaymentIntentMetadataResponse {
  success: boolean;
  paymentIntentId: string;
  metadata: {
    orderNumber: string;
    email?: string;
    phoneNumber?: string;
    customerName?: string;
    shippingAddress?: string;
  };
}

export interface UpdatePaymentIntentAmountRequest {
  paymentIntentId: string;
  cartproducts: ProductItem[];
  coupondata?: Coupon | null;
  shippingMethod?: ShippingMethodData | null;
}

export interface UpdatePaymentIntentAmountResponse {
  success: boolean;
  paymentIntentId: string;
  amount: number;
  finalTotal: number;
  clientSecret: string;
}

// ============================================================================
// CONSOLIDATED API CLASS
// ============================================================================

export class CheckoutApi {
  private get baseUrl(): string {
    return API_URL;
  }

  // ============================================================================
  // AUTH METHODS
  // ============================================================================

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axios.post(`${this.baseUrl}/login`, data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await axios.post(`${this.baseUrl}/register`, data);
    return response.data;
  }

  // ============================================================================
  // COUPON METHODS
  // ============================================================================

  async getAllCoupons(): Promise<GetCouponsResponse> {
    const response = await axios.get(`${this.baseUrl}/get/all/coupons`);
    return response.data;
  }

  // ============================================================================
  // ORDER METHODS
  // ============================================================================

  async createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
    const response = await axios.post(`${this.baseUrl}/create/order`, data);
    return response.data;
  }

  async createCheckoutSession(data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> {
    const response = await fetch(`${this.baseUrl}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Checkout session creation failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  async getStripeConfig(): Promise<StripeConfigResponse> {
    const response = await fetch(`${this.baseUrl}/config`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Stripe config: ${response.statusText}`);
    }

    return response.json();
  }

  async retrievePaymentDetails(data: RetrievePaymentDetailsRequest): Promise<RetrievePaymentDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/retrieve-payment-details-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve payment details: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.cardDetails) {
      throw new Error('Required payment details not found in backend response.');
    }

    return result;
  }

  async updateCheckoutSession(data: UpdateCheckoutSessionRequest): Promise<UpdateCheckoutSessionResponse> {
    const response = await fetch(`${this.baseUrl}/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a PaymentIntent for embedded checkout (no redirect)
   * @param data - Cart products, coupon, shipping info, contact info, order number
   */
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    console.log('📤 Creating PaymentIntent with data:', {
      cartItemsCount: data.cartproducts?.length,
      hasOrderNumber: !!data.orderNumber,
      email: data.contactInformation?.email,
    });

    const response = await fetch(`${this.baseUrl}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ PaymentIntent creation failed:', response.status, errorData);
      throw new Error(errorData.error?.message || `Failed to create payment intent: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📥 PaymentIntent response:', {
      paymentIntentId: result.paymentIntentId,
      hasClientSecret: !!result.clientSecret,
      amount: result.amount,
    });

    return result;
  }

  /**
   * Update PaymentIntent metadata with order number (called after order is created)
   * This allows the webhook to find and update the correct order
   * @param data - paymentIntentId, orderNumber, email, phoneNumber
   */
  async updatePaymentIntentMetadata(data: UpdatePaymentIntentMetadataRequest): Promise<UpdatePaymentIntentMetadataResponse> {
    console.log('📝 Updating PaymentIntent metadata:', data.paymentIntentId, 'with orderNumber:', data.orderNumber);

    const response = await fetch(`${this.baseUrl}/update-payment-intent-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to update PaymentIntent metadata:', response.status, errorData);
      throw new Error(errorData.error || `Failed to update payment intent metadata: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ PaymentIntent metadata updated:', result);
    return result;
  }

  /**
   * Update PaymentIntent amount when shipping method changes
   * @param data - paymentIntentId, cartproducts, coupondata, shippingMethod
   */
  async updatePaymentIntentAmount(data: UpdatePaymentIntentAmountRequest): Promise<UpdatePaymentIntentAmountResponse> {
    console.log('💰 Updating PaymentIntent amount:', data.paymentIntentId, 'shipping:', data.shippingMethod?.price);

    const response = await fetch(`${this.baseUrl}/update-payment-intent-amount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Failed to update PaymentIntent amount:', response.status, errorData);
      throw new Error(errorData.error || `Failed to update payment amount: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ PaymentIntent amount updated:', result);
    return result;
  }

  /**
   * Retrieve payment details from a PaymentIntent after successful payment
   * @param paymentIntentId - The Stripe PaymentIntent ID
   */
  async retrievePaymentDetailsFromPaymentIntent(paymentIntentId: string): Promise<RetrievePaymentIntentDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/retrieve-payment-details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Failed to retrieve payment details: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // ADDITIONAL PAYMENT & ORDER METHODS
  // ============================================================================

  /**
   * Retrieve payment details from Stripe session after successful payment
   * @param sessionId - The Stripe session ID
   */
  async retrievePaymentDetailsFromSession(sessionId: string): Promise<RetrievePaymentDetailsResponse> {
    const response = await fetch(`${this.baseUrl}/retrieve-payment-details-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve payment details: ${response.statusText}`);
    }

    const paymentData = await response.json();

    return {
      paymentIntentId: paymentData.paymentIntentId,
      paymentMethodId: paymentData.paymentMethodId || null,
      cardDetails: paymentData.cardDetails,
    };
  }

  /**
   * Update order status to Pending after successful payment
   * @param orderData - Complete order data including payment details
   */
  async updateOrderAfterPayment(orderData: {
    cart: any[];
    shippingInformation: any;
    contactInformation: any;
    coupon?: any;
    paymentDetails: any;
    orderNumber: string;
    status: string;
  }): Promise<CreateOrderResponse> {
    const response = await axios.post(`${this.baseUrl}/create/order`, orderData);

    if (!response ) {
      throw new Error(`Failed to update order`);
    }

    return response.data;
  }
}

// Shipping Types
export interface ShippingMethod {
  _id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  isActive: boolean;
  order: number;
}

export interface GetShippingMethodsResponse {
  success: boolean;
  data: {
    methods: ShippingMethod[];
    freeShippingThreshold: number | null;
    freeShippingEnabled: boolean;
  };
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const api = new CheckoutApi();

// ============================================================================
// SHIPPING API
// ============================================================================

export const getActiveShippingMethods = async (): Promise<GetShippingMethodsResponse> => {
  const response = await fetch(`${API_URL}/shipping/methods/active`);
  if (!response.ok) {
    throw new Error('Failed to fetch shipping methods');
  }
  return response.json();
};
