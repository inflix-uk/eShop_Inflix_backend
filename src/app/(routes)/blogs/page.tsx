"use client";
import Nav from "@/app/components/navbar/Nav";


import TopBar from "@/app/topbar/page";
import React, { useEffect, useState } from "react";
import { Blog } from "../../../../types";
import BlogCard from "@/app/components/blogs/BlogCard";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import LoadingBar from "react-top-loading-bar";
import { useRouter } from "next/navigation";


export default function Blogs() {
  const breadCrumb = [{ name: "Blogs", link: "/blogs", current: true }];
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const router = useRouter();

  const [progress, setProgress] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const blogsPerPage = 12;

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

  const normalizeCategory = (blog: Blog) => {
    if (blog.blogCategory) return blog.blogCategory;
    if (blog.categories && blog.categories.length > 0) {
      const cat = blog.categories[0];
      if (typeof cat === "object" && cat.name) return cat.name;
      if (typeof cat === "string") return cat;
    }
    return "";
  };

  const normalizeTitle = (blog: Blog) => blog.title || blog.name || "";

  // Filter blogs
  const filteredBlogs = blogs.filter((blog) => {
    const category = normalizeCategory(blog).toLowerCase();
    const title = normalizeTitle(blog).toLowerCase();
    const term = searchTerm.toLowerCase();
    return (
      (selectedCategory === "all" || category === selectedCategory.toLowerCase()) &&
      title.includes(term)
    );
  });

  // Extract categories
  const uniqueCategories = Array.from(
    new Set(
      blogs.map(normalizeCategory).filter((cat) => typeof cat === "string" && cat.trim() !== "")
    )
  );

  const categories = ["all", ...uniqueCategories];

  // Pagination
  const indexOfLastBlog = currentPage * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = filteredBlogs.slice(indexOfFirstBlog, indexOfLastBlog);
  const totalPages = Math.ceil(filteredBlogs.length / blogsPerPage);

  // Slugify category
  const categoryToSlug = (category: string) =>
    category.toLowerCase().replace(/\s+/g, "-");

  const handleCategoryChange = (category: string) => {
    setCurrentPage(1);
    setSelectedCategory(category);
    if (category !== "all") {
      const slug = categoryToSlug(category);
      router.push(`/blogs/category/${slug}`);
    } else {
      router.push("/blogs");
    }
  };

  return (
    <>
      <LoadingBar color="#046d38" progress={progress} onLoaderFinished={() => setProgress(0)} />
      <TopBar />
      <Nav />
      <BreadCrumb breadcrumb={breadCrumb} />

      <div className="container mx-auto max-w-screen-xl py-10 px-4">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-8 text-center">
          Explore Our Blogs
        </h2>

        {/* Search + Category Filter */}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="p-4 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition duration-200 shadow-sm hover:shadow-md cursor-pointer bg-white min-w-[200px] pr-12 text-gray-700 font-medium"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all"
                  ? "All Categories"
                  : category
                      .split(" ")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
              </option>
            ))}
          </select>
        </div>

        {/* Blog Grid */}
        {currentBlogs.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-medium text-gray-700 mb-4">No blogs found</h3>
            <p className="text-gray-500 mb-8">Try adjusting your search or browse other categories</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              Reset Filters
            </button>
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

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-12 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded-full transition-all ${
                selectedCategory === cat
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-800"
              }`}
            >
              {cat
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </button>
          ))}
        </div>

        {/* Pagination */}
        {currentBlogs.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center space-x-3 mt-12">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 flex items-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  currentPage === index + 1
                    ? "bg-green-600 text-white shadow-lg scale-110"
                    : "border-2 hover:bg-gray-50"
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-5 py-3 border-2 rounded-lg disabled:opacity-50 hover:bg-gray-50 flex items-center space-x-2"
            >
              <span>Next</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      </>
  );
}
