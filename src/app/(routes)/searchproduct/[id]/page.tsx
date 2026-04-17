"use client";
import Nav from "@/app/components/navbar/Nav";
import { useAuth } from "@/app/context/Auth";
import TopBar from "@/app/topbar/page";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Product, SortOption } from "../../../../../types";
import Link from "next/link";
import ClipLoader from "react-spinners/ClipLoader";
import SortMenu from "@/app/components/SortMenu";
import Pagination from "@/app/components/Pagination";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import { SortOptions } from "@/app/components/SortOptions";
import SidebarCommon from "@/app/components/SidebarCommon";
import axios from "axios";

export default function SearchPage() {
  const auth = useAuth();
  const { id: searchTerm } = useParams();
  const formatSearchTerm = (term: string | string[] | undefined) => {
    if (!term) return "";

    const termString = Array.isArray(term) ? term.join(" ") : term;

    return (
      termString
        // Remove all hyphens
        .replace(/-/g, " ")
        // Split into words, capitalize the first letter of each word, and join back into a string
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")
    );
  };
  const formattedSearchTerm = formatSearchTerm(searchTerm);

  const encodedTerm = encodeURIComponent(searchTerm as string);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSort, setSelectedSort] = useState<SortOption>(SortOptions[0]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const productsPerPage = 50;
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = useMemo(() => {
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [filteredProducts, indexOfFirstProduct, indexOfLastProduct]);
  // Fetch subcategory products

  useEffect(() => {
    const getSearchedProduct = () => {
      setLoading(true);
      axios
        .get(`${auth.ip}get/product/by/search/${encodedTerm}`)
        .then((response) => {
          if (response.data.status === 201) {
            setProducts(response.data.products);
            setFilteredProducts(response.data.products);
          } else {
            // No products found or other error status
            setProducts([]);
            setFilteredProducts([]);
            console.log(response.data.message);
          }
          setLoading(false);
        })
        .catch((error) => {
          // Handle network errors or other exceptions
          console.error("Error fetching products:", error);
          setProducts([]);
          setFilteredProducts([]);
          setLoading(false);
        });
    };
    getSearchedProduct(); // Call the function to fetch products for the category
  }, [encodedTerm, auth.ip]);
  const noProducts = filteredProducts.length === 0;
  return (
    <>
      <header className="relative">
        <nav className="" aria-label="Top">
          <TopBar />
          <Nav />
        </nav>
      </header>
      <div className="max-w-7xl mx-auto p-3">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link
            href={`/searchproduct/${encodedTerm}`}
            className="hover:underline"
          >
            {formattedSearchTerm}
          </Link>
        </nav>
        <div className="relative">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 rounded-md">
                <ClipLoader color="#36D7B7" loading={loading} size={100} />
              </div>
            )}
            {!loading && noProducts && (
              <div className="py-10 md:py-20 inset-0 flex items-center justify-center bg-gray-100 bg-opacity-60 backdrop-blur-lg z-10 rounded-md">
                <div className="text-center animate-fadeIn bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-4 border border-gray-200">
                  <div className="mb-6">
                    <svg
                      className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                    Can&apos;t find what you&apos;re looking for?
                  </h1>
                  <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8">
                    Contact us — we might have it in stock!
                  </p>
                  <div className="space-y-4">
                    <a
                      href="mailto:hello@zextons.co.uk"
                      className="flex items-center justify-center gap-3 text-base md:text-lg text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
                    >
                      <svg
                        className="w-5 h-5 md:w-6 md:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>hello@zextons.co.uk</span>
                    </a>
                    <a
                      href="tel:03333448541"
                      className="flex items-center justify-center gap-3 text-base md:text-lg text-primary hover:text-primary/80 transition-colors duration-200 font-medium"
                    >
                      <svg
                        className="w-5 h-5 md:w-6 md:h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>0333 344 8541</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`relative grid grid-flow-row-dense lg:grid-cols-5 my-5 py-5 ${
                loading || (!noProducts && !loading)
                  ? "filter blur-none"
                  : "filter blur-sm"
              }`}
            >
              <SidebarCommon
                products={products}
                setFilteredProducts={setFilteredProducts}
                selectedSort={selectedSort}
                id={encodedTerm}
              />
              <div className="sm:col-span-4 col-span-5">
                <div className="flex items-center justify-end">
                  <SortMenu
                    selectedSort={selectedSort}
                    setSelectedSort={
                      setSelectedSort as React.Dispatch<
                        React.SetStateAction<{ name: string }>
                      >
                    }
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:p-5">
                  {currentProducts.length === 0 ? (
                    <div>No products found</div>
                  ) : (
                    currentProducts.map((product, index) => (
                      <ProductCardWithStock
                        key={index}
                        product={product}
                        checkStockRealTime={true}
                      />
                    ))
                  )}
                </div>
                <Pagination
                  filteredProducts={filteredProducts}
                  productsPerPage={productsPerPage}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  indexOfFirstProduct={indexOfFirstProduct}
                  indexOfLastProduct={indexOfLastProduct}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
