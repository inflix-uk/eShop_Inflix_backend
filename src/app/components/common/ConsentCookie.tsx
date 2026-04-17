"use client";

import { useState, useEffect, FC } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/solid";
import CookieImage from "@/app/assets/cookie.png";
import Image from "next/image";
interface Preferences {
  necessary: boolean;
  performance: boolean;
  targeting: boolean;
}

const CookieConsent: FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    necessary: true,
    performance: false,
    targeting: false,
  });

  const handlePreferenceChange = (type: keyof Preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  useEffect(() => {
    const consent = Cookies.get("cookieConsent");
    if (!consent) setVisible(true);

    // Load preferences from cookies if they exist
    setPreferences({
      necessary: true,
      performance: Cookies.get("performance") === "true",
      targeting: Cookies.get("targeting") === "true",
    });
  }, []);

  const handleAccept = () => {
    Cookies.set("cookieConsent", "accepted", { expires: 365 });
    setPreferences((prev) => {
      const newPreferences = { ...prev, performance: true, targeting: true };
      savePreferences(newPreferences);
      return newPreferences;
    });
    setVisible(false);
  };

  const handleReject = () => {
    Cookies.set("cookieConsent", "rejected", { expires: 365 });
    savePreferences({
      necessary: true,
      performance: false,
      targeting: false,
    });
    setVisible(false);
  };

  const savePreferences = (prefs: Preferences) => {
    Cookies.set("performance", String(prefs.performance), { expires: 365 });
    Cookies.set("targeting", String(prefs.targeting), { expires: 365 });
    setShowPreferences(false);
    console.log("Saved preferences:", prefs);
  };

  const handleClose = () => {
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 bg-white text-gray-800 z-50 border-t border-gray-300 cookie-banner">
      <div className="relative mt-1">
        <button
          onClick={handleClose}
          type="button"
          className="text-gray-400 hover:text-gray-100 transition duration-300 ease-in-out absolute top-0 right-0"
          aria-label="Close"
        >
          <XMarkIcon className="text-gray-900 hover:text-gray-100 transition duration-300 ease-in-out w-6 h-6" />
        </button>
      </div>
      <div className="max-w-screen-lg mx-auto flex flex-col md:flex-row justify-between items-center py-6 md:py-3 gap-5 px-4">
        <div className="flex items-center gap-2">
          {/* Make sure `cookie.png` is placed in `public` directory */}
          <Image
            src={CookieImage}
            alt="Cookies"
            className="w-10 h-10"
            width={40}
            height={40}
          />
          <p className="text-sm sm:text-base font-normal">
            This website uses cookies to ensure you get the best experience. |{" "}
            <Link href="/privacy-policy" className="underline">
              Read our Privacy Policy
            </Link>
          </p>
        </div>
        <div className="space-x-2 flex items-center">
          <button
            onClick={() => setShowPreferences(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-800"
          >
            Preferences
          </button>
          <button
            onClick={handleAccept}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-800"
          >
            Decline
          </button>
        </div>
      </div>

      {showPreferences && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50 px-4 xl:px-0">
          <div className="bg-white text-gray-800 rounded-lg p-3 md:p-6 max-w-screen-lg mx-auto relative min-w-64">
            <button
              onClick={() => setShowPreferences(false)}
              className="text-gray-400 hover:text-gray-100 transition duration-300 ease-in-out absolute top-1 right-2 md:top-4 md:right-4"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
            <h2 className="text-sm md:text-lg font-bold mb-2">
              Manage Consent Preferences
            </h2>
            <p className="text-sm mb-4">
              We use Cookies to optimize website functionality, analyze
              performance, and provide a personalized experience. Some cookies
              are essential to make the website operate correctly, and these
              cannot be disabled.
            </p>

            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p>Strictly Necessary Cookies</p>
                  <p className="text-xs text-gray-500">
                    These cookies are essential for the website to function and
                    cannot be disabled in your systems.
                  </p>
                </div>
                <span className="text-green-600 font-medium md:font-bold">
                  Always Allowed
                </span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div>
                  <p>Performance Cookies</p>
                  <p className="text-xs text-gray-500">
                    These cookies help us understand how visitors interact with
                    our website, enabling us to improve performance and user
                    experience.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.performance}
                    onChange={() => handlePreferenceChange("performance")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white"></div>
                </label>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div>
                  <p>Targeting Cookies</p>
                  <p className="text-xs text-gray-500">
                    These cookies are used to deliver advertisements that are
                    more relevant to you and your interests.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.targeting}
                    onChange={() => handlePreferenceChange("targeting")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-white"></div>
                </label>
              </div>

              <button
                className="mt-4 bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-800"
                onClick={() => savePreferences(preferences)}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CookieConsent;
