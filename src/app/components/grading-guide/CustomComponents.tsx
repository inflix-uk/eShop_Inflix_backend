import React, { useState } from "react";

// Custom Card Components
export const CustomCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const CustomCardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 pb-4 ${className}`}>{children}</div>;

export const CustomCardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2 className={`text-2xl font-bold text-gray-800 ${className}`}>
    {children}
  </h2>
);

export const CustomCardDescription = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <p className={`text-gray-700 text-[15px] leading-relaxed ${className}`}>
    {children}
  </p>
);

export const CustomCardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 pt-0 ${className}`}>{children}</div>;

// Custom Accordion Components
export const CustomAccordion = ({
  children,
  type = "single",
  collapsible = true,
  className = "",
}: {
  children: React.ReactNode;
  type?: "single" | "multiple";
  collapsible?: boolean;
  className?: string;
}) => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  const toggleItem = (value: string) => {
    if (type === "single" && collapsible) {
      setOpenItem(openItem === value ? null : value);
    } else if (type === "multiple") {
      // For multiple, you'd manage an array of open items
      // This example only supports single for simplicity
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === CustomAccordionItem) {
          return React.cloneElement(
            child as React.ReactElement<{
              value: string;
              isOpen?: boolean;
              onToggle?: () => void;
            }>,
            {
              isOpen: openItem === child.props.value,
              onToggle: () => toggleItem(child.props.value),
            }
          );
        }
        return child;
      })}
    </div>
  );
};

export const CustomAccordionItem = ({
  children,
  isOpen,
  onToggle,
  className = "",
}: {
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}) => (
  <div className={`border-b border-gray-200 ${className}`}>
    {React.Children.map(children, (child) => {
      if (
        React.isValidElement(child) &&
        (child.type === CustomAccordionTrigger ||
          child.type === CustomAccordionContent)
      ) {
        return React.cloneElement(
          child as React.ReactElement<{
            isOpen?: boolean;
            onToggle?: () => void;
          }>,
          {
            isOpen,
            onToggle,
          }
        );
      }
      return child;
    })}
  </div>
);

export const CustomAccordionTrigger = ({
  children,
  isOpen,
  onToggle,
  className = "",
}: {
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}) => (
  <button
    className={`flex items-center justify-between w-full py-4 text-lg font-semibold text-gray-900 hover:text-green-600 transition-colors duration-200 ${className}`}
    onClick={onToggle}
    aria-expanded={isOpen}
  >
    {children}
    <svg
      className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
        isOpen ? "rotate-180" : ""
      }`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

export const CustomAccordionContent = ({
  children,
  isOpen,
  className = "",
}: {
  children: React.ReactNode;
  isOpen?: boolean;
  className?: string;
}) => (
  <div
    className={`overflow-hidden transition-all duration-300 ease-in-out ${
      isOpen ? "max-h-screen opacity-100 py-2" : "max-h-0 opacity-0"
    }`}
  >
    <div
      className={`pb-4 text-gray-700 text-[15px] leading-relaxed max-w-4xl ${className}`}
    >
      {children}
    </div>
  </div>
);

// Custom Icons (SVG)
export const CheckCircleIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 text-green-600 ${className}`}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-8.5" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ShieldCheckIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 text-green-600 ${className}`}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const TruckIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`w-5 h-5 text-green-600 ${className}`}
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <g
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <path d="M19.5 17.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m-10 0a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0" />
      <path d="M14.5 17.5h-5m10 0h.763c.22 0 .33 0 .422-.012a1.5 1.5 0 0 0 1.303-1.302c.012-.093.012-.203.012-.423V13a6.5 6.5 0 0 0-6.5-6.5M2 4h10c1.414 0 2.121 0 2.56.44C15 4.878 15 5.585 15 7v8.5M2 12.75V15c0 .935 0 1.402.201 1.75a1.5 1.5 0 0 0 .549.549c.348.201.815.201 1.75.201M2 7h6m-6 3h4" />
    </g>
  </svg>
);

export const RefreshCwIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`w-5 h-5 text-green-600 ${className}`}
    width="24"
    height="24"
    viewBox="0 0 24 24"
  >
    <path
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M23 4v6h-6M1 20v-6h6M3.5 15a9 9 0 0 1 14.8-9.5L23 10M1 14l4.7-4.5A9 9 0 0 1 20.5 9"
    />
  </svg>
);

export const LockIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 text-green-600 ${className}`}
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const DiamondIcon = ({ className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 ${className}`}
  >
    <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
  </svg>
);
