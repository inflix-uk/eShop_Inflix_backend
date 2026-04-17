"use client";

import React, { useState, ChangeEvent, FC, FormEvent } from "react";
import { useAuth } from "@/app/context/Auth";
import axios from "axios";
import NewsletterSuccessModal from "@/app/components/common/NewsletterSuccessModal"; // Adjust the import path as needed
import AddressAutocomplete from "./AddressAutocomplete";

interface ShippingInformation {
  firstName: string;
  lastName: string;
  companyName: string;
  phoneNumber: string;
  address: string;
  apartment: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

interface Errors {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  password?: string;
  confirmPassword?: string;
}

interface RegisterFormProps {
  handleCreateAcc: (e: FormEvent<HTMLFormElement>) => void;
  handleShippingChange: (e: ChangeEvent<HTMLInputElement>) => void;
  email: string;
  setEmail: (email: string) => void;
  shippingInformation: ShippingInformation;
  password: string;
  setPassword: (password: string) => void;
  Cpassword: string;
  setCPassword: (password: string) => void;
  errors: Errors;
}

const RegisterForm: FC<RegisterFormProps> = ({
  handleCreateAcc,
  handleShippingChange,
  email,
  setEmail,
  shippingInformation,
  password,
  setPassword,
  Cpassword,
  setCPassword,
  errors,
}) => {
  const auth = useAuth();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState<boolean>(false); // State for Thank You modal

  const handleClose = () => {
    setShowThankYou(false); // Reset thank you modal state
  };

  const handleSubmit = async () => {
    // Reset success and error messages
    setError(null);
    setSuccess(null);

    // Log to verify handleSubmit is being called
    console.log("Submitting subscription...");

    // Get values based on authentication
    const userEmail = auth?.user ? auth.user.email : email;
    const userFirstName = auth?.user
      ? auth.user.firstname
      : shippingInformation.firstName;
    const userLastName = auth?.user
      ? auth.user.lastname
      : shippingInformation.lastName;

    if (!userEmail || !userFirstName || !userLastName) {
      setError("Please provide all the required information.");
      console.error("Missing information:", {
        userEmail,
        userFirstName,
        userLastName,
      });
      return;
    }

    // Check if ip exists and handle accordingly
    const ip = auth?.ip || `${process.env.NEXT_PUBLIC_API_URL}/`; // Provide a fallback if ip is not available

    try {
      const response = await axios.post(`${ip}newsletter/subscribers`, {
        fullName: `${userFirstName} ${userLastName}`,
        email: userEmail,
        mode: "checkout",
      });

      if (response.status === 201) {
        setSuccess("You have successfully subscribed!");
        setEmail(""); // Clear email field
        console.log("Subscription successful!");
        setShowThankYou(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      setError("Error: " + err.message);
      console.error("Error while submitting:", err);
    }
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsSubscribed(isChecked);

    // Log checkbox change
    console.log("Checkbox changed:", isChecked);

    if (isChecked) {
      // If the checkbox is checked, trigger the form submission
      handleSubmit();
    }
  };

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [showAddressLookup, setShowAddressLookup] = useState<boolean>(true);

  const handleAddressSelect = (selectedAddress: {
    address: string;
    apartment?: string;
    city: string;
    county: string;
    postalCode: string;
  }) => {
    // Auto-fill the form fields with selected address
    const addressEvent = { target: { name: 'address', value: selectedAddress.address } };
    const apartmentEvent = { target: { name: 'apartment', value: selectedAddress.apartment || '' } };
    const cityEvent = { target: { name: 'city', value: selectedAddress.city } };
    const countyEvent = { target: { name: 'county', value: selectedAddress.county } };
    const postalCodeEvent = { target: { name: 'postalCode', value: selectedAddress.postalCode } };

    handleShippingChange(addressEvent as ChangeEvent<HTMLInputElement>);
    handleShippingChange(apartmentEvent as ChangeEvent<HTMLInputElement>);
    handleShippingChange(cityEvent as ChangeEvent<HTMLInputElement>);
    handleShippingChange(countyEvent as ChangeEvent<HTMLInputElement>);
    handleShippingChange(postalCodeEvent as ChangeEvent<HTMLInputElement>);

    setShowAddressLookup(false);
  };

  return (
    <>
      <form
        className="mt-5 border-t border-gray-200 pt-5"
        onSubmit={handleCreateAcc}
      >
        <h2 className="text-lg font-medium text-gray-900">Billing Details</h2>
        <div className="mt-4 grid gap-y-3 grid-cols-2 sm:gap-x-4 gap-x-2">
          {/* Email and Subscribe Checkbox */}
          <div className="sm:col-span-2 col-span-2">
            <div className="mt-1">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Email Address"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                  errors.email ? "border-red-600" : ""
                }`}
                value={auth?.user?.email || email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                required
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-2">{errors.email}</p>
              )}
            </div>
            <div className="flex items-center mt-2">
              <input
                id="default-checkbox2"
                type="checkbox"
                checked={isSubscribed}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-primary bg-gray-50 outline-none focus:outline-none focus:ring-0 ring-0"
              />
              <label
                htmlFor="default-checkbox2"
                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                <b>Stay in the Loop!</b> Subscribe to our newsletter for
                exclusive offers and updates.
              </label>
              {success && (
                <p className="text-green-600 text-sm mt-2 hidden">{success}</p>
              )}
              {error && (
                <p className="text-red-600 text-sm mt-2 hidden">{error}</p>
              )}
            </div>
          </div>

          {/* First and Last Name */}
          <div className="col-span-2 flex gap-2 items-center">
            <div className="w-full">
              <input
                type="text"
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                placeholder="First Name"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.firstName ? "border-red-600" : ""
                }`}
                value={shippingInformation.firstName}
                onChange={handleShippingChange}
                required
              />
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-2">{errors.firstName}</p>
              )}
            </div>
            <div className="w-full">
              <input
                type="text"
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                placeholder="Last Name"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.lastName ? "border-red-600" : ""
                }`}
                value={shippingInformation.lastName}
                onChange={handleShippingChange}
                required
              />
              {errors.lastName && (
                <p className="text-red-600 text-sm mt-2">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Company Name */}
          <div className="sm:col-span-2 col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="company"
                name="companyName"
                autoComplete="organization"
                placeholder="Company Name (optional)"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                value={shippingInformation.companyName}
                onChange={handleShippingChange}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="sm:col-span-2 col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="phone"
                name="phoneNumber"
                placeholder="Phone Number"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.phoneNumber ? "border-red-600" : ""
                }`}
                value={shippingInformation.phoneNumber}
                onChange={handleShippingChange}
                required
              />
              {errors.phoneNumber && (
                <p className="text-red-600 text-sm mt-2">
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Address Autocomplete */}
          {showAddressLookup && (
            <div className="sm:col-span-2 col-span-2">
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing your address..."
                className="mb-4"
                initialValue=""
              />
            </div>
          )}

          {/* Address and Apartment */}
          <div className="sm:col-span-2 col-span-2">
            <div className="mt-1 relative">
              <input
                type="text"
                id="address"
                name="address"
                autoComplete="street-address"
                placeholder="Address"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.address ? "border-red-600" : ""
                }`}
                value={shippingInformation.address}
                onChange={handleShippingChange}
                required
              />
              {!showAddressLookup && (
                <button
                  type="button"
                  onClick={() => setShowAddressLookup(true)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-primary hover:underline"
                >
                  Lookup
                </button>
              )}
              {errors.address && (
                <p className="text-red-600 text-sm mt-2">{errors.address}</p>
              )}
            </div>
            <div className="mt-6">
              <input
                type="text"
                id="apartment"
                name="apartment"
                placeholder="Apartment, Suite, etc."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                value={shippingInformation.apartment}
                onChange={handleShippingChange}
              />
            </div>
          </div>

          {/* City */}
          <div className="sm:col-span-2 col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="city"
                name="city"
                autoComplete="address-level2"
                placeholder="City"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.city ? "border-red-600" : ""
                }`}
                value={shippingInformation.city}
                onChange={handleShippingChange}
                required
              />
              {errors.city && (
                <p className="text-red-600 text-sm mt-2">{errors.city}</p>
              )}
            </div>
          </div>

          {/* County */}
          <div className="col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="county"
                name="county"
                autoComplete="address-level1"
                placeholder="County (optional)"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                value={shippingInformation.county}
                onChange={handleShippingChange}
              />
            </div>
          </div>

          {/* Postal Code */}
          <div className="col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                autoComplete="postal-code"
                placeholder="Postal Code"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm ${
                  errors.postalCode ? "border-red-600" : ""
                }`}
                value={shippingInformation.postalCode}
                onChange={handleShippingChange}
                required
              />
              {errors.postalCode && (
                <p className="text-red-600 text-sm mt-2">{errors.postalCode}</p>
              )}
            </div>
          </div>

          {/* Country (Disabled) */}
          <div className="col-span-2">
            <div className="mt-1">
              <input
                type="text"
                id="country"
                name="country"
                autoComplete="country"
                placeholder="Country"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                value={shippingInformation.country}
                onChange={handleShippingChange}
                disabled={true} // Disable the input to prevent changes
              />
            </div>
          </div>

          {/* Password and Confirm Password (Only if not authenticated) */}
          {!auth.user && (
            <>
              {/* Password */}
              <div className="sm:col-span-2 col-span-2 relative">
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Password"
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.password ? "border-red-600" : ""
                    }`}
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    required
                  />
                  <span
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="green"
                        className="h-6 w-6 text-green-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="gray"
                        className="h-6 w-6 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228L3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </span>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="sm:col-span-2 col-span-2 relative">
                <div className="mt-1 relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmpassword"
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                      errors.confirmPassword ? "border-red-600" : ""
                    }`}
                    value={Cpassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCPassword(e.target.value)
                    }
                    required
                  />
                  <span
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="green"
                        className="h-6 w-6 text-green-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="gray"
                        className="h-6 w-6 text-gray-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228L3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </span>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </form>

      {/* Thank You Modal */}
      {showThankYou && <NewsletterSuccessModal onClose={handleClose} />}
    </>
  );
};

export default RegisterForm;
