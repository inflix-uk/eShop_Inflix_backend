import React from "react";
import Image from "next/image";
import {
  CustomCard,
  CustomCardTitle,
  CustomCardDescription,
} from "./CustomComponents";

interface Grade {
  title: string;
  description: string;
  image: any;
}

interface GradeCardsProps {
  grades: Grade[];
}

const GradeCards: React.FC<GradeCardsProps> = ({ grades }) => {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
        Our Grades
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {grades.map((grade, index) => (
          <CustomCard
            key={index}
            className="flex flex-col items-center text-center p-6"
          >
            <div className="relative w-full h-60 mb-4 rounded-lg overflow-hidden">
              <Image
                src={grade.image || "/placeholder.svg"}
                alt={grade.title}
                fill
                className="object-cover"
              />
            </div>
            <CustomCardTitle className="text-xl font-semibold text-gray-900 mb-2">
              {grade.title}
            </CustomCardTitle>
            <CustomCardDescription className="text-gray-700 text-sm">
              {grade.description}
            </CustomCardDescription>
          </CustomCard>
        ))}
      </div>
    </section>
  );
};

export default GradeCards;
