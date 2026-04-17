import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.NEXT_PUBLIC_API_URL;
const TIMEOUT_MS = 7000;

// Helper function to fetch products from multiple endpoints (optimized)
async function fetchProductsFromEndpoints() {
  // Use only the most reliable and fast endpoints
  const primaryEndpoints = [
    "/get/Featureproducts/Homepage",
    "/get/latest/products/Homepage"
  ];

  const allProducts: any[] = [];
  
  // Fetch from primary endpoints in parallel for faster loading
  const fetchPromises = primaryEndpoints.map(async (endpoint) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reduced timeout
      
      const res = await fetch(`${UPSTREAM_URL}${endpoint}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          return data.products;
        }
      }
    } catch (error) {
      // Continue with other endpoints
    }
    return [];
  });
  
  // Wait for all primary endpoints to complete
  const results = await Promise.all(fetchPromises);
  results.forEach(products => allProducts.push(...products));
  
  // If we have enough products, return early
  if (allProducts.length >= 50) {
    return allProducts;
  }
  
  // Only fetch additional endpoints if we need more products
  const additionalEndpoints = [
    "/get/refurbishedProduct/Homepage",
    "/get/laptopsAndMacbooks/Homepage"
  ];
  
  for (const endpoint of additionalEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // Even shorter timeout
      
      const res = await fetch(`${UPSTREAM_URL}${endpoint}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          allProducts.push(...data.products);
        }
      }
    } catch (error) {
      // Continue with other endpoints
    }
    
    // Stop if we have enough products
    if (allProducts.length >= 100) {
      break;
    }
  }
  
  return allProducts;
}

// Helper function to calculate product similarity score
function calculateSimilarityScore(currentProduct: any, candidateProduct: any): number {
  let score = 0;
  
  const currentName = (currentProduct.name || '').toLowerCase();
  const candidateName = (candidateProduct.name || '').toLowerCase();
  const currentBrand = (currentProduct.brand || '').toLowerCase();
  const candidateBrand = (candidateProduct.brand || '').toLowerCase();
  
  // Same category and subcategory (highest priority - 40% weight)
  if (currentProduct.category === candidateProduct.category && 
      currentProduct.subCategory === candidateProduct.subCategory) {
    score += 40;
  }
  // Same category only (30% weight)
  else if (currentProduct.category === candidateProduct.category) {
    score += 30;
  }
  
  // Same brand (25% weight)
  if (currentBrand && candidateBrand && currentBrand === candidateBrand) {
    score += 25;
  }
  
  // Exact product model match (20% weight)
  if (currentName && candidateName) {
    const currentModel = extractProductModel(currentName);
    const candidateModel = extractProductModel(candidateName);
    
    if (currentModel && candidateModel && currentModel === candidateModel) {
      score += 20;
    }
    // Same product line (e.g., iPhone 14, iPhone 15)
    else if (currentModel && candidateModel && 
             currentModel.split(' ')[0] === candidateModel.split(' ')[0]) {
      score += 15;
    }
  }
  
  // Accessory matching (15% weight)
  if (isAccessoryMatch(currentName, candidateName)) {
    score += 15;
  }
  
  // Same condition (10% weight)
  if (currentProduct.condition === candidateProduct.condition) {
    score += 10;
  }
  
  // Product type similarity (8% weight)
  if (isSameProductType(currentName, candidateName)) {
    score += 8;
  }
  
  // Price range within ±30% (5% weight)
  const currentPrice = currentProduct.minSalePrice || currentProduct.minPrice || 0;
  const candidatePrice = candidateProduct.minSalePrice || candidateProduct.minPrice || 0;
  if (currentPrice > 0 && candidatePrice > 0) {
    const priceDiff = Math.abs(currentPrice - candidatePrice) / currentPrice;
    if (priceDiff <= 0.3) {
      score += 5;
    }
  }
  
  // Popularity score (2% weight)
  const rating = candidateProduct.averageRating || 0;
  if (rating >= 4.5) score += 2;
  else if (rating >= 4.0) score += 1;
  
  return score;
}

// Helper function to check if products are accessory matches
function isAccessoryMatch(currentName: string, candidateName: string): boolean {
  const accessoryKeywords = [
    'charger', 'case', 'cover', 'cable', 'adapter', 'headphone', 'earphone', 
    'speaker', 'stand', 'mount', 'protector', 'screen protector', 'power bank',
    'wireless charger', 'bluetooth', 'usb', 'lightning', 'type-c', 'hdmi'
  ];
  
  const currentAccessories = accessoryKeywords.filter(keyword => currentName.includes(keyword));
  const candidateAccessories = accessoryKeywords.filter(keyword => candidateName.includes(keyword));
  
  // If both are accessories and share at least one keyword
  if (currentAccessories.length > 0 && candidateAccessories.length > 0) {
    return currentAccessories.some(accessory => candidateAccessories.includes(accessory));
  }
  
  return false;
}

// Helper function to extract product model from name
function extractProductModel(productName: string): string {
  const name = productName.toLowerCase();
  
  // iPhone patterns
  if (name.includes('iphone')) {
    const match = name.match(/iphone\s*(\d+\s*(?:pro|plus|max)?(?:\s*mini)?)/);
    return match ? `iphone ${match[1].trim()}` : 'iphone';
  }
  
  // Samsung Galaxy patterns
  if (name.includes('galaxy')) {
    const match = name.match(/galaxy\s*([a-z0-9\s]+)/);
    return match ? `galaxy ${match[1].trim()}` : 'galaxy';
  }
  
  // Google Pixel patterns
  if (name.includes('pixel')) {
    const match = name.match(/pixel\s*(\d+(?:\s*(?:pro|xl|a))?)/);
    return match ? `pixel ${match[1].trim()}` : 'pixel';
  }
  
  // Xbox patterns
  if (name.includes('xbox')) {
    const match = name.match(/xbox\s*([a-z0-9\s]+)/);
    return match ? `xbox ${match[1].trim()}` : 'xbox';
  }
  
  // PlayStation patterns
  if (name.includes('playstation') || name.includes('ps')) {
    const match = name.match(/(?:playstation|ps)\s*(\d+)/);
    return match ? `playstation ${match[1]}` : 'playstation';
  }
  
  // Sony patterns (for PlayStation products)
  if (name.includes('sony') && (name.includes('playstation') || name.includes('ps'))) {
    const match = name.match(/sony\s*(?:playstation|ps)\s*(\d+)/);
    return match ? `playstation ${match[1]}` : 'playstation';
  }
  
  // Nintendo patterns
  if (name.includes('nintendo')) {
    const match = name.match(/nintendo\s*([a-z0-9\s]+)/);
    return match ? `nintendo ${match[1].trim()}` : 'nintendo';
  }
  
  // MacBook patterns
  if (name.includes('macbook')) {
    const match = name.match(/macbook\s*([a-z0-9\s]+)/);
    return match ? `macbook ${match[1].trim()}` : 'macbook';
  }
  
  // iPad patterns
  if (name.includes('ipad')) {
    const match = name.match(/ipad\s*([a-z0-9\s]+)/);
    return match ? `ipad ${match[1].trim()}` : 'ipad';
  }
  
  // OnePlus patterns
  if (name.includes('oneplus')) {
    const match = name.match(/oneplus\s*(\d+)/);
    return match ? `oneplus ${match[1]}` : 'oneplus';
  }
  
  // Xiaomi patterns
  if (name.includes('xiaomi') || name.includes('redmi')) {
    const match = name.match(/(xiaomi|redmi)\s*([a-z0-9\s]+)/);
    return match ? `${match[1]} ${match[2].trim()}` : 'xiaomi';
  }
  
  return '';
}

// Helper function to check if products are the same type
function isSameProductType(currentName: string, candidateName: string): boolean {
  const phoneKeywords = ['iphone', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'redmi', 'huawei', 'oppo', 'vivo', 'realme'];
  const laptopKeywords = ['macbook', 'laptop', 'notebook', 'ultrabook'];
  const tabletKeywords = ['ipad', 'tablet', 'tab'];
  const watchKeywords = ['watch', 'apple watch', 'galaxy watch'];
  const consoleKeywords = ['xbox', 'playstation', 'ps', 'sony', 'nintendo', 'switch', 'console', 'gaming'];
  
  const currentType = getProductType(currentName, phoneKeywords, laptopKeywords, tabletKeywords, watchKeywords, consoleKeywords);
  const candidateType = getProductType(candidateName, phoneKeywords, laptopKeywords, tabletKeywords, watchKeywords, consoleKeywords);
  
  return currentType === candidateType && currentType !== 'unknown';
}

