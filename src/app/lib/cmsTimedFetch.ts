/**
 * Bounded wait for CMS/backend during SSR. Without this, a hung upstream in
 * production can block layout/page render and leave the tab loading indefinitely.
 * Override with CMS_UPSTREAM_TIMEOUT_MS (milliseconds, 3000–120000) in `.env.local`.
 */
function readCmsUpstreamTimeoutMs(): number {
  const raw = process.env.CMS_UPSTREAM_TIMEOUT_MS;
  if (raw == null || raw === "") return 12_000;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 3000 && n <= 120_000) return n;
  return 12_000;
}

export const CMS_UPSTREAM_TIMEOUT_MS = readCmsUpstreamTimeoutMs();

/** True when fetch was aborted (timeout, navigation, or parent RSC signal). */
export function isCmsFetchAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  return false;
}

/**
 * Abort when any input signal aborts (timeout + framework cancellation).
 * Uses AbortSignal.any when available (Node 20+, modern browsers).
 */
export function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const valid = signals.filter(Boolean) as AbortSignal[];
  if (valid.length === 0) {
    return new AbortController().signal;
  }
  if (valid.length === 1) {
    return valid[0];
  }
  const Any = (
    AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }
  ).any;
  if (typeof Any === "function") {
    return Any(valid);
  }
  const controller = new AbortController();
  for (const sig of valid) {
    if (sig.aborted) {
      controller.abort();
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

export async function cmsTimedFetch(
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
      signal,
    });
  } finally {
    clearTimeout(id);
  }
}
