"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import clearpay from "@/app/assets/clearpay.png";
import paypall from "@/app/assets/paypall.png";
import klarna from "@/app/assets/klarna.png";
import Image from "next/image";
// Dynamic imports
const Nav = dynamic(() => import("@/app/components/navbar/Nav"), {
  ssr: false,
});


const TopBar = dynamic(() => import("@/app/topbar/page"), { ssr: false });

export default function BuyNowPayLaterPage() {
  const [openAccordion, setOpenAccordion] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const faqs = [
    {
      question: "How does Klarna Pay in 3 work?",
      answer:
        "Klarna's Pay in 3 allows you to split your total purchase into three equal interest-free payments. The first payment is taken at checkout, followed by two more every 30 days. Example: £300 purchase = £100 at checkout, £100 after 30 days, and £100 after 60 days. Manage payments and reminders in the Klarna app.",
    },
    {
      question: "What is Clearpay and how does it work?",
      answer:
        "Clearpay lets you pay for your purchase in four equal interest-free instalments, taken every two weeks. Example: £240 purchase = 4 x £60 instalments. No fees when you pay on time.",
    },
    {
      question: "Can I use PayPal Pay in 3 on Zextons?",
      answer:
        "Yes! Eligible customers can select PayPal Pay in 3 at checkout. You'll split your order into three monthly payments with 0% interest.",
    },
    {
      question: "Who can use Buy Now Pay Later options?",
      answer:
        "BNPL options are available to UK residents aged 18+ who meet the provider's eligibility criteria. Providers may perform a soft credit check which does not affect your credit score.",
    },
    {
      question: "Will using BNPL affect my credit score?",
      answer:
        "Paying on time usually won't affect your score, but missed or late payments could impact future credit eligibility or result in late fees.",
    },
    {
      question: "Is Buy Now Pay Later regulated by the FCA?",
      answer:
        "Some BNPL products are not regulated by the Financial Conduct Authority (FCA), including Klarna's Pay in 3, Clearpay, and PayPal Pay in 3.",
    },
    {
      question: "Can I return or cancel an order made with BNPL?",
      answer:
        "Yes — our returns policy applies to BNPL purchases as normal. The provider will adjust or cancel your remaining payments accordingly.",
    },
    {
      question: "How do I get help with a BNPL payment issue?",
      answer:
        "For payment issues, contact your provider directly. For order queries, contact Zextons Support at hello@zextons.co.uk.",
    },
  ];

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <main className="mx-auto max-w-7xl p-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-6">
            Buy Now, Pay Later with Klarna, Clearpay & PayPal | Zextons
          </h1>

          <div className="prose prose-lg max-w-none">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-12 border border-green-100">
              <h2 className="text-xl font-bold text-primary mb-4">
                Shop Now. Pay Later. Stress-Free.
              </h2>
              <p className="text-gray-700 leading-relaxed">
                At Zextons, we make it easier to get the tech you love today —
                and spread the cost over time with Klarna, Clearpay, and PayPal
                Pay in 3. Choose the payment method that suits you best — all
                with 0% interest, no hidden fees, and fast approval.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-100">
              <h2 className="text-xl font-bold text-primary mb-6">
                Flexible Payment Options
              </h2>

              <div className="space-y-8">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                      Klarna – Pay in 3
                    </h3>
                    <div className="flex-shrink-0">
                      <Image
                        src={klarna}
                        alt="Klarna Logo"
                        className="object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-4">
                      Split your purchase into three equal payments. No interest
                      or fees when paid on time. Manage easily in the Klarna
                      app. Instant decision at checkout.
                    </p>
                    <p className="text-gray-700 mb-4">
                      <strong>Example:</strong> £300 purchase = 3 x £100
                      payments.
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      <strong>Important:</strong> Klarna&apos;s Pay Later
                      products are not regulated by the FCA.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Read Klarna&apos;s Terms:</strong>{" "}
                      <a
                        href="https://www.klarna.com/uk/terms-and-conditions/"
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Klarna Terms & Conditions
                      </a>
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                      Clearpay – Pay in 4
                    </h3>
                    <div className="flex-shrink-0">
                      <Image
                        src={clearpay}
                        alt="Clearpay Logo"
                        className="object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Spread your cost into four fortnightly, interest-free
                    payments. No setup fees. Quick approval. Manage payments
                    through the Clearpay app.
                  </p>
                  <p className="text-gray-700 mb-4">
                    <strong>Example:</strong> £240 purchase = 4 x £60 payments.
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Read Clearpay Terms:</strong>{" "}
                    <a
                      href="https://www.clearpay.co.uk/en-GB/terms"
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Clearpay Terms of Service
                    </a>
                  </p>
                </div>

                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                      PayPal Pay in 3
                    </h3>
                    <div className="flex-shrink-0">
                      <Image
                        src={paypall}
                        alt="PayPal Logo"
                        className="object-contain rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-700 mb-4">
                      Split your total into three monthly payments with 0%
                      interest. No hidden fees. Simple approval in seconds.
                      Available to eligible UK customers.
                    </p>
                    <p className="text-gray-700 mb-4">
                      <strong>Example:</strong> £300 purchase = 3 x £100 monthly
                      payments.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Read PayPal Pay in 3 Terms:</strong>{" "}
                      <a
                        href="https://www.paypal.com/uk/webapps/mpp/pay-in-3"
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        PayPal Pay in 3
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-6 rounded-lg mb-8 border border-red-100">
              <h2 className="text-xl font-bold text-primary mb-4">
                Responsible Spending & Legal Notice
              </h2>
              <p className="text-gray-700 mb-4">
                BNPL services are a form of credit. Please ensure you can afford
                repayments before choosing these options. Zextons acts as an
                introducer, not a lender. Your agreement is with the chosen
                provider.
              </p>
              <p className="text-gray-700">
                Klarna Pay Later and Pay in 3 are not FCA-regulated. Clearpay
                and PayPal Pay in 3 are unregulated credit agreements.
                Advertising and information are provided in line with ASA and
                FCA guidance for clear, fair, and non-misleading promotions.
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg mb-8 border border-green-100">
              <h2 className="text-xl font-bold text-primary mb-4">
                How to Use BNPL at Checkout
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Add your items to your basket.</li>
                <li>
                  Choose Klarna, Clearpay, or PayPal Pay in 3 at checkout.
                </li>
                <li>Complete the quick approval process.</li>
                <li>Enjoy your new tech — pay over time, interest-free.</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-bold text-primary mb-6">
                Frequently Asked Questions – Buy Now Pay Later at Zextons
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
              <h2 className="text-xl font-bold text-primary mb-4">
                Support & Useful Links
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Klarna Customer Service:</strong>{" "}
                  <a
                    href="https://www.klarna.com/uk/customer-service/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://www.klarna.com/uk/customer-service/
                  </a>
                </li>
                <li>
                  <strong>Clearpay Help:</strong>{" "}
                  <a
                    href="https://www.clearpay.co.uk/en-GB/help"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://www.clearpay.co.uk/en-GB/help
                  </a>
                </li>
                <li>
                  <strong>PayPal UK:</strong>{" "}
                  <a
                    href="https://www.paypal.com/uk"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://www.paypal.com/uk
                  </a>
                </li>
                <li>
                  <strong>Zextons Returns Policy:</strong>{" "}
                  <a
                    href="https://zextons.co.uk/refund-and-return-policy"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://zextons.co.uk/refund-and-return-policy
                  </a>
                </li>
                <li>
                  <strong>Contact Zextons Support (email):</strong>{" "}
                  <a
                    href="mailto:hello@zextons.co.uk"
                    className="text-primary hover:underline"
                  >
                    hello@zextons.co.uk
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-bold text-primary mb-4">
                Legal Disclaimer
              </h2>
              <p className="text-gray-700 mb-4">
                Zextons Tech Store is not a lender and acts only as an
                introducer to payment providers including Klarna Bank AB (publ),
                Clearpay Finance Ltd, and PayPal (Europe) S.à r.l. et Cie,
                S.C.A.
              </p>
              <p className="text-gray-700 mb-4">
                Credit is provided by these third parties and is subject to
                eligibility, status, and approval. Terms and conditions apply.
                Late or missed payments may affect your ability to access credit
                in the future.
              </p>
              <p className="text-gray-700 mb-4">
                Klarna&apos;s Pay in 3 and Pay Later, Clearpay, and PayPal Pay
                in 3 are unregulated credit agreements. Borrow responsibly —
                ensure you can make repayments on time.
              </p>
              <p className="text-gray-700 font-semibold">
                Zextons Tech Store acts as an introducer and not a lender.
                Credit is provided by Klarna, Clearpay, and PayPal, subject to
                status. Terms and conditions apply. Please borrow responsibly.
              </p>
            </div>
          </div>
        </div>
      </main>

      </>
  );
}
