import { SortOption } from "../../../types";

export const SortOptions: SortOption[] = [
  {
    name: "Most Popular",
    key: "popularity",
    sortFunc: (a, b) => b.popularity - a.popularity,
  },
  {
    name: "Best Rating",
    key: "rating",
    sortFunc: (a, b) => b.averageRating - a.averageRating,
  },
  {
    name: "Newest",
    key: "newest",
    sortFunc: (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  },
  {
    name: "Price: Low to High",
    key: "priceLowToHigh",
    sortFunc: (a, b) => parseFloat(a.minSalePrice) - parseFloat(b.minSalePrice),
  },
  {
    name: "Price: High to Low",
    key: "priceHighToLow",
    sortFunc: (a, b) => parseFloat(b.minSalePrice) - parseFloat(a.minSalePrice),
  },
];
