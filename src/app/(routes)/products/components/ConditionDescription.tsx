import React, { Fragment } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogTitle,
  DialogPanel,
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
import { XMarkIcon } from "@heroicons/react/24/solid";
// const XMarkIcon = dynamic(() =>
//   import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// );
import Fair from "@/app/assets/fair.jpg";
import Good from "@/app/assets/good.jpg";
import Excellent from "@/app/assets/excellent.jpg";
import BrandNew from "@/app/assets/brandnew.jpg";

// Image mapping for conditions
// NOTE: Images are intentionally mapped here because each condition needs a specific image
// When adding new conditions, add corresponding images to the assets folder
const CONDITION_IMAGES: { [key: string]: any } = {
  fair: Fair,
  good: Good,
  excellent: Excellent,
  brand_new: BrandNew,
  brandnew: BrandNew,
  "brand new": BrandNew,
  "brand-new": BrandNew,
};

/**
 * Get condition image with flexible matching
 * Supports: "Brand New", "brand_new", "brand-new", "brandnew", etc.
 */
function getConditionImage(condition: string): any | null {
  if (!condition) return null;

  // Normalize the condition string for matching
  const normalized = condition.toLowerCase().trim();

  // Try direct match first
  if (CONDITION_IMAGES[normalized]) {
    return CONDITION_IMAGES[normalized];
  }

  // Try with underscores replaced by spaces
  const withSpaces = normalized.replace(/_/g, ' ');
  if (CONDITION_IMAGES[withSpaces]) {
    return CONDITION_IMAGES[withSpaces];
  }

  // Try with hyphens replaced by underscores
  const withUnderscores = normalized.replace(/-/g, '_');
  if (CONDITION_IMAGES[withUnderscores]) {
    return CONDITION_IMAGES[withUnderscores];
  }

  // Try without any separators
  const noSeparators = normalized.replace(/[-_\s]/g, '');
  if (CONDITION_IMAGES[noSeparators]) {
    return CONDITION_IMAGES[noSeparators];
  }

  return null;
}

export default function ConditionDescription({
  openConditionDescription,
  setOpenConditionDescription,
  variantDesc,
  activeTab,
  setActiveTab,
}: {
  openConditionDescription: boolean;
  setOpenConditionDescription: (open: boolean) => void;
  variantDesc: any;
  activeTab: string | null;
  setActiveTab: (tab: string) => void;
}) {
  // Helper to get descriptions as array (handles both old string and new array format)
  const getDescriptionsArray = (tab: string | null): string[] => {
    if (!tab || !variantDesc[tab]) return [];
    const desc = variantDesc[tab];
    if (Array.isArray(desc)) {
      return desc.filter((d: string) => d && d.trim() !== "");
    } else if (typeof desc === "string" && desc.trim() !== "") {
      return [desc];
    }
    return [];
  };

  const descriptions = activeTab ? getDescriptionsArray(activeTab) : [];

  // Process all descriptions and join them with line breaks
  const processedContent = descriptions
    .map((desc: string) => desc?.replace(/(?<!\w)-/g, "<br />-"))
    .join("<br /><br />");

  // Get the image for the active tab (with flexible matching)
  const activeImage = activeTab ? getConditionImage(activeTab) : null;
  
  return (
    <>
      <Transition show={openConditionDescription} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setOpenConditionDescription(false)}
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
                            Condition Description
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={() => setOpenConditionDescription(false)}
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
                      <div className="relative mt-6 flex-1 px-4 sm:px-6">
                        {activeTab && (
                          <>
                            {activeImage && (
                              <Image
                                src={activeImage}
                                className="w-full h-auto"
                                alt={`${activeTab} Condition`}
                              />
                            )}

                            <h3 className="text-lg font-semibold text-gray-900 mt-5 capitalize">
                              {activeTab.replace(/_/g, ' ')}
                            </h3>

                            {descriptions.length > 0 ? (
                              <div
                                className="prose prose-sm max-w-none mt-3 bg-gray-50 p-5 text-justify rounded-xl"
                                dangerouslySetInnerHTML={{
                                  __html: processedContent,
                                }}
                              />
                            ) : (
                              <p className="mt-3 bg-gray-50 p-5 text-center rounded-xl text-gray-500">
                                No description available for this option.
                              </p>
                            )}
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
    </>
  );

}