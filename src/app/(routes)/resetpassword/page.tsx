"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ResetPassword() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page if no token is provided
    router.push("/login");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h2 className="mb-6 text-2xl font-bold text-center">Password Reset</h2>
        <p className="text-center mb-4">
          Please use the reset link sent to your email address.
        </p>
        <p className="text-center">
          Redirecting to login page...
        </p>
      </div>
    </div>
  );
}
