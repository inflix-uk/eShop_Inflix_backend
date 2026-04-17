
import { Fragment } from 'react'
import Image from "next/image";
import dynamic from "next/dynamic";
import { Dialog, DialogTitle, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
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
import { XMarkIcon } from "@heroicons/react/20/solid";
// const XMarkIcon = dynamic(() =>
//   import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// );
import verifiedrfurbishedimg from "@/app/assets/verifiedrfurbishedimg.jpg";

function ProductVerifiedRefurbished({
  verifiedRefurbished,
  setVerifiedRefurbished,
}: {
  verifiedRefurbished: boolean;
  setVerifiedRefurbished: (open: boolean) => void;
}) {
  return (
    <>
      <Transition show={verifiedRefurbished} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setVerifiedRefurbished(false)}
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
                            Verified Refurbished
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={() => setVerifiedRefurbished(false)}
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

                        <div className="mt-10 flex flex-col gap-y-10">
                         
                          <Image
                            className="rounded-lg"
                            src={verifiedrfurbishedimg}
                            alt=""
                          />
                          <div>
                            <h1 className="text-xl font-bold text-gray-800">
                              Perfect working condition.
                            </h1>
                            <p className="text-gray-600 mb-8">
                              Guaranteed by a minimum 50-point inspection
                              conducted by industry professionals, backed by
                              18-month and free 30-day returns.
                            </p>
                            <p className="mb-5">
                              A few of them are listed below:
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                              <ul className="list-none space-y-1">
                                <li className="text-gray-800">Appearance</li>
                                <li className="text-gray-800">
                                  Digital compass
                                </li>
                                <li className="text-gray-800">Flashlight</li>
                                <li className="text-gray-800">Headset plug</li>
                                <li className="text-gray-800">
                                  Rear camera system
                                </li>
                                <li className="text-gray-800">SIM tray</li>
                                <li className="text-gray-800">WiFi</li>
                              </ul>
                              <ul className="list-none space-y-1">
                                <li className="text-gray-800">Backlight</li>
                                <li className="text-gray-800">Bluetooth</li>
                                <li className="text-gray-800">Haptics</li>
                                <li className="text-gray-800">Microphones</li>
                                <li className="text-gray-800">
                                  Technical condition
                                </li>
                                <li className="text-gray-800">
                                  USB & Charger plug
                                </li>
                                <li className="text-gray-800">Accelerometer</li>
                              </ul>
                              <ul className="list-none space-y-1">
                                <li className="text-gray-800">Cleanliness</li>
                                <li className="text-gray-800">Display</li>
                                <li className="text-gray-800">Headset plug</li>
                                <li className="text-gray-800">Power button</li>
                                <li className="text-gray-800">Touchscreen</li>
                                <li className="text-gray-800">
                                  Volume buttons
                                </li>
                                <li className="text-gray-800">Speaker</li>
                              </ul>
                            </div>
                            <p className="text-md font-bold mt-5">
                              100% fully functional
                            </p>
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

export default ProductVerifiedRefurbished