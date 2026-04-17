# Products You May Like - Implementation Guide

## Overview

The "Products You May Like" section displays related products on the product detail page to increase user engagement and cross-selling opportunities.

## Implementation Details

### 1. API Endpoint

- **Path**: `/api/products/related/[productId]`
- **Method**: GET
- **Backend Endpoint**: `GET /get/related/products/{productId}`
- **Caching**: 5 minutes with stale-while-revalidate
- **Timeout**: 7 seconds

### 2. Product Matching Algorithm

The backend should implement the following matching criteria in order of priority:

#### Primary Criteria (High Weight)

1. **Same Category & SubCategory**

   - Exact match on `category` and `subCategory` fields
   - Weight: 40%

2. **Same Brand**

   - Exact match on `brand` field
   - Weight: 25%

3. **Same Condition**
   - Exact match on `condition` field (Refurbished, Brand New, etc.)
   - Weight: 20%

#### Secondary Criteria (Medium Weight)

4. **Price Range**

   - Products within ±30% of current product's `minSalePrice`
   - Weight: 10%

5. **Product Type Similarity**
   - Similar product names (iPhone, MacBook, iPad, etc.)
   - Weight: 3%

#### Tertiary Criteria (Low Weight)

6. **Popularity Score**
   - Higher `averageRating` and more reviews
   - Weight: 2%

### 3. Expected Backend Response Format

```json
{
  "status": 200,
  "products": [
    {
      "_id": "product_id",
      "name": "Product Name",
      "category": "Electronics",
      "subCategory": "Smartphones",
      "brand": "Apple",
      "condition": "Refurbished",
      "minPrice": 999,
      "minSalePrice": 799,
      "averageRating": 4.5,
      "producturl": "product-slug",
      "thumbnail_image": {
        "filename": "image.jpg",
        "path": "/uploads/image.jpg"
      }
    }
  ],
  "message": "Related products fetched successfully"
}
```

### 4. Component Features

#### Carousel Functionality

- **Responsive Design**: 2-4 products visible based on screen size
- **Autoplay**: 2-second intervals (slower than recently viewed)
- **Navigation**: Mouse hover to pause, click dots to navigate
- **Loop**: Infinite scrolling

#### Loading States

- **Loading**: Shows spinner while fetching data
- **Error**: Displays error message if API fails
- **Empty**: Shows message if no related products found

#### Product Filtering

- Excludes current product by ID and name
- Limits to maximum 8 products
- Filters out products with missing data

### 5. Integration Points

#### Product Page Integration

- Positioned after "Recently Viewed" section
- Before product summary/description
- Wrapped in Suspense for loading states

#### Props Interface

```typescript
interface ProductsYouMayLikeProps {
  productId: string; // Current product ID
  currentProductName?: string; // Current product name for filtering
}
```

### 6. Performance Considerations

#### Caching Strategy

- API responses cached for 5 minutes
- Client-side component uses React Suspense
- Embla carousel optimized for performance

#### Error Handling

- Graceful degradation if API fails
- Timeout protection (7 seconds)
- Fallback to empty state

### 7. Styling

The component uses the same styling patterns as `RecentlyViewed`:

- Consistent spacing and typography
- Responsive grid layout
- Hover effects and transitions
- Pagination dots for navigation

### 8. Future Enhancements

#### Potential Improvements

1. **Machine Learning**: Implement ML-based recommendations
2. **User Behavior**: Track user interactions for better matching
3. **A/B Testing**: Test different recommendation algorithms
4. **Personalization**: Consider user's browsing history
5. **Seasonal Recommendations**: Time-based product suggestions

#### Analytics Integration

- Track clicks on recommended products
- Monitor conversion rates
- Measure engagement metrics

## Usage Example

```tsx
import ProductsYouMayLike from "@/app/(routes)/products/components/ProductsYouMayLike";

// In your product page component
<ProductsYouMayLike
  productId={product._id}
  currentProductName={product.name}
/>;
```

## Backend Requirements

To make this feature work, your backend needs to implement the `/get/related/products/{productId}` endpoint that:

1. Accepts a product ID parameter
2. Implements the matching algorithm described above
3. Returns up to 8 related products
4. Excludes the current product from results
5. Orders results by relevance score
6. Handles edge cases (no matches, invalid product ID)

The endpoint should be optimized for performance and consider implementing caching on the backend side as well.
