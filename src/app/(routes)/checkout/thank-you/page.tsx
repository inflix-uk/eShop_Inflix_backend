"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { OrderService } from "../services/orderService";
const Nav = dynamic(() => import("@/app/components/navbar/Nav"), { ssr: false });
const TopBar = dynamic(() => import("@/app/topbar/page"), { ssr: false });


export interface OrderItem {
  productName: string;
  productId: string;
  qty: number;
  salePrice: number;
}

export interface Order {
  totalOrderValue: number;
  orderNumber: string;
  cart: OrderItem[];
  customerEmail?: string;
  customerName?: string;
}

// Trustpilot JavaScript Integration Key
const TRUSTPILOT_KEY = 'apBDpgcgPa9iX8ag';

// Trustpilot invitation config type
interface TrustpilotConfig {
  key: string;
  recipientEmail: string;
  recipientName: string;
  referenceId: string;
  source: string;
}

export default function ThankYouPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const hasTracked = useRef(false);
  const hasTrustpilotInvited = useRef(false);

  useEffect(() => {
    // Get order details from localStorage or session
    const storedOrder = localStorage.getItem("lastOrder");
    console.log('📦 Checking localStorage for order data:', storedOrder);
    if (storedOrder) {
      try {
        const orderData = JSON.parse(storedOrder);
        console.log('✅ Order data loaded:', orderData);
        setOrder(orderData);
      } catch (error) {
        console.error("❌ Error parsing order data:", error);
      }
    } else {
      console.warn('⚠️ No order data found in localStorage');
    }
  }, []);

  // Google Analytics purchase tracking - fires only once when order is loaded
  useEffect(() => {
    console.log('🎯 GA Tracking useEffect triggered. Order:', order, 'HasTracked:', hasTracked.current);
    if (order && !hasTracked.current) {
      hasTracked.current = true;
      console.log('🚀 Firing Google Analytics purchase event...');

      // Track purchase using OrderService
      const orderService = OrderService.init();
      orderService.trackPurchaseEvent(
        order.orderNumber,
        order.totalOrderValue,
        order.cart
      );
    }
  }, [order]);

  // Trustpilot JavaScript Integration - sends review invitation
  useEffect(() => {
    if (order && order.customerEmail && order.orderNumber && !hasTrustpilotInvited.current) {
      hasTrustpilotInvited.current = true;
      console.log('📧 Triggering Trustpilot invitation...');
      console.log('   Customer:', order.customerName);
      console.log('   Email:', order.customerEmail);
      console.log('   Order:', order.orderNumber);

      // Load Trustpilot invite script and trigger invitation
      const script = document.createElement('script');
      script.src = '//invitejs.trustpilot.com/tp.min.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Trustpilot script loaded, invoking invitation...');
        // Use type assertion for Trustpilot on window
        const trustpilot = (window as unknown as { Trustpilot?: { Invoke: (config: TrustpilotConfig) => void } }).Trustpilot;
        if (trustpilot) {
          trustpilot.Invoke({
            key: TRUSTPILOT_KEY,
            recipientEmail: order.customerEmail || '',
            recipientName: order.customerName || 'Customer',
            referenceId: order.orderNumber,
            source: 'InvitationScript'
          });
          console.log('✅ Trustpilot invitation sent!');
        } else {
          console.error('❌ Trustpilot object not available after script load');
        }
      };
      script.onerror = () => {
        console.error('❌ Failed to load Trustpilot script');
      };
      document.head.appendChild(script);

      // Cleanup
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [order]);

  // Clean up order data after some time
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.removeItem("lastOrder");
    }, 300000); // Clear after 5 minutes

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Success Icon with Confetti Animation */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="relative inline-block">
                <div className="relative z-10 w-36 h-36 background-check-confetti"></div>
                <div className="absolute top-0 left-0 w-36 h-36 background-confeti-square"></div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Thank you for your order!
              </h1>
              <p className="text-lg text-gray-600">
                Your order has been confirmed. You will receive an email confirmation shortly.
              </p>

              {order && order.orderNumber && (
                <div className="mt-6 p-4 bg-gray-50 rounded-md hidden">
                  <p className="text-sm text-gray-600">Order Number:</p>
                  <p className="text-xl font-semibold text-primary">#{order.orderNumber}</p>
                </div>
              )}
            </div>

            {/* Order Details (if available) */}
            {order && order.cart && order.cart.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mb-6 hidden">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3">
                  {order.cart.map((item, index) => (
                    <div key={index} className="flex justify-between py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {item.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.qty}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        £{(item.salePrice * item.qty).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <p className="text-base font-semibold text-gray-900">Total</p>
                      <p className="text-base font-semibold text-primary">
                        £{order.totalOrderValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/customer/my-orders"
                className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                View My Orders
              </Link>
              <Link
                href="/"
                className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Continue Shopping
              </Link>
            </div>

            {/* Additional Information */}
            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800 text-center">
                A confirmation email has been sent to your registered email address.
                Please check your inbox for order details and tracking information.
              </p>
            </div>
          </div>
        </div>
      </main>

      </>
  );
}