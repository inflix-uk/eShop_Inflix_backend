"use client";
import React, { useState } from "react";
import Script from "next/script";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import {
  GradeCards,
  InteractiveConditionSelector,
  ComparisonTable,
  WhatWeTest,
  BatteryAndAccessories,
  WarrantyBanner,
  TabSelector,
  TabContent,
  FAQSection,
  grades,
  comparisonTable,
  whatWeTest,
  faqs,
  faqSchema,
  tabs,
  conditionOptions,
  getImageForCondition,
  getGradientForCondition,
  getImagesForCondition,
} from "@/app/components/grading-guide";

const GradingGuidePage = () => {
  const [activeTab, setActiveTab] = useState("refurbished");

  const renderTabContent = () => {
    return <TabContent activeTab={activeTab} />;
  };

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 lg:px-8">
        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          strategy="beforeInteractive"
        />

        {/* Hero Section */}
        {/* <section className="text-center mb-16">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Our Device Grading Explained
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
            Every phone is fully tested, unlocked, and covered by an 18‑month
            warranty — choose the grade that fits your budget and style.
          </p>
        </section> */}

        {/* Grade Cards */}
        {/* <GradeCards grades={grades} /> */}

        {/* Interactive Condition Selector */}
        <InteractiveConditionSelector
          conditionOptions={conditionOptions}
          getImageForCondition={getImageForCondition}
          getGradientForCondition={getGradientForCondition}
          getImagesForCondition={getImagesForCondition}
        />

        {/* Quick Comparison Table */}
        <ComparisonTable comparisonTable={comparisonTable} />

        {/* What We Test */}
        <WhatWeTest whatWeTest={whatWeTest} />

        {/* Battery Health & Accessories Policy */}
        <BatteryAndAccessories />

        {/* Warranty, Delivery & Returns Banner */}
        <WarrantyBanner />

        {/* Tab Selector */}
        <TabSelector
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          renderTabContent={renderTabContent}
        />

        {/* FAQs */}
        <FAQSection faqs={faqs} />
      </div>

      </>
  );
};

export default GradingGuidePage;
