"use client";
import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { useAuth } from "@/app/context/Auth";
import { useCheckout } from "./hooks/useCheckout";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { api } from "./api";

// Dynamic imports
const NewsletterModal = dynamic(
  () => import("@/app/components/common/NewsletterModal"),
  { ssr: false }
);


const Nav = dynamic(() => import("@/app/components/navbar/Nav"), {
  ssr: false,
});

const TopBar = dynamic(() => import("@/app/topbar/page"), { ssr: false });

const LoadingBar = dynamic(() => import("react-top-loading-bar"), {
  ssr: false,
});

const LoginForm = dynamic(
  () => import("@/app/(routes)/checkout/components/LoginForm"),
  { ssr: false }
);

const RegisterForm = dynamic(
  () => import("@/app/(routes)/checkout/components/RegisterForm"),
  { ssr: false }
);

const ProductDetails = dynamic(
  () => import("@/app/(routes)/checkout/components/ProductDetails"),
  { ssr: false }
);

const PaymentForm = dynamic(
  () => import("@/app/(routes)/checkout/components/PaymentForm"),
  { ssr: false }
);

import TrustBoxWidget from "@/app/components/trusBoxWidget";
import BenefitsFromZextons from "./components/benefits-from-zextons";
import PaymentLogos from "@/app/components/PaymentLogos";

