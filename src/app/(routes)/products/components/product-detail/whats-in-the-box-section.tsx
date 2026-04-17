import Image from "next/image";
import freeprotectionbundle from "@/app/assets/free-protection-bundle.png";

interface ProductShowcaseProps {
  productName?: string;
}

export default function ProductShowcase({
  productName = "iPhone 11",
}: ProductShowcaseProps) {
  const boxItems = [
    `Your ${productName}`,
    "SIM Removal Tool",
    "Protection Bundle",
    "Free SIM",
    "Charging Cable",
    "100% Sustainable and Recyclable Box",
  ];

  return (
    <div className="">
      <div className="grid lg:grid-cols-2">
        {/* Left Section - Red Background with Product Image */}
        <div className="bg-primary flex items-center justify-center p-8 lg:p-16">
          <div className="max-w-sm">
            <Image src={freeprotectionbundle} alt="Free Protection Bundle" />
          </div>
        </div>

        {/* Right Section - White Background with Content */}
        <div className="bg-white flex items-center justify-start p-8 lg:p-16">
          <div className="max-w-md w-full">
            <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-gray-900 mb-8 text-balance">
              What&apos;s <span className="text-primary">In The Box?</span>
            </h2>

            <div className="space-y-4">
              {boxItems.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Custom Red Checkmark */}
                  <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <span className="text-gray-900 text-lg font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
