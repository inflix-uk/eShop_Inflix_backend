/** Public navbar row from GET /get/category/for/navbar (via /api/navbar) */
export type NavbarCategoryItem = {
  itemType?: "category";
  _id: string;
  name: string;
  isPublish: boolean;
  isFeatured: boolean;
  subCategory: string[];
  order: number;
  Logo?: { filename?: string; path?: string; url?: string };
  bannerImage?: { filename?: string; path?: string; url?: string };
};

export type NavbarCustomItem = {
  itemType: "custom";
  _id: string;
  label: string;
  path: string;
  order: number;
  subCategory?: string[];
};

export type NavbarItem = NavbarCategoryItem | NavbarCustomItem;

export function isNavbarCustom(
  item: NavbarItem
): item is NavbarCustomItem {
  return item.itemType === "custom";
}
