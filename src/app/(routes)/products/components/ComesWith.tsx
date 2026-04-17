"use client";
import React from "react";

export interface ComesWithItem {
  slug: string;
  name: string;
  icon: string | null;
  description: string | null;
  image?: {
    filename?: string;
    path?: string;
    url?: string;
  } | null;
}

// Fallback SVG icon when no icon is provided
const DefaultIcon = () => (
  <svg
    className="w-5 h-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);

// Render icon - supports HTML icons from database
const renderIcon = (item: ComesWithItem) => {
  // Check if icon is HTML (like Flaticon <i class="fi fi-rr-truck-side"></i>)
  if (item.icon && item.icon.trim().startsWith("<")) {
    return (
      <span
        className="flex items-center justify-center [&>i]:text-lg [&>svg]:w-5 [&>svg]:h-5"
        dangerouslySetInnerHTML={{ __html: item.icon }}
      />
    );
  }

  // Fallback to default icon
  return <DefaultIcon />;
};

export default function ComesWith({
  product,
  comesWithItemsPopulated,
  onItemClick,
}: {
  product: any;
  comesWithItemsPopulated?: ComesWithItem[];
  onItemClick?: (item: ComesWithItem) => void;
}) {
  // Use populated items if available
  const hasPopulatedItems =
    comesWithItemsPopulated && comesWithItemsPopulated.length > 0;
  const comesWithSlugs: string[] = product?.comesWithItems || [];

  // Convert slugs to items if not populated
  const comesWithItems: ComesWithItem[] = hasPopulatedItems
    ? comesWithItemsPopulated
    : comesWithSlugs.map((slug) => ({
        slug,
        name: slug
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        icon: null,
        description: null,
      }));

  const handleItemClick = (item: ComesWithItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  if (comesWithItems.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold leading-6 text-gray-900 mb-2">
        Comes with
      </h2>
      <div className="grid md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 grid-cols-2 justify-start gap-3 items-center">
        {comesWithItems.map((item) => {
          return (
            <div
              key={item.slug}
              className="flex flex-row items-center gap-3 border p-2 rounded-lg bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => handleItemClick(item)}
            >
              <div className="h-6 w-6 flex items-center justify-center">
                {renderIcon(item)}
              </div>
              <label className="text-xs font-medium leading-6 text-gray-900 lg:whitespace-nowrap flex-1 cursor-pointer">
                {item.name}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
