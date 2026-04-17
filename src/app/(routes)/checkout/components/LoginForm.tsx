"use client";

import React, { useState, ChangeEvent, FC } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/Auth";
import { LoginFormProps } from "../../../../../types";



const LoginForm: FC<LoginFormProps> = ({
  toggleFormVisibility,
  showForm,
  email,
  setEmail,
  password,
  setPassword,
  handleLogin,
  errors,
}) => {
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div>
      {!auth.user && (
        <h2 className="text-lg font-medium text-gray-900">
          Returning customer?{" "}
          <span
            className="text-primary text-sm font-bold hover:underline cursor-pointer"
            onClick={toggleFormVisibility}
          >
            Click here to login
          </span>
        </h2>
      )}

      {!auth.user && showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="mt-4"
        >
          <p className="text-sm font-normal mt-4">
            If you have shopped with us before, please enter your details below.
            If you are a new customer, please proceed to the Billing section.
          </p>

          {/* Email Field */}
          <div className="mt-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <div className="mt-1">
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
                  errors.email ? "border-red-600" : ""
                }`}
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                required
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-2">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Password Field */}
          <div className="mt-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
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
              {errors.password && (
                <p className="text-red-600 text-sm mt-2">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Remember Me & Lost Password */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex items-center gap-1">
              <input
                type="checkbox"
                name="remember"
                id="remember"
                className="accent-green-300 focus:accent-primary border rounded-sm"
              />
              <label htmlFor="remember" className="text-sm font-medium">
                Remember Me
              </label>
            </div>
            <Link href="/forgot-password">
              <p className="text-sm text-blue-400 font-medium hover:underline">
                Lost your Password?
              </p>
            </Link>
          </div>

          {/* Login Button */}
          <div className="mt-4">
            <button
              type="submit"
              className="w-full rounded-md border border-transparent bg-primary px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LoginForm;
