// import dynamic from 'next/dynamic'
import Image from 'next/image'
import { Dialog, DialogTitle, DialogPanel, Transition, TransitionChild } from '@headlessui/react'
// const Dialog = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog)
// )
// const DialogTitle = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Title)
// );
// const DialogPanel = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Dialog.Panel)
// );
// const Transition = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition)
// );const TransitionChild = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.Transition.Child)
// );
import { Fragment } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
// const XMarkIcon = dynamic(
//   () => import("@heroicons/react/20/solid").then((mod) => mod.XMarkIcon)
// )
import batteryimg from '@/app/assets/PhoneBattery.svg'
export default function ProductBattery({ openBattery, setOpenBattery }: { openBattery: boolean; setOpenBattery: (open: boolean) => void }) {
    return (
        <>
            <Transition as={Fragment} show={openBattery}>
                <Dialog
                    as="div"
                    className="relative z-10"
                    onClose={() => setOpenBattery(false)}
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
                                                        Battery Options
                                                    </DialogTitle>
                                                    <div className="ml-3 flex h-7 items-center">
                                                        <button
                                                            type="button"
                                                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                            onClick={() => setOpenBattery(false)}
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
                                            <div className="relative mt-6 flex-1 px-4">
                                                <div className='flex flex-col gap-4 justify-center items-center'>
                                                    <Image src={batteryimg} alt="" className='w-full h-52' />
                                                    <h3 className='text-4xl font-bold text-center'>What battery do you need?
                                                    </h3>
                                                    <p className='text-lg font-normal text-gray-500 text-center'>   All devices come with good battery health that have been tested by professionals.</p>
                                                </div>
                                                <div className='flex gap-4 w-full'>
                                                    <div className='flex flex-col gap-5 justify-center items-center w-full'>
                                                        <h2 className='text-xl font-bold'> Standard</h2>
                                                        <div className='bg-gray-200 text-black rounded-lg px-4 py-4 relative flex flex-col justify-between items-center h-80 text-center'>
                                                            <div className='absolute -top-5'>
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-10 text-green-600">
                                                                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                            <p className='text-base text-gray-700'>Minimum 80% battery capacity*</p>
                                                            <p className='text-base text-gray-700'>Gets you through the day</p>
                                                            <p className='text-base text-gray-700'>Checked, tested, and installed by experts</p>

                                                        </div>
                                                    </div>
                                                    <div className='flex flex-col gap-5 justify-center items-center w-full'>
                                                        <h2 className='text-xl font-bold'>New Battery</h2>
                                                        <div className='bg-gray-200 text-black rounded-lg px-4 relative flex flex-col justify-between py-4 items-center h-80 text-center'>
                                                            <div className='absolute -top-5'>
                                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-10 text-green-600">
                                                                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
                                                                </svg>

                                                            </div>
                                                            <p className='text-base text-gray-700'> Minimum 90% battery capacity*</p>
                                                            <p className='text-base text-gray-700'>
                                                                1.5 hr more streaming time daily, subject to use</p>
                                                            <p className='text-base text-gray-700'>   Checked, tested, and installed by experts</p>

                                                        </div>
                                                    </div>
                                                </div>
                                                <p className='text-base font-medium text-center text-gray-700 mt-4'>*Battery capacity is the amount of energy a battery can hold, also considered the leading health indicator for a battery.</p>
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
