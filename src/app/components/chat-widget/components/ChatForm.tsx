"use client";

import { MessageCircle, Send, ChevronDown } from "lucide-react";
import type { FormData, FormErrors } from "../types";

interface ChatFormProps {
  formData: FormData;
  errors: FormErrors;
  isLoading: boolean;
  isLoggedIn?: boolean;
  onFieldChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
}

export const ChatForm: React.FC<ChatFormProps> = ({
  formData,
  errors,
  isLoading,
  isLoggedIn = false,
  onFieldChange,
  onSubmit,
}) => {
  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-100 to-rose-50 rounded-2xl mb-3">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
        </div>
        <h4 className="text-xl font-bold text-gray-900 mb-1.5 text-balance">
          Let&apos;s Connect
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          Share a few details and we&apos;ll get you sorted right away
        </p>
      </div>

      {/* Form Error */}
      {errors.form && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-sm text-rose-600 font-medium">{errors.form}</p>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-3.5">
        {/* Is Order Related */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-800">
            Is this order related? <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.isOrderRelated}
              onChange={(e) => onFieldChange("isOrderRelated", e.target.value)}
              className={`w-full px-3.5 py-2.5 text-base sm:text-sm border-2 rounded-xl appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm ${
                errors.isOrderRelated
                  ? "border-rose-300 bg-rose-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <option value="">Choose one...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.isOrderRelated && (
            <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
              <span className="text-sm">!</span> {errors.isOrderRelated}
            </p>
          )}
        </div>

        {/* Order Number (conditional) */}
        {formData.isOrderRelated === "yes" && (
          <div className="space-y-1.5 animate-slideDown">
            <label className="block text-xs font-bold text-gray-800">
              Order Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.orderNumber}
              onChange={(e) => onFieldChange("orderNumber", e.target.value)}
              placeholder="e.g., #12345"
              className={`w-full px-3.5 py-2.5 text-base sm:text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm ${
                errors.orderNumber
                  ? "border-rose-300 bg-rose-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            />
            {errors.orderNumber && (
              <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                <span className="text-sm">!</span> {errors.orderNumber}
              </p>
            )}
          </div>
        )}

        {/* Name, Phone, Email - only show if not logged in */}
        {!isLoggedIn && (
          <>
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Your Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
                placeholder="John Doe"
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm ${
                  errors.name
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <span className="text-sm">!</span> {errors.name}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => onFieldChange("phoneNumber", e.target.value)}
                placeholder="+44 7700 900123"
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm ${
                  errors.phoneNumber
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <span className="text-sm">!</span> {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onFieldChange("email", e.target.value)}
                placeholder="john@example.com"
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all shadow-sm ${
                  errors.email
                    ? "border-rose-300 bg-rose-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <span className="text-sm">!</span> {errors.email}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Starting...
          </>
        ) : (
          <>
            Start Conversation
            <Send className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Privacy Note */}
      <p className="text-xs text-center text-gray-500 leading-relaxed">
        Your information is secure and will only be used to assist with your inquiry
      </p>
    </div>
  );
};
