"use client";

import { useState, useEffect } from "react";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import SortMenu from "@/app/components/SortMenu";
import Pagination from "@/app/components/Pagination";
import SidebarCommon from "@/app/components/SidebarCommon";
import { Product, SortOption } from "../../../../../types";
import { SortOptions } from "@/app/components/SortOptions";

export default function ProductList({
  initialProducts,
  subCategoryName,
}: {
  initialProducts: Product[];
  subCategoryName: string;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filteredProducts, setFilteredProducts] =
    useState<Product[]>(initialProducts);
  const [selectedSort, setSelectedSort] = useState<SortOption>(SortOptions[0]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const productsPerPage = 50;
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  return (
    <div className="grid grid-flow-row-dense lg:grid-cols-5 my-5 py-5">
      <SidebarCommon
        products={products}
        setFilteredProducts={setFilteredProducts}
        selectedSort={selectedSort}
        id={subCategoryName}
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
  );
}
