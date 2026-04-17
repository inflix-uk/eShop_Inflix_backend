// ============================================
// FILE: src/app/(routes)/blogs/[slug]/not-found.tsx
// ============================================
import Link from "next/link";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";


export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Nav />
      <div className="flex-grow flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Blog Not Found</h1>
          <p className="text-gray-600 mb-8">
            Sorry, the blog post you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/blogs"
            className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Back to Blogs
          </Link>
        </div>
      </div>
      </div>
  );
}
