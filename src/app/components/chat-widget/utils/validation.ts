import type { FormData, FormErrors } from "../types";

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10;
};

/**
 * Validate the entire form
 * @param formData - The form data to validate
 * @param isLoggedIn - If true, skip validation for name, phone, and email (already filled from user account)
 */
export const validateForm = (formData: FormData, isLoggedIn = false): FormErrors => {
  const errors: FormErrors = {};

  if (!formData.isOrderRelated) {
    errors.isOrderRelated = "Please select an option";
  }

  if (formData.isOrderRelated === "yes" && !formData.orderNumber.trim()) {
    errors.orderNumber = "Order number is required";
  }

  // Skip name, phone, email validation for logged-in users
  if (!isLoggedIn) {
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (!validatePhone(formData.phoneNumber)) {
      errors.phoneNumber = "Please enter a valid phone number";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
  }

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasErrors = (errors: FormErrors): boolean => {
  return Object.keys(errors).length > 0;
};
