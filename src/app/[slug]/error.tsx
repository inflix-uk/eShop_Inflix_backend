"use client";

import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";
import Link from "next/link";
import { useEffect } from "react";

export default function DynamicPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dynamic footer page error:", error);
  }, [error]);

  return (
    <>
      <SlugRouteHeader />

      <div className="max-w-7xl mx-auto p-6 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Something Went Wrong
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            We encountered an error while loading this page. Please try again.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>

      </>
  );
}
