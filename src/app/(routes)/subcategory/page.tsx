"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/context/Auth";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";

export default function SubCategoriesPage() {
  const auth = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${auth.ip}get/product/category`);
        const data = await response.json();
        const categoriesWithSubs = data.productCategories.filter(
          (cat: any) => cat.subCategory && cat.subCategory.length > 0
        );
        setCategories(categoriesWithSubs);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <>
      <header className="relative">
        <nav aria-label="Top">
          <TopBar />
          <Nav />
        </nav>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Explore Our <span className="text-primary">Collections</span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Discover our wide range of products across various categories
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-16">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:shadow-2xl"
            >
              {/* Category Banner with Parallax Effect */}
              <div className="relative w-full overflow-hidden">
                <Image
                  src={`${auth.ip}${category.bannerImage?.path}`}
                  alt={category.name}
                  width={1280}
                  height={520}
                  className="object-contain transform hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1280px) 100vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {category.name}
                  </h2>
                  <p className="text-gray-200 text-lg">
                    Explore the latest {category.name} collection
                  </p>
                </div>
              </div>

              {/* Subcategories Grid with Enhanced Styling */}
              <div className="p-8 bg-gradient-to-b from-gray-50 to-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 grid-cols-4 gap-6">
                  {category.subCategory.map((subcat: string, index: number) => (
                    <Link
                      key={index}
                      href={`/categories/${encodeURIComponent(category.name.toLowerCase())}/${encodeURIComponent(subcat.toLowerCase())}`}
                      className="group relative"
                    >
                      <div
                        className="bg-white rounded-xl p-6 shadow-md transition-all duration-300 
                        group-hover:shadow-xl group-hover:scale-105 border border-gray-100
                        group-hover:border-primary"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-semibold text-gray-800 group-hover:text-primary transition-colors">
                            {subcat.replace(/-/g, " ")}
                          </div>
                          <svg
                            className="w-5 h-5 text-gray-400 group-hover:text-primary transform group-hover:translate-x-1 transition-all"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Content Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            Why Choose Our Collections?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-white shadow-lg">
              <div className="text-primary text-2xl mb-4">✨</div>
              <h4 className="text-xl font-semibold mb-2">Premium Quality</h4>
              <p className="text-gray-600">
                Carefully curated products meeting highest standards
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white shadow-lg">
              <div className="text-primary text-2xl mb-4">🚚</div>
              <h4 className="text-xl font-semibold mb-2">Fast Delivery</h4>
              <p className="text-gray-600">
                Quick and reliable shipping service
              </p>
            </div>
            <div className="p-6 rounded-xl bg-white shadow-lg">
              <div className="text-primary text-2xl mb-4">💫</div>
              <h4 className="text-xl font-semibold mb-2">Best Prices</h4>
              <p className="text-gray-600">
                Competitive prices for all products
              </p>
            </div>
          </div>
        </div>
      </main>
      </>
  );
}
