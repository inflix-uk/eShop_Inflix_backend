import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";

export default function DynamicPageLoading() {
  return (
    <>
      <SlugRouteHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb Skeleton */}
        <div className="mb-4 h-5 w-64 bg-gray-200 rounded animate-pulse" />

        {/* Banner Skeleton */}
        <div className="mb-6 h-64 bg-gray-200 rounded-lg animate-pulse" />

        {/* Title Skeleton */}
        <div className="mb-6 h-10 w-96 bg-gray-200 rounded animate-pulse" />

        {/* Content Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      </>
  );
}
