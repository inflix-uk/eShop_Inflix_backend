import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_URL  = process.env.NEXT_PUBLIC_API_URL + "/get/navbar/suggestions";
const TIMEOUT_MS = 5000;

// In-memory cache for suggestions
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = searchParams.get("limit") || "5";

    // Validate query length
    if (query.trim().length < 2) {
      return NextResponse.json(
        {
          status: 200,
          suggestions: [],
          message: "Query too short",
        },
        { status: 200 }
      );
    }

    // Create cache key
    const cacheKey = `${query.toLowerCase().trim()}_${limit}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data, {
        status: 200,
        headers: {
          "X-Cache": "HIT",
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      });
    }

    // Fetch from upstream
    const url = `${UPSTREAM_URL}?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      next: { revalidate: 300 }, // Revalidate every 5 minutes
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: res.status, message: "Upstream error", suggestions: [] },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Prepare response
    const responseData = {
      status: data?.status ?? 200,
      suggestions: data?.suggestions ?? [],
      count: data?.count ?? 0,
      message: data?.message ?? "",
    };

    // Store in cache
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    // Clean old cache entries (keep cache size manageable)
    if (cache.size > 100) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (err: any) {
    const message =
      err?.name === "AbortError"
        ? "Request timed out"
        : err?.message || "Unknown error";
    return NextResponse.json(
      { status: 504, message, suggestions: [] },
      { status: 504 }
    );
  } finally {
    clearTimeout(id);
  }
}
