import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.NEXT_PUBLIC_API_URL + "/get/refurbishedProduct/Homepage";
const TIMEOUT_MS = 7000;

export async function GET() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(UPSTREAM_URL, {
      next: { revalidate: 300 },
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
        status: data?.status ?? 200,
        products: data?.products ?? [],
        message: data?.message ?? "",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({ status: 504, message }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
