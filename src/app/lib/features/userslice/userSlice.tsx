import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define the User State Type
interface UserState {
  email: string;
  userId: string;
}

// Initial state with the defined types
const initialState: UserState = {
  email: "",
  userId: "",
};

// User Slice
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{ email: string; userId: string }>
    ) => {
      state.email = action.payload.email;
      state.userId = action.payload.userId;
    },
    clearUser: (state) => {
      state.email = "";
      state.userId = "";
    },
  },
});

// Export the actions and the reducer
export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
