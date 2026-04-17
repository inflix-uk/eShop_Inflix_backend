import React from "react";
import {
  CustomCard,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardContent,
  CustomAccordion,
  CustomAccordionItem,
  CustomAccordionTrigger,
  CustomAccordionContent,
} from "./CustomComponents";

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
}

const FAQSection: React.FC<FAQSectionProps> = ({ faqs }) => {
  return (
    <section className="mb-16">
      <CustomCard>
        <CustomCardHeader>
          <CustomCardTitle className="text-2xl font-bold text-gray-800">
            FAQs
          </CustomCardTitle>
        </CustomCardHeader>
        <CustomCardContent>
          <CustomAccordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <CustomAccordionItem key={index}>
                <CustomAccordionTrigger>{faq.question}</CustomAccordionTrigger>
                <CustomAccordionContent>{faq.answer}</CustomAccordionContent>
              </CustomAccordionItem>
            ))}
          </CustomAccordion>
        </CustomCardContent>
      </CustomCard>
    </section>
  );
};

export default FAQSection;
