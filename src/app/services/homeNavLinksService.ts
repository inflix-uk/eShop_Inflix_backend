import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";

export interface HomeNavLink {
  label: string;
  path: string;
}

/**
 * Server-side: upstream CMS with ISR + memory cache (same payload as the Next API route).
 */
export async function getHomeNavLinksPublicServer(): Promise<HomeNavLink[]> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) return [];
  try {
    const json = await cmsServerFetchJson<{
      success?: boolean;
      data?: { links?: HomeNavLink[] };
    }>(`${base}/homepage-nav-links/public`);
    if (!json.success || !Array.isArray(json.data?.links)) return [];
    return json.data!.links;
  } catch {
    return [];
  }
}

/**
 * Loads admin-configured quick links via the Next.js API route (same-origin),
 * which proxies to the backend — avoids CORS and matches `/api/navbar`.
 */
export async function getHomeNavLinksPublic(): Promise<HomeNavLink[]> {
  try {
    const response = await fetch("/api/homepage-nav-links", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = await response.json();
    if (!json.success || !Array.isArray(json.data?.links)) return [];
    return json.data.links;
  } catch {
    return [];
  }
}
