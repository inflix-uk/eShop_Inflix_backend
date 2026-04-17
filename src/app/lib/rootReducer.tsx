import { combineReducers } from "redux";
import authSlice from "@/app/lib/features/auth/authSlice";
import registerSlice from "@/app/lib/features/register/registerSlice";
import productsReducer from "@/app/lib/features/products/getProductSlice";
import categoriesReducer from "@/app/lib/features/categories/categoriesSlice";
import navbarCategoryReducer from "@/app/lib/features/navbarcategories/navbarCategorySlice";
import userReducer from "@/app/lib/features/userslice/userSlice";
import paymentReducer from "@/app/lib/features/paymentdetails/paymentDetailsSlice";
import recentlyViewedReducer from "@/app/lib/features/recentlyviewedproducts/recentlyViewedSlice";
import blogsReducer from "@/app/lib/features/blogs/blogsSlice";

const rootReducer = combineReducers({
  auth: authSlice,
  register: registerSlice,
  products: productsReducer,
  categories: categoriesReducer,
  navbarCategory: navbarCategoryReducer,
  blogs: blogsReducer,
  user: userReducer,
  payment: paymentReducer,
  recentlyViewed: recentlyViewedReducer,
});

export default rootReducer;
