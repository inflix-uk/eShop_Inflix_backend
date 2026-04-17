import React from "react";
import dynamic from "next/dynamic";
import {
  Transition,
  Dialog,
  DialogTitle,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
// const Dialog = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog)
// );
// const DialogTitle = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Title)
// );
// const DialogPanel = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Panel)
// );
// const Transition = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition)
// );
// const TransitionChild = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition.Child)
// );
import { Fragment } from "react";
// const XMarkIcon = dynamic(() =>
//   import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// );
import { XMarkIcon } from "@heroicons/react/24/solid";
export default function ProductWarranty({
  openWarranty,
  setOpenWarranty,
}: {
  openWarranty: boolean;
  setOpenWarranty: (open: boolean) => void;
}) {
  return (
    <>
      <Transition show={openWarranty} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setOpenWarranty(false)}
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
                            Our best in-class warranties
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={() => setOpenWarranty(false)}
                            >
                              <span className="absolute -inset-2.5" />
                              <span className="sr-only">Close panel</span>
                              <XMarkIcon
                                className="h-6 w-6"
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-10">
                        <div className="p-6">
                          <h2 className="text-lg mb-4 text-gray-700">
                            Free 30-day returns
                          </h2>
                          <div className="text-gray-700 text-base">
                            <div className="mb-6 flex items-start">
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                                xmlns="http://www.w3.org/2000/svg"
                                className="shrink-0"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M19.73 12.066c.198.094.377.215.533.36a1.923 1.923 0 0 1 0 2.814c-.41.384-.977.593-1.638.593H12.54l.476 2.383a3.046 3.046 0 0 1-1.624 3.323 1.21 1.21 0 0 1-1.648-.594l-3.172-7.191a5.243 5.243 0 0 1-.219-.588H4.375c-.69 0-1.25-.56-1.25-1.25v-6c0-.69.56-1.25 1.25-1.25h2.5c.089 0 .174.016.253.044a2.24 2.24 0 0 1 1.247-.377h7.75c.66 0 1.229.21 1.638.594a1.924 1.924 0 0 1 .464 2.146c.706.343 1.124 1.013 1.13 1.754a1.92 1.92 0 0 1-.25.968 1.924 1.924 0 0 1 .623 2.271m-13.566-5.9H4.625v5.5h1.5V6.584c0-.142.013-.281.039-.417M17.715 8.52c-.09-.086-.267-.186-.59-.186h-1.5a.75.75 0 1 1 0-1.5h.5c.34 0 .522-.103.612-.187a.424.424 0 0 0 0-.625c-.09-.085-.273-.188-.612-.188h-7.75a.75.75 0 0 0-.75.75v5.052c0 .521.109 1.037.32 1.514l3.036 6.884c.454-.355.68-.941.565-1.523l-.656-3.28a.75.75 0 0 1 .735-.897h7c.34 0 .521-.103.612-.187a.424.424 0 0 0 0-.625c-.09-.085-.273-.188-.612-.188h-2.5a.75.75 0 0 1 0-1.5h1.5c.34 0 .521-.103.612-.187a.424.424 0 0 0 0-.625c-.09-.085-.273-.188-.612-.188l-.45.001h-1.05a.75.75 0 0 1 0-1.5h1.006c.336-.002.51-.104.596-.185a.415.415 0 0 0 .13-.309.445.445 0 0 0-.142-.321"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              <div className="ml-3">
                                <h6 className="text-base font-semibold mb-2">
                                  Oh no. The device<span>&nbsp;</span>
                                  <span>{`doesn't meet your expectations`}</span>
                                  ?
                                </h6>
                                <span className="text-sm">
                                  {`You have 30 days to test your new device and
                                  decide if it's right for you.`}
                                </span>
                              </div>
                            </div>
                            <div className="mb-6 flex items-start">
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                                className="shrink-0"
                              >
                                <path d="M12.75 6.5a.75.75 0 0 0-1.5 0v5.293c0 .331.132.65.366.884l2.354 2.353a.75.75 0 1 0 1.06-1.06l-2.28-2.28z"></path>
                                <path
                                  fillRule="evenodd"
                                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 1 1-16.5 0"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              <div className="ml-3">
                                <h6 className="text-base font-semibold mb-2">
                                  You have 30 days from delivery to
                                </h6>
                                <span className="text-sm">
                                  Get a full refund for any reason, with no
                                  questions asked.
                                </span>
                              </div>
                            </div>
                            <hr />
                          </div>

                          <h2 className="text-lg mb-4 text-gray-700 mt-5">
                            1-year seller warranty
                          </h2>
                          <div className="border-0 m-0 p-0 text-gray-800 font-sans text-base leading-6 ">
                            <div className="mb-6 flex items-start border-0 p-0">
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                                className="shrink-0"
                              >
                                <path d="M12.75 3a.75.75 0 0 0-1.5 0v1.414a.75.75 0 0 0 1.5 0zM4.97 4.97a.75.75 0 0 1 1.06 0l1 1a.75.75 0 0 1-1.06 1.06l-1-1a.75.75 0 0 1 0-1.06m14.06 1.06a.75.75 0 0 0-1.06-1.06l-1 1a.75.75 0 0 0 1.06 1.06zM5.164 11a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h1.414a.75.75 0 0 1 .75.75m16.586 0a.75.75 0 0 1-.75.75h-1.414a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75m-8.325-1.246a.75.75 0 0 1 .821.671l.3 3a.75.75 0 0 1-1.492.15l-.3-3a.75.75 0 0 1 .671-.821"></path>
                                <path
                                  fillRule="evenodd"
                                  d="m6.321 17.25.798-7.974A2.25 2.25 0 0 1 9.358 7.25h5.285a2.25 2.25 0 0 1 2.238 2.026l.798 7.974H18a2.25 2.25 0 0 1 2.25 2.25v1c0 .69-.56 1.25-1.25 1.25H5c-.69 0-1.25-.56-1.25-1.25v-1A2.25 2.25 0 0 1 6 17.25zm2.29-7.825a.75.75 0 0 1 .747-.675h5.285a.75.75 0 0 1 .746.675l.782 7.825H7.83zM5.25 19.5a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 .75.75v.75H5.25z"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              <div className="ml-3 border-0 p-0">
                                <h6 className="body-1-bold mb-2 text-lg leading-6">
                                  <h6 className="text-base font-semibold mb-2">
                                    We gotchu on defects for the first year
                                  </h6>
                                </h6>
                                <span className="body-2 text-base leading-5">
                                  Network, button, camera issues, etc. Open a
                                  customer service ticket and get the help you
                                  need in 3 clicks.
                                </span>
                              </div>
                            </div>

                            <div className="mb-6 flex items-start border-0 p-0">
                              <svg
                                aria-hidden="true"
                                fill="currentColor"
                                height="24"
                                viewBox="0 0 24 24"
                                width="24"
                                xmlns="http://www.w3.org/2000/svg"
                                className="shrink-0"
                              >
                                <path d="M12.75 6.5a.75.75 0 0 0-1.5 0v5.293c0 .331.132.65.366.884l2.354 2.353a.75.75 0 1 0 1.06-1.06l-2.28-2.28z"></path>
                                <path
                                  fillRule="evenodd"
                                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 1 1-16.5 0"
                                  clipRule="evenodd"
                                ></path>
                              </svg>
                              <div className="ml-3 border-0 p-0">
                                <h6 className="body-1-bold mb-2 text-lg leading-6">
                                  <span>Get regular updates</span>
                                </h6>
                                <span className="body-2 text-base leading-5">
                                  Stay informed with our latest product updates
                                  and services. Sign up for our newsletter and
                                  never miss an update.
                                </span>
                              </div>
                            </div>
                          </div>
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
