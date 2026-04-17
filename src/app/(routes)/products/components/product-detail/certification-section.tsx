import LockDetection from "@/app/assets/Lock-Detection.png";
import Diagnostics from "@/app/assets/Diagnostics.png";
import BatteryHealth from "@/app/assets/Battery-Health.png";
import Authenticity from "@/app/assets/Authenticity.png";
import CellularService from "@/app/assets/Cellular-Service.png";
import EraseReset from "@/app/assets/Erase-Reset.png";
import Image from "next/image";

interface CertificationSectionProps {
  productName?: string;
}

export default function CertificationSection({
  productName = "iPhone 11",
}: CertificationSectionProps) {
  return (
    <section className="relative bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Main Heading */}
        <div className="text-center mb-16">
          <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-primary leading-tight max-w-4xl mx-auto">
            This {productName} undergoes rigorous testing to guarantee top-tier
            reliability
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Lock Detection */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={LockDetection} alt="Lock Detection" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Lock Detection
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Checks for manufacturer, carrier, & software locks.
            </p>
          </div>

          {/* Diagnostics */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={Diagnostics} alt="Diagnostics" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Diagnostics
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Automated component functionality scan.
            </p>
          </div>

          {/* Battery Health */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={BatteryHealth} alt="Battery Health" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Battery Health
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Battery capacity check to receive and hold a charge.
            </p>
          </div>

          {/* Authenticity */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={Authenticity} alt="Authenticity" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Authenticity
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Replacement part & background check.
            </p>
          </div>

          {/* Cellular Service */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={CellularService} alt="Cellular Service" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Cellular Service
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Check SIM, place test call & sms message.
            </p>
          </div>

          {/* Erase & Reset */}
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <Image src={EraseReset} alt="Erase Reset" />
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">
              Erase & Reset
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Secure data wipe and reset to factory default.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
