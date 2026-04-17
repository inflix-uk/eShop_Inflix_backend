import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * API endpoint to check if a product has any available variants in stock
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  
  try {
    // Fetch product details with variant information
    const productRes = await fetch(`${UPSTREAM_URL}/get/product/${productId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    
    if (!productRes.ok) {
      return NextResponse.json(
        { 
          status: 404, 
          message: "Product not found",
          hasStock: false 
        },
        { status: 404 }
      );
    }
    
    const productData = await productRes.json();
    const product = productData.product || productData;
    
    // Check if product has any available variants
    const hasStock = product.variantValues?.some((variant: any) => 
      variant.Quantity && variant.Quantity > 0
    ) || false;
    
    return NextResponse.json(
      {
        status: 200,
        productId,
        hasStock,
        message: hasStock ? "Product has available stock" : "Product is out of stock"
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
    
  } catch (error: any) {
    return NextResponse.json(
      { 
        status: 500, 
        message: error.message || "Internal server error",
        hasStock: false 
      },
      { status: 500 }
    );
  }
}
