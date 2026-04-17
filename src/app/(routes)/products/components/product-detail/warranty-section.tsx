"use client";

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface WarrantySectionProps {
  productName?: string;
}

export default function WarrantySection({
  productName = "iPhone 11",
}: WarrantySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <section className="bg-black py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-white mb-6 leading-tight">
            18 MONTH WARRANTY ON YOUR
            <br />
            {productName.toUpperCase()}
          </h2>

          <p className="text-white text-lg leading-relaxed mb-12 max-w-3xl mx-auto">
            The {productName} from Zextons Tech Store comes with a Big warranty!
            The policy covers any internal fault that may arise through normal
            use during the 18 month warranty period.
          </p>

          <button
            onClick={openModal}
            className="bg-primary hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
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
      </section>

      {/* Warranty Modal */}
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
                            Warranty
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
                        {/* Introduction */}
                        <div className="space-y-4">
                          {/* Warranty Icon */}
                          <div className="flex justify-center">
                            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                              <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                          </div>

                          <p className="text-gray-700 leading-relaxed">
                            Welcome to The Big Phone Store&apos;s warranty page.
                            We are dedicated to providing our customers with
                            high-quality products and support. To ensure your
                            confidence in your purchase, we offer a
                            comprehensive warranty policy.
                          </p>
                        </div>

                        {/* What is covered */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            What is covered
                          </h3>

                          <p className="text-gray-700">
                            The warranty period begins on the day of order and
                            covers internal faults during normal use.
                          </p>

                          <p className="text-gray-700">
                            <strong>Important:</strong> Repairs by third-party
                            companies without pre-approval will void the
                            warranty.
                          </p>

                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-black">
                                Brand New Devices:
                              </h4>
                              <p className="text-gray-700">
                                12-month manufacturer warranty. You may return
                                to the manufacturer. If you do not know their
                                contact details, email us and we will assist.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-black">
                                Refurbished Devices:
                              </h4>
                              <p className="text-gray-700">
                                Full 12-month warranty on refurbished devices.
                                Exception: &quot;Poor&quot; condition devices
                                carry a 3-month warranty.
                              </p>
                            </div>

                            <div>
                              <h4 className="font-semibold text-black">
                                Batteries:
                              </h4>
                              <p className="text-gray-700">
                                3-month warranty against faults from normal use.
                                For more information on battery health,{" "}
                                <button className="text-blue-600 underline hover:text-blue-800">
                                  click here
                                </button>
                              </p>
                            </div>
                          </div>

                          <p className="text-gray-700">
                            While warranties provide security, some conditions
                            may invalidate them.
                          </p>
                        </div>

                        {/* What isn't covered */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            What isn&apos;t covered
                          </h3>

                          <p className="text-gray-700">
                            Although we pride ourselves on our comprehensive
                            warranty policy, the following exclusions apply. The
                            warranty will not cover:
                          </p>

                          <ul className="space-y-2 text-gray-700">
                            <li className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <span>
                                Any physical damage caused by mistreatment,
                                whether intentional, accidental, or due to
                                misuse or neglect. This includes cracks,
                                scratches, dents, or any other sign of physical
                                damage.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <span>
                                Any defect caused by improper use of the device.
                                Please refer to the manufacturer&apos;s
                                instructions as to how to properly care for your
                                device.
                              </span>
                            </li>
                          </ul>
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
