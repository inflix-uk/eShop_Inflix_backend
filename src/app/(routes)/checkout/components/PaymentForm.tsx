"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  PaymentElement,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";

interface PaymentFormProps {
  onPaymentSuccess: (paymentIntent: any) => void;
  totalAmount: number;
  isProcessing?: boolean;
  onBeforePayment?: () => Promise<{ success: boolean; error?: string }>;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  onPaymentSuccess,
  totalAmount,
  isProcessing: externalProcessing = false,
  onBeforePayment,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaymentElementComplete, setIsPaymentElementComplete] = useState<boolean>(false);
  const [expressCheckoutReady, setExpressCheckoutReady] = useState<boolean>(false);
  const [_paymentElementReady, setPaymentElementReady] = useState<boolean>(false);
  const [elementLoadError, setElementLoadError] = useState<string | null>(null);

  // Handle card payment form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault();

      if (!stripe || !elements) {
        return;
      }

      setIsProcessing(true);
      setMessage(null);

      // Call validation callback before payment
      if (onBeforePayment) {
        try {
          const result = await onBeforePayment();
          if (!result.success) {
            setMessage(result.error || 'Please fill in all required fields.');
            setIsProcessing(false);
            return;
          }
        } catch (error: any) {
          setMessage(error.message || 'Validation failed. Please try again.');
          setIsProcessing(false);
          return;
        }
      }

      try {
        // Use redirect: 'if_required' to stay on page for most payments
        // 3DS will open in a modal, handled automatically by Stripe
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout?payment_intent_success=true`,
          },
          redirect: 'if_required',
        });

        if (error) {
          // Handle payment errors
          if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message || "Payment failed. Please try again.");
          } else {
            setMessage("An unexpected error occurred. Please try again.");
          }
          setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          // Payment succeeded without redirect
          console.log('Payment successful:', paymentIntent.id);
          setMessage("Payment successful!");
          onPaymentSuccess({ paymentIntent });
        } else if (paymentIntent && paymentIntent.status === 'requires_action') {
          // Additional action required (e.g., 3DS) - Stripe handles this
          setMessage("Additional authentication required...");
        } else {
          // Payment is processing or in another state
          setMessage("Payment is being processed...");
        }
      } catch (err: any) {
        console.error('Payment error:', err);
        setMessage(err.message || "Payment failed. Please try again.");
        setIsProcessing(false);
      }
    },
    [stripe, elements, onBeforePayment, onPaymentSuccess]
  );

  // Handle Express Checkout click - request user details from wallet
  const handleExpressCheckoutClick = useCallback(
    (event: { resolve: (options: any) => void }) => {
      // Request all available user info from Apple Pay / Google Pay wallet
      event.resolve({
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        billingAddressRequired: true,
      });
    },
    []
  );

  // Handle Express Checkout (Apple Pay, Google Pay, Link)
  // NOTE: Skip form validation for express checkout - wallet provides all customer data
  const handleExpressCheckoutConfirm = useCallback(
    async (event: StripeExpressCheckoutElementConfirmEvent) => {
      if (!stripe || !elements) {
        return;
      }

      setIsProcessing(true);
      setMessage(null);

      // For Express Checkout, we DON'T call onBeforePayment validation
      // because Apple Pay/Google Pay provides all customer info from the wallet
      // (name, email, phone, shipping address, billing address)
      console.log('Express checkout - using wallet data:', {
        billingDetails: event.billingDetails,
        shippingAddress: event.shippingAddress,
        payerEmail: (event as any).payerEmail,
        payerName: (event as any).payerName,
      });

      try {
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/checkout?payment_intent_success=true`,
          },
          redirect: 'if_required',
        });

        if (error) {
          setMessage(error.message || "Payment failed. Please try again.");
          setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
          console.log('Express checkout payment successful:', paymentIntent.id);
          setMessage("Payment successful!");
          // Pass wallet data along with payment intent for order creation
          onPaymentSuccess({
            paymentIntent,
            expressCheckoutData: {
              billingDetails: event.billingDetails,
              shippingAddress: event.shippingAddress,
              payerEmail: (event as any).payerEmail,
              payerName: (event as any).payerName,
              payerPhone: (event as any).payerPhone,
            }
          });
        }
      } catch (err: any) {
        console.error('Express checkout error:', err);
        setMessage(err.message || "Payment failed. Please try again.");
        setIsProcessing(false);
      }
    },
    [stripe, elements, onBeforePayment, onPaymentSuccess]
  );

  // Listen for PaymentElement changes
  useEffect(() => {
    if (elements) {
      const paymentElement = elements.getElement(PaymentElement);
      if (paymentElement) {
        const handleChange = (event: { complete: boolean; error?: { message: string } }) => {
          setIsPaymentElementComplete(event.complete);
          if (event.error) {
            setMessage(event.error.message);
          } else {
            setMessage(null);
          }
        };
        // Cast to any to access the on method which exists at runtime
        (paymentElement as any).on("change", handleChange);
      }
    }
  }, [elements]);

  // Check if 3DS redirect happened and handle return
  useEffect(() => {
    if (!stripe) return;

    const queryParams = new URLSearchParams(window.location.search);
    const paymentIntentSuccess = queryParams.get('payment_intent_success');
    const paymentIntentClientSecret = queryParams.get('payment_intent_client_secret');

    if (paymentIntentSuccess === 'true' && paymentIntentClientSecret) {
      // User returned from 3DS redirect
      stripe.retrievePaymentIntent(paymentIntentClientSecret).then(({ paymentIntent }) => {
        if (paymentIntent && paymentIntent.status === 'succeeded') {
          onPaymentSuccess({ paymentIntent });
        } else if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
          setMessage('Payment failed. Please try another payment method.');
        }
      });
    }
  }, [stripe, onPaymentSuccess]);

  const formattedAmount = totalAmount.toFixed(2);
  const isButtonDisabled = isProcessing || externalProcessing || !stripe || !elements || !isPaymentElementComplete;

  return (
    <div className="payment-form-container space-y-6">
      {/* Express Checkout Section - Apple Pay, Google Pay, Link */}
      {!elementLoadError && (
        <div className="express-checkout-section">
          <ExpressCheckoutElement
            onClick={handleExpressCheckoutClick}
            onConfirm={handleExpressCheckoutConfirm}
            onReady={() => setExpressCheckoutReady(true)}
            onLoadError={(error) => {
              console.log('Express checkout not available:', error);
              // This is normal if Apple Pay/Google Pay aren't set up on this device/browser
            }}
            options={{
              buttonType: {
                applePay: 'buy',
                googlePay: 'buy',
              },
            }}
          />
        </div>
      )}

      {/* Divider - only show if express checkout is available */}
      {expressCheckoutReady && (
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or pay with card</span>
          </div>
        </div>
      )}

      {/* Card Payment Form */}
      <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">
        {elementLoadError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
            <p className="font-medium">Payment form error</p>
            <p>{elementLoadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Refresh page to try again
            </button>
          </div>
        ) : (
          <PaymentElement
            id="payment-element"
            onReady={() => {
              console.log('Payment element ready');
              setPaymentElementReady(true);
            }}
            onLoadError={(error) => {
              console.error('Payment element load error:', error);
              // Check for common error types - error has shape { elementType, error: StripeError }
              const errorMessage = error?.error?.message || 'Unknown error';
              if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                setElementLoadError('Payment configuration error. Please contact support or try again later.');
              } else {
                setElementLoadError('Failed to load payment form. Please refresh the page.');
              }
              setMessage(null);
            }}
            options={{
              layout: 'tabs',
            }}
          />
        )}

        {/* Error/Success Message */}
        {message && !elementLoadError && (
          <div
            id="payment-message"
            className={`text-sm p-3 rounded-md ${
              message.includes('successful')
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message}
          </div>
        )}

        {/* Pay Button */}
        {!elementLoadError && (
          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full rounded-md border border-transparent px-4 py-3 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isButtonDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark focus:ring-primary'
            }`}
          >
            {isProcessing || externalProcessing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay GBP ${formattedAmount}`
            )}
          </button>
        )}
      </form>

      {/* Security Notice */}
      <div className="flex items-center justify-center text-xs text-gray-500 mt-4">
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Secured by Stripe. Your payment information is encrypted.
      </div>
    </div>
  );
};

export default PaymentForm;
