import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";
import {
  buildHeroBannersFromApiPayload,
  type Banner,
} from "@/app/lib/homepageBannerShared";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

/** Active hero banners (Admin → Banners), ISR + in-memory via cmsServerFetchJson. */
export async function getHomepageHeroBannersCached(): Promise<Banner[]> {
  const base = apiBase();
  if (!base) return [];
  try {
    const data = await cmsServerFetchJson<unknown>(
      `${base}/get/banners/active`
    );
    return buildHeroBannersFromApiPayload(data, base);
  } catch (e) {
    console.warn("[activeBannersPublicService] fetch failed:", e);
    return [];
  }
}
