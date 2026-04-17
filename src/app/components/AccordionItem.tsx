import React from "react";

// Define the types for the component props
interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  isOpen,
  onClick,
}) => {
  return (
    <div className="border-b border-gray-200">
      <h2>
        <button
          type="button"
          className="flex items-center justify-between w-full p-5 font-medium text-gray-500 hover:bg-gray-100 gap-3"
          onClick={onClick}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <svg
            className={`w-3 h-3 transform ${
              isOpen ? "rotate-0" : "rotate-180"
            }`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 10 6"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5L5 1 1 5"
            />
          </svg>
        </button>
      </h2>
      {isOpen && <div className="p-5 border-t border-gray-200">{children}</div>}
    </div>
  );
};

export default AccordionItem;
