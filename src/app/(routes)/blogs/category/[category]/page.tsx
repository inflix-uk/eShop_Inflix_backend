"use client";

import TopBar from "@/app/topbar/page";
import React, { useEffect, useState } from "react";
import { Blog } from "../../../../../../types";
import BlogCard from "@/app/components/blogs/BlogCard";
import Nav from "@/app/components/navbar/Nav";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import LoadingBar from "react-top-loading-bar";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CategoryBlogs() {
  const { category } = useParams();
  const router = useRouter();
  const categorySlug = typeof category === 'string' ? category : '';
  
  // We'll find the actual category name from the slug after loading blogs
  
  // We'll set this after we have the blogs data
  const [breadCrumb, setBreadCrumb] = useState([
    { name: "Blogs", link: "/blogs", current: false },
    { name: "Loading...", link: `/blogs/category/${categorySlug}`, current: true }
  ]);
  
  const [progress, setProgress] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 12;

  const [blogs, setBlogs] = useState<Blog[]>([]);

  useEffect(() => {
    setProgress(30);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/blog`)
      .then(res => res.json())
      .then(data => {
        setBlogs(Array.isArray(data.data) ? data.data : []);
        setProgress(100);
      })
      .catch(() => setProgress(100));
  }, []);

  // Format category name for display
  function formatCategoryName(categoryName: string | undefined | null): string {
    if (!categoryName || typeof categoryName !== "string") return "All Categories";
    return categoryName
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Find the actual category name from the slug
  const [actualCategory, setActualCategory] = useState<string>("");
  
  useEffect(() => {
    if (blogs.length > 0 && categorySlug) {
      const matchingBlog = blogs.find((blog: Blog) => {
        // Robustly compare category slug for both old and new blog formats
        let cat = '';
        if (blog.blogCategory && typeof blog.blogCategory === 'string') {
          cat = blog.blogCategory;
        } else if (blog.categories && blog.categories.length > 0) {
          const firstCat = blog.categories[0];
          if (typeof firstCat === 'object' && firstCat.name) cat = firstCat.name;
          if (typeof firstCat === 'string') cat = firstCat;
        }
        return (cat || '').toLowerCase().replace(/\s+/g, '-') === categorySlug;
      });
      
      if (matchingBlog) {
        setActualCategory(matchingBlog.blogCategory);
        setBreadCrumb([
          { name: "Blogs", link: "/blogs", current: false },
          { name: formatCategoryName(matchingBlog.blogCategory), link: `/blogs/category/${categorySlug}`, current: true }
        ]);
      } else {
        // If no match found, use the slug as fallback
        const formattedName = formatCategoryName(categorySlug.replace(/-/g, ' '));
        setActualCategory(formattedName);
        setBreadCrumb([
          { name: "Blogs", link: "/blogs", current: false },
          { name: formattedName, link: `/blogs/category/${categorySlug}`, current: true }
        ]);
      }
    }
  }, [blogs, categorySlug]);
  
  // Helper to robustly extract category name
  const normalizeCategory = (blog: Blog) => {
    if (blog.blogCategory) return blog.blogCategory;
    if (blog.categories && blog.categories.length > 0) {
      const cat = blog.categories[0];
      if (typeof cat === "object" && cat.name) return cat.name;
      if (typeof cat === "string") return cat;
    }
    return "";
  };

  // Helper to robustly extract title
  const normalizeTitle = (blog: Blog) => blog.title || blog.name || "";

  // Filter blogs based on search and category
  const filteredBlogs = blogs.filter((blog: Blog) => {
    const category = (normalizeCategory(blog) || "").toLowerCase().replace(/\s+/g, '-');
    const title = (normalizeTitle(blog) || "").toLowerCase();
    const term = (searchTerm || "").toLowerCase();
    const matchesCategory = category === categorySlug;
    const matchesSearch = title.includes(term);
    return matchesSearch && matchesCategory;
  });

  // Get all categories for the category list
  const categories = [
    "all",
    ...new Set(
      blogs
        .map((blog: Blog) => blog.blogCategory)
        .filter((cat) => !!cat && typeof cat === "string" && cat.trim() !== "")
    ),
  ];

  // Pagination logic
  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);

  // Handle category change
  const handleCategoryChange = (newCategory: string) => {
    if (newCategory === "all") {
      router.push("/blogs");
    } else {
      // Convert category to URL-friendly slug
      const newCategorySlug = newCategory.toLowerCase().replace(/\s+/g, '-');
      router.push(`/blogs/category/${newCategorySlug}`);
    }
  };

  return (
    <>
      <LoadingBar
        color="#046d38"
        progress={progress}
        onLoaderFinished={() => setProgress(0)}
      />
      <TopBar />
      <Nav />
      <BreadCrumb breadcrumb={breadCrumb} />
      <div className="container mx-auto max-w-screen-xl py-10 px-4">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-8 text-center">
          {actualCategory ? formatCategoryName(actualCategory) : "Loading..."} Blogs
        </h2>

        <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search blogs..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm hover:shadow-md pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <select
            className="p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm hover:shadow-md cursor-pointer bg-white min-w-[200px] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[length:12px_12px] bg-[right_1rem_center] pr-12 text-gray-700 font-medium"
            value={actualCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {categories.map((cat) => (
              <option
                key={cat}
                value={cat}
                className="py-2 px-4 hover:bg-green-50 font-medium capitalize"
                style={{
                  backgroundColor:
                    cat === actualCategory ? "#f0fdf4" : "white",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                {cat === "all"
                  ? "All Categories"
                  : formatCategoryName(cat)}
              </option>
            ))}
          </select>
        </div>

        {filteredBlogs.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-medium text-gray-700 mb-4">No blogs found</h3>
            <p className="text-gray-500 mb-8">Try adjusting your search or browse other categories</p>
            <Link 
              href="/blogs" 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View All Blogs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {currentBlogs
              .filter((blog: Blog) => {
                const slug = blog.slug || blog.permalink || "";
                return slug && slug.trim() !== "";
              })
              .map((blog: Blog) => (
                <div key={blog._id} className="transform hover:scale-105 transition duration-300">
                  <BlogCard {...blog} />
                </div>
              ))}
          </div>
        )}

        {/* Enhanced Pagination - Only show if we have blogs */}
        {filteredBlogs.length > 0 && (
          <div className="flex justify-center items-center space-x-3 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition duration-200 flex items-center space-x-2"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Previous</span>
            </button>

            <div className="flex space-x-2">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition duration-200 ${
                    currentPage === index + 1
                      ? "bg-green-600 text-white shadow-lg transform scale-110"
                      : "border-2 hover:bg-gray-50"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition duration-200 flex items-center space-x-2"
            >
             <span>Next</span>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
      </>
  );
}
