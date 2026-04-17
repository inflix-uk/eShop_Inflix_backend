import React, { useState } from 'react'
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogTitle } from '@headlessui/react';
import ShopAllFilterSidebar from './ShopAllFilterSidebar';
export default function Sidebar({ products, setFilteredProducts, selectedSort }: any) {
     const [isOpen, setIsOpen] = useState<boolean>(false);
    const toggleOffCanvas = () => setIsOpen(!isOpen);
  return (
    <>
      <div className="lg:hidden block p-4">
        <button
          onClick={toggleOffCanvas}
          className="bg-green-600 text-white px-4 py-2 rounded-md flex gap-2 items-center"
        >
          Filters
          <ChevronDownIcon className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
      <Dialog
        open={isOpen}
        onClose={toggleOffCanvas}
        className="fixed inset-0 z-40"
      >
        {/* Overlay */}
        <div className="fixed inset-0 bg-black opacity-50" aria-hidden="true" />

        {/* Drawer Panel */}
        <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white p-4 overflow-y-auto">
          <DialogTitle className="text-lg font-semibold text-gray-800">
            Filters
          </DialogTitle>
          <button
            type="button"
            onClick={toggleOffCanvas}
            className="text-gray-900 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 right-2.5 inline-flex items-center justify-center"
          >
            <svg
              className="w-3 h-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 1l6 6m0 0l6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
            <span className="sr-only">Close menu</span>
          </button>

          {/* Drawer Content */}
          <div className="py-4 overflow-y-auto">
            <div
              id="accordion-collapse"
              className="border border-gray-300 rounded-lg"
            >
              <ShopAllFilterSidebar
                products={products}
                setFilteredProducts={setFilteredProducts}
                selectedSort={selectedSort}
              />
            </div>
          </div>
        </div>
      </Dialog>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={toggleOffCanvas}
          className="fixed inset-0 z-40 bg-black opacity-50 md:hidden"
        />
      )}
      <div className="lg:col-span-1 col-span-0 lg:block hidden">
        <div
          id="accordion-collapse"
          className="border border-gray-300 rounded-lg"
        >
          <ShopAllFilterSidebar
            products={products}
            setFilteredProducts={setFilteredProducts}
            selectedSort={selectedSort}
          />
        </div>
      </div>
    </>
  );
}
