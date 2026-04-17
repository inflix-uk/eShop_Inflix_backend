'use client'
import React, { useState } from 'react'
import axios from 'axios';
import { useAuth } from '@/app/context/Auth';
import Link from 'next/link';
import Image from 'next/image';
import iphone13 from '@/app/assets/iphone13-green.webp';
import TopBar from '@/app/topbar/page';
import Nav from "@/app/components/navbar/Nav";
export default function SubscribeNewsletter() {
    const auth = useAuth();
    const [email, setEmail] = useState<string>("");
    const [showThankYou, setShowThankYou] = useState<boolean>(false);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!email) {
        console.log("Please provide your email.");
        return;
      }
      const fullName = auth?.user
        ? `${auth?.user?.firstname} ${auth?.user?.lastname}`
        : null;
      try {
        const response = await axios.post(`${auth.ip}newsletter/subscribers`, {
          fullName,
          email,
          mode: "homepage",
        });
        if (response.status >= 200 && response.status < 300) {
          setEmail("");
          setShowThankYou(true);
        } else {
          console.log("Something went wrong. Please try again.");
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error: " + err.message);
        } else {
          console.error("An unknown error occurred");
        }
      }
    };  return (
      <>
        <header className="relative ">
            <TopBar />
            <Nav />
          </header>
          {/* Breadcrumb */}
          <div className="max-w-7xl mx-auto px-6 py-4 text-sm text-gray-600">
            <nav>
              <Link
                href={"/"}
                className="hover:underline"
                aria-label="Go to Zextons Home"
              >
                Home
              </Link>
              <span className="mx-2">»</span>
              <span className="text-gray-800">Subscribe Newsletter</span>
            </nav>
          </div>
          <div className="max-w-7xl mx-auto px-6 py-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Stay Updated with Our Latest News!
            </h1>
            <p className="text-lg md:text-xl">
              Subscribe to our newsletter and never miss out on exclusive
              offers, tips, and guides.
            </p>
          </div>
    
        {/* Newsletter Section */}
        <div className="px-4">
          <section className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-8 mb-10 border border-gray-200 ">
            <div className="flex flex-col lg:flex-row items-center lg:items-start">
              {/* Text Section */}
              <div className="w-full lg:w-1/2 text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
                  Subscribe to Our Newsletter
                </h2>
                <p className="text-gray-600 mb-6">
                  Get exclusive tips and daily guides about smart devices,
                  straight to your inbox.
                </p>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col lg:flex-row items-center gap-3"
                >
                  <input
                    type="email"
                    placeholder="Enter Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full lg:flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary text-white font-semibold rounded-lg transition hover:brightness-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/70"
                  >
                    Subscribe
                  </button>
                </form>
                {showThankYou && (
                  <p className="text-green-500 mt-4">
                    Thank you for subscribing!
                  </p>
                )}
              </div>

              {/* Image Section */}
              <div className="w-full lg:w-1/2 flex justify-center mt-6 lg:mt-0">
                <Image
                  src={iphone13}
                  alt="Smart Watch"
                  className="w-64 h-64 object-contain animate-pulse"
                  loading="lazy"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-6">
              Why Subscribe?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 flex justify-center items-center text-2xl font-bold">
                  <span aria-hidden="true" role="img">💡</span>
                </div>
                <h3 className="font-semibold text-lg mt-4">Daily Tips</h3>
                <p className="text-gray-600 mt-2">
                  Learn something new about smart devices every day.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 flex justify-center items-center text-2xl font-bold">
                  <span aria-hidden="true" role="img">🎁</span>
                </div>
                <h3 className="font-semibold text-lg mt-4">Exclusive Offers</h3>
                <p className="text-gray-600 mt-2">
                  Access special discounts and limited-time deals.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-500 flex justify-center items-center text-2xl font-bold">
                  <span aria-hidden="true" role="img">📧</span>
                </div>
                <h3 className="font-semibold text-lg mt-4">Stay Connected</h3>
                <p className="text-gray-600 mt-2">
                  Be the first to know about our latest updates and releases.
                </p>
              </div>
            </div>
            <p className="text-center mt-6 text-gray-900 font-extrabold text-3xl">
              Subscribe get 5% Discount
            </p>
          </section>
        </div>
        {/* Footer */}
        </>
    );
}
