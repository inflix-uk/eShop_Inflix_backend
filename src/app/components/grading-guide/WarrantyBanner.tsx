import React from "react";
import {
  ShieldCheckIcon,
  TruckIcon,
  RefreshCwIcon,
  LockIcon,
} from "./CustomComponents";

const WarrantyBanner: React.FC = () => {
  return (
    <section className="mb-16">
      <div className="bg-green-600 text-white p-8 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-around text-center md:text-left gap-6">
        <div className="flex flex-col items-center md:items-start">
          <ShieldCheckIcon className="w-8 h-8 text-white mb-2" />
          <span className="font-semibold text-lg">18‑Month Warranty</span>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <TruckIcon className="w-8 h-8 text-white mb-2" />
          <span className="font-semibold text-lg">
            Free UK Next‑Day Delivery
          </span>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <RefreshCwIcon className="w-8 h-8 text-white mb-2" />
          <span className="font-semibold text-lg">30‑Day Returns</span>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <LockIcon className="w-8 h-8 text-white mb-2" />
          <span className="font-semibold text-lg">Unlocked & SIM‑Free</span>
        </div>
      </div>
    </section>
  );
};

export default WarrantyBanner;
