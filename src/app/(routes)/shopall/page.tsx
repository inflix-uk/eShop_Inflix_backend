"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/lib/hooks";
import { RootState } from "@/app/lib/store";
import { fetchProducts } from "@/app/lib/features/products/getProductSlice";
import { SortOptions } from "@/app/components/SortOptions";
import { Product, SortOption } from "../../../../types";
import Pagination from "@/app/components/Pagination";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import SortMenu from "@/app/components/SortMenu";
import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
export default function ShopAll() {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state: RootState) => state.products);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedSort, setSelectedSort] = useState<SortOption>(SortOptions[0]);
  const productsPerPage = 50;
  const fetchOnceRef = useRef(false);

  useEffect(() => {
    if (products.length > 0) {
      setFilteredProducts(products);
      return;
    }
    if (!fetchOnceRef.current) {
      fetchOnceRef.current = true;
      dispatch(fetchProducts());
    }
  }, [dispatch, products]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;

  const currentProducts = useMemo(() => {
    return filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  }, [filteredProducts, indexOfFirstProduct, indexOfLastProduct]);

  return (
    <>
      <header className="relative">
        <TopBar />
        <Nav />
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/shopall" className="hover:underline">
            Shop All
          </Link>
        </nav>

        <div className={`grid grid-flow-row-dense lg:grid-cols-5 my-5 py-5 `}>
          <Sidebar
            products={products}
            setFilteredProducts={setFilteredProducts}
            selectedSort={selectedSort}
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
      </main>
      </>
  );
}
