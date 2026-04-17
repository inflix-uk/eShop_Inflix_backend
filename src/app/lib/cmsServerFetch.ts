import { CMS_REVALIDATE_SECONDS } from "./cmsCacheConfig";
import {
  CMS_UPSTREAM_TIMEOUT_MS,
  combineAbortSignals,
} from "./cmsTimedFetch";
import { memoryJsonCacheGet, memoryJsonCacheSet } from "./memoryJsonCache";

/**
 * Server-side fetch with Next.js Data Cache (ISR-style) + optional memory layer.
 * Do not use from Client Components — `next.revalidate` is ignored in the browser.
 */
export async function cmsServerFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const timeoutController = new AbortController();
  const id = setTimeout(
    () => timeoutController.abort(),
    CMS_UPSTREAM_TIMEOUT_MS
  );
  const { signal: outerSignal, ...restInit } = init ?? {};
  const signal = outerSignal
    ? combineAbortSignals([timeoutController.signal, outerSignal])
    : timeoutController.signal;
  try {
    return await fetch(url, {
      ...restInit,
      next: { revalidate: CMS_REVALIDATE_SECONDS },
      signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export async function cmsServerFetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const memKey = `json:${init?.method ?? "GET"}:${url}`;
  const cached = memoryJsonCacheGet<T>(memKey);
  if (cached !== undefined) return cached;

  const res = await cmsServerFetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...((init?.headers as Record<string, string>) || {}),
    },
  });

  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`cmsServerFetchJson: empty body ${url}`);
  }

  const parsed = JSON.parse(trimmed) as T;
  memoryJsonCacheSet(memKey, parsed);
  return parsed;
}
