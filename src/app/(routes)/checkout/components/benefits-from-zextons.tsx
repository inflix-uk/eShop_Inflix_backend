"use client";
import React from "react";
import Image from "next/image";
import warretntofzextons from "@/app/assets/warretntofzextons.png";
import thirtydaywarrenty from "@/app/assets/thirtydaywarrenty.png";
import freedeliveryicon from "@/app/assets/freedeliveryicon.png";
import ukbasedcustomerservice from "@/app/assets/ukbasedcustomerservice.png";
const BenefitsFromZextons: React.FC = () => {
  return (
    <div className="border border-gray-200 rounded-lg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          Benefits Buying from Zextons:
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 18 Month Warranty */}
          <div className="bg-gray-100 rounded-lg p-6 flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image src={warretntofzextons} alt="18 month warranty" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              18 Month Warranty on the refurbished device
            </span>
          </div>

          {/* Free 30-day returns */}
          <div className="bg-gray-100 rounded-lg p-6 flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image src={thirtydaywarrenty} alt="30 day returns" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              Free 30-day returns
            </span>
          </div>

          {/* Free delivery on all items */}
          <div className="bg-gray-100 rounded-lg p-6 flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image src={freedeliveryicon} alt="free delivery on all items" />
            </div>
            <span className="text-sm font-medium text-gray-900">
              Free delivery on all items
            </span>
          </div>

          {/* UK-based Customer support */}
          <div className="bg-gray-100 rounded-lg p-6 flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image
                src={ukbasedcustomerservice}
                alt="UK-based customer support"
              />
            </div>
            <span className="text-sm font-medium text-gray-900">
              UK-based Customer support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsFromZextons;
