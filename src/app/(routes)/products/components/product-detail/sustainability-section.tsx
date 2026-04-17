"use client";

import saveplanetgif from "@/app/assets/save-planet-gif.gif";
import Image from "next/image";
import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";

interface SustainabilitySectionProps {
  productName?: string;
}

export default function SustainabilitySection({
  productName = "iPhone 11",
}: SustainabilitySectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4 justify-center items-center">
        {/* Left Section - Superhero Illustration */}
        <div className="bg-white col-span-1 flex items-end justify-center p-8 lg:p-16">
          <div className="max-w-sm w-full">
            <Image
              src={saveplanetgif}
              alt="save planet gif"
              className="w-full h-full"
            />
          </div>
        </div>

        {/* Right Section - Content */}
        <div className="bg-white col-span-1 flex items-center justify-start p-8 lg:p-16">
          <div className="max-w-lg w-full">
            <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-green-600 mb-6 italic text-balance">
              Saving the Planet
            </h2>

            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-6 text-balance">
              Buying a refurbished {productName} is a smart way to reduce your
              environmental footprint
            </h3>

            <p className="text-gray-600 text-base lg:text-lg leading-relaxed mb-8">
              Every year, millions of electronic devices are discarded, creating
              unnecessary waste. At Zextons Tech Store, choosing a refurbished{" "}
              {productName} means you&apos;re making a smarter and greener
              choice. Each device we carefully restore and resell helps extend
              the life of valuable materials, reduces electronic waste, and
              supports a more sustainable future. With our quality assurance and
              extended warranties, buying refurbished isn&apos;t just
              eco-friendly&mdash;it&apos;s also reliable and affordable.
            </p>

            <button
              onClick={openModal}
              className="bg-primary hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-full flex items-center gap-2 transition-colors"
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
        </div>
      </div>

      {/* Sustainability Modal */}
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
                            Saving the Planet
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
                        {/* Hero Illustration */}
                        <div className="flex justify-center">
                          <div className="w-64 h-64">
                            <Image
                              src={saveplanetgif}
                              alt="Superhero saving the planet"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>

                        {/* Reduce, Re-use, Refurbish Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            Reduce, Re-use, Refurbish
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            The most sustainable smartphone is the one that
                            already exists. While manufacturers often promote
                            their devices as eco-friendly, the reality is that
                            producing a brand-new smartphone always comes with
                            significant environmental and ethical costs.
                          </p>
                        </div>

                        {/* The Hidden Cost of a New Smartphone Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            The Hidden Cost of a New Smartphone
                          </h3>

                          <ul className="space-y-4 text-gray-700">
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <div>
                                <strong>CO2 Emissions:</strong> Manufacturing a
                                new smartphone generates between 50 to 100 kg of
                                CO2, contributing to climate change. (European
                                Environmental Bureau, 2019)
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <div>
                                <strong>Water Consumption:</strong> Producing a
                                single flagship smartphone requires
                                12,000-16,000 liters of fresh water—enough to
                                sustain a person for over 10 years. (Green
                                Alliance, 2018)
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <div>
                                <strong>Rare Metal Mining:</strong> The
                                extraction of key smartphone materials like
                                lithium and cobalt destroys ecosystems, pollutes
                                water sources, and depletes natural resources.
                                (Amnesty International, 2016)
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <div>
                                <strong>Conflict Minerals:</strong> Many
                                smartphone components rely on tantalum,
                                tungsten, tin, and gold (3TG minerals), which
                                are often sourced from conflict zones where
                                labor rights are exploited. (SEC, 2012)
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></span>
                              <div>
                                <strong>Social and Economic Inequality:</strong>{" "}
                                Mining and manufacturing disproportionately
                                affect poorer communities, where unsafe working
                                conditions and low wages are common.
                              </div>
                            </li>
                          </ul>
                        </div>

                        {/* The Good News Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-black">
                            The Good News: Choosing Refurbished Makes a
                            Difference
                          </h3>
                          <p className="text-gray-700 leading-relaxed">
                            By choosing a refurbished smartphone, you&apos;re
                            actively reducing demand for new device production,
                            extending the life of existing materials, and
                            contributing to a more sustainable technology
                            ecosystem. Every refurbished device purchased means
                            one less new device manufactured, significantly
                            reducing environmental impact.
                          </p>
                          <p className="text-gray-700 leading-relaxed">
                            At Zextons Tech Store, we carefully restore and test
                            every device to ensure it meets our high quality
                            standards. This process gives electronics a second
                            life while providing you with a reliable,
                            affordable, and environmentally conscious choice.
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
