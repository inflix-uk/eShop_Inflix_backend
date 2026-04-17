import { NextResponse } from "next/server";

const UPSTREAM_URL = process.env.NEXT_PUBLIC_API_URL + "/get/category/for/navbar";
const TIMEOUT_MS = 7000;

/** Navbar order/content is edited in admin — do not cache or storefront stays stale for minutes. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(UPSTREAM_URL, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { message: "Upstream error", status: res.status, body: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    // Ensure shape matches client expectation: { data: [...] }
    return NextResponse.json(
      { data: data?.data ?? data },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "private, no-cache, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    const message = err?.name === "AbortError" ? "Request timed out" : err?.message || "Unknown error";
    return NextResponse.json({ message }, { status: 504 });
  } finally {
    clearTimeout(id);
  }
}
