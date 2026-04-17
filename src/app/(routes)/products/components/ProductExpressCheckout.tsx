"use client";

import React, { useState, useEffect, useCallback } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

interface ProductExpressCheckoutProps {
  product: any;
  selectedVariant: any;
  updatedPrice: number;
  disabled?: boolean;
}

// Inner component that uses Stripe hooks
function ExpressCheckoutInner({
  product,
  selectedVariant,
  updatedPrice,
  onSuccess,
  onError,
}: {
  product: any;
  selectedVariant: any;
  updatedPrice: number;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);

  // Handle click - request user details from Apple Pay / Google Pay wallet
  const handleClick = useCallback(
    (event: { resolve: (options: any) => void }) => {
      event.resolve({
        emailRequired: true,
        phoneNumberRequired: true,
        shippingAddressRequired: true,
        billingAddressRequired: true,
      });
    },
    []
  );

  const handleConfirm = useCallback(async (event: any) => {
    if (!stripe || !elements) {
      onError("Payment system not ready");
      return;
    }

    try {
      // Submit the elements first
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Payment failed");
        return;
      }

      // Extract user details from Apple Pay / Google Pay wallet
      const shippingAddress = event.shippingAddress || {};
      const billingDetails = event.billingDetails || {};
      const payerEmail = event.payerEmail || billingDetails.email || "";
      const payerPhone = event.payerPhone || billingDetails.phone || shippingAddress.phone || "";
      const payerName = event.payerName || billingDetails.name || "";

      // Parse name into first/last
      const nameParts = payerName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create PaymentIntent on the server with real user data from wallet
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/create-payment-intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartproducts: [
              {
                _id: selectedVariant?._id || product._id,
                productId: product._id,
                productName: product.name,
                name: selectedVariant?.name || product.name,
                salePrice: updatedPrice,
                qty: 1,
                variantImages: selectedVariant?.variantImages || product.Gallery_Images,
              },
            ],
            coupondata: null,
            shippingInformation: {
              firstName: firstName,
              lastName: lastName,
              companyName: "",
              address: shippingAddress.line1 || shippingAddress.address?.line1 || "",
              apartment: shippingAddress.line2 || shippingAddress.address?.line2 || "",
              country: shippingAddress.country || shippingAddress.address?.country || "United Kingdom",
              city: shippingAddress.city || shippingAddress.address?.city || "",
              county: shippingAddress.state || shippingAddress.address?.state || "",
              postalCode: shippingAddress.postal_code || shippingAddress.address?.postal_code || "",
              phoneNumber: payerPhone,
            },
            contactInformation: {
              email: payerEmail,
              userId: "express_checkout",
            },
            orderNumber: "",
            isExpressCheckout: true,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.clientSecret) {
        onError(data.error?.message || "Failed to create payment");
        return;
      }

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?express_payment=true&product_id=${product._id}`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Payment failed");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Pass customer data along with payment intent for order storage
        onSuccess({
          ...paymentIntent,
          customerData: {
            email: payerEmail,
            name: payerName,
            firstName,
            lastName,
            phone: payerPhone,
            shippingAddress,
          },
        });
      }
    } catch (err: any) {
      console.error("Express checkout error:", err);
      onError(err.message || "Payment failed");
    }
  }, [stripe, elements, product, selectedVariant, updatedPrice, onSuccess, onError]);

  return (
    <div className="w-full">
      <ExpressCheckoutElement
        onClick={handleClick}
        onConfirm={handleConfirm}
        onReady={() => setIsReady(true)}
        onLoadError={(error) => {
          console.log("Express checkout not available:", error);
        }}
        options={{
          buttonType: {
            applePay: "buy",
            googlePay: "buy",
          },
          buttonTheme: {
            applePay: "black",
            googlePay: "black",
          },
          layout: {
            maxColumns: 2,
            maxRows: 1,
          },
        }}
      />
      {!isReady && (
        <div className="text-center text-xs text-gray-400 mt-1">
          Loading payment options...
        </div>
      )}
    </div>
  );
}

// Main component
export default function ProductExpressCheckout({
  product,
  selectedVariant,
  updatedPrice,
  disabled = false,
}: ProductExpressCheckoutProps) {
  const router = useRouter();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Stripe
  useEffect(() => {
    const initStripe = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/config`);
        const data = await response.json();
        if (data.publishableKey) {
          setStripePromise(loadStripe(data.publishableKey));
        }
      } catch (err) {
        console.error("Failed to initialize Stripe:", err);
      }
    };
    initStripe();
  }, []);

  const handleSuccess = useCallback(
    (paymentIntent: any) => {
      console.log("Express payment successful:", paymentIntent.id);

      // Extract customer data from wallet (passed from handleConfirm)
      const customerData = paymentIntent.customerData || {};

      // Store order data for thank-you page with real customer info
      const orderData = {
        totalOrderValue: updatedPrice,
        orderNumber: paymentIntent.id,
        cart: [
          {
            productName: product.name,
            productId: product._id,
            qty: 1,
            salePrice: updatedPrice,
          },
        ],
        customerEmail: customerData.email || "",
        customerName: customerData.name || `${customerData.firstName || ""} ${customerData.lastName || ""}`.trim() || "Customer",
        customerPhone: customerData.phone || "",
        shippingAddress: customerData.shippingAddress || null,
        isExpressCheckout: true,
      };
      localStorage.setItem("lastOrder", JSON.stringify(orderData));

      // Redirect to thank you page
      router.push("/checkout/thank-you?express=true");
    },
    [product, updatedPrice, router]
  );

  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsProcessing(false);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Don't render if no variant selected or disabled
  if (disabled || !selectedVariant || updatedPrice <= 0) {
    return null;
  }

  // Don't render until Stripe is loaded
  if (!stripePromise) {
    return null;
  }

  const amount = Math.round(updatedPrice * 100); // Convert to pence

  return (
    <div className="mt-4 mb-2">
      <Elements
        stripe={stripePromise}
        options={{
          mode: "payment",
          amount: amount,
          currency: "gbp",
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#046d38",
            },
          },
        }}
      >
        <ExpressCheckoutInner
          product={product}
          selectedVariant={selectedVariant}
          updatedPrice={updatedPrice}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </Elements>

      {error && (
        <div className="mt-2 text-sm text-red-600 text-center">{error}</div>
      )}

      {isProcessing && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          Processing payment...
        </div>
      )}
    </div>
  );
}