function getProductType(name: string, ...keywordGroups: string[][]): string {
  for (let i = 0; i < keywordGroups.length; i++) {
    if (keywordGroups[i].some(keyword => name.includes(keyword))) {
      return ['phone', 'laptop', 'tablet', 'watch', 'console'][i] || 'unknown';
    }
  }
  return 'unknown';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  
  try {
    // Try to get current product first (faster approach)
    let currentProduct = null;
    try {
      const currentProductRes = await fetch(`${UPSTREAM_URL}/get/product/${productId}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 }, // Cache for 5 minutes
      });
      
      if (currentProductRes.ok) {
        const currentProductData = await currentProductRes.json();
        currentProduct = currentProductData.product || currentProductData;
      }
    } catch (error) {
      // Could not fetch current product details
    }
    
    // Fetch products from endpoints (optimized)
    const allProducts = await fetchProductsFromEndpoints();
    
    // If we couldn't get current product directly, try to find it in fetched products
    if (!currentProduct) {
      currentProduct = allProducts.find(product => product._id === productId);
    }
    
    
    if (!currentProduct) {
      // If we still can't get current product, return a subset of all products
      const shuffled = allProducts.sort(() => 0.5 - Math.random());
      return NextResponse.json(
        {
          status: 200,
          products: shuffled.slice(0, 8),
          message: "Related products fetched successfully (fallback mode)",
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
          },
        }
      );
    }
    
    // Optimized filtering - limit to first 200 products for faster processing
    const limitedProducts = allProducts.slice(0, 200);
    
    // Filter products that might be related - more flexible approach
    const potentialMatches = limitedProducts.filter(product => {
      if (product._id === productId) return false;
      
      const productName = (product.name || '').toLowerCase();
      const currentName = (currentProduct.name || '').toLowerCase();
      
      // Always include products from the same category (most important)
      if (product.category === currentProduct.category) {
        return true;
      }
      
      // Include products from the same subcategory
      if (product.subCategory === currentProduct.subCategory) {
        return true;
      }
      
      // Include products from the same brand
      if (product.brand === currentProduct.brand) {
        return true;
      }
      
      // For specific product types, include related products
      const isConsoleProduct = ['xbox', 'playstation', 'ps', 'sony', 'nintendo', 'switch', 'console', 'gaming'].some(keyword => 
        productName.includes(keyword)
      );
      
      const isCurrentConsole = ['xbox', 'playstation', 'ps', 'sony', 'nintendo', 'switch', 'console', 'gaming'].some(keyword => 
        currentName.includes(keyword)
      );
      
      if (isConsoleProduct && isCurrentConsole) {
        return true;
      }
      
      // For accessories, include other accessories
      const isAccessory = ['charger', 'case', 'cover', 'cable', 'adapter', 'headphone', 'earphone', 'speaker', 'stand', 'mount', 'protector', 'screen protector'].some(keyword => 
        productName.includes(keyword)
      );
      
      const isCurrentAccessory = ['charger', 'case', 'cover', 'cable', 'adapter', 'headphone', 'earphone', 'speaker', 'stand', 'mount', 'protector', 'screen protector'].some(keyword => 
        currentName.includes(keyword)
      );
      
      if (isAccessory && isCurrentAccessory) {
        return true;
      }
      
      // For phones, include phone accessories
      const isPhone = ['iphone', 'galaxy', 'pixel', 'oneplus', 'xiaomi', 'redmi', 'huawei', 'oppo', 'vivo', 'realme'].some(keyword => 
        currentName.includes(keyword)
      );
      
      if (isPhone && isAccessory) {
        return true;
      }
      
      return false;
    });
    
    // Calculate similarity scores and sort (optimized)
    const productsWithScores = potentialMatches
      .slice(0, 50) // Limit to 50 products for faster scoring
      .map(product => ({
        ...product,
        similarityScore: calculateSimilarityScore(currentProduct, product)
      }))
      .filter(product => product.similarityScore > 0) // Only products with some similarity
      .sort((a, b) => b.similarityScore - a.similarityScore) // Sort by score descending
      .slice(0, 8); // Take top 8 for faster response
    
    
    // If we don't have enough similar products, fill with same category products (optimized)
    if (productsWithScores.length < 4) {
      const sameCategoryProducts = limitedProducts
        .filter(product => 
          product._id !== productId && 
          !productsWithScores.some(p => p._id === product._id) &&
          product.category === currentProduct.category
        )
        .slice(0, 8 - productsWithScores.length); // No need to sort randomly, just take first few
      
      productsWithScores.push(...sameCategoryProducts);
    }
    
    // Final fallback - if still not enough, add random products (optimized)
    if (productsWithScores.length < 4) {
      const remainingProducts = limitedProducts
        .filter(product => 
          product._id !== productId && 
          !productsWithScores.some(p => p._id === product._id)
        )
        .slice(0, 8 - productsWithScores.length); // No need to sort randomly
      
      productsWithScores.push(...remainingProducts);
    }
    
    return NextResponse.json(
      {
        status: 200,
        products: productsWithScores.slice(0, 8), // Return top 8
        message: "Related products fetched successfully",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600", // Increased cache time
        },
      }
    );
    
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({ 
      status: 500, 
      message,
      products: []
    }, { status: 500 });
  }
}
