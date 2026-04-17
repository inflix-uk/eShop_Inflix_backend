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
import { XMarkIcon } from "@heroicons/react/24/solid";
// const XMarkIcon = dynamic(() =>
//   import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// );
import { Fragment } from "react";
import productimgnotincluded from "@/app/assets/productimgnotincluded.jpg";
import Image from "next/image";
export default function ProductNotIncluded({ setNotIncluded, notIncluded }: { setNotIncluded: (value: boolean) => void, notIncluded: boolean }) {
    return (
        <>
            <Transition show={notIncluded} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setNotIncluded(false)}
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
                                                        Accessory exclusions
                                                    </DialogTitle>
                                                    <div className="ml-3 flex h-7 items-center">
                                                        <button
                                                            type="button"
                                                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                            onClick={() => setNotIncluded(false)}
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

                                                <div className="mt-10 flex flex-col gap-y-10 p-4">
                                                    <Image src={productimgnotincluded} alt="product image not included" />
                                                    <p>
                                                        To help fight e-waste and reduce our environmental impact, we no longer include AC adapters and headphones with smartphone orders. This way, we encourage the reuse of existing accessories and minimize unnecessary waste.
                                                    </p>
                                                    <div className="hidden">
                                                        <div className=" flex">
                                                            <div className="flex-shrink-0">
                                                                <svg
                                                                    aria-hidden="true"
                                                                    fill="currentColor"
                                                                    height="24"
                                                                    viewBox="0 0 24 24"
                                                                    width="24"
                                                                >
                                                                    <path d="M11.25 13.75v-4a.75.75 0 0 1 1.5 0v4a.75.75 0 0 1-1.5 0m.75 3.8a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8"></path>
                                                                    <path
                                                                        fillRule="evenodd"
                                                                        d="M10.917 4.625a1.25 1.25 0 0 1 2.165 0l7.795 13.5A1.25 1.25 0 0 1 19.794 20H4.206a1.25 1.25 0 0 1-1.083-1.875zM12 5.75 4.639 18.5H19.36z"
                                                                        clipRule="evenodd"
                                                                    ></path>
                                                                </svg>
                                                            </div>
                                                            <div className="ml-5 flex-1">
                                                                <p className="font-semibold text-lg leading-6 m-0">
                                                                    Less is more
                                                                </p>
                                                                <p className="text-gray-500 text-sm leading-5 mt-2">
                                                                    To reduce e-waste, AC adapters and headphones
                                                                    are not included with smartphone orders.
                                                                </p>
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
    )
}
