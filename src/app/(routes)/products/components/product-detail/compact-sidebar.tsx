"use client";

import { useState } from "react";

interface CompactSidebarProps {
  productName?: string;
  className?: string;
}

export default function CompactSidebar({
  productName = "iPhone 11",
  className = "",
}: CompactSidebarProps) {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    { id: "overview", label: "Overview", icon: "📱" },
    { id: "specifications", label: "Specs", icon: "⚙️" },
    { id: "reliable-power", label: "Power", icon: "🔋" },
    { id: "certification", label: "Quality", icon: "✅" },
    { id: "warranty", label: "Warranty", icon: "🛡️" },
    { id: "whats-in-box", label: "In Box", icon: "📦" },
    { id: "reviews", label: "Reviews", icon: "⭐" },
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-4 text-center">
        {productName}
      </h4>

      <nav className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`
              w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium rounded transition-colors
              ${
                activeSection === section.id
                  ? "bg-green-100 text-green-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }
            `}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="space-y-2">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
            Add to Cart
          </button>
          <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded transition-colors">
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