export default function CheckoutPage() {
  const auth = useAuth();
  const router = useRouter();
  const {
    // State
    progress,
    products,
    errors,
    shippingInformation,
    appliedCoupon,
    enteredCoupon,
    isCouponValid,
    couponError,
    totalSalePrice,
    discountedPrice,
    stripePromise,
    clientSecret,
    email,
    password,
    confirmPassword,
    isChecked,
    showWarning,
    generalError,

    // Embedded payment state
    isPaymentReady,
    isProcessingPayment,
    paymentError,

    // Shipping state
    shippingMethods,
    selectedShippingMethod,
    shippingCost,
    freeShippingThreshold,
    freeShippingEnabled,

    // Setters
    setEmail,
    setPassword,
    setConfirmPassword,
    setProgress,

    // Handlers
    handleLogin,
    handleCouponInputChange,
    handleApplyCoupon,
    handleShippingChange,
    handleTermsCheckboxChange,
    handleShippingMethodChange,
    removeFromCart,
    handlePlaceOrder,
    handleRegisterAndPlaceOrder,

    // Embedded payment handlers
    handlePaymentSuccess,
    resetPaymentState,
    validateAndCreateOrder,
  } = useCheckout();

  // Additional local state
  const [showForm, setShowForm] = useState<boolean>(false);
  const [stockData, setStockData] = useState<Record<string, { availableQuantity: number; inStock: boolean }>>({});

  const toggleFormVisibility = () => setShowForm(!showForm);

  // Check for payment success in URL and handle order completion (for redirects from Stripe hosted checkout or 3DS)
  useEffect(() => {
    let trackingScript: HTMLScriptElement | null = null;

    const handlePaymentSuccessFromUrl = async () => {
      const queryParams = new URLSearchParams(window.location.search);

      // Check for Stripe hosted checkout session redirect
      const paymentSuccess = queryParams.get("payment_success");
      const sessionId = queryParams.get("session_id");

      // Check for 3DS redirect from embedded payment (fallback)
      const paymentIntentSuccess = queryParams.get("payment_intent_success");
      const paymentIntentClientSecret = queryParams.get("payment_intent_client_secret");

      console.log('🔍 Checking payment status:', { paymentSuccess, sessionId, paymentIntentSuccess });

      // Handle 3DS redirect from embedded payment
      if (paymentIntentSuccess === "true" && paymentIntentClientSecret && stripePromise) {
        console.log('✅ 3DS redirect detected! Handling payment completion...');
        try {
          const stripe = await stripePromise;
          if (stripe) {
            const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
            if (paymentIntent && paymentIntent.status === 'succeeded') {
              // Call the payment success handler from the hook
              handlePaymentSuccess({ paymentIntent });
            }
          }
        } catch (error) {
          console.error("Error handling 3DS redirect:", error);
          router.push("/checkout/thank-you");
        }
        return;
      }

      // Handle Stripe hosted checkout session redirect (legacy fallback)
      if (paymentSuccess === "true" && sessionId) {
        console.log('✅ Hosted checkout payment success detected! Starting order update...');
        try {
          setProgress(50);

          // Get stored order number from localStorage
          const storedOrderNumber = localStorage.getItem("createdOrderNumber");
          console.log('📦 Stored order number:', storedOrderNumber);

          if (!storedOrderNumber) {
            console.error("❌ No order number found in localStorage");
            router.push("/checkout/thank-you");
            return;
          }

          // First: Retrieve payment details from Stripe session
          console.log('💳 Retrieving payment details from Stripe...');
          let paymentDetails;
          try {
            paymentDetails = await api.retrievePaymentDetailsFromSession(sessionId);
            console.log('✅ Payment details retrieved:', paymentDetails);
          } catch (error) {
            console.error("❌ Failed to retrieve payment details:", error);
            router.push("/checkout/thank-you");
            return;
          }

          // Get cart data and contact info for order creation
          const cartData = JSON.parse(localStorage.getItem("cart") || "[]");
          const appliedCouponData = JSON.parse(
            localStorage.getItem("appliedcoupon") || "null"
          );

          // Get contact information
          const userForOrder = JSON.parse(
            localStorage.getItem("userForOrder") || "{}"
          );
          const contactInformation: { email?: string; userId?: string } = {};

          if (userForOrder && userForOrder.email && userForOrder._id) {
            contactInformation.email = userForOrder.email;
            contactInformation.userId = userForOrder._id;
          } else if (auth.user) {
            contactInformation.email = auth.user.email;
            contactInformation.userId = auth.user._id;
          }

          // Get shipping information from localStorage or auth user
          let shippingInfo = JSON.parse(
            localStorage.getItem("shippingInformation") || "null"
          );

          if (!shippingInfo && auth.user) {
            shippingInfo = {
              firstName: auth.user.firstname || "",
              lastName: auth.user.lastname || "",
              companyName: auth.user.companyname || "",
              address: auth.user.address?.address || "",
              apartment: auth.user.address?.apartment || "",
              country: auth.user.address?.country || "United Kingdom",
              city: auth.user.address?.city || "",
              county: auth.user.address?.county || "",
              postalCode: auth.user.address?.postalCode || "",
              phoneNumber: auth.user.phoneNumber || "",
            };
          }

          // Create order with "Pending" status
          const orderData = {
            cart: cartData,
            shippingInformation: shippingInfo || shippingInformation,
            contactInformation,
            coupon: appliedCouponData,
            paymentDetails,
            orderNumber: storedOrderNumber,
            status: "Pending",
          };

          console.log('📋 Order data to be sent:', JSON.stringify(orderData, null, 2));

          try {
            console.log('🔄 Updating order to Pending status...', orderData);
            await api.updateOrderAfterPayment(orderData);
            console.log('✅ Order updated successfully to Pending!');

            // Calculate total order value with discount
            let totalOrderValue = cartData
              .reduce((sum: number, item: any) => {
                return sum + parseFloat((item.salePrice * item.qty).toFixed(2));
              }, 0);

            if (appliedCouponData) {
              if (appliedCouponData.discount_type === 'flat') {
                totalOrderValue -= appliedCouponData.discount;
              } else if (appliedCouponData.discount_type === 'percentage') {
                const discountAmount = (totalOrderValue * appliedCouponData.discount) / 100;
                totalOrderValue -= appliedCouponData.upto
                  ? Math.min(discountAmount, appliedCouponData.upto)
                  : discountAmount;
              }
            }
            totalOrderValue = Math.max(0, totalOrderValue);

            // Store order data for thank-you page
            const orderForThankYou = {
              totalOrderValue,
              orderNumber: storedOrderNumber,
              cart: cartData.map((item: any) => ({
                productName: item.productName || item.name,
                productId: item.productId || item._id,
                qty: item.qty,
                salePrice: item.salePrice,
              })),
              customerEmail: contactInformation.email || '',
              customerName: shippingInfo
                ? `${shippingInfo.firstName || ''} ${shippingInfo.lastName || ''}`.trim()
                : '',
            };
            localStorage.setItem('lastOrder', JSON.stringify(orderForThankYou));
            console.log('✅ Order data stored for thank-you page:', orderForThankYou);

            // Load tracking script
            trackingScript = document.createElement("script");
            trackingScript.src = "https://s.kk-resources.com/ks.js";
            trackingScript.async = true;
            document.body.appendChild(trackingScript);

            // Clean up localStorage
            localStorage.removeItem("clientSecret");
            localStorage.removeItem("cart");
            localStorage.removeItem("appliedcoupon");
            localStorage.removeItem("paymentIntentId");
            localStorage.removeItem("cart-old");
            localStorage.removeItem("createdOrderNumber");
            localStorage.removeItem("shippingInformation");
            localStorage.removeItem("userForOrder");

            setProgress(100);

            // Redirect to thank you page
            router.push("/checkout/thank-you");
          } catch (orderError) {
            console.error("Failed to update order status:", orderError);
            router.push("/checkout/thank-you");
          }
        } catch (error) {
          console.error("Error handling payment success:", error);
          router.push("/checkout/thank-you");
        }
      }
    };

    handlePaymentSuccessFromUrl();

    // Cleanup function
    return () => {
      if (trackingScript && document.body.contains(trackingScript)) {
        document.body.removeChild(trackingScript);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripePromise]); // Re-run when stripePromise is available for 3DS handling

  const handleCreateAccount = async () => {
    // This will be handled by the useCheckout hook
    return true;
  };

  const updateCheckoutSession = () => {
    // This functionality is now handled within the services
    console.log("Checkout session update triggered");
  };

  // Validate stock before placing order
  const validateStockBeforeOrder = (): boolean => {
    const outOfStockItems: string[] = [];
    const insufficientStockItems: { name: string; requested: number; available: number }[] = [];

    // Helper function to clean product name (remove color codes)
    const cleanProductName = (name: string): string => {
      // Remove color codes like (#d70909) or (#000000)
      return name.replace(/\s*\(#[a-fA-F0-9]{6}\)/g, '');
    };

    products.forEach((product: any) => {
      const stock = stockData[product._id];

      if (stock) {
        const cleanName = cleanProductName(product.name || product.productName);

        if (!stock.inStock || stock.availableQuantity === 0) {
          outOfStockItems.push(cleanName);
        } else if (product.qty > stock.availableQuantity) {
          insufficientStockItems.push({
            name: cleanName,
            requested: product.qty,
            available: stock.availableQuantity,
          });
        }
      }
    });

    if (outOfStockItems.length > 0) {
      toast.error(
        `Out of stock: ${outOfStockItems.join(', ')}. Please remove these items from your cart before placing an order.`,
        { autoClose: 5000 }
      );
      return false;
    }

    if (insufficientStockItems.length > 0) {
      const messages = insufficientStockItems.map(
        (item) => `${item.name}: only ${item.available} available (you have ${item.requested} in cart)`
      );
      toast.error(
        `Insufficient stock: ${messages.join('; ')}. Please adjust quantities before placing an order.`,
        { autoClose: 5000 }
      );
      return false;
    }

    return true;
  };

  // Wrapper for handlePlaceOrder with stock validation
  const handlePlaceOrderWithValidation = () => {
    if (!validateStockBeforeOrder()) {
      return;
    }
    handlePlaceOrder();
  };

  // Wrapper for handleRegisterAndPlaceOrder with stock validation
  const handleRegisterAndPlaceOrderWithValidation = () => {
    if (!validateStockBeforeOrder()) {
      return;
    }
    handleRegisterAndPlaceOrder();
  };

  const loader = "auto";

  return (
    <>
      <NewsletterModal mode="checkout" />
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />

      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <h1 className="sr-only">Checkout</h1>

          <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
            <div>
              <LoginForm
                toggleFormVisibility={toggleFormVisibility}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleLogin={handleLogin}
                showForm={showForm}
                errors={errors}
              />

              <RegisterForm
                handleCreateAcc={handleCreateAccount}
                handleShippingChange={(e) =>
                  handleShippingChange(e.target.name, e.target.value)
                }
                email={email}
                setEmail={setEmail}
                shippingInformation={shippingInformation}
                password={password}
                setPassword={setPassword}
                Cpassword={confirmPassword}
                setCPassword={setConfirmPassword}
                errors={errors}
              />
            </div>

            {/* Order summary */}
            <div className="mt-10 lg:mt-0">
              <div className="bg-gray-200 py-6 px-4 rounded-md xl:flex-row xl:sticky top-[100px]">
                <h2 className="text-lg font-medium text-gray-900 pb-5">
                  Order summary
                </h2>

                <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                  <h3 className="sr-only">Items in your cart</h3>

                  <ProductDetails
                    products={products}
                    removeFromCart={removeFromCart}
                    totalSalePrice={totalSalePrice}
                    appliedCoupon={appliedCoupon}
                    showWarning={showWarning}
                    isChecked={isChecked}
                    handleTermsCheckboxChange={(e) =>
                      handleTermsCheckboxChange(e.target.checked)
                    }
                    handleApplyCoupon={(e) => {
                      e.preventDefault();
                      handleApplyCoupon();
                    }}
                    handleCouponInputChange={(e) =>
                      handleCouponInputChange(e.target.value)
                    }
                    isCouponValid={isCouponValid}
                    enteredCoupon={enteredCoupon}
                    updateCheckoutSession={updateCheckoutSession}
                    couponError={couponError}
                    onStockDataUpdate={setStockData}
                    shippingMethods={shippingMethods}
                    selectedShippingMethod={selectedShippingMethod}
                    shippingCost={shippingCost}
                    freeShippingThreshold={freeShippingThreshold}
                    freeShippingEnabled={freeShippingEnabled}
                    onShippingMethodChange={handleShippingMethodChange}
                  />

                  <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                    {/* Klarna Promotion Badge */}
                    <div className="mb-4">
                      <div
                        data-pp-message
                        data-pp-style-layout="text"
                        data-pp-style-logo-type="inline"
                        data-pp-style-text-color="black"
                        data-pp-amount={totalSalePrice ? (totalSalePrice * 100).toString() : ""}
                      ></div>
                      <klarna-placement
                        data-key="credit-promotion-badge"
                        data-locale="en-GB"
                        data-purchase-amount={totalSalePrice ? (totalSalePrice * 100).toString() : ""}
                      ></klarna-placement>
                    </div>

                    {/* Embedded Payment Form - shown directly on page */}
                    {clientSecret && stripePromise ? (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Payment Details
                        </h3>
                        <Elements
                          stripe={stripePromise}
                          options={{
                            clientSecret,
                            loader,
                            appearance: {
                              theme: 'stripe',
                              variables: {
                                colorPrimary: '#046d38',
                              },
                            },
                          }}
                        >
                          <PaymentForm
                            onPaymentSuccess={handlePaymentSuccess}
                            totalAmount={discountedPrice}
                            isProcessing={isProcessingPayment}
                            onBeforePayment={validateAndCreateOrder}
                          />
                        </Elements>
                        {paymentError && (
                          <p className="text-red-600 text-sm mt-2 text-center">{paymentError}</p>
                        )}
                        {generalError && (
                          <p className="text-red-600 text-sm mt-2 text-center">{generalError}</p>
                        )}
                      </div>
                    ) : paymentError ? (
                      <div className="text-center py-8">
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                          <p className="font-medium">Payment Error</p>
                          <p className="text-sm mt-1">{paymentError}</p>
                          <button
                            onClick={() => window.location.reload()}
                            className="mt-3 text-sm text-red-600 underline hover:text-red-800"
                          >
                            Refresh page to try again
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-gray-500 mt-2">Loading payment form...</p>
                        {!stripePromise && (
                          <p className="text-gray-400 text-xs mt-1">Initializing Stripe...</p>
                        )}
                        {stripePromise && !clientSecret && (
                          <p className="text-gray-400 text-xs mt-1">Creating payment session...</p>
                        )}
                      </div>
                    )}
                    <PaymentLogos />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <TrustBoxWidget />
        <BenefitsFromZextons />
      </main>

      </>
  );
}
 