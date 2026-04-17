import { cache } from "react";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

function apiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/**
 * Fetches site-wide JSON-LD schemas from the backend.
 * Returns an array of raw JSON strings ready for injection.
 * Cached per request via React `cache()` + ISR via cmsPublicFetchInit.
 */
export const getSiteWideSchemaPublic = cache(
  async (): Promise<string[]> => {
    const base = apiBase();
    if (!base) return [];
    try {
      const res = await cmsTimedFetch(`${base}/site-wide-schema/public`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        ...cmsPublicFetchInit(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      if (!json.success || !json.data) return [];
      const schemas = json.data.schemas;
      if (!Array.isArray(schemas)) return [];
      return schemas.filter(
        (s: unknown): s is string => typeof s === "string" && s.trim().length > 0
      );
    } catch {
      return [];
    }
  }
);
