import { loadStripe, Stripe } from '@stripe/stripe-js';
import { api, RetrievePaymentDetailsRequest } from '../api';

export interface PaymentDetails {
  paymentIntentId: string;
  paymentMethodId?: string | null;
  cardDetails?: any;
}

export class PaymentService {
  private stripePromise: Promise<Stripe | null> | null = null;

  static init(): PaymentService {
    return new PaymentService();
  }

  async initializeStripe(): Promise<Stripe | null> {
    if (!this.stripePromise) {
      this.stripePromise = this.fetchStripePromise();
    }
    return this.stripePromise;
  }

  private async fetchStripePromise(): Promise<Stripe | null> {
    try {
      const response = await api.getStripeConfig();
      return await loadStripe(response.publishableKey);
    } catch (error) {
      console.error('Failed to load Stripe:', error);
      return null;
    }
  }

  async retrievePaymentDetails(sessionId: string): Promise<PaymentDetails | null> {
    try {
      const requestData: RetrievePaymentDetailsRequest = { sessionId };
      const response = await api.retrievePaymentDetails(requestData);

      return {
        paymentIntentId: response.paymentIntentId,
        paymentMethodId: response.paymentMethodId || null,
        cardDetails: response.cardDetails,
      };
    } catch (error) {
      console.error('Error retrieving payment details:', error);
      return null;
    }
  }

  getPaymentSuccessFromURL(): { isSuccess: boolean; sessionId: string | null } {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentSuccess = queryParams.get('payment_success');
    const sessionId = queryParams.get('session_id');

    return {
      isSuccess: paymentSuccess === 'true',
      sessionId: sessionId,
    };
  }

  storeClientSecret(clientSecret: string): void {
    localStorage.setItem('clientSecret', clientSecret);
  }

  getStoredClientSecret(): string | null {
    return localStorage.getItem('clientSecret');
  }

  storePaymentIntentId(paymentIntentId: string): void {
    localStorage.setItem('paymentIntentId', paymentIntentId);
  }

  getStoredPaymentIntentId(): string | null {
    return localStorage.getItem('paymentIntentId');
  }

  clearPaymentData(): void {
    localStorage.removeItem('clientSecret');
    localStorage.removeItem('paymentIntentId');
  }

  async updateCheckoutSession(
    cartProducts: any[],
    coupon: any = null,
    shippingInformation: any,
    contactInfo: any
  ): Promise<void> {
    const paymentIntentId = this.getStoredPaymentIntentId();

    if (paymentIntentId && cartProducts.length > 0) {
      try {
        const response = await api.updateCheckoutSession({
          cartproducts: cartProducts,
          paymentIntentId,
          coupondata: coupon,
          shippingInformation,
          contactInformation: contactInfo,
        });

        this.storeClientSecret(response.clientSecret);

        if (response.paymentIntentId) {
          this.storePaymentIntentId(response.paymentIntentId);
        }
      } catch (error) {
        console.error('Error updating checkout session:', error);
      }
    }
  }
}