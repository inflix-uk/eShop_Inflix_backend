/**
 * Public navbar header settings (e.g. support phone) — no auth.
 */

const apiBase = (): string =>
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export const DEFAULT_HEADER_SUPPORT_PHONE = "0333 344 8541";

export async function fetchNavbarHeaderPublic(): Promise<{
  supportPhone: string;
}> {
  const base = apiBase();
  if (!base) {
    return { supportPhone: DEFAULT_HEADER_SUPPORT_PHONE };
  }
  try {
    const res = await fetch(`${base}/navbar-header/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return { supportPhone: DEFAULT_HEADER_SUPPORT_PHONE };
    }
    const json = await res.json();
    const raw = json?.data?.supportPhone;
    const phone =
      typeof raw === "string" && raw.trim()
        ? raw.trim()
        : DEFAULT_HEADER_SUPPORT_PHONE;
    return { supportPhone: phone };
  } catch {
    return { supportPhone: DEFAULT_HEADER_SUPPORT_PHONE };
  }
}
