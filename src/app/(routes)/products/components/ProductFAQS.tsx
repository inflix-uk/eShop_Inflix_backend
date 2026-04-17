import dynamic from "next/dynamic";
import {
  Disclosure,
  Transition,
  Dialog,
  DialogTitle,
  DialogPanel,
  DisclosurePanel,
  DisclosureButton,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon, PlusIcon, MinusIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";

interface FAQDetail {
  question: string;
  answer: string;
  status?: string;
}

export default function ProductFAQS({
  openFAQs,
  setOpenFAQs,
  productFAQs = [],
}: {
  openFAQs: boolean;
  setOpenFAQs: (open: boolean) => void;
  productFAQs?: FAQDetail[];
}) {
  // Filter to only show published FAQs
  const dynamicFAQs = productFAQs.filter(
    (faq) => faq.status === "Published" && faq.question && faq.answer
  );


  return (
    <Transition show={openFAQs} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setOpenFAQs(false)}
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
                    <div className="px-4 sm:px-6 flex items-center justify-between">
                      <DialogTitle className="text-lg font-semibold text-gray-900">
                        Frequently Asked Questions
                      </DialogTitle>
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        onClick={() => setOpenFAQs(false)}
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="relative flex-1 px-4 sm:px-6 mt-5">
                      {dynamicFAQs.length > 0 ? (
                        <dl className="space-y-6 divide-y divide-gray-200">
                          {dynamicFAQs.map((faq, index) => (
                            <Disclosure
                              as="div"
                              key={`product-faq-${index}`}
                              className="pt-6"
                            >
                              {({ open }) => (
                                <>
                                  <dt>
                                    <DisclosureButton className="flex w-full items-start justify-between text-left text-gray-900">
                                      <span className="text-base font-medium">
                                        {faq.question}
                                      </span>
                                      <span className="ml-6 flex h-7 items-center">
                                        {open ? (
                                          <MinusIcon
                                            className="h-6 w-6"
                                            aria-hidden="true"
                                          />
                                        ) : (
                                          <PlusIcon
                                            className="h-6 w-6"
                                            aria-hidden="true"
                                          />
                                        )}
                                      </span>
                                    </DisclosureButton>
                                  </dt>
                                  <DisclosurePanel as="dd" className="mt-2 pr-12">
                                    <div
                                      className="prose prose-sm max-w-none text-base leading-7 text-gray-600 space-y-2"
                                      dangerouslySetInnerHTML={{
                                        __html: faq.answer.trim(),
                                      }}
                                    />
                                  </DisclosurePanel>
                                </>
                              )}
                            </Disclosure>
                          ))}
                        </dl>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No FAQs available for this product.
                        </p>
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
