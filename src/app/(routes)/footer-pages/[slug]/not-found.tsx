import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";
import Link from "next/link";

export default function FooterPageNotFound() {
  return (
    <>
      <SlugRouteHeader />

      <div className="max-w-7xl mx-auto p-6 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>

      </>
  );
}
