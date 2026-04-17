"use client";
import {
  Transition,
  Dialog,
  DialogTitle,
  DialogPanel,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Fragment } from "react";

export interface ComesWithItem {
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  image?: {
    filename?: string;
    path?: string;
    url?: string;
  } | null;
}

// Fallback SVG icon when no icon is provided
const DefaultIcon = () => (
  <svg
    className="w-8 h-8"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

// Render icon - supports HTML icons from database
const renderIcon = (item: ComesWithItem) => {
  // Check if icon is HTML (like Flaticon <i class="fi fi-rr-truck-side"></i>)
  if (item.icon && item.icon.trim().startsWith("<")) {
    return (
      <span
        className="flex items-center justify-center [&>i]:text-3xl [&>svg]:w-8 [&>svg]:h-8"
        dangerouslySetInnerHTML={{ __html: item.icon }}
      />
    );
  }

  // Fallback to default icon
  return <DefaultIcon />;
};

export default function ComesWithSlider({
  open,
  setOpen,
  selectedItem = null,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedItem?: ComesWithItem | null;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setOpen(false)}
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
                        {selectedItem?.name || "Comes With"}
                      </DialogTitle>
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        onClick={() => setOpen(false)}
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="relative flex-1 px-4 sm:px-6 mt-6">
                      {selectedItem ? (
                        <div>
                          {/* Icon and Name */}
                          <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-green-100 rounded-xl flex items-center justify-center">
                              {renderIcon(selectedItem)}
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {selectedItem.name}
                            </h3>
                          </div>

                          {/* Description */}
                          {selectedItem.description ? (
                            <div
                              className="prose prose-sm max-w-none text-base leading-7 text-gray-600 space-y-2"
                              dangerouslySetInnerHTML={{
                                __html: selectedItem.description,
                              }}
                            />
                          ) : (
                            <p className="text-base leading-7 text-gray-500">
                              This item is included with your purchase.
                            </p>
                          )}

                          {/* Image if available */}
                          {selectedItem.image?.url && (
                            <div className="mt-6">
                              <img
                                src={selectedItem.image.url}
                                alt={selectedItem.name}
                                className="w-full rounded-lg object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No details available.
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
