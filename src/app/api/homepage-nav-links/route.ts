import { NextResponse } from "next/server";
import { CMS_REVALIDATE_SECONDS } from "@/app/lib/cmsCacheConfig";

const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const UPSTREAM_URL = `${base}/homepage-nav-links/public`;
const TIMEOUT_MS = 8000;

export async function GET() {
  if (!base) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_API_URL is not set", data: { links: [] } },
      { status: 200 }
    );
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(UPSTREAM_URL, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: CMS_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: "Upstream error",
          data: { links: [] },
          upstreamStatus: res.status,
          body: text.slice(0, 200),
        },
        { status: 200 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${CMS_REVALIDATE_SECONDS}, stale-while-revalidate=${CMS_REVALIDATE_SECONDS * 2}`,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return NextResponse.json(
      { success: false, message, data: { links: [] } },
      { status: 200 }
    );
  } finally {
    clearTimeout(id);
  }
}
