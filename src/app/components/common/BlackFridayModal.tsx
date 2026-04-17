"use client";

import { useEffect, useState, FC, FormEvent } from "react";
import axios from "axios";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import FridaySaleModalBannerImage from "@/app/assets/FridaySaleModalBannerImage.png";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  fetchDealsModalPublic,
  DEALS_MODAL_STATIC_DEFAULTS,
  type DealsModalPublicFields,
} from "@/app/services/dealsModalPublicService";

function calculateTimeLeftForEnd(endsAtIso: string) {
  const endMs = new Date(endsAtIso ?? "").getTime();
  const now = Date.now();
  if (!Number.isFinite(endMs)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const difference = endMs - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

interface BlackFridayModalProps {
  mode?: string;
}

const BlackFridayModal: FC<BlackFridayModalProps> = ({ mode }) => {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  const [cfg, setCfg] = useState<DealsModalPublicFields>(DEALS_MODAL_STATIC_DEFAULTS);
  /** When CMS turns the feature off, skip auto-popup only; FAB + manual open still use static defaults. */
  const [cmsAllowsAutoOpen, setCmsAllowsAutoOpen] = useState(true);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchDealsModalPublic();
      if (cancelled) return;
      if (res === null) return;
      if ("enabled" in res && res.enabled === false) {
        setCmsAllowsAutoOpen(false);
        return;
      }
      setCmsAllowsAutoOpen(true);
      setCfg({ ...DEALS_MODAL_STATIC_DEFAULTS, ...(res as DealsModalPublicFields) });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check localStorage on mount for permanent dismissal
  const [isPermanentlyDismissed, setIsPermanentlyDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("blackFridayPermanentlyDismissed") === "true";
    }
    return false;
  });

  // Check if modal has been shown before - use state to ensure it's set synchronously
  const [hasBeenShown, setHasBeenShown] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("blackFridayModalShown") === "true";
    }
    return false;
  });

  // Show collapsed banner by default on mount if modal has been shown before and not permanently dismissed
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const dismissed =
        localStorage.getItem("blackFridayPermanentlyDismissed") === "true";
      const shown = localStorage.getItem("blackFridayModalShown") === "true";
      return !dismissed && shown; // Show collapsed banner only if shown before and not dismissed
    }
    return false; // First visit: don't show collapsed, show full modal
  });

  // Only allow isOpen to be true on first visit (after 10 seconds) or when expanded from collapsed banner
  const [isOpen, setIsOpen] = useState(() => {
    // On subsequent visits, isOpen should always start as false
    if (typeof window !== "undefined") {
      const shown = localStorage.getItem("blackFridayModalShown") === "true";
      return false; // Always start as false, will be set to true after 10 seconds on first visit only
    }
    return false;
  });
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Check if email was already submitted - show discount code view if yes
  const [showDiscountCode, setShowDiscountCode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("blackFridayEmailSubmitted") === "true";
    }
    return false;
  });
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const discountCode = cfg.discountCode;

  const [timeLeft, setTimeLeft] = useState(() =>
    calculateTimeLeftForEnd(DEALS_MODAL_STATIC_DEFAULTS.countdownEndsAt)
  );

  const auth = useAuth();

  // Check if we're on checkout page
  const isOnCheckoutPage = pathname?.startsWith("/checkout") ?? false;

  // Check if ProductCart is open - hide banner if it is
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let modalTimer: ReturnType<typeof setTimeout> | undefined;
    const delayMs =
      Number.isFinite(cfg.openDelayMs) && cfg.openDelayMs >= 0
        ? cfg.openDelayMs
        : DEALS_MODAL_STATIC_DEFAULTS.openDelayMs;
    if (
      cmsAllowsAutoOpen &&
      !isPermanentlyDismissed &&
      !hasBeenShown &&
      !isCollapsed
    ) {
      modalTimer = setTimeout(() => {
        setIsOpen(true);
      }, delayMs);
    }

    return () => {
      if (modalTimer) clearTimeout(modalTimer);
    };
  }, [
    cmsAllowsAutoOpen,
    isPermanentlyDismissed,
    hasBeenShown,
    isCollapsed,
    cfg.openDelayMs,
  ]);

  // Countdown: own effect so CMS `countdownEndsAt` updates apply immediately and
  // do not reset the auto-open delay timer.
  useEffect(() => {
    const endsAt = cfg.countdownEndsAt || DEALS_MODAL_STATIC_DEFAULTS.countdownEndsAt;
    const tick = () => setTimeLeft(calculateTimeLeftForEnd(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cfg.countdownEndsAt]);

  useEffect(() => {
    const checkCart = () => {
      if (typeof window !== "undefined") {
        const isOpen = document.body.hasAttribute("data-cart-open");
        setIsCartOpen(isOpen);
      }
    };

    // Check on mount
    checkCart();

    // Watch for changes using MutationObserver
    const observer = new MutationObserver(checkCart);
    if (typeof window !== "undefined") {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-cart-open"],
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Sync showDiscountCode with localStorage when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const emailSubmitted =
        localStorage.getItem("blackFridayEmailSubmitted") === "true";
      if (emailSubmitted !== showDiscountCode) {
        setShowDiscountCode(emailSubmitted);
      }
    }
  }, [isOpen, showDiscountCode]);

  const handleClose = () => {
    // If already collapsed, permanently dismiss
    if (isCollapsed) {
      setIsPermanentlyDismissed(true);
      setIsOpen(false);
      // Mark as permanently dismissed in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("blackFridayPermanentlyDismissed", "true");
      }
    } else {
      // First close: collapse the modal and mark as shown
      setIsCollapsed(true);
      setIsOpen(false);
      // Mark that modal has been shown - on next visit, only show collapsed banner
      if (typeof window !== "undefined") {
        localStorage.setItem("blackFridayModalShown", "true");
        setHasBeenShown(true);
      }
    }
    setError(null);
    setSuccess(null);
    // Don't reset showDiscountCode - it should persist based on localStorage
    setIsCodeCopied(false);
  };

  const handleExpand = () => {
    // Click on collapsed banner to expand
    setIsCollapsed(false);
    setIsOpen(true);
  };

  const handlePermanentDismiss = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding when clicking dismiss button
    setIsPermanentlyDismissed(true);
    setIsOpen(false);
    // Mark as permanently dismissed in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("blackFridayPermanentlyDismissed", "true");
    }
  };

  const handleNoThanks = () => {
    handleClose();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(discountCode);
      setIsCodeCopied(true);
      setTimeout(() => {
        setIsCodeCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      console.log("Please provide your email.");
      return;
    }

    const fullName = auth?.user
      ? `${auth?.user?.firstname} ${auth?.user?.lastname}`
      : null;

    try {
      // Use environment variable for API URL from .env file
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await axios.post(`${apiUrl}/blackfridaymodal`, {
        fullName,
        email,
        mode: "homepage",
      });
      if (response.status === 200) {
        setEmail(""); // Clear email field after successful subscription
        setSuccess(cfg.successSubscribeMessage);
        // Save to localStorage that email was submitted
        if (typeof window !== "undefined") {
          localStorage.setItem("blackFridayEmailSubmitted", "true");
        }
        // Show discount code view after a brief delay
        setTimeout(() => {
          setShowDiscountCode(true);
          setSuccess(null);
        }, 1500);
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
  };

  if (!hasMounted) return null;
  if (isPermanentlyDismissed) return null;

  const showHotUkDealsButton =
    !isOnCheckoutPage && !isCartOpen && !isOpen;

  const triggerLabel =
    cfg.collapsedBannerText?.trim() ||
    DEALS_MODAL_STATIC_DEFAULTS.collapsedBannerText;

  const dealsUi = (
    <>
      {showHotUkDealsButton && (
        <div
          className="pointer-events-auto fixed bottom-20 left-3 sm:bottom-6 sm:left-4 z-[10050] flex max-w-[calc(100vw-1.5rem)] items-stretch rounded-lg shadow-2xl overflow-hidden ring-2 ring-white/25"
          role="complementary"
          aria-label="Hot UK Deals promotion"
        >
          <button
            type="button"
            onClick={handleExpand}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2.5 sm:px-4 sm:py-3 font-bold text-left text-xs sm:text-sm uppercase tracking-wide hover:from-orange-600 hover:to-red-600 focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-400 transition-colors min-w-0 min-h-[44px] flex-1 sm:min-h-0"
          >
            {triggerLabel}
          </button>
          <button
            type="button"
            onClick={handlePermanentDismiss}
            aria-label="Permanently dismiss Hot UK Deals"
            className="text-white shrink-0 bg-black/30 hover:bg-black/45 focus-visible:outline focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60 px-2.5 min-h-[44px] sm:min-h-0 flex items-center justify-center border-l border-white/25"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-4 sm:size-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {isOpen && (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[10051] px-2 sm:px-4 py-2 sm:py-4 overflow-y-auto">
      <div className="relative rounded-lg shadow-2xl overflow-hidden max-w-3xl w-full flex flex-col md:flex-row my-auto max-h-[95vh] md:max-h-[90vh] transform transition-all duration-300 ease-in-out">
        {/* Left Section - White Background */}
        <div className="w-full md:w-3/5 px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 lg:py10- flex flex-col justify-between bg-gradient-to-br from-white via-gray-50 to-white min-h-[400px] md:min-h-[500px] relative overflow-y-auto max-h-[95vh] md:max-h-none">
          {/* Close button for mobile - positioned in top right */}
          <button
            onClick={handleClose}
            aria-label="Close Hot UK Deals modal"
            className="absolute top-3 right-3 md:hidden z-20 text-gray-600 hover:text-gray-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-600 transition-all bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/30 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-100/30 to-transparent rounded-full blur-3xl"></div>

          <div className="relative z-10">
            {showDiscountCode ? (
              /* Discount Code View */
              <div className="flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px]">
                {/* Success Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6 shadow-md">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-white text-sm md:text-base font-bold uppercase tracking-wide">
                    {cfg.discountViewSuccessBadge}
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 uppercase mb-4 md:mb-6 leading-tight tracking-tight text-center">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    {cfg.discountViewHeadline}
                  </span>
                </h1>

                {/* Description */}
                <p className="text-sm md:text-base lg:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed font-medium text-center max-w-md">
                  {cfg.discountViewDescription}
                </p>

                {/* Discount Code Display */}
                <div className="w-full max-w-md mb-6 md:mb-8">
                  <p className="text-xs md:text-sm text-gray-600 font-semibold mb-3 uppercase tracking-wide text-center">
                    {cfg.discountViewLabel}
                  </p>
                  <div className="relative bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4 md:p-6 shadow-lg">
                    <div className="flex items-center justify-between gap-4">
                      <code className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-wider flex-1 text-center">
                        {discountCode}
                      </code>
                      <button
                        onClick={handleCopyCode}
                        className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-lg font-bold text-sm md:text-base transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                      >
                        {isCodeCopied ? (
                          <>
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>{cfg.copiedButtonText}</span>
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            <span>{cfg.copyCodeButtonText}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Thank you message */}
                <p className="text-sm md:text-base text-gray-600 italic text-center">
                  {cfg.discountViewThankYou}
                </p>
              </div>
            ) : (
              <>
                {/* Badge/Offer highlight */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mb-4 shadow-md">
                  <span className="text-white text-xs md:text-sm font-bold uppercase tracking-wide">
                    {cfg.badgeText}
                  </span>
                </div>

                {/* Headline */}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 uppercase mb-3 md:mb-4 leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    {cfg.headline}
                  </span>
                </h1>

                {/* Description text */}
                <div className="mb-4">
                  <p className="text-sm md:text-base lg:text-lg text-gray-700 mb-2 leading-relaxed font-medium">
                    {cfg.descriptionPrimary}
                  </p>
                  <p className="text-sm md:text-base text-gray-600 italic">
                    {cfg.descriptionSecondary}
                  </p>
                </div>

                {/* Countdown Timer */}
                <div className="mb-4">
                  <p className="text-xs md:text-sm text-gray-500 font-medium mb-2 sm:mb-3 uppercase tracking-wide">
                    {cfg.countdownLabel}
                  </p>
                  <div className="flex gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
                    <div className="flex flex-col items-center bg-gradient-to-br from-gray-50 to-white rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 shadow-md border border-gray-200 flex-1 min-w-0">
                      <span className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none mb-0.5 sm:mb-1">
                        {String(timeLeft.days).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wide">
                        days
                      </span>
                    </div>
                    <div className="flex flex-col items-center bg-gradient-to-br from-gray-50 to-white rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 shadow-md border border-gray-200 flex-1 min-w-0">
                      <span className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none mb-0.5 sm:mb-1">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wide">
                        hours
                      </span>
                    </div>
                    <div className="flex flex-col items-center bg-gradient-to-br from-gray-50 to-white rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 shadow-md border border-gray-200 flex-1 min-w-0">
                      <span className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none mb-0.5 sm:mb-1">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-600 font-semibold uppercase tracking-wide">
                        minutes
                      </span>
                    </div>
                    <div className="flex flex-col items-center bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 shadow-md border border-orange-200 flex-1 min-w-0">
                      <span className="text-xl sm:text-2xl font-extrabold text-orange-600 leading-none mb-0.5 sm:mb-1">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </span>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-orange-600 font-semibold uppercase tracking-wide">
                        seconds
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={cfg.emailPlaceholder}
                      className="w-full px-4 py-3 md:py-3.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-base sm:text-sm bg-white shadow-sm transition-all hover:border-purple-400"
                      style={{ borderColor: "#9333EA" }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-600 text-xs md:text-sm mt-2 font-medium flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {error}
                    </p>
                  )}
                  {success && (
                    <p className="text-green-600 text-xs md:text-sm mt-2 font-medium flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {success}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="my-3 sm:my-4 w-full font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-800 text-xs sm:text-sm md:text-base transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <span className="text-center">
                      {cfg.submitButtonText}
                    </span>
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Privacy Policy Text */}
          <p className="relative z-10 text-[9px] sm:text-[10px] md:text-xs text-gray-600 leading-relaxed">
            By submitting this form, you consent to receive informational (e.g.,
            order updates, verification requests) and/or promotional texts
            (e.g., special offers or cart reminders) from Zextons, which may
            include automated messages. Consent is not a condition of purchase.
            Standard message and data rates may apply. Message frequency varies.
            You can unsubscribe at any time by replying STOP or clicking the
            unsubscribe link (where available). See our{" "}
            <Link
              href="/privacy-policy"
              className="underline hover:text-gray-600"
            >
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link
              href="/terms-and-conditions"
              className="underline hover:text-gray-600"
            >
              Terms
            </Link>{" "}
            for more details.
          </p>
        </div>

        {/* Right Section - Image Background */}
        <div className="hidden md:flex w-full md:w-2/5 relative items-stretch justify-center overflow-hidden min-h-[280px]">
          {/* Background Image — CMS URL or default bundled asset */}
          {cfg.bannerImageUrl?.trim() ? (
            <Image
              src={cfg.bannerImageUrl.trim()}
              alt={cfg.rightPanelImageAlt}
              fill
              className="object-cover"
              sizes="40vw"
              priority
              unoptimized={
                cfg.bannerImageUrl.startsWith("http://") ||
                cfg.bannerImageUrl.startsWith("https://")
              }
            />
          ) : (
            <Image
              src={FridaySaleModalBannerImage}
              alt={cfg.rightPanelImageAlt}
              className="w-full h-full object-fit"
              priority
            />
          )}

          {/* Close button - positioned in top right */}
          <button
            onClick={handleClose}
            aria-label="Close Hot UK Deals modal"
            className="absolute top-3 right-3 md:top-4 md:right-4 z-20 text-white hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/70 transition-all bg-black/40 hover:bg-black/60 rounded-full p-1.5 md:p-2 shadow-lg backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5 md:size-6"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
      )}
    </>
  );

  return dealsUi;
};

export default BlackFridayModal;
