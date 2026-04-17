import { CMS_MEMORY_TTL_MS } from "./cmsCacheConfig";

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

/**
 * Short-lived per-process JSON cache to reduce duplicate upstream calls
 * within the same instance (no Redis). Safe for public CMS payloads only.
 */
export function memoryJsonCacheGet<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e || e.expiresAt <= Date.now()) {
    if (e) store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function memoryJsonCacheSet(key: string, value: unknown): void {
  store.set(key, { value, expiresAt: Date.now() + CMS_MEMORY_TTL_MS });
}

export function memoryJsonCacheClearKey(key: string): void {
  store.delete(key);
}
