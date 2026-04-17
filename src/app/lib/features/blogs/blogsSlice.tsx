import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { Blog } from "../../../../../types";

interface BlogState {
  blogs: Blog[]; // Array to store blogs
  isLoading: boolean;
  error: string | null;
}

// Thunk for fetching blogs
export const fetchBlogs = createAsyncThunk<
  Blog[], // Type of the returned data (an array of Blog objects)
  void, // No argument passed to the thunk
  { rejectValue: string } // Type of the error message in case of rejection
>("blogs/fetchBlogs", async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`/api/blogs/latest`, { timeout: 8000 });
    if (response.data.status === 201 || response.status === 200) {
      return response.data.data as Blog[]; // Return blogs data on success
    } else {
      const msg = response.data?.message || "Unknown error";
      return rejectWithValue(msg); // Reject with error message
    }
  } catch (error: any) {
    const msg = error?.response?.data?.message || error.message;
    return rejectWithValue(msg); // Reject with error message
  }
});

// Blog Slice
const blogSlice = createSlice({
  name: "blogs",
  initialState: {
    blogs: [], // Initialize blogs as an empty array
    isLoading: false,
    error: null,
  } as BlogState, // Type the initial state
  reducers: {}, // No synchronous reducers for now
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogs.pending, (state) => {
        state.isLoading = true;
        state.error = null; // Clear previous error on new request
      })
      .addCase(fetchBlogs.fulfilled, (state, action: PayloadAction<Blog[]>) => {
        state.isLoading = false;
        state.blogs = action.payload; // Set fetched blogs in state
      })
      .addCase(fetchBlogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string; // Set error message
      });
  },
});

export default blogSlice.reducer;
