// Export the consolidated API class and singleton instance
export { CheckoutApi, api, getActiveShippingMethods } from './api';

// Export all types
export type {
  // Auth Types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,

  // Coupon Types
  GetCouponsResponse,

  // Order Types
  CreateOrderRequest,
  CreateOrderResponse,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,

  // Payment Types
  StripeConfigResponse,
  RetrievePaymentDetailsRequest,
  RetrievePaymentDetailsResponse,
  UpdateCheckoutSessionRequest,
  UpdateCheckoutSessionResponse,

  // Shipping Types
  ShippingMethod,
  GetShippingMethodsResponse,
} from './api';