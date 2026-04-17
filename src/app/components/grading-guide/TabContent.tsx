import React from "react";
import Image from "next/image";
import Link from "next/link";
import iphonemini from "@/app/assets/iphonemini.png";
import samsungmini from "@/app/assets/samsungmini.png";
import iphone2mini from "@/app/assets/iphone2mini.png";
import allmobilesmini from "@/app/assets/allmobilesmini.png";
interface TabContentProps {
  activeTab: string;
}

const TabContent: React.FC<TabContentProps> = ({ activeTab }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "refurbished":
        return (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold mb-4">Refurbished iPhones</h3>
            <p className="text-gray-600 mb-6">
              Discover our premium selection of refurbished iPhones, thoroughly
              tested and certified.
            </p>
            <Link href="/categories/refurbished/iphone" className="inline-block">
              <div className="relative max-w-md mx-auto cursor-pointer group">
                <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-6 h-48 flex items-center justify-center overflow-hidden">
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <Image
                        src={iphonemini}
                        alt="Refurbished iPhone"
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-green-800 font-bold text-lg block">
                      View Refurbished iPhones
                    </span>
                    <p className="text-green-700 text-sm">
                      Premium quality, tested devices
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-green-600/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          </div>
        );
      case "all":
        return (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold mb-4">All Phones</h3>
            <p className="text-gray-600 mb-6">
              Browse our complete collection of smartphones from various brands
              and models.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Link href="/categories/refurbished/iphone" className="group">
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-6 h-48 flex items-center justify-center cursor-pointer overflow-hidden">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <Image
                        src={iphone2mini}
                        alt="iPhone Collection"
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-blue-800 font-bold text-lg block">
                      iPhone Collection
                    </span>
                    <p className="text-blue-700 text-sm">
                      Latest models & classics
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/categories/samsung" className="group">
                <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg p-6 h-48 flex items-center justify-center cursor-pointer overflow-hidden">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <Image
                        src={samsungmini}
                        alt="Samsung Collection"
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-purple-800 font-bold text-lg block">
                      Samsung Collection
                    </span>
                    <p className="text-purple-700 text-sm">
                      Galaxy series & more
                    </p>
                  </div>
                </div>
              </Link>

              <Link href="/categories/mobile-phones" className="group">
                <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-lg p-6 h-48 flex items-center justify-center cursor-pointer overflow-hidden">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <Image
                        src={allmobilesmini}
                        alt="Other Brands"
                        fill
                        className="object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-orange-800 font-bold text-lg block">
                      All Brands
                    </span>
                    <p className="text-orange-700 text-sm">
                      OnePlus, Huawei & more
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      case "deals":
        return (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold mb-4">Today&apos;s Special Deals</h3>
            <p className="text-gray-600 mb-6">
              Don&apos;t miss out on these limited-time offers and exclusive
              discounts.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-6 h-32 flex items-center justify-center">
                <div>
                  <span className="text-green-800 font-bold text-lg">
                    Up to 70% Off
                  </span>
                  <p className="text-green-700">Selected iPhone Models</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-6 h-32 flex items-center justify-center">
                <div>
                  <span className="text-blue-800 font-bold text-lg">
                    Free Shipping
                  </span>
                  <p className="text-blue-700">On All Orders</p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <>{renderTabContent()}</>;
};

export default TabContent;
