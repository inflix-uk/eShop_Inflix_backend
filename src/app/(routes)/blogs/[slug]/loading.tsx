// ============================================
// FILE: src/app/(routes)/blogs/[slug]/loading.tsx
// ============================================
export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gray-300 h-[35rem] rounded-lg mb-5"></div>
            <div className="bg-gray-200 h-8 rounded w-3/4 mb-4"></div>
            <div className="bg-gray-200 h-4 rounded w-1/2 mb-8"></div>
            <div className="space-y-3">
              <div className="bg-gray-200 h-4 rounded"></div>
              <div className="bg-gray-200 h-4 rounded w-5/6"></div>
              <div className="bg-gray-200 h-4 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}