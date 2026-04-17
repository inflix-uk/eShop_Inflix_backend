/**
 * Runs work after the browser is idle (or after timeout), to reduce main-thread
 * contention during initial paint. Falls back to setTimeout(0) when unavailable.
 */
export function scheduleIdle(
  work: () => void,
  options?: { timeout?: number }
): () => void {
  if (typeof window === "undefined") {
    queueMicrotask(work);
    return () => {};
  }
  const timeout = options?.timeout ?? 2000;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    const id = ric.call(window, () => work(), { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(work, 0);
  return () => clearTimeout(t);
}
