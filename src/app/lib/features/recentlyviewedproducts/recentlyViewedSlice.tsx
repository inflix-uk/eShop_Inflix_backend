import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "../../../../../types";

const MAX_RECENTLY_VIEWED = 5; // Kept at 4 as per your requirement

interface RecentlyViewedState {
  products: Product[];
}

const initialState: RecentlyViewedState = {
  products: [],
};

const recentlyViewedSlice = createSlice({
  name: "recentlyViewed",
  initialState,
  reducers: {
    // Modified to avoid changing the order when revisiting an existing product
    addProduct: (state, action: PayloadAction<Product>) => {
      const product = action.payload;

      // Check if the product is already in the list
      const existingProductIndex = state.products.findIndex(
        (p) => p._id === product._id
      );

      if (existingProductIndex === -1) {
        // If the product is not in the list, add it to the beginning
        state.products.unshift(product);

        // Limit the list to MAX_RECENTLY_VIEWED items
        if (state.products.length > MAX_RECENTLY_VIEWED) {
          state.products = state.products.slice(0, MAX_RECENTLY_VIEWED);
        }
      }
    },

    clearRecentlyViewed: (state) => {
      state.products = [];
    },
  },
});

export const { addProduct, clearRecentlyViewed } = recentlyViewedSlice.actions;
export default recentlyViewedSlice.reducer;
