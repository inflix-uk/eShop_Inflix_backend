"use client";

import React, { useState, ChangeEvent } from "react";
import Top from "@/app/customer/components/TopBar";
import Sidebar from "@/app/customer/components/Sidebar";
import { useAuth } from "@/app/context/Auth";
import Modal from "@/app/components/common/Modal";
import axios from "axios";
import { toast } from "react-toastify";
import Image from "next/image";

interface FormData {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  country: string;
  state: string;
  county: string;
  postalCode: string;
}

const generateImageFromInitial = (initial: string): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Set background color
  ctx.fillStyle = "#f3f4f6"; // Light background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set text properties
  ctx.font = "50px Arial";
  ctx.fillStyle = "#333"; // Dark text color
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw the initial in the center
  ctx.fillText(initial, canvas.width / 2, canvas.height / 2);

  // Return the data URL of the image
  return canvas.toDataURL();
};

const Dashboard: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const auth = useAuth();
  const userId = auth?.user?._id;
  const [selectedPage, setSelectedPage] = useState("Customer-Details");
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Show notification and auto-hide after 10 seconds
  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formData, setFormData] = useState<FormData>({
    firstName: auth?.user?.firstname || "",
    lastName: auth?.user?.lastname || "",
    companyName: auth?.user?.companyname || "",
    email: auth?.user?.email || "",
    phone: auth?.user?.phoneNumber || "",
    address: auth?.user?.address?.address || "",
    apartment: auth?.user?.address?.apartment || "",
    city: auth?.user?.address?.city || "",
    country: auth?.user?.address?.country || "",
    state: auth?.user?.address?.state || "",
    county: auth?.user?.address?.county || "",
    postalCode: auth?.user?.address?.postalCode || "",
  });

  const [dateofBirth, setDateOfBirth] = useState("");

  const imageUrl = formData.firstName
    ? generateImageFromInitial(formData.firstName.charAt(0).toUpperCase())
    : "";

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Handle input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOldPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setOldPassword(e.target.value);
  };

  const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  // Save updated user information
  const saveUpdatedInfo = async () => {
    try {
      const response = await axios.patch(`${auth.ip}update/user/${userId}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phone,
        companyname: formData.companyName,
        dateofbirth: dateofBirth,
        address: {
          address: formData.address,
          apartment: formData.apartment,
          country: formData.country,
          city: formData.city,
          county: formData.county,
          postalCode: formData.postalCode,
        },
      });

      console.log("Profile updated successfully:", response.data);
      if (response.data.status === 201) {
        toast.success(response.data.message);
        setIsEditMode(false); // Exit edit mode after saving
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Error updating profile");
    }
  };

  // Reset password functionality
  const resetPassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        toast.error("New password and confirm password do not match.");
        return;
      }

      const response = await axios.patch(`${auth.ip}update/user/${userId}`, {
        oldPassword: oldPassword,
        newPassword: newPassword,
      });

      console.log("Password updated successfully:", response.data);
      if (response.data.status === 201) {
        toast.success(response.data.message);
        closeModal();
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error("Error updating password");
    }
  };

  return (
    <>
      <Sidebar
        toggleSidebar={toggleSidebar}
        selectedPage={selectedPage}
        setSelectedPage={setSelectedPage}
        isSidebarOpen={isSidebarOpen}
        closeSidebar={closeSidebar}
      />
      <div className={isSidebarOpen ? "pl-0" : "lg:pl-72"}>
        <Top
          toggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
        />
        <main className="py-8 bg-gray-50 min-h-screen">
          <div className="px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-8">
              Your Details
            </h1>

            {notification && (
              <div
                className={`mb-6 p-4 rounded-md ${
                  notification.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {notification.type === "success" ? (
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Profile Summary Section */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    {imageUrl ? (
                      <Image
                        className="w-full h-full rounded-full object-cover"
                        src={imageUrl}
                        alt="User profile"
                        width={64}
                        height={64}
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-600">
                        {formData.firstName?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Profile Summary
                    </h2>
                    <p className="text-gray-600">
                      {formData.firstName} {formData.lastName}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-gray-200 rounded-lg p-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Email
                    </label>
                    <p className="text-gray-600">{formData.email || "—"}</p>
                  </div>
                  <div className="bg-gray-200 rounded-lg p-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Phone
                    </label>
                    <p className="text-gray-600">{formData.phone || "—"}</p>
                  </div>
                  <div className="bg-gray-200 rounded-lg p-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Address
                    </label>
                    <p className="text-gray-600">{formData.address || "—"}</p>
                  </div>
                </div>

                <button
                  className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-secondary transition-colors"
                  onClick={async () => {
                    try {
                      const response = await fetch(`${auth.ip}forgotpassword`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: formData.email }),
                      });
                      const data = await response.json();
                      if (response.ok) {
                        showNotification(
                          "Password reset link has been sent to your email",
                          "success"
                        );
                      } else {
                        showNotification(
                          data.message || "Failed to send reset link",
                          "error"
                        );
                      }
                    } catch (error) {
                      console.error("Error sending reset link:", error);
                      showNotification(
                        "An error occurred while sending reset link",
                        "error"
                      );
                    }
                  }}
                  type="button"
                >
                  Reset Password
                </button>
              </div>

              {/* Edit Details Section */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                      {imageUrl ? (
                        <Image
                          className="w-full h-full rounded-full object-cover"
                          src={imageUrl}
                          alt="User profile"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <span className="text-2xl font-bold text-gray-600">
                          {formData.firstName?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? "Edit Details" : "Your Details"}
                      </h2>
                      <p className="text-gray-600">
                        {isEditMode
                          ? "Manage your personal information"
                          : "View your personal information"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `${auth.ip}forgotpassword`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: formData.email }),
                            }
                          );
                          const data = await response.json();
                          if (response.ok) {
                            showNotification(
                              "Password reset link has been sent to your email",
                              "success"
                            );
                          } else {
                            showNotification(
                              data.message || "Failed to send reset link",
                              "error"
                            );
                          }
                        } catch (error) {
                          console.error("Error sending reset link:", error);
                          showNotification(
                            "An error occurred while sending reset link",
                            "error"
                          );
                        }
                      }}
                      type="button"
                    >
                      Reset Password
                    </button>
                    <button
                      className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors"
                      onClick={toggleEditMode}
                      type="button"
                    >
                      {isEditMode ? "Cancel" : "Edit"}
                    </button>
                  </div>
                </div>

                {isEditMode ? (
                  <form className="space-y-6">
                    {/* Email and Phone Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="text"
                          name="phone"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    {/* First Name and Last Name Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.firstName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.lastName}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    {/* Company and Date of Birth Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Company
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.companyName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="dob"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={dateofBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Address Row */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Apartment and County Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Apartment, Suite
                        </label>
                        <input
                          type="text"
                          name="apartment"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.apartment}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          County
                        </label>
                        <input
                          type="text"
                          name="county"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.county}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    {/* City, Country, and Postal Code Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="city"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.city}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          name="country"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.country}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          name="postalCode"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Personal Information Section */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">
                        Personal Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Email:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.email || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Phone:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.phone || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Name:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.firstName} {formData.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Company:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.companyName || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm font-medium text-gray-700">
                            DOB:
                          </span>
                          <span className="text-sm text-gray-600">
                            {dateofBirth || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Address Information Section */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h3 className="text-base font-semibold text-gray-900 mb-3">
                        Address Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Address:
                          </span>
                          <span className="text-sm text-gray-600 text-right max-w-xs">
                            {formData.address || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Apt/Suite:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.apartment || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            City:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.city || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            County:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.county || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-200">
                          <span className="text-sm font-medium text-gray-700">
                            Country:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.country || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm font-medium text-gray-700">
                            Postal Code:
                          </span>
                          <span className="text-sm text-gray-600">
                            {formData.postalCode || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {isEditMode && (
                  <div className="flex justify-end gap-4 pt-4">
                    <button
                      type="button"
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setFormData({
                          firstName: auth?.user?.firstname || "",
                          lastName: auth?.user?.lastname || "",
                          companyName: auth?.user?.companyname || "",
                          email: auth?.user?.email || "",
                          phone: auth?.user?.phoneNumber || "",
                          address: auth?.user?.address?.address || "",
                          apartment: auth?.user?.address?.apartment || "",
                          city: auth?.user?.address?.city || "",
                          country: auth?.user?.address?.country || "",
                          state: auth?.user?.address?.state || "",
                          county: auth?.user?.address?.county || "",
                          postalCode: auth?.user?.address?.postalCode || "",
                        });
                        setDateOfBirth("");
                        setIsEditMode(false);
                      }}
                    >
                      Reset Form
                    </button>
                    <button
                      type="button"
                      className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-secondary transition-colors"
                      onClick={saveUpdatedInfo}
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Password Reset Modal */}
            <Modal isOpen={isOpen} onClose={closeModal} title="Reset Password">
              <div className="p-4 flex flex-col justify-between items-center w-full gap-2">
                <div className="mb-4 w-full">
                  <label
                    htmlFor="oldPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Old Password
                  </label>
                  <input
                    type="password"
                    id="oldPassword"
                    name="oldPassword"
                    className="mt-1 block w-full px-3 py-1.5 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={oldPassword}
                    onChange={handleOldPasswordChange}
                    required
                  />
                </div>
                <div className="mb-4 w-full">
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    className="mt-1 block w-full px-3 py-1.5 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={newPassword}
                    onChange={handleNewPasswordChange}
                    required
                  />
                </div>
                <div className="mb-4 w-full">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                </div>
                <div className="mt-4 flex justify-between items-center gap-4">
                  <button
                    type="button"
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={resetPassword}
                    type="button"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </Modal>
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
