# Product Stock Status Feature

This feature adds out-of-stock indicators and "Take a Look at It" buttons to product cards when products have no available variants.

## Components

### 1. ProductCard (Updated)

- **Location**: `src/app/components/ProductCard.tsx`
- **Features**:
  - Shows "Out of Stock" overlay on product images when `product.hasStock` is `false`
  - Displays "Take a Look at It" button for out-of-stock products
  - Dims product image when out of stock

### 2. ProductCardWithStock (Enhanced)

- **Location**: `src/app/components/ProductCardWithStock.tsx`
- **Features**:
  - Same as ProductCard but with optional real-time stock checking
  - Uses `useStockStatus` hook for live stock updates
  - Better for dynamic stock status checking

### 3. Stock Utilities

- **Location**: `src/app/utils/stockUtils.ts`
- **Functions**:
  - `hasProductStock(product)`: Checks if product has any available variants
  - `isVariantSoldOut(variant)`: Checks if specific variant is sold out

### 4. Stock Status Hook

- **Location**: `src/app/hooks/useStockStatus.ts`
- **Features**:
  - Real-time stock status checking via API
  - Loading states and error handling
  - Caching with 5-minute revalidation

### 5. Stock Status API

- **Location**: `src/app/api/products/stock/[productId]/route.ts`
- **Endpoint**: `GET /api/products/stock/[productId]`
- **Returns**: `{ hasStock: boolean, productId: string, message: string }`

## Usage Examples

### Basic Usage (Static Stock Status)

```tsx
import ProductCard from "@/app/components/ProductCard";

// Product with hasStock field
const product = {
  _id: "123",
  name: "iPhone 14",
  hasStock: false, // This will show out-of-stock overlay
  // ... other product fields
};

<ProductCard product={product} />;
```

### Advanced Usage (Real-time Stock Checking)

```tsx
import ProductCardWithStock from "@/app/components/ProductCardWithStock";

<ProductCardWithStock
  product={product}
  checkStockRealTime={true} // Enables real-time stock checking
/>;
```

### Manual Stock Checking

```tsx
import { useStockStatus } from "@/app/hooks/useStockStatus";

const { hasStock, isLoading, error } = useStockStatus(productId);
```

## Visual Features

### Out of Stock Overlay

- **Style**: Black semi-transparent background with white text
- **Text**: "Out of Stock" in bold
- **Position**: Centered on product image with -12 degree rotation
- **Effect**: Dims the product image to 60% opacity

### Take a Look at It Button

- **Style**: Blue button with hover effects
- **Position**: Centered below product image
- **Visibility**: Only shown for out-of-stock products
- **Action**: Links to product page (same as clicking the card)

## Implementation Notes

1. **Backward Compatibility**: The feature is backward compatible - products without `hasStock` field default to "in stock"

2. **Performance**: Real-time stock checking is optional and disabled by default to maintain performance

3. **Caching**: Stock status API responses are cached for 5 minutes to reduce server load

4. **Error Handling**: If stock checking fails, products default to "in stock" to avoid false negatives

## Future Enhancements

- Add stock quantity display
- Implement low stock warnings
- Add stock status to product listings
- Create bulk stock checking utilities
- Add stock status to search results
