"use client";
import Link from "next/link";
import React, { useState, useEffect, useMemo } from "react";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import { Offer, DealApiResponse } from "../../../../types";
import axiosInstance from "@/app/lib/axios";

// Helper function to format date from API (ISO string) to readable format
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

// Helper function to map API response to Offer format
const mapDealToOffer = (deal: DealApiResponse): Offer => {
  // If deal is expired, set type to "Expired"
  const offerType = deal.isExpired ? "Expired" : deal.type;

  return {
    id: deal._id,
    title: deal.title,
    desc: deal.desc,
    type: offerType,
    expiry: deal.expiryText,
    startDate: formatDate(deal.startDate),
    emoji: deal.emoji,
    link: deal.link || undefined,
    buttonText: deal.buttonText || undefined,
    coupontext: deal.couponCode || undefined,
  };
};
const faqs = [
  {
    question:
      "What is the difference between a discount code and a promotional voucher?",
    answer:
      "A discount code is entered during checkout for an instant reduction in price. A promotional voucher may have specific usage conditions.",
  },
  {
    question: "Can I use my code or voucher online or in-store?",
    answer:
      "Some codes can be used online only, while others are valid for in-store purchases. Check the terms of the voucher.",
  },
  {
    question: "What product(s) is my code or voucher valid on?",
    answer:
      "Your code is valid on selected products only. Review the eligible product list for more details.",
  },
  {
    question: "Can I use multiple voucher codes?",
    answer:
      "Typically, only one code can be used per transaction unless stated otherwise.",
  },
  {
    question: "Can I use the code on top of other offers?",
    answer:
      "It depends on the offer. Check the terms of the code for stacking eligibility.",
  },
  {
    question: "Why isn't my code or voucher working online?",
    answer:
      "Ensure the code is entered correctly and still valid. Some codes may have expired or have usage restrictions.",
  },
];
// Reusable FilterButton Component
const FilterButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md font-medium transition ${
      active
        ? "bg-primary text-white"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }`}
  >
    {label}
  </button>
);

// Reusable OfferCard Component

const OfferCard = ({ offer }: { offer: Offer }) => {
  const [isCopied, setIsCopied] = useState(false); // State to track if coupon is copied

  const handleCopy = async (coupontext: string) => {
    try {
      await navigator.clipboard.writeText(coupontext);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset copied state after 2 seconds
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div
      className={`border rounded-lg p-6 flex justify-between items-center shadow-md ${
        offer.type === "Expired" ? "bg-gray-100" : "bg-white"
      }`}
    >
      {/* Emoji Section */}
      <div className="flex-shrink-0 text-4xl mr-4">{offer.emoji}</div>

      {/* Offer Details */}
      <div className="flex-grow">
        <h3 className="text-lg font-bold">{offer.title}</h3>
        <p className="text-gray-500 font-medium">{offer.desc}</p>
        <div className="text-sm text-gray-500 mt-2 space-y-1">
          {offer.startDate && <p>Starts: {offer.startDate}</p>}
          <p>Expires: {offer.expiry}</p>
        </div>
      </div>

      {/* Button Section */}
      {offer.type === "Expired" ? (
        <button
          className="px-4 py-2 rounded-md font-medium shadow bg-gray-400 text-white cursor-not-allowed"
          disabled
        >
          Expired
        </button>
      ) : offer.type === "Coupon" && offer?.coupontext ? (
        <button
          className="px-4 py-2 rounded-md font-medium shadow bg-primary text-white hover:bg-secondary-dark relative"
          onClick={() => handleCopy(offer.coupontext!)}
        >
          {isCopied ? "Copied!" : offer.coupontext}
        </button>
      ) : offer.type === "Deal" && offer.link ? (
        <Link
          href={offer.link}
          className="px-4 py-2 rounded-md font-medium shadow bg-primary text-white hover:bg-primary-dark"
        >
          {offer.buttonText || "GET DEAL"}
        </Link>
      ) : null}
    </div>
  );
};
export default function DealsAndDiscounts() {
  const [filter, setFilter] = useState<string>("All");
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch deals from API
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axiosInstance.get("/get/active/deals");

        if (response.data && response.data.deals) {
          const mappedOffers = response.data.deals.map(
            (deal: DealApiResponse) => mapDealToOffer(deal)
          );
          setOffers(mappedOffers);
        } else {
          setError("No deals found");
          setOffers([]);
        }
      } catch (err: any) {
        console.error("Error fetching deals:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load deals. Please try again later."
        );
        setOffers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeals();
  }, []);

  const handleFilter = (type: string) => {
    setFilter(type);
  };

  // Filter and sort offers: expired ones at the bottom
  const filteredOffers = useMemo(() => {
    const filtered =
      filter === "All"
        ? offers
        : offers.filter((offer) => offer.type === filter);

    // Sort: expired offers at the bottom, active offers at the top
    return [...filtered].sort((a, b) => {
      const aIsExpired = a.type === "Expired";
      const bIsExpired = b.type === "Expired";

      // If one is expired and the other isn't, expired goes to bottom
      if (aIsExpired && !bIsExpired) return 1;
      if (!aIsExpired && bIsExpired) return -1;

      // If both have the same expired status, maintain original order
      return 0;
    });
  }, [offers, filter]);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(
      (prevOpenFAQ: number | null) =>
        (prevOpenFAQ === index ? null : index) as number | null
    );
  };

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-4 text-sm">
        <nav>
          <Link
            href={"/"}
            className="hover:underline"
            aria-label="Go to Zextons Home"
          >
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link
            href={"/"}
            className="hover:underline"
            aria-label="Go to Zextons Home"
          >
            Home
          </Link>
        </nav>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Deals & Discounts
        </h1>
        <p className="text-lg md:text-xl">
          The latest promo codes and offers at Zextons and how to use them.
        </p>
      </div>

      {/* Filtering Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6">
          Next Discount Code, Coupons, and Promo Codes
        </h2>

        {/* Filter Buttons */}
        <div className="flex gap-4 mb-6">
          {["All", "Deal", "Coupon", "Expired"].map((type) => (
            <FilterButton
              key={type}
              label={type}
              active={filter === type}
              onClick={() => handleFilter(type)}
            />
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading deals...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filtered Offers */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 gap-6">
            {filteredOffers.length > 0 ? (
              filteredOffers.map((offer) => (
                <OfferCard key={offer.id || Math.random()} offer={offer} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  No deals found for the selected filter.
                </p>
              </div>
            )}
          </div>
        )}
      </section>
      {/* How-To Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6">
          How to Use Our Online Discount Codes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="font-semibold text-lg">Step 1</h3>
            <h3 className="font-semibold text-lg">
              Step 1 : Browse and Add Items to Your Cart
            </h3>
            <p className="text-gray-600 mt-2">
              {` Look out for codes across our site, browse the complete list of
              active codes below or check your email for promotional vouchers.
              Start by shopping on our website and adding the items you wish to
              purchase to your shopping cart. When you're ready to checkout,
              click on the cart icon at the top right of the page to view your
              items. `}
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">🎁</div>
            <h3 className="font-semibold text-lg">Step 2</h3>
            <h3 className="font-semibold text-lg">
              Step 2 : Enter Your Discount Code at Checkout
            </h3>
            <p className="text-gray-600 mt-2">
              {`  Check T&Cs to see how the code works. Browse eligible products,
              add them to your basket and head to checkout when ready. Once
              you're on the checkout page, you'll see a section labeled
              "Discount Code" or "Promo Code." Simply enter your unique discount
              code in the box provided. `}
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">✅</div>
            <h3 className="font-semibold text-lg">Step 3</h3>
            <h3 className="font-semibold text-lg">
              {` Step 3:Apply and Enjoy Your Discount `}
            </h3>
            <p className="text-gray-600 mt-2">
              {`  Select home delivery, or find your nearest Argos store or
              collection point. Enter the code on the payment page, click
              'Apply' and pay online. After entering your code, click the
              "Apply" button to activate the discount. You'll see the updated
              price reflecting the discount. Proceed with your payment to
              complete the order. `}
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">🚚</div>
            <h3 className="font-semibold text-lg">Step 4</h3>
            <h3 className="font-semibold text-lg">
              {` Step 4 : We’ll Deliver to Your Door in a Timely Manner`}
            </h3>
            <p className="text-gray-600 mt-2">
              {`  We’ll deliver to you, or you can collect your order from your
              chosen Argos store or collection point. After completing your
              purchase, sit back and relax! We’ll handle the rest and ensure
              your items are delivered directly to your doorstep in a timely
              manner. `}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-bold mb-6">Frequently asked questions</h2>
        <div className="divide-y divide-gray-200">
          {faqs.map((faq, index) => (
            <div key={index} className="py-4">
              <button
                className="w-full text-left flex justify-between items-center text-lg font-semibold text-gray-900"
                onClick={() => toggleFAQ(index)}
              >
                {faq.question}
                <span>{openFAQ === index ? "−" : "+"}</span>
              </button>
              <div
                className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                  openFAQ === index ? "max-h-screen" : "max-h-0"
                }`}
              >
                <p className="mt-2 text-gray-600 text-base font-medium">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Section */}
      </>
  );
}
