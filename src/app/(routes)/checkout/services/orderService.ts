import { ShippingInformation, ContactInfo, Coupon, ProductItem, Errors } from '../../../../../types';
import { toast } from 'react-toastify';
import { api, CreateOrderRequest, CreateCheckoutSessionRequest } from '../api';

export interface ShippingMethodData {
  name: string;
  price: number;
  estimatedDays: string;
  methodId: string;
}

export interface OrderData {
  cart: ProductItem[];
  shippingInformation: ShippingInformation;
  contactInformation: ContactInfo;
  coupon?: Coupon | null;
  orderNumber?: string | null;
  status: string;
  shippingMethod?: ShippingMethodData | null;
}

export interface OrderResponse {
  status: number;
  message: string;
  order?: any;
  orderNumber?: string;
}

export class OrderService {
  static init(): OrderService {
    return new OrderService();
  }

  async createOrder(orderData: OrderData): Promise<OrderResponse | false> {
    try {
      const createOrderData: CreateOrderRequest = {
        cart: orderData.cart,
        shippingInformation: orderData.shippingInformation,
        contactInformation: orderData.contactInformation,
        coupon: orderData.coupon,
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        shippingMethod: orderData.shippingMethod,
      };

      console.log('📤 Sending order data:', {
        cartItemsCount: createOrderData.cart.length,
        hasShipping: !!createOrderData.shippingInformation,
        hasContact: !!createOrderData.contactInformation,
        hasCoupon: !!createOrderData.coupon,
        status: createOrderData.status,
        shippingMethod: createOrderData.shippingMethod?.name,
      });

      const response = await api.createOrder(createOrderData);

      console.log('📥 Order response:', response);

      if (response.status === 201) {
        // Store order data for thank-you page
        const orderForThankYou = {
          totalOrderValue: this.calculateDiscountedPrice(createOrderData.cart, createOrderData.coupon ?? null),
          orderNumber: response.orderNumber || Date.now().toString(),
          cart: createOrderData.cart.map((item: ProductItem) => ({
            productName: item.productName || item.name,
            productId: item._id,
            qty: item.qty,
            salePrice: item.salePrice,
          })),
        };
        localStorage.setItem('lastOrder', JSON.stringify(orderForThankYou));

        return response;
      } else {
        console.error('Order creation returned non-201 status:', response);
        return false;
      }
    } catch (error: any) {
      console.error('Order creation failed:', error);
      // Extract error message from axios error
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error details:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  async createCheckoutSession(
    cartProducts: ProductItem[],
    amount: number,
    coupon: Coupon | null,
    shippingInformation: ShippingInformation,
    contactInfo: ContactInfo,
    paymentIntentId?: string | null
  ): Promise<{ url: string; clientSecret: string; paymentIntentId?: string } | false> {
    try {
      const sessionData: CreateCheckoutSessionRequest = {
        cartproducts: cartProducts,
        paymentIntentId: paymentIntentId || null,
        amount,
        coupondata: coupon,
        shippingInformation,
        contactInformation: contactInfo,
      };

      const response = await api.createCheckoutSession(sessionData);

      if (!response.url || !response.clientSecret) {
        throw new Error('Invalid checkout session data received');
      }

      return response;
    } catch (error) {
      console.error('Checkout session creation failed:', error);
      return false;
    }
  }

  validateOrderData(
    shippingInformation: ShippingInformation,
    cartData: ProductItem[]
  ): Errors {
    const errors: Errors = {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      password: '',
      county: '',
      confirmPassword: '',
      email: '',
    };

    // Validate cart
    if (!cartData || cartData.length === 0) {
      errors.email = 'Your cart is empty';
      return errors;
    }

    // Shipping validation
    if (
      !shippingInformation.firstName ||
      !/^[a-zA-Z]+(?: [a-zA-Z]+)?$/.test(shippingInformation.firstName)
    ) {
      errors.firstName = 'Enter a valid first name';
    }

    if (
      !shippingInformation.lastName ||
      !/^[a-zA-Z]+(?: [a-zA-Z]+)?$/.test(shippingInformation.lastName)
    ) {
      errors.lastName = 'Enter a valid last name';
    }

    if (
      !shippingInformation.phoneNumber ||
      !/^(?:0|\+?44)(?:\d\s?){9,10}$/.test(shippingInformation.phoneNumber)
    ) {
      errors.phoneNumber = 'Enter a valid UK phone number';
    }

    if (!shippingInformation.address || shippingInformation.address.trim().length === 0) {
      errors.address = 'Enter a valid address';
    }

    if (
      !shippingInformation.postalCode ||
      !/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(shippingInformation.postalCode)
    ) {
      errors.postalCode = 'Enter a valid UK postal code';
    }

    return errors;
  }

  validateContactInformation(
    userState: { email: string; userId: string },
    contactInfo: ContactInfo,
    userInfo: ContactInfo
  ): ContactInfo | null {
    // Check localStorage first
    const userForOrder = this.getUserForOrder();
    if (userForOrder && userForOrder.email && userForOrder._id) {
      return { email: userForOrder.email, userId: userForOrder._id };
    }

    // Then check other sources
    if (this.validateEmailAndUserId(userState.email, userState.userId)) {
      return { email: userState.email, userId: userState.userId };
    }

    if (this.validateEmailAndUserId(contactInfo.email, contactInfo.userId)) {
      return contactInfo;
    }

    if (this.validateEmailAndUserId(userInfo.email, userInfo.userId)) {
      return userInfo;
    }

    return null;
  }

  private validateEmailAndUserId(email: string, userId: string): boolean {
    return !!(
      email &&
      email.trim() !== '' &&
      email.includes('@') &&
      userId &&
      userId.trim() !== ''
    );
  }

  private getUserForOrder(): { email: string; _id: string } | null {
    try {
      const userForOrder = JSON.parse(localStorage.getItem('userForOrder') || '{}');
      return userForOrder.email && userForOrder._id ? userForOrder : null;
    } catch {
      return null;
    }
  }

  private getCartFromStorage(): ProductItem[] {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch {
      return [];
    }
  }

  private calculateDiscountedPrice(products: ProductItem[], coupon: Coupon | null): number {
    let total = products.reduce((sum, product) => {
      return sum + parseFloat((product.salePrice * product.qty).toFixed(2));
    }, 0);

    if (coupon) {
      if (coupon.discount_type === 'flat') {
        total -= coupon.discount;
      } else if (coupon.discount_type === 'percentage') {
        const discountAmount = (total * coupon.discount) / 100;
        total -= coupon.upto ? Math.min(discountAmount, coupon.upto) : discountAmount;
      }
    }

    return Math.max(0, total);
  }

  // Google Analytics tracking helper
  trackPurchaseEvent(orderNumber: string, totalValue: number, cartItems: any[]): void {
    try {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: orderNumber,
          value: totalValue,
          currency: 'GBP',
          items: cartItems.map((item: any) => ({
            item_name: item.productName || item.name,
            item_id: item.productId || item._id,
            price: item.salePrice,
            quantity: item.qty,
          })),
        },
      });
      console.log('Google Analytics purchase event tracked:', orderNumber);
    } catch (error) {
      console.error('Failed to track purchase event:', error);
    }
  }

  // Helper methods for localStorage management
  storeOrderNumber(orderNumber: string): void {
    localStorage.setItem('createdOrderNumber', orderNumber);
  }

  getStoredOrderNumber(): string | null {
    return localStorage.getItem('createdOrderNumber');
  }

  storeUserForOrder(user: { email: string; _id: string }): void {
    localStorage.setItem('userForOrder', JSON.stringify(user));
  }

  clearOrderData(): void {
    localStorage.removeItem('clientSecret');
    localStorage.removeItem('cart');
    localStorage.removeItem('appliedcoupon');
    localStorage.removeItem('paymentIntentId');
    localStorage.removeItem('cart-old');
    localStorage.removeItem('createdOrderNumber');
    localStorage.removeItem('userForOrder');
  }
}