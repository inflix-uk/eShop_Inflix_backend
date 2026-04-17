import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define types for the user and ip
interface User {
  _id: string;
  username: string;
  email: string;
  // add other fields depending on your user data
}

interface AuthState {
  user: User | null; // user can be null if not logged in
  ip: string;
}

// Initial state with types
const initialState: AuthState = {
  user: null,
  ip: `${process.env.NEXT_PUBLIC_API_URL}/`, // Initialize ip state
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Define the login action
    login: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    // Define the logout action
    logout: (state) => {
      state.user = null;
    },
    // Define the setIp action
    setIp: (state, action: PayloadAction<string>) => {
      state.ip = action.payload;
    },
  },
});

// Export actions
export const { login, logout, setIp } = authSlice.actions;

// Export the reducer
export default authSlice.reducer;
