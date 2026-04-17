import React from 'react'
import {
  Transition,
  Dialog,
  DialogTitle,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import { Fragment } from 'react'
import { XMarkIcon } from "@heroicons/react/24/solid";

export default function ProductPerks({
  openPerks,
  setOpenPerks,
  product,
}: {
  openPerks: boolean;
  setOpenPerks: (open: boolean) => void;
  product?: any;
}) {
  // Check if product has dynamic perks_and_benefits content
  const hasDynamicPerks = product?.perks_and_benefits?.status && product?.perks_and_benefits?.description;

  return (
    <Transition show={openPerks} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setOpenPerks(false)}
      >
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
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
                          Perks & Benefits
                        </DialogTitle>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            onClick={() => setOpenPerks(false)}
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-6 flex-1 px-4 sm:px-6">
                      {hasDynamicPerks ? (
                        // Render dynamic perks_and_benefits content
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: product.perks_and_benefits.description }}
                        />
                      ) : (
                        // Fallback to static content
                        <>
                          <div className="flex items-center mb-6">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="30"
                              height="30"
                              viewBox="0 0 48 48"
                            >
                              <path
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.628 18.36c1.815-5.003 6.61-8.578 12.241-8.578c3.722 0 7.08 1.563 9.427 4.004m2.692 4.82c.13.665 3.817 10.985 1.927 23.875M15.61 7.542a17.9 17.9 0 0 0-7.734 7.898m28.14-5.146c1.303 1.063 2.43 2.54 3.37 4.371M5.5 10.269a22.7 22.7 0 0 1 4.037-4.326m28.55-.092a22.7 22.7 0 0 1 3.988 4.194m-31.22 13.632s.465 4.534.384 10.073m-.324 5.99a49 49 0 0 1-.35 2.74m4.508 0c.335-1.475.463-2.967.579-4.467m18.12-.017a79 79 0 0 1-.33 4.484m-13.86-2.418c.05-.692.09-1.387.138-2.07m9.357 2.21a96 96 0 0 1-.233 2.278m-4.391-4.448c-.025.887-.066 1.77-.127 2.634c-.04.583-.154 1.255-.215 1.815"
                              />
                              <path
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.365 17.209a4.407 4.407 0 1 1 8.815 0v2.362"
                              />
                              <rect
                                width="16.899"
                                height="15.778"
                                x="15.323"
                                y="19.739"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                rx="1.567"
                                ry="1.567"
                              />
                              <path
                                fill="none"
                                stroke="currentColor"
                                strokeMiterlimit="7"
                                d="M19.365 17.209v2.53"
                              />
                              <circle
                                cx="23.772"
                                cy="27.01"
                                r="2.255"
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M38.5 5.5h-29a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h29a4 4 0 0 0 4-4v-29a4 4 0 0 0-4-4"
                              />
                            </svg>
                            <h3 className="text-2xl font-semibold text-gray-800 ms-4">
                              Warranty
                            </h3>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-800 ">
                            Refurbished Device
                          </h3>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="mt-1"
                                  aria-hidden="true"
                                  fill="currentColor"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  width="24"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="m18.176 6.835.68.226a1.25 1.25 0 0 0 1.467-.542l1.093-1.822a1.25 1.25 0 0 0-.188-1.527l-.448-.448a1.25 1.25 0 0 0-1.527-.188l-1.821 1.093a1.25 1.25 0 0 0-.543 1.467l.227.68-3.899 3.898-.533-.533c.507-1.825.036-3.904-1.276-5.217C9.496 2.011 6.9 2.326 5.888 2.538c-.866.182-1.032 1.197-.5 1.728l2.618 2.619v1.06h-1.06l-2.62-2.619c-.53-.53-1.545-.365-1.727.502-.212 1.01-.527 3.607 1.384 5.519 1.294 1.294 3.334 1.77 5.139 1.297l.562.562-.96.96-.366-.366a1.25 1.25 0 0 0-1.768 0l-3.586 3.586a2.25 2.25 0 0 0 0 3.182l.379.378a2.25 2.25 0 0 0 3.182 0l3.586-3.585a1.25 1.25 0 0 0 0-1.768l-.366-.366.96-.96 6.644 6.645a2.499 2.499 0 1 0 3.534-3.534l-6.645-6.645zm1.682-2.914.171.172-.889 1.482-.573-.191-.191-.574zM8.913 16.477l-3.409 3.409a.75.75 0 0 1-1.06 0l-.379-.379a.75.75 0 0 1 0-1.06l3.409-3.41zM9.2 5.956 7.128 3.884c.972-.05 2.244.124 3.22 1.1.977.977 1.322 2.675.78 4.091a.75.75 0 0 0 .17.799l8.564 8.564a.999.999 0 0 1-1.413 1.413l-8.587-8.587a.75.75 0 0 0-.786-.175c-1.405.51-3.069.16-4.032-.803-.975-.975-1.15-2.247-1.098-3.22l2.07 2.072c.198.197.465.307.743.307h1.697c.58 0 1.05-.47 1.05-1.05V6.698c0-.278-.11-.545-.307-.742"
                                    clipRule="evenodd"
                                  ></path>
                                </svg>
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-lg m-0">18-Month Warranty</p>
                                <p className="text-gray-600 text-sm mt-2">
                                  If the item has a technical defect within 18
                                  months, we will repair or replace it.
                                </p>
                              </div>
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800 ">
                            Brand New Device
                          </h3>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="ml-4 flex-1">
                                <p className="text-gray-600 text-sm mt-2">
                                  All brand new devices come with a standard{" "}
                                  <b>12-month</b> manufacturer warranty. With some
                                  brands, this warranty may be extended to up to{" "}
                                  <b>24 months</b>. <br /> <br />
                                  For more details on warranty coverage and
                                  extensions, please refer to the full warranty
                                  policy or contact our customer support team.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="mt-1"
                                  aria-hidden="true"
                                  fill="currentColor"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  width="24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path d="M20.24 7.525H2.5a.5.5 0 1 1 0-1h17.795l-3.45-3.445a.502.502 0 1 1 .71-.71l4.285 4.31a.5.5 0 0 1 .16.36.5.5 0 0 1-.3.46l-4.145 4.13a.5.5 0 0 1-.858-.355.5.5 0 0 1 .148-.355zM3.755 16.5H21.5a.5.5 0 1 1 0 1H3.705l3.44 3.43a.5.5 0 0 1-.355.858.5.5 0 0 1-.355-.148L2.16 17.365A.5.5 0 0 1 2 17a.5.5 0 0 1 .3-.5l4.145-4.105a.502.502 0 0 1 .71.71z"></path>
                                </svg>
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-lg m-0">30-Day Return Policy</p>
                                <p className="text-gray-600 text-sm mt-2">
                                  You can return your item within the first 30 days
                                  of receiving it, no questions asked. We want you
                                  to be completely satisfied with your purchase.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="mt-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 32 32"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M0 6v2h19v15h-6.156c-.446-1.719-1.992-3-3.844-3s-3.398 1.281-3.844 3H4v-5H2v7h3.156c.446 1.719 1.992 3 3.844 3s3.398-1.281 3.844-3h8.312c.446 1.719 1.992 3 3.844 3s3.398-1.281 3.844-3H32v-8.156l-.063-.157l-2-6L29.72 10H21V6zm1 4v2h9v-2zm20 2h7.281L30 17.125V23h-1.156c-.446-1.719-1.992-3-3.844-3s-3.398 1.281-3.844 3H21zM2 14v2h6v-2zm7 8c1.117 0 2 .883 2 2s-.883 2-2 2s-2-.883-2-2s.883-2 2-2m16 0c1.117 0 2 .883 2 2s-.883 2-2 2s-2-.883-2-2s.883-2 2-2"
                                  />
                                </svg>
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-lg m-0">Fast Free Shipping</p>
                                <p className="text-gray-600 text-sm mt-2">
                                  Enjoy fast, free delivery on all orders over £30!{" "}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="mt-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                >
                                  <g
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                    color="currentColor"
                                  >
                                    <path d="M17 11.805c0-.346 0-.519.052-.673c.151-.448.55-.621.95-.803c.448-.205.672-.307.895-.325c.252-.02.505.034.721.155c.286.16.486.466.69.714c.943 1.146 1.415 1.719 1.587 2.35c.14.51.14 1.044 0 1.553c-.251.922-1.046 1.694-1.635 2.41c-.301.365-.452.548-.642.655a1.27 1.27 0 0 1-.721.155c-.223-.018-.447-.12-.896-.325c-.4-.182-.798-.355-.949-.803c-.052-.154-.052-.327-.052-.672zm-10 0c0-.436-.012-.827-.364-1.133c-.128-.111-.298-.188-.637-.343c-.449-.204-.673-.307-.896-.325c-.667-.054-1.026.402-1.41.87c-.944 1.145-1.416 1.718-1.589 2.35a2.94 2.94 0 0 0 0 1.553c.252.921 1.048 1.694 1.636 2.409c.371.45.726.861 1.363.81c.223-.018.447-.12.896-.325c.34-.154.509-.232.637-.343c.352-.306.364-.697.364-1.132z" />
                                    <path d="M20 10.5V9c0-3.866-3.582-7-8-7S4 5.134 4 9v1.5m16 7c0 4.5-4 4.5-8 4.5" />
                                  </g>
                                </svg>
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-lg m-0">Customer Support</p>
                                <p className="text-gray-600 text-sm mt-2">
                                 {`We're here for you! Expect a response within 1
                                  business day.`}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <div className="flex-shrink-0">
                                <svg
                                  className="mt-1"
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 512 512"
                                >
                                  <path
                                    fill="currentColor"
                                    d="M298.9 24.31c-14.9.3-25.6 3.2-32.7 8.4l-97.3 52.1l-54.1 73.59c-11.4 17.6-3.3 51.6 32.3 29.8l39-51.4c49.5-42.69 150.5-23.1 102.6 62.6c-23.5 49.6-12.5 73.8 17.8 84l13.8-46.4c23.9-53.8 68.5-63.5 66.7-106.9l107.2 7.7l-1-112.09zM244.8 127.7c-17.4-.3-34.5 6.9-46.9 17.3l-39.1 51.4c10.7 8.5 21.5 3.9 32.2-6.4c12.6 6.4 22.4-3.5 30.4-23.3c3.3-13.5 8.2-23 23.4-39m-79.6 96c-.4 0-.9 0-1.3.1c-3.3.7-7.2 4.2-9.8 12.2c-2.7 8-3.3 19.4-.9 31.6c2.4 12.1 7.4 22.4 13 28.8c5.4 6.3 10.4 8.1 13.7 7.4c3.4-.6 7.2-4.2 9.8-12.1c2.7-8 3.4-19.5 1-31.6c-2.5-12.2-7.5-22.5-13-28.8c-4.8-5.6-9.2-7.6-12.5-7.6m82.6 106.8c-7.9.1-17.8 2.6-27.5 7.3c-11.1 5.5-19.8 13.1-24.5 20.1c-4.7 6.9-5.1 12.1-3.6 15.2c1.5 3 5.9 5.9 14.3 6.3c8.4.5 19.7-1.8 30.8-7.3s19.8-13 24.5-20c4.7-6.9 5.1-12.2 3.6-15.2c-1.5-3.1-5.9-5.9-14.3-6.3c-1.1-.1-2.1-.1-3.3-.1m-97.6 95.6c-4.7.1-9 .8-12.8 1.9c-8.5 2.5-13.4 7-15 12.3c-1.7 5.4 0 11.8 5.7 18.7c5.8 6.8 15.5 13.3 27.5 16.9c11.9 3.6 23.5 3.5 32.1.9c8.6-2.5 13.5-7 15.1-12.3c1.6-5.4 0-11.8-5.8-18.7c-5.7-6.8-15.4-13.3-27.4-16.9c-6.8-2-13.4-2.9-19.4-2.8"
                                  />
                                </svg>
                              </div>
                              <div className="ml-4 flex-1">
                                <p className="text-lg m-0">Pay in Instalments</p>
                                <p className="text-gray-600 text-sm mt-2">
                                  Spread the cost with easy monthly payments over 3,
                                  6, or 12 months using Klarna or PayPal.{" "}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="mb-8 flex">
                              <p className="text-gray-600 text-sm mt-2">
                                <span className="text-lg m-0">Note:</span> Please
                                spend responsibly. These options are subject to
                                approval and terms
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
