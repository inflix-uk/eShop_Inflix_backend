import dynamic from "next/dynamic";
import Image from "next/image";
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
import { Fragment } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
// const XMarkIcon = dynamic(() =>
//   import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// );
import esim from "@/app/assets/esim.jpg";
export default function ProductSimOptions({ simOptions, setSimOptions }: { simOptions: boolean; setSimOptions: (open: boolean) => void }) {
  return (
    <>
      <Transition show={simOptions} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setSimOptions(false)}
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
                            Sim Options
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={() => setSimOptions(false)}
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
                          <Image className="rounded-lg" src={esim} alt="" />
                          <div className="text-center">
                            <h2 className="text-2xl font-semibold mb-4">
                              There are 2 types of SIMs
                            </h2>
                            <div className="flex justify-center space-x-8">
                              <div className="w-2/3 bg-gray-100 p-6 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">
                                  SIM card
                                </h3>
                                <p>A physical chip inserted into your phone</p>
                              </div>
                              <div className="w-2/3 bg-gray-100 p-6 rounded-lg">
                                <h3 className="text-lg font-medium mb-2">eSIM</h3>
                                <p>The digital version*</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-4">
                              eSIMs* are more secure and reliable than a
                              physical SIM card. They are impossible to lose,
                              and offer a more flexible and convenient way to
                              switch carriers or plans.
                            </p>
                          </div>
                          <div>
                            <ul className="divide-y divide-gray-200">
                              <li className="flex justify-between py-4">
                                <span>eSIM</span>
                                <span className="text-gray-500">
                                  1 virtual slot
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Single-SIM</span>
                                <span className="text-gray-500">
                                  1 physical slot
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Single-SIM + eSIM</span>
                                <span className="text-gray-500">
                                  1 physical + 1 virtual slot
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Dual eSIM</span>
                                <span className="text-gray-500">
                                  2 virtual slots
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Dual-SIM</span>
                                <span className="text-gray-500">
                                  2 physical slots
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Dual-SIM + eSIM</span>
                                <span className="text-gray-500">
                                  2 physical + 1 virtual slot
                                </span>
                              </li>
                              <li className="flex justify-between py-4">
                                <span>Hybrid Dual SIM</span>
                                <span className="text-gray-500">
                                  2 physical slots
                                </span>
                              </li>
                            </ul>
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
