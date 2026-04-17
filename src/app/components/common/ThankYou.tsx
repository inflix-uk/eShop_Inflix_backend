"use client";

import { FC, useEffect } from "react";
import Link from "next/link";

declare global {
  interface Window {
    _kkstrack?: any;
  }
}

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
}

interface ThankYouModalProps {
  isOpen: boolean;
  onClose?: () => void;
  order?: Order | null;
}

const ThankYouModal: FC<ThankYouModalProps> = ({ isOpen, onClose, order }) => {
  useEffect(() => {
    if (order && order.totalOrderValue && order.cart) {
      // Define the _kkstrack object with dynamic values
      window._kkstrack = {
        merchantInfo: [
          {
            country: "uk", // e.g., 'uk'
            merchantId: "100550709", // Your merchant ID
          },
        ],
        orderValue: order.totalOrderValue,
        orderId: order.orderNumber,
        basket: order.cart.map((item) => ({
          productname: item.productName,
          productid: item.productId,
          quantity: item.qty,
          saleprice: item.salePrice,
        })),
      };

      // Dynamically load the ks.js script
      const script = document.createElement("script");
      script.src = "https://s.kk-resources.com/ks.js";
      script.async = true;
      document.body.appendChild(script);

      // Cleanup function
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [order]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-4">
      <div className="fixed inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg shadow-xl flex flex-col transform transition-all sm:max-w-3xl w-full h-80 relative">
        <button
          className="absolute top-0 right-0 text-gray-500 hover:text-gray-700 focus:outline-none"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex flex-col justify-center items-center h-full w-full">
          <div className="mx-auto flex-shrink-0 flex flex-col items-center justify-center mt-5 md:mt-3">
            <div className="relative inline-block mb-8">
              <div className="relative z-10 w-36 h-36 background-check-confetti"></div>
              <div className="absolute top-0 left-0 w-36 h-36 background-confeti-square"></div>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
                Thank you for your order!
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Your order has been confirmed. You will receive an email
                  confirmation shortly.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col md:flex-row-reverse gap-4">
          <Link
            href="/customer/my-orders"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
          >
            Orders
          </Link>
          <Link
            href="/"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouModal;
