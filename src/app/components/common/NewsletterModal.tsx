/*
"use client";

import { useEffect, useState, FC, FormEvent } from "react";
import axios from "axios";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth"; // Adjust the import path as needed
import NewsletterSuccessModal from "./NewsletterSuccessModal"; // Ensure this is adapted to Next.js and TS
import newsletterImage from "@/app/assets/newslettern.png";
interface NewsletterModalProps {
  mode?: string;
}

const NewsletterModal: FC<NewsletterModalProps> = ({ mode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  const auth = useAuth();

  useEffect(() => {
    const today = new Date().toLocaleDateString();
    const modalLastShown =
      typeof window !== "undefined"
        ? localStorage.getItem("newsletterModalShown")
        : null;

    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";

    // Prevent modal from showing on the /checkout page
    if (currentPath === "/checkout") {
      return;
    }

    // If there's a stored date, and it's not today, clear the localStorage to reset it
    if (modalLastShown && modalLastShown !== today) {
      localStorage.removeItem("newsletterModalShown");
    }

    // Show modal if it hasn't been shown today
    if (!modalLastShown || modalLastShown !== today) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer); // Clear timeout if component unmounts
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setSuccess(null);
    setShowThankYou(false); // Reset thank you modal state

    // Store the current date in localStorage to prevent the modal from showing again today
    const today = new Date().toLocaleDateString();
    localStorage.setItem("newsletterModalShown", today);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Reset success and error messages
    setError(null);
    setSuccess(null);

    // Validate email
    if (!email) {
      setError("Please provide your email.");
      return;
    }

    // Use the provided API endpoint or fallback
    const ip = auth?.ip;

    // Get full name if authenticated, otherwise set to null
    const fullName = auth?.user
      ? `${auth.user.firstname} ${auth.user.lastname}`
      : null;

    try {
      const response = await axios.post(`${ip}newsletter/subscribers`, {
        fullName, // Send the combined full name
        email,
        mode: mode, // Use the mode prop or default to 'website'
      });

      if (response.status >= 200 && response.status < 300) {
        setSuccess("You have successfully subscribed!");
        setEmail(""); // Clear email field
        setShowThankYou(true); // Show Thank You modal
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      if (err?.response?.status === 400 && err?.response?.data?.message) {
        setError(String(err.response.data.message));
      } else {
        setError("Error: " + (err?.message || "Something went wrong."));
      }
    }
  };

  if (showThankYou) {
    return <NewsletterSuccessModal onClose={handleClose} />;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 px-4">
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl w-full flex flex-col xs:flex-row">
        <button
          onClick={handleClose}
          aria-label="Close newsletter modal"
          className="absolute top-1 right-1 lg:right-2 lg:top-2 text-gray-600 hover:text-gray-800 bg-black p-1 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/70"
        >
          <span className="font-bold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6 text-white"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        <div
          className="relative w-full lg:w-1/2"
          style={{ aspectRatio: `${newsletterImage.width} / ${newsletterImage.height}` }}
        >
          <Image
            src={newsletterImage}
            alt="Devices"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover rounded-tl-lg rounded-bl-lg"
            priority
          />
        </div>
        <div className="w-full lg:w-1/2 px-4 md:px-8 py-3 sm:py-10 flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-gray-500">
            SUBSCRIBE TO OUR NEWSLETTER
          </h2>
          <h1 className="text-2xl font-bold mt-2">Enjoy 5% Off</h1>
          <p className="text-sm text-gray-500 mt-1">On Your First Order</p>

          <form onSubmit={handleSubmit} className="mt-4">
            <input
              autoComplete="true"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="px-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
            {success && (
              <p className="text-green-600 text-sm mt-1">{success}</p>
            )}
            <button
              type="submit"
              className="mt-3 w-full font-bold bg-primary text-white py-2 rounded-full hover:brightness-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/70"
            >
              SUBMIT
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewsletterModal;
*/

// Temporary placeholder export to prevent import errors
import { FC } from "react";

interface NewsletterModalProps {
  mode?: string;
}

const NewsletterModal: FC<NewsletterModalProps> = () => null;
export default NewsletterModal;
