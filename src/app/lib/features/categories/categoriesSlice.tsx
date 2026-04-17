// redux/productCategorySlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

// Define a Type for the product category based on the response structure
interface ThumbnailImage {
  filename: string;
  path: string;
}

interface MetaSchema {
  // Add the structure of metaSchemas if needed
  [key: string]: string;
}

interface ProductCategory {
  _id: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  isPublish: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  subCategory: string[];
  metaSchemas: MetaSchema[];
  content: string | null;
  Logo: ThumbnailImage;
  bannerImage: ThumbnailImage;
  metaImage: ThumbnailImage | null;
  metasubCategory: SubCategory[];
}

interface SubCategory {
  subcategoryName: string;
  subCategoryIndex: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  metaSchemas: string[];
  content: string | null;
  _id: string;
}

// Define types for category counts
interface SubCategoryCount {
  name: string;
  count: number;
}

interface CategoryCount {
  categoryId: string;
  categoryName: string;
  totalProducts: number;
  subCategories: SubCategoryCount[];
}

interface ProductCategoryState {
  categories: ProductCategory[];
  categoryCounts: CategoryCount[];
  isLoading: boolean;
  isCountsLoading: boolean;
  error: string | null;
  countsError: string | null;
}

// Initial state of the product category slice
const initialState: ProductCategoryState = {
  categories: [],
  categoryCounts: [],
  isLoading: false,
  isCountsLoading: false,
  error: null,
  countsError: null,
};

// Async thunk to fetch product categories
export const fetchProductCategory = createAsyncThunk<
  ProductCategory[], // Return type of the fulfilled action
  string, // Argument type (category string)
  { rejectValue: string } // Reject value type
>(
  "productCategory/fetchProductCategory",
  async (category, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/category/customized`, { timeout: 10000 });
      const body = response.data ?? {};
      const code = body.status;
      if (code === 201 || code === 200) {
        const raw = body.productCategories;
        return Array.isArray(raw) ? raw : [];
      }
      return rejectWithValue(
        typeof body.message === "string"
          ? body.message
          : "Failed to load categories"
      );
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message); // Reject with error message
      }
      return rejectWithValue("An unknown error occurred");
    }
  }
);

// Async thunk to fetch category counts
export const fetchCategoryCounts = createAsyncThunk<
  CategoryCount[], // Return type of the fulfilled action
  string | undefined, // Argument type (optional categories string)
  { rejectValue: string } // Reject value type
>(
  "productCategory/fetchCategoryCounts",
  async (categories, { rejectWithValue }) => {
    try {
      const url = categories
        ? `/api/category/counts?categories=${encodeURIComponent(categories)}`
        : `/api/category/counts`;

      const response = await axios.get(url, { timeout: 10000 });

      if (response.data.success) {
        const raw = response.data.categoryCounts;
        return Array.isArray(raw) ? raw : [];
      } else {
        return rejectWithValue(response.data.message); // Reject with message if not success
      }
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message); // Reject with error message
      }
      return rejectWithValue("An unknown error occurred");
    }
  }
);

// Create slice for product categories
const productCategorySlice = createSlice({
  name: "productCategory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchProductCategory.fulfilled,
        (state, action: PayloadAction<ProductCategory[]>) => {
          state.isLoading = false;
          state.categories = Array.isArray(action.payload)
            ? action.payload
            : [];
        }
      )
      .addCase(
        fetchProductCategory.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.isLoading = false;
          state.error = action.payload ?? "An error occurred"; // Set error message if rejected
        }
      )
      // Category counts reducers
      .addCase(fetchCategoryCounts.pending, (state) => {
        state.isCountsLoading = true;
        state.countsError = null;
      })
      .addCase(
        fetchCategoryCounts.fulfilled,
        (state, action: PayloadAction<CategoryCount[]>) => {
          state.isCountsLoading = false;
          state.categoryCounts = Array.isArray(action.payload)
            ? action.payload
            : [];
        }
      )
      .addCase(
        fetchCategoryCounts.rejected,
        (state, action: PayloadAction<string | undefined>) => {
          state.isCountsLoading = false;
          state.countsError = action.payload ?? "An error occurred"; // Set error message if rejected
        }
      );
  },
});

export default productCategorySlice.reducer;
