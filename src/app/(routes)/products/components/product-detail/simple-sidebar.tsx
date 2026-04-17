interface SimpleSidebarProps {
  productName?: string;
  className?: string;
}

export default function SimpleSidebar({
  productName = "iPhone 11",
  className = "",
}: SimpleSidebarProps) {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "specifications", label: "Specifications" },
    { id: "reliable-power", label: "Reliable Power" },
    { id: "certification", label: "Quality Certification" },
    { id: "warranty", label: "Warranty" },
    { id: "whats-in-box", label: "What's In The Box" },
    { id: "reviews", label: "Customer Reviews" },
    { id: "sustainability", label: "Sustainability" },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {productName} Details
      </h3>

      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="space-y-3">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
            Add to Cart
          </button>
          <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-md transition-colors">
            Compare Products
          </button>
        </div>
      </div>
    </div>
  );
}
