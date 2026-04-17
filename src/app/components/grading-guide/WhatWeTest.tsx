import React from "react";
import {
  CustomCard,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardDescription,
  CustomCardContent,
  CheckCircleIcon,
} from "./CustomComponents";

interface WhatWeTestProps {
  whatWeTest: string[];
}

const WhatWeTest: React.FC<WhatWeTestProps> = ({ whatWeTest }) => {
  return (
    <section className="mb-16">
      <CustomCard>
        <CustomCardHeader>
          <CustomCardTitle className="text-2xl font-bold text-gray-800">
            What We Test
          </CustomCardTitle>
          <CustomCardDescription>
            Every refurbished device at Zextons undergoes a rigorous 90-point
            diagnostic inspection to guarantee perfect functionality,
            reliability, and performance — just like new. Our certified
            technicians test every detail, from battery health to camera
            quality. A few of the checks we perform include:
          </CustomCardDescription>
        </CustomCardHeader>
        <CustomCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whatWeTest.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-gray-800"
              >
                <CheckCircleIcon />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CustomCardContent>
      </CustomCard>
    </section>
  );
};

export default WhatWeTest;
