import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import type { NavbarCategoryItem, NavbarItem } from "./navbarTypes";
import { isNavbarCustom } from "./navbarTypes";

interface NavbarCategoryState {
  items: NavbarItem[];
  isLoading: boolean;
  error: string | null;
}

interface RootState {
  auth: {
    ip: string;
  };
}

function normalizeNavbarPayload(raw: unknown): NavbarItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NavbarItem[] = [];
  for (const row of raw as Record<string, unknown>[]) {
    if (row?.itemType === "custom") {
      out.push({
        itemType: "custom",
        _id: String(row._id),
        label: String(row.label ?? ""),
        path: String(row.path ?? ""),
        order: Number(row.order) || 0,
        subCategory: [],
      });
    } else {
      const cat: NavbarCategoryItem = {
        _id: String(row._id),
        name: String(row.name ?? ""),
        isPublish: Boolean(row.isPublish),
        isFeatured: Boolean(row.isFeatured),
        subCategory: Array.isArray(row.subCategory)
          ? (row.subCategory as string[])
          : [],
        order: Number(row.order) || 0,
        Logo: row.Logo as NavbarCategoryItem["Logo"],
        bannerImage: row.bannerImage as NavbarCategoryItem["bannerImage"],
      };
      out.push(cat);
    }
  }
  return out;
}

export const fetchNavbarCategory = createAsyncThunk<
  NavbarItem[],
  void,
  { rejectValue: string; state: RootState }
>(
  "navbarCategory/fetchNavbarCategory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/navbar`, { timeout: 8000 });
      if (response.status === 200) {
        const normalized = normalizeNavbarPayload(response.data?.data);
        return normalized
          .filter((item) => isNavbarCustom(item) || item.isPublish)
          .sort((a, b) => a.order - b.order);
      }
      const errorMessage =
        response.data?.message || "Unknown error occurred";
      return rejectWithValue(errorMessage);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.message || err.message || "Network error";
      return rejectWithValue(errorMessage);
    }
  }
);

const navbarCategorySlice = createSlice({
  name: "navbarCategory",
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  } as NavbarCategoryState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNavbarCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchNavbarCategory.fulfilled,
        (state, action: PayloadAction<NavbarItem[]>) => {
          state.isLoading = false;
          state.items = action.payload;
        }
      )
      .addCase(fetchNavbarCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default navbarCategorySlice.reducer;
