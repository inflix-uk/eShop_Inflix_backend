import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define types for the payment state
interface PaymentState {
  paymentIntentId: string | null;
  paymentMethodId: string | null;
  cardDetails: { cardNumber: string; expiryDate: string; cvv: string } | null;
}

// Define the initial state with types
const initialState: PaymentState = {
  paymentIntentId: null,
  cardDetails: null,
  paymentMethodId: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    // Define the action payload type explicitly
    setPaymentDetails: (
      state,
      action: PayloadAction<{
        paymentMethodId: string | null;
        paymentIntentId: string;
        cardDetails: { cardNumber: string; expiryDate: string; cvv: string };
      }>
    ) => {
      state.paymentIntentId = action.payload.paymentIntentId;
      state.cardDetails = action.payload.cardDetails;
    },
  },
});

export const { setPaymentDetails } = paymentSlice.actions;
export default paymentSlice.reducer;
