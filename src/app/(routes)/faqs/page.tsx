"use client";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import React, { useState } from "react";
import { Disclosure } from "@headlessui/react";
import {
  PlusIcon,
  PlusSmallIcon,
  MinusSmallIcon,
  MinusIcon,
} from "@heroicons/react/20/solid";
export default function FAQSPage() {
  const [activeTab, setActiveTab] = useState<string>("delivery");
  const faqs = [
    {
      id: 1,
      question: "HOW LONG IT WILL TAKE TO GET MY DEVICE?",
      answer:
        "Approx 2 – 3 days for standard delivery and 1 – 2 days for special delivery.",
    },
    {
      id: 2,
      question: "WHAT IF I DIDN′T LIKE THE DEVICE OR I HAVE CHANGED MY MIND?",
      answer:
        "We offer 30 days return on all our devices, and we offer to buy now pay later service, please select at checkout.",
    },
    {
      id: 3,
      question:
        "WHAT HAPPEN IF MY DEVICE GOT ISSUE AFTER RETURN PERIOD PASSED?",
      answer:
        "We offer a 12-month warranty on all the devices you purchase from our online store so you can buy with confidence.",
    },
    {
      id: 4,
      question: "WHAT IS THE DIFFERENCE BETWEEN LIKE NEW AND GOOD CONDITION?",
      answer:
        "So to make things smooth & easy for our customers we have two conditions for refurbished phones, like new and good.",
    },
    {
      id: 5,
      question: "What types of refurbished devices do you sell?",
      answer:
        "We offer a wide selection of refurbished mobile devices (phones and tablets), laptops, and video game consoles.",
    },
    {
      id: 6,
      question: "What condition are your refurbished devices in?",
      answer:
        "We categorize our devices into two grades: Like New (Grade A) and Good (Grade B). Both grades are fully functional and have undergone rigorous testing. Like New devices show minimal signs of wear, while Good devices may show moderate signs of wear but are still in excellent working condition.",
    },
    {
      id: 7,
      question: "What's the difference between refurbished and used?",
      answer:
        "Refurbished devices have been professionally inspected, cleaned, tested, and repaired (if necessary) to ensure they function like new. Used devices haven’t necessarily undergone the same level of testing and refurbishment.",
    },
    {
      id: 8,
      question: "Are your refurbished devices covered by a warranty?",
      answer:
        "Yes! We offer a 18 months warranty on all our refurbished devices for your peace of mind.",
    },
    {
      id: 9,
      question: "What is your return policy?",
      answer:
        "We offer a 30-day return policy on all devices. If you’re not satisfied with your purchase, you can simply return it for a full refund.",
    },
  ];
  const BuyingProcess = [
    {
      question: "How do I order a refurbished device?",
      answer:
        "Ordering is easy! Simply browse our selection of devices online, choose the one that meets your needs, and add it to your cart. You can then complete your purchase securely through our website.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards and debit cards.",
    },
    {
      question: "How long does shipping take?",
      answer:
        "We typically ship orders within the same day if placed before 12 PM BST. Delivery times will vary depending on your location.",
    },
    {
      question: "Do you offer international shipping?",
      answer: "Currently, we only offer shipping within the UK.",
    },
  ];
  const TechnicalSupport = [
    {
      question: "What if I have a problem with my refurbished device?",
      answer:
        "If you experience any issues with your device, please don't hesitate to contact our friendly customer support team. We're here to help!",
    },
    {
      question: "Do you offer technical support for refurbished devices?",
      answer:
        "Yes, we offer comprehensive technical support for all our devices. Our team can assist you with troubleshooting, software updates, and other technical inquiries",
    },
  ];
  const AboutZextons = [
    {
      question: "What is Zextons' mission?",
      answer:
        "Our mission is to make high-quality tech accessible and affordable for everyone, while also minimizing our environmental impact by promoting the reuse of electronic devices.",
    },
    {
      question: "How long has Zextons been in business?",
      answer: "We've been serving customers for over 15 years!",
    },
    {
      question: "Why should I choose Zextons for my refurbished tech needs?",
      answer:
        "We offer a wide selection of top-quality devices at competitive prices. We prioritize customer satisfaction with exceptional service and support. Plus, by choosing refurbished, you're making a responsible choice for the environment.",
    },
  ];
  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <div className="relative flex-1 px-4 sm:px-6 mt-5">
          <h2 className="text-3xl font-bold text-primary mb-4">
            General Questions
          </h2>
          <dl className=" space-y-6 divide-y divide-gray-900/10">
            {faqs.map((faq) => (
              <Disclosure as="div" key={faq.id} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7 uppercase">
                          {faq.question}
                        </span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <PlusIcon className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600 text-justify">
                        {faq.answer}
                      </p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>

          <h2 className="text-3xl font-bold text-primary mb-4 mt-10">
            Buying Process
          </h2>
          <dl className=" space-y-6 divide-y divide-gray-900/10">
            {BuyingProcess.map((process) => (
              <Disclosure as="div" key={process.question} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7 uppercase">
                          {process.question}
                        </span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusSmallIcon
                              className="h-6 w-6"
                              aria-hidden="true"
                            />
                          ) : (
                            <PlusSmallIcon
                              className="h-6 w-6"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600 text-justify">
                        {process.answer}
                      </p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>
          <h2 className="text-3xl font-bold text-primary mb-4 mt-10">
            Technical Support
          </h2>
          <dl className=" space-y-6 divide-y divide-gray-900/10">
            {TechnicalSupport.map((support) => (
              <Disclosure as="div" key={support.question} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7 uppercase">
                          {support.question}
                        </span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <PlusIcon className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600 text-justify">
                        {support.answer}
                      </p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>
          <h2 className="text-3xl font-bold text-primary mb-4 mt-10">
            About Zextons
          </h2>
          <dl className=" space-y-6 divide-y divide-gray-900/10">
            {AboutZextons.map((about) => (
              <Disclosure as="div" key={about.question} className="pt-6">
                {({ open }) => (
                  <>
                    <dt>
                      <Disclosure.Button className="flex w-full items-start justify-between text-left text-gray-900">
                        <span className="text-base font-semibold leading-7 uppercase">
                          {about.question}
                        </span>
                        <span className="ml-6 flex h-7 items-center">
                          {open ? (
                            <MinusIcon className="h-6 w-6" aria-hidden="true" />
                          ) : (
                            <PlusIcon className="h-6 w-6" aria-hidden="true" />
                          )}
                        </span>
                      </Disclosure.Button>
                    </dt>
                    <Disclosure.Panel as="dd" className="mt-2 pr-12">
                      <p className="text-base leading-7 text-gray-600 text-justify">
                        {about.answer}
                      </p>
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            ))}
          </dl>
        </div>
        <h1 className="text-3xl font-bold text-primary my-10">
          Payment and Delivery
        </h1>
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 focus:outline-none ${
              activeTab === "delivery"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("delivery")}
          >
            Delivery
          </button>
          <button
            className={`ml-4 px-4 py-2 focus:outline-none ${
              activeTab === "payments"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("payments")}
          >
            Payments
          </button>
        </div>
        <div>
          {activeTab === "delivery" && (
            <div className="pt-3">
              <p>
                We dispatch your device the same day we receive the order by
                royal mail and track 24 and 48 services. You will be provided
                tracking information once it is dispatched from our warehouse,
                you can track your parcel on the royal mail website{" "}
                <a href="https://www.royalmail.com/track-your-item" target="_blank" rel="noopener noreferrer" className="text-blue-500 py-1 px-1 inline-block">
                  here
                </a>
                .
              </p>
              <p>
                Our cut-off time is 12:00 PM, for same-day dispatch. Order
                received after 12:00 PM will dispatch the following day Mon –
                Fri. Orders on Friday will dispatch on Monday.
              </p>
              <table className="w-full mt-4 border">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="p-2">United Kingdom</th>
                    <th className="p-2">Orders Under £30</th>
                    <th className="p-2">Orders Over £30</th>
                    <th className="p-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border">Standard Delivery</td>
                    <td className="p-2 border">£4.99</td>
                    <td className="p-2 border">FREE</td>
                    <td className="p-2 border">2 – 3 Working Days</td>
                  </tr>
                  <tr>
                    <td className="p-2 border">Express Delivery</td>
                    <td className="p-2 border">£9.99</td>
                    <td className="p-2 border">£7.99</td>
                    <td className="p-2 border">1 – 2 Working Days</td>
                  </tr>
                </tbody>
              </table>
              <p className="font-bold mt-4">
                For more information, please contact us
              </p>
              <p className="font-bold mt-4">
                Email:{" "}
                <a href="mailto:hello@zextons.co.uk">hello@zextons.co.uk</a> –
                Phone: 0333 344 8541
              </p>
            </div>
          )}
          {activeTab === "payments" && (
            <div className="pt-3">
              {/* Add your Payments content here */}
              <p>
                We accept credit cards, debit cards, Google Pay, Apple Pay, and
                Paypal. We also offer the buy now and pay later option by Klarna
                and Paypal.
              </p>
            </div>
          )}
        </div>
        <p className="mt-5">
          {`We hope this FAQ helps answer your questions about Zextons and our
          selection of refurbished devices. If you have any further questions,
          please don't hesitate to contact us! We're here to help!`}
        </p>
      </div>
      </>
  );
}
