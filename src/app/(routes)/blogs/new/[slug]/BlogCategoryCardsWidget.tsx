"use client";

import CategoriesCard from "@/app/components/CategoriesCard";
import type { CategoryCard } from "@/app/services/categoryCardsService";

export type CategoryCardBlockItem = {
  id?: string;
  categoryName?: string;
  categoryNameColor?: string;
  itemCountColor?: string;
  overlayColor?: string;
  shopNowLink?: string;
  itemCount?: number;
  backgroundImage?: string;
  categoryImage?: string;
  order?: number;
  isActive?: boolean;
};

export type BlogCategoryCardsWidgetProps = {
  headingText?: string;
  headingColor?: string;
  dividerColor?: string;
  sectionBackgroundColor?: string;
  items?: CategoryCardBlockItem[];
};

function toDisplayCards(items: CategoryCardBlockItem[] | undefined): CategoryCard[] {
  return (items || [])
    .filter((it) => it && it.isActive !== false)
    .map((it) => ({
      _id: it.id || `cc-${it.categoryName || "card"}`,
      categoryName: it.categoryName || "",
      shopNowLink: (it.shopNowLink || "").trim(),
      itemCount: it.itemCount ?? 0,
      categoryNameColor: it.categoryNameColor,
      itemCountColor: it.itemCountColor,
      overlayColor: it.overlayColor,
      backgroundImage: it.backgroundImage || "",
      categoryImage: it.categoryImage || "",
      order: it.order ?? 0,
      isActive: true,
    }))
    .filter(
      (c) =>
        c.categoryName.trim().length > 0 &&
        c.shopNowLink.length > 0 &&
        c.backgroundImage.trim().length > 0
    );
}

export default function BlogCategoryCardsWidget({
  headingText = "Popular Categories",
  headingColor = "var(--secondary)",
  dividerColor = "#000000",
  sectionBackgroundColor = "",
  items = [],
}: BlogCategoryCardsWidgetProps) {
  const cards = toDisplayCards(items);

  return (
    <section
      className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8"
      style={
        sectionBackgroundColor?.trim()
          ? { backgroundColor: sectionBackgroundColor.trim() }
          : undefined
      }
    >
      <div className="relative">
        <div className="flex items-center gap-3 mt-10">
          <h2
            className="text-2xl font-semibold"
            style={{ color: headingColor }}
          >
            {headingText}
          </h2>
          <div
            className="min-w-0 flex-grow border-b mt-1"
            style={{ borderColor: dividerColor }}
          />
        </div>
      </div>
      <CategoriesCard
        countItems={() => 0}
        newCategories={{ categories: [] }}
        inlineCards={cards}
      />
    </section>
  );
}
