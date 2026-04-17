import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "react-toastify";
import { UserData } from "../../../../../types";

// Define the UserData type for the payload of the registerUser asyncThunk

// Define the initial state type
interface RegisterState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  Cpassword: string;
  progress: number;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

// Initial state with the defined types
const initialState: RegisterState = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  password: "",
  Cpassword: "",
  progress: 0,
  status: "idle",
  error: null,
};

// Thunk for registering a user
export const registerUser = createAsyncThunk<
  any, // The type of data returned from the asyncThunk (you can replace `any` with the actual response type if needed)
  UserData, // The type of the payload (the user data being sent)
  { rejectValue: string } // The type of the error message in case of rejection
>(
  "register/registerUser",
  async (userData: UserData, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as { auth: { ip: string } }; // Access state and get the API IP from the `auth` slice
    const ip = state.auth.ip;

    try {
      dispatch(setProgress(30)); // Set progress to 30%
      const response = await axios.post(`${ip}register`, userData);

      console.log("response", response.data);

      dispatch(setProgress(100)); // Set progress to 100%

      if (response.data.status === 201) {
        toast.success(response.data.message); // Show success toast notification
        return response.data;
      } else {
        throw new Error(response.data.message); // Throw an error if registration failed
      }
    } catch (error: any) {
      dispatch(setProgress(100)); // Set progress to 100%

      // Log error details for debugging
      console.error("Error during registration:", error.message);
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        console.error("Error request:", error.request);
      } else {
        console.error("General error message:", error.message);
      }

      toast.error(`Registration failed: ${error.message}`);
      return rejectWithValue(error.message); // Return the error message
    }
  }
);

// Register Slice
const registerSlice = createSlice({
  name: "register",
  initialState,
  reducers: {
    setFirstName: (state, action: PayloadAction<string>) => {
      state.firstName = action.payload;
    },
    setLastName: (state, action: PayloadAction<string>) => {
      state.lastName = action.payload;
    },
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setPhoneNumber: (state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload;
    },
    setPassword: (state, action: PayloadAction<string>) => {
      state.password = action.payload;
    },
    setCPassword: (state, action: PayloadAction<string>) => {
      state.Cpassword = action.payload;
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.status = "succeeded";
        state.error = null;
        // Reset form fields on success
        state.firstName = "";
        state.lastName = "";
        state.email = "";
        state.phoneNumber = "";
        state.password = "";
        state.Cpassword = "";
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string; // Set error message from rejection
      });
  },
});

export const {
  setFirstName,
  setLastName,
  setEmail,
  setPhoneNumber,
  setPassword,
  setCPassword,
  setProgress,
} = registerSlice.actions;

export default registerSlice.reducer;
