import React from "react";
import {
  CustomCard,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardContent,
} from "./CustomComponents";

const BatteryAndAccessories: React.FC = () => {
  return (
    <section className="mb-16">
      <CustomCard>
        <CustomCardHeader>
          <CustomCardTitle className="text-2xl font-bold text-gray-800">
            Battery Health & Accessories
          </CustomCardTitle>
        </CustomCardHeader>
        <CustomCardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Battery Health:
          </h3>
          <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
            <li>
              iPhone: Minimum 85% battery health or replaced to meet performance
              standards.
            </li>
            <li>Android: Meets manufacturer performance thresholds.</li>
          </ul>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Accessories Included:
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-1">
            <li>
              Phone, USB cable, SIM opening tool, & free case + screen protector
            </li>
          </ul>
        </CustomCardContent>
      </CustomCard>
    </section>
  );
};

export default BatteryAndAccessories;
