import { NextResponse } from "next/server";

const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const UPSTREAM_URL = `${base}/site-theme/public`;
const TIMEOUT_MS = 8000;

export async function GET() {
  if (!base) {
    return NextResponse.json(
      {
        success: true,
        data: { primaryColor: "#16a34a", secondaryColor: "#15803d" },
      },
      { status: 200 }
    );
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(UPSTREAM_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: true,
          data: { primaryColor: "#16a34a", secondaryColor: "#15803d" },
        },
        { status: 200 }
      );
    }

    const json = await res.json();
    return NextResponse.json(json, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: true,
        data: { primaryColor: "#16a34a", secondaryColor: "#15803d" },
      },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
