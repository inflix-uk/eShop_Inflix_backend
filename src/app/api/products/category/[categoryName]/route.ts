import { NextResponse } from "next/server";

const TIMEOUT_MS = 7000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ categoryName: string }> }
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Await params for Next.js 15+
    const { categoryName } = await params;
    const UPSTREAM_URL = `${process.env.NEXT_PUBLIC_API_URL}/category/display-products/name/${encodeURIComponent(categoryName)}`;

    const res = await fetch(UPSTREAM_URL, {
      next: { revalidate: 600 },
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { status: res.status, message: "Upstream error", body: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      {
        success: data?.status === 200,
        status: data?.status ?? 200,
        products: data?.products ?? [],
        message: data?.message ?? "",
        totalCount: data?.totalCount ?? 0,
        categoryName: data?.categoryName ?? categoryName,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
        },
      }
    );
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({
      success: false,
      status: 504,
      message,
      products: [],
      totalCount: 0
    }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
