"use client";

import batterygif from "@/app/assets/battery-gif.png";
import Image from "next/image";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useState } from "react";

interface ReliablePowerSectionProps {
  productName?: string;
}

export default function ReliablePowerSection({
  productName = "iPhone 11",
}: ReliablePowerSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <section className="bg-gray-100 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-600 tracking-wide">
                  Reliable Power
                </h3>

                <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-black leading-tight">
                  This {productName} comes with
                  <span className="text-green-500 ms-1">85%</span> minimum
                  battery health
                </h2>
                <p className="text-xl text-gray-700 font-medium">
                  Better than competitors 80% average
                </p>
              </div>

              <button
                onClick={openModal}
                className="bg-gray-200 text-sm hover:bg-gray-300 text-black font-medium px-4 py-2 rounded-lg flex items-center gap-2 w-fit transition-colors"
              >
                Read more
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Right Battery Icon */}
            <div className="justify-center md:block hidden lg:justify-end">
              <div className="relative w-64 h-64">
                {/* Battery Outline */}
                <Image
                  src={batterygif}
                  alt="battery gif"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Battery Health Modal */}
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-in-out duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-500"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <TransitionChild
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500 sm:duration-700"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500 sm:duration-700"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <DialogPanel className="pointer-events-auto w-screen max-w-2xl">
                    <div className="flex h-full flex-col bg-white shadow-xl">
                      {/* Fixed Header */}
                      <div className="flex-shrink-0 px-4 sm:px-6 py-6 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <DialogTitle className="text-2xl font-bold text-black">
                            Battery Health
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={closeModal}
                            >
                              <span className="absolute -inset-2.5" />
                              <span className="sr-only">Close panel</span>
                              <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
                        {/* Battery Icon */}
                        <div className="flex justify-center">
                          <div className="w-20 h-12 border-4 border-gray-300 rounded-lg relative">
                            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-gray-300 rounded-r-sm"></div>
                            <div className="absolute inset-1 bg-green-500 rounded flex items-center justify-center">
                              <svg
                                className="w-6 h-6 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* What Is Battery Health? */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-black">
                            What Is Battery Health?
                          </h3>
                          <p className="text-gray-700">
                            Battery health measures how much of the original
                            battery capacity remains compared to when the phone
                            was brand new. Over time, as the battery is charged
                            and discharged, it naturally loses some capacity.
                          </p>
                        </div>

                        {/* It&apos;s Not the Same as Maximum Charge Percentage */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-black">
                            It&apos;s Not the Same as Maximum Charge Percentage
                          </h3>
                          <p className="text-gray-700">
                            The phone will always display 100% when fully
                            charged. Charge percentage shows how full the
                            battery is at that moment not the total health or
                            original capacity of the battery.
                          </p>
                        </div>

                        {/* What Does This Mean for You? */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            What Does This Mean for You?
                          </h3>

                          {/* Performance */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">
                                Performance
                              </h4>
                              <p className="text-gray-700">
                                Your phone will still function just as
                                efficiently as when it was new.
                              </p>
                            </div>
                          </div>

                          {/* Charging */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg
                                className="w-5 h-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </div>
                            <div>
                              <h4 className="font-semibold text-black">
                                Charging
                              </h4>
                              <p className="text-gray-700">
                                You will still get a full charge of 100%, but
                                the total time the phone will run on that charge
                                might be slightly shorter than when the battery
                                was brand new.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Our Guarantee */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-gray-600"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-black">
                              Our Guarantee
                            </h3>
                            <p className="text-gray-700">
                              Every refurbished phone we sell has at least
                              85%-95% battery health, the highest of any
                              refurbished phone seller! This ensures you get
                              excellent performance and a reliable device.
                            </p>
                          </div>
                        </div>

                        {/* Can I Get A Brand New Battery? */}
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-black">
                            Can I Get A Brand New Battery?
                          </h3>
                          <p className="text-gray-700">
                            For ultimate peace of mind, on many of our phones
                            you can upgrade to a brand-new battery with 100%
                            health. Look for the battery upgrade option when
                            adding to the basket
                          </p>
                        </div>
                      </div>

                      {/* Fixed Footer */}
                      <div className="flex-shrink-0 px-4 sm:px-6 py-6 border-t border-gray-200">
                        <div className="flex justify-center">
                          <button
                            onClick={closeModal}
                            className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors w-full"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
