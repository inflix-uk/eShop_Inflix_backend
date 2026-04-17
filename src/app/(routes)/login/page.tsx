"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Zextons from "@/app/assets/Zextons.png";
import { toast } from "react-toastify";
import LoadingBar from "react-top-loading-bar";
import TopBar from "@/app/topbar/page";
import { useAuth } from "@/app/context/Auth";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import Image from "next/image";
import Link from "next/link";
export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [otpRequired, setOtpRequired] = useState<boolean>(false);
  const [otpExpired, setOtpExpired] = useState<boolean>(false);
  const [errState, setErrState] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleInputChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
        setErrState(false);
      },
    []
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setProgress(50);

      if (!email) {
        toast.error("Enter a valid Email");
        setErrState(true);
        setProgress(100);
        return;
      }

      if (!password) {
        toast.error("Enter a valid Password");
        setErrState(true);
        setProgress(100);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.status === 201) {
          toast.success(data.message);

       
          const user = data.user;
          auth.login(user);
          router.replace("/customer/dashboard");
        
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Login error:", error);
        toast.error("Login failed. Please try again.");
      } finally {
        setProgress(100);
      }
    },
    [email, password, auth, router]
  );

  const handleOtpSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setProgress(50);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, enteredOtp: otp }),
        });

        const data = await res.json();

        if (data.status === 201) {
          toast.success(data.message);
          const user = data.user;
          auth.login(user);
          router.replace("/customer/dashboard");
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("OTP verification error:", error);
        toast.error("OTP verification failed. Please try again.");
      } finally {
        setProgress(100);
      }
    },
    [otp, email, password, auth, router]
  );

  return (
    <>
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <TopBar />
      <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">

        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <Link href="/">
            <Image
              className="mx-auto h-20 w-auto"
              src={Zextons}
              alt="Your Company"
            />
          </Link>
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            {auth.user
              ? "You're already signed in"
              : otpRequired
              ? "Enter OTP"
              : "Customer Sign in"}
          </h2>
          {auth.user && (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={() => router.push("/customer/dashboard")}
              className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Go to Dashboard
            </button>
          </div>
        )}
        </div>
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {otpRequired ? (
            <form className="space-y-6" onSubmit={handleOtpSubmit}>
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  OTP{" "}
                  {otpExpired && (
                    <span className="text-red-600">(Expired)</span>
                  )}
                </label>
                <div className="mt-2">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    autoComplete="one-time-code"
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                    value={otp}
                    onChange={handleInputChange(setOtp)}
                    disabled={otpExpired}
                  />
                </div>
              </div>
              <div className="flex justify-center">
                <CountdownCircleTimer
                  isPlaying
                  duration={600} // 10 minutes
                  colors={["#046d38", "#F7B801", "#A30000"]}
                  colorsTime={[600, 300, 0]}
                  onComplete={() => {
                    setOtpExpired(true);
                    toast.error("OTP has expired. Please request a new one.");
                    return { shouldRepeat: false };
                  }}
                >
                  {({ remainingTime }) => {
                    const minutes = Math.floor(remainingTime / 60);
                    const seconds = remainingTime % 60;
                    return (
                      <div className="text-xl">
                        {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                      </div>
                    );
                  }}
                </CountdownCircleTimer>
              </div>
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  disabled={otpExpired}
                >
                  Verify OTP
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="block w-full rounded-md border-0 py-1.5 px-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                    value={email}
                    onChange={handleInputChange(setEmail)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Password
                  </label>
                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-semibold text-primary hover:text-primary"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
                <div className="mt-2 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  />
                  <span
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Toggle password visibility"
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
                          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    )}
                  </span>
                </div>
              </div>
              {errState && (
                <p className="text-red-500 text-sm mt-2 hidden">{errState}</p>
              )}
              <div>
                <button
                  type="submit"
                  className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
          <p className="mt-10 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-primary hover:text-primary"
            >
              Create Now
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
