"use client";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export default function PaymentSuccessPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setShowConfetti(true);

    // Hide confetti after animation
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleRedirect = () => {
    // Add your redirect logic here
    console.log("Redirecting to home page...");
  };

  return (
    <>
      <TopBar />
      <Nav />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-green-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-50 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
        <div className="max-w-6xl mx-auto">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-green-500 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${3 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div
            className={`relative z-10 max-w-md w-full transition-all duration-1000 transform ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            {/* Success Card */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-green-100 p-8 text-center border border-green-100 backdrop-blur-sm">
              {/* Success Icon */}
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mx-auto flex items-center justify-center shadow-lg transform transition-transform duration-500 hover:scale-110">
                  <div className="relative">
                    {/* Credit Card SVG */}
                    <svg
                      className="w-8 h-8 text-white absolute -top-1 -left-1"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M2 5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5ZM4 5V7H20V5H4ZM4 19H20V10H4V19ZM6 14H8V16H6V14ZM10 14H14V16H10V14Z" />
                    </svg>
                    {/* Check Circle SVG */}
                    <svg
                      className="w-10 h-10 text-white relative z-10"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                </div>

                {/* Pulsing Ring Animation */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 border-4 border-green-400 rounded-full animate-ping opacity-20"></div>
              </div>

              {/* Success Message */}
              <h1 className="text-3xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                Thank You!
              </h1>
              <p className="text-lg text-gray-600 mb-2 font-medium">
                Payment Completed Successfully
              </p>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                Your transaction has been processed successfully. You will be
                redirected to the home page shortly or click the button below to
                continue.
              </p>

              {/* Transaction Details */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-4 mb-8 border border-green-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-green-700 font-semibold">
                    #TXN-2024-001
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-green-700 font-semibold">
                    #ORD-56789
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">Item Name:</span>
                  <span className="font-semibold text-gray-800">
                    Wireless Earbuds Pro
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-800">$99.00</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center group"
                >
                  {/* Home SVG */}
                  <svg
                    className="w-5 h-5 mr-2 group-hover:animate-bounce"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                  Back to Home
                  {/* Arrow Right SVG */}
                  <svg
                    className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </Link>

                {/*  */}
              </div>
            </div>

            {/* Additional Info */}
            <p className="text-center text-sm text-gray-500 mt-6 px-4">
              Need help? Contact our support team at{" "}
              <Link
                href="/contact-us"
                className="text-green-600 hover:text-green-700 font-medium underline"
              >
                Contact Us
              </Link>
            </p>
          </div>

          <style jsx>{`
            @keyframes blob {
              0% {
                transform: translate(0px, 0px) scale(1);
              }
              33% {
                transform: translate(30px, -50px) scale(1.1);
              }
              66% {
                transform: translate(-20px, 20px) scale(0.9);
              }
              100% {
                transform: translate(0px, 0px) scale(1);
              }
            }

            @keyframes confetti {
              0% {
                transform: translateY(-100vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }

            .animate-blob {
              animation: blob 7s infinite;
            }

            .animation-delay-2000 {
              animation-delay: 2s;
            }

            .animation-delay-4000 {
              animation-delay: 4s;
            }

            .animate-confetti {
              animation: confetti linear infinite;
            }
          `}</style>
        </div>
      </div>
      </>
  );
}
