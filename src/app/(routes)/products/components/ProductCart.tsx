import React, { useEffect } from "react";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogTitle,
  DialogPanel,
  Transition,
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
import { XMarkIcon } from "@heroicons/react/24/solid";
export default function ProductCart({
  openCart,
  setOpenCart,
  isZoomed,
  totalSalePrice,
  updateCartQuantity,
  removeFromCart,
  products,
}: {
  removeFromCart: (id: string) => void;
  products: any;
  updateCartQuantity: (quantity: number, id: string) => void;
  totalSalePrice: number;
  isZoomed: boolean;
  openCart: boolean;
  setOpenCart: (open: boolean) => void;
}) {
  // Set data attribute on body when ProductCart is open to hide BlackFridayModal banner
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (openCart) {
        document.body.setAttribute("data-cart-open", "true");
      } else {
        document.body.removeAttribute("data-cart-open");
      }
    }
  }, [openCart]);

  return (
    <>
      <Transition show={openCart} as={Fragment}>
        <Dialog
          as="div"
          className={`relative ${isZoomed ? "-z-10" : "z-50"} `}
          onClose={() => setOpenCart(false)}
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
          <div className="fixed inset-0 ">
            <div className="absolute inset-0 ">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
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
                    <div className="flex h-full flex-col bg-white py-6 shadow-xl">
                      <div className="px-4 sm:px-6">
                        <div className="flex items-start justify-between">
                          <DialogTitle className="text-lg font-medium text-gray-900">
                            Shopping Cart
                          </DialogTitle>
                          <div className="ml-3 flex h-7 items-center">
                            <button
                              type="button"
                              className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                              onClick={() => setOpenCart(false)}
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

                      <div className="mt-8 px-4 sm:px-6 overflow-y-auto scrollbar-thin scrollbar-webkit h-screen">
                        <div className="flow-root">
                          <ul
                            role="list"
                            className="-my-6 divide-y divide-gray-200"
                          >
                            {products.map((prod: any) => {
                              const productName = prod.name || '';
                              const modifiedProductName = productName.replace(
                                /\s*\([^)]+\)/,
                                ""
                              ); // remove everything inside parentheses
                              const finalProductName =
                                modifiedProductName.replace(/\s+/g, "-");
                              return (
                                <li className="flex py-6" key={prod._id}>
                                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                    <Image
                                      src={(() => {
                                        // Check variant images first (prefer url for Vercel Blob, fallback to path)
                                        if (prod.variantImages && prod.variantImages.length > 0) {
                                          const img = prod.variantImages[0];
                                          if (img.url) return img.url;
                                          if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
                                        }
                                        // Check gallery images as fallback
                                        if (prod.galleryImages && prod.galleryImages.length > 0) {
                                          const img = prod.galleryImages[0];
                                          if (img.url) return img.url;
                                          if (img.path) return `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`;
                                        }
                                        // Check product thumbnail
                                        if (prod.productthumbnail) {
                                          return `${process.env.NEXT_PUBLIC_API_URL}/uploads/products/${prod.productthumbnail}`;
                                        }
                                        // Final fallback
                                        return "/placeholder.png";
                                      })()}
                                      alt={productName}
                                      className="w-20 rounded-md"
                                      width={224}
                                      height={224}
                                    />
                                  </div>
                                  <div className="ml-4 flex flex-1 flex-col">
                                    <div>
                                      <div className="flex flex-col justify-between text-base">
                                        <h3 className="font-semibold ">
                                          <p>
                                            {prod.productName}{" "}
                                            {finalProductName}{" "}
                                            {prod.selectedSim && (
                                              <p className="text-sm text-gray-700">
                                                SIM: {prod.selectedSim}
                                              </p>
                                            )}
                                          </p>
                                        </h3>
                                      </div>
                                    </div>
                                    <div className="flex flex-1 items-end justify-between text-sm">
                                      <p className="text-gray-500">
                                        Qty
                                        <input
                                          type="number"
                                          id="quantity"
                                          name="quantity"
                                          className="ml-2 w-16 rounded-md border border-gray-300 text-center text-sm font-medium text-gray-700 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                                          value={(prod.qty ?? 1).toString()} // Ensure value is a string
                                          min="1"
                                          max="100"
                                          onChange={(
                                            event: React.ChangeEvent<HTMLInputElement>
                                          ) =>
                                            updateCartQuantity(
                                              parseInt(event.target.value),
                                              prod._id
                                            )
                                          }
                                        />
                                      </p>

                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-end flex-col">
                                          <p className="font-medium text-gray-900">
                                            £{" "}
                                            {parseFloat(
                                              (
                                                prod?.salePrice * prod?.qty
                                              ).toString()
                                            ).toFixed(2)}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          className="font-medium text-primary hover:text-green-500"
                                          onClick={() =>
                                            removeFromCart(prod._id)
                                          }
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 px-4 py-6 sm:px-6 sticky w-full bottom-0 bg-white">
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <p>Subtotal</p>
                          <p>£ {totalSalePrice}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          Shipping and taxes calculated at checkout.
                        </p>
                        <div className="mt-6">
                          <Link
                            href="/checkout"
                            className="flex items-center justify-center rounded-md border border-transparent bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary w-full"
                          >
                            Checkout
                          </Link>
                        </div>
                        <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                          <p>
                            or{" "}
                            <button
                              type="button"
                              className="font-medium text-green-600 hover:text-green-500"
                              onClick={() => setOpenCart(false)}
                            >
                              Continue Shopping
                              <span aria-hidden="true"> &rarr;</span>
                            </button>
                          </p>
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
