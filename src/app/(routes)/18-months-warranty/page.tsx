"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

// Dynamic imports
const Nav = dynamic(() => import("@/app/components/navbar/Nav"), {
  ssr: false,
});


const TopBar = dynamic(() => import("@/app/topbar/page"), { ssr: false });

export default function WarrantyPage() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const faqs = [
    {
      question: "1. Is the warranty available for all refurbished products?",
      answer:
        "Yes. Every refurbished device purchased directly from Zextons includes our full 18-month warranty at no extra cost.",
    },
    {
      question: "2. Do brand-new devices also have warranty coverage?",
      answer:
        "Yes, new devices include a 12-month warranty, while refurbished ones enjoy 18 months.",
    },
    {
      question: "3. Can I transfer my warranty to someone else?",
      answer:
        "No, the warranty is only valid for the original buyer who purchased directly from Zextons.",
    },
    {
      question: "4. How long does a repair take under warranty?",
      answer:
        "Most repairs or replacements are completed within 5–7 business days after we receive your device.",
    },
    {
      question: "5. How can I contact support?",
      answer:
        "Simply visit our Contact Page or email our team — we're here 7 days a week.",
    },
  ];

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-6">
            Zextons 18-Month Warranty – Buy with Confidence in the UK
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-8 leading-relaxed">
              When you buy a refurbished phone, tablet, or laptop from{" "}
              <Link
                href="https://zextons.co.uk"
                className="text-primary hover:underline font-semibold"
              >
                Zextons
              </Link>
              , you&apos;re not just saving money — you&apos;re investing in
              peace of mind. Every refurbished device we sell is backed by our
              exclusive 18-month warranty, giving you longer protection than
              most UK retailers.
            </p>

            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                🛡️ What Our 18-Month Warranty Covers
              </h2>
              <p className="text-gray-700 mb-4">
                Our 18-month warranty is designed to make sure your device
                performs exactly as promised. It covers all hardware and
                performance-related issues that might occur under normal use.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                ✅ Included in your warranty:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  Internal hardware faults (battery, motherboard, display,
                  camera, speaker, charging port)
                </li>
                <li>
                  Software malfunctions and system errors not caused by user
                  actions
                </li>
                <li>Battery performance issues beyond normal degradation</li>
                <li>
                  Free diagnostics, repair, or replacement service for covered
                  issues
                </li>
              </ul>

              <p className="text-gray-700 mt-4">
                Each refurbished product — from Refurbished iPhones to
                Refurbished Samsung Phones — comes with this industry-leading
                coverage.
              </p>
            </div>

            <div className="bg-red-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4">
                What&apos;s Not Covered
              </h2>
              <p className="text-gray-700 mb-4">
                While we go above and beyond, certain conditions fall outside
                our warranty policy:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  Physical damage such as cracked screens or dropped devices
                </li>
                <li>Water damage or liquid exposure</li>
                <li>Unauthorized repairs or tampering</li>
                <li>Accidental damage, theft, or loss</li>
              </ul>
              <p className="text-gray-700 mt-4">
                If your issue doesn&apos;t qualify under the warranty,
                don&apos;t worry — we still offer affordable repair services
                through our Phone Repair Centre in Abingdon.
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                🧾 How to Claim Your Warranty
              </h2>
              <p className="text-gray-700 mb-4">
                Claiming your warranty is quick, transparent, and
                customer-friendly.
              </p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Contact Us:
                  </h3>
                  <p className="text-gray-700">
                    Reach our support team via the Contact Page or email
                    hello@zextons.co.uk.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Provide Details:
                  </h3>
                  <p className="text-gray-700">
                    Share your order number, purchase date, and a short
                    description of the issue.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Ship Your Device:
                  </h3>
                  <p className="text-gray-700">
                    We&apos;ll send return instructions and a free return label.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    We Repair or Replace:
                  </h3>
                  <p className="text-gray-700">
                    Once received, our certified technicians will repair or
                    replace your device and return it within days.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                💡 Why Choose Zextons Warranty?
              </h2>
              <p className="text-gray-700 mb-4">
                Most refurbished tech stores offer just 12 months of coverage —
                but at{" "}
                <Link
                  href="https://zextons.co.uk"
                  className="text-primary hover:underline font-semibold"
                >
                  Zextons
                </Link>
                , we believe our customers deserve more protection and more
                value.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    🔹 Longer Protection
                  </h3>
                  <p className="text-gray-700">
                    Enjoy 18 months of worry-free ownership — 6 months longer
                    than the industry standard.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    🔹 UK-Based Support
                  </h3>
                  <p className="text-gray-700">
                    Our dedicated UK support team ensures fast response times
                    and real-time updates.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    🔹 Certified Quality
                  </h3>
                  <p className="text-gray-700">
                    Every device undergoes 70+ quality checks before sale, and
                    our warranty ensures it stays that way.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    🔹 Peace of Mind
                  </h3>
                  <p className="text-gray-700">
                    Whether you buy a refurbished iPhone, Samsung tablet, or
                    gaming console, you&apos;re always covered by{" "}
                    <Link
                      href="https://zextons.co.uk"
                      className="text-primary hover:underline font-semibold"
                    >
                      Zextons
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                📦 Products Covered by Our Warranty
              </h2>
              <p className="text-gray-700 mb-4">
                Our 18-month warranty applies to all refurbished and brand-new
                products sold on{" "}
                <Link
                  href="https://zextons.co.uk"
                  className="text-primary hover:underline font-semibold"
                >
                  Zextons
                </Link>
                , including:
              </p>

              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Refurbished Phones</li>
                <li>Refurbished iPads & Tablets</li>
                <li>Refurbished Laptops</li>
                <li>Gaming Consoles</li>
                <li>Smartwatches & Accessories</li>
              </ul>

              <p className="text-gray-700 mt-4">
                Each product is certified, tested, and protected, giving you
                full confidence when shopping with{" "}
                <Link
                  href="https://zextons.co.uk"
                  className="text-primary hover:underline font-semibold"
                >
                  Zextons
                </Link>
                .
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-6">
                FAQs – 18-Month Warranty Explained
              </h2>

              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <button
                      className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                      onClick={() => toggleAccordion(index)}
                    >
                      <h3 className="text-lg font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </h3>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          openAccordion === index ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {openAccordion === index && (
                      <div className="px-6 pb-4">
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-primary mb-4">
                Helping Page
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <Link
                    href="/refund-and-return-policy"
                    className="text-primary hover:underline font-semibold"
                  >
                    Returns & Refund Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about-zextons"
                    className="text-primary hover:underline font-semibold"
                  >
                    About Zextons – Trusted UK Tech Store
                  </Link>
                </li>
                <li>
                  <Link
                    href="/categories/refurbished/iphone"
                    className="text-primary hover:underline font-semibold"
                  >
                    Refurbished iPhones UK
                  </Link>
                </li>
                <li>
                  <Link
                    href="/categories/samsung"
                    className="text-primary hover:underline font-semibold"
                  >
                    Refurbished Samsung Phones UK
                  </Link>
                </li>
              </ul>
            </div>

            <div className="bg-green-100 p-6 rounded-lg">
              <h2 className="text-2xl font-bold text-primary mb-4 flex items-center">
                🌿 Confidence + Care = Zextons Guarantee
              </h2>
              <p className="text-gray-700 mb-4">
                When you buy from{" "}
                <Link
                  href="https://zextons.co.uk"
                  className="text-primary hover:underline font-semibold"
                >
                  Zextons
                </Link>
                , you&apos;re choosing quality, sustainability, and security.
                Our 18-month warranty proves that every refurbished device we
                sell is built to last and supported long after purchase.
              </p>
              <p className="text-gray-700 font-semibold">
                Shop smart, buy safe, and stay protected — only at{" "}
                <Link
                  href="https://zextons.co.uk"
                  className="text-primary hover:underline font-semibold"
                >
                  Zextons.co.uk
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      </>
  );
}
