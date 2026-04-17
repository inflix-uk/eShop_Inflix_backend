import React from "react";

interface Tab {
  id: string;
  label: string;
  href: string;
}

interface TabSelectorProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  renderTabContent: () => React.ReactNode;
}

const TabSelector: React.FC<TabSelectorProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  renderTabContent,
}) => {
  return (
    <>
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-md font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-green-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-12">{renderTabContent()}</div>
    </>
  );
};

export default TabSelector;
