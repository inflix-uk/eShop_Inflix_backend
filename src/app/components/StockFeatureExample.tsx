// Example component demonstrating the stock feature
import React from "react";
import ProductCard from "./ProductCard";
import ProductCardWithStock from "./ProductCardWithStock";
import { Product } from "../../../types";

const StockFeatureExample: React.FC = () => {
  // Example products with different stock statuses
  const inStockProduct: Product = {
    _id: "1",
    name: "iPhone 14 Pro Max - 256GB - Space Black - Excellent",
    category: "Smartphones",
    subCategory: "iPhone",
    condition: "Excellent",
    is_featured: true,
    thumbnail_image: {
      filename: "iphone14.jpg",
      path: "/uploads/iphone14.jpg",
    },
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    producturl: "iphone-14-pro-max-256gb-space-black-excellent",
    minPrice: 899,
    minSalePrice: 799,
    averageRating: 4.8,
    hasStock: true, // This product is in stock
  };

  const outOfStockProduct: Product = {
    _id: "2",
    name: "Samsung Galaxy S23 Ultra - 512GB - Phantom Black - Like New",
    category: "Smartphones",
    subCategory: "Samsung",
    condition: "Like New",
    is_featured: true,
    thumbnail_image: {
      filename: "samsung-s23.jpg",
      path: "/uploads/samsung-s23.jpg",
    },
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    producturl: "samsung-galaxy-s23-ultra-512gb-phantom-black-like-new",
    minPrice: 1099,
    minSalePrice: 999,
    averageRating: 4.9,
    hasStock: false, // This product is out of stock
  };

  const unknownStockProduct: Product = {
    _id: "3",
    name: "MacBook Pro 14-inch - M2 Pro - 512GB - Space Gray - Refurbished",
    category: "Laptops",
    subCategory: "MacBook",
    condition: "Refurbished",
    is_featured: true,
    thumbnail_image: {
      filename: "macbook-pro.jpg",
      path: "/uploads/macbook-pro.jpg",
    },
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    producturl: "macbook-pro-14-inch-m2-pro-512gb-space-gray-refurbished",
    minPrice: 1899,
    minSalePrice: 1699,
    averageRating: 4.7,
    // hasStock field is undefined - will default to in stock
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Stock Feature Examples</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* In Stock Product */}
        <div>
          <h2 className="text-xl font-semibold mb-4">In Stock Product</h2>
          <ProductCard product={inStockProduct} />
        </div>

        {/* Out of Stock Product */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Out of Stock Product</h2>
          <ProductCard product={outOfStockProduct} />
        </div>

        {/* Unknown Stock Product */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Unknown Stock (Default: In Stock)
          </h2>
          <ProductCard product={unknownStockProduct} />
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">
          Real-time Stock Checking
        </h2>
        <p className="text-gray-600 mb-4">
          The following product card uses real-time stock checking via API:
        </p>
        <div className="max-w-sm">
          <ProductCardWithStock
            product={outOfStockProduct}
            checkStockRealTime={true}
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            Set <code>hasStock: false</code> on any product to see the
            out-of-stock overlay
          </li>
          <li>
            Use <code>ProductCardWithStock</code> with{" "}
            <code>checkStockRealTime={true}</code> for live updates
          </li>
          <li>
            Check the browser network tab to see API calls to{" "}
            <code>/api/products/stock/[productId]</code>
          </li>
          <li>
            Modify the stock status in your backend to see real-time updates
          </li>
        </ol>
      </div>
    </div>
  );
};

export default StockFeatureExample;
