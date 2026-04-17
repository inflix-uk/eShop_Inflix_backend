import { CMS_REVALIDATE_SECONDS } from "./cmsCacheConfig";

/**
 * Public CMS fetch: ISR on the server, fresh fetches in the browser.
 */
export function cmsPublicFetchInit(
  extra?: Omit<RequestInit, "cache" | "next">
): RequestInit {
  if (typeof window !== "undefined") {
    return { ...extra, cache: "no-store" };
  }
  return { ...extra, next: { revalidate: CMS_REVALIDATE_SECONDS } };
}
