import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stock/check
 * Check stock availability for a single product/variant
 *
 * Request body:
 * {
 *   "productId": "string",
 *   "variantId": "string" (optional)
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "data": {
 *     "availableQuantity": number,
 *     "stockStatus": string,
 *     "inStock": boolean,
 *     "productId": string,
 *     "variantId": string (optional)
 *   },
 *   "message": string (optional)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, variantId } = body;

    // Validate required parameters
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          message: "productId is required",
        },
        { status: 400 }
      );
    }

    // Get backend URL from environment variable
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;

    // Make request to backend API
    const response = await fetch(`${backendUrl}/check/stock/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId, variantId }),
    });

    // Parse response from backend
    const data = await response.json();

    // Return response from backend
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error in /api/stock/check:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
