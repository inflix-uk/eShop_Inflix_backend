/**
 * Public deals modal (Hot UK Deals) CMS — no auth.
 */

const apiBase = (): string =>
  (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export type DealsModalPublicFields = {
  enabled: boolean;
  openDelayMs: number;
  countdownEndsAt: string;
  discountCode: string;
  collapsedBannerText: string;
  badgeText: string;
  headline: string;
  descriptionPrimary: string;
  descriptionSecondary: string;
  countdownLabel: string;
  emailPlaceholder: string;
  submitButtonText: string;
  successSubscribeMessage: string;
  discountViewSuccessBadge: string;
  discountViewHeadline: string;
  discountViewDescription: string;
  discountViewLabel: string;
  discountViewThankYou: string;
  copyCodeButtonText: string;
  copiedButtonText: string;
  rightPanelImageAlt: string;
  bannerImageUrl: string;
};

export type DealsModalPublicResponse =
  | { enabled: false }
  | DealsModalPublicFields;

/** Static defaults mirror BlackFridayModal + backend DEFAULT_CONTENT */
export const DEALS_MODAL_STATIC_DEFAULTS: DealsModalPublicFields = {
  enabled: true,
  openDelayMs: 10000,
  countdownEndsAt: new Date("2026-01-31T00:00:00.000Z").toISOString(),
  discountCode: "HOTDEALS",
  collapsedBannerText: "HOT UK DEALS",
  badgeText: "🔥 HOT UK DEALS",
  headline: "HOT UK DEALS - EXCLUSIVE SAVINGS!",
  descriptionPrimary:
    "Discover the hottest UK deals with up to 70% OFF on premium tech products.",
  descriptionSecondary:
    "Smart tech, smart gifts, smart savings – only at Zextons.",
  countdownLabel: "Sale Ends In:",
  emailPlaceholder: "Enter Your Email",
  submitButtonText: "Beat The Clock And Sign Me Up",
  successSubscribeMessage: "You have successfully subscribed!",
  discountViewSuccessBadge: "Successfully Subscribed!",
  discountViewHeadline: "Your Discount Code",
  discountViewDescription:
    "Use this code at checkout to claim your exclusive discount!",
  discountViewLabel: "Use Discount Code:",
  discountViewThankYou: "Thank you for subscribing! Enjoy your savings.",
  copyCodeButtonText: "Copy Code",
  copiedButtonText: "Copied!",
  rightPanelImageAlt: "Hot UK Deals",
  bannerImageUrl: "",
};

export async function fetchDealsModalPublic(): Promise<DealsModalPublicResponse | null> {
  const base = apiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/deals-modal/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.success || !json.data) return null;
    const d = json.data;
    if (d.enabled === false) {
      return { enabled: false };
    }
    const merged = {
      ...DEALS_MODAL_STATIC_DEFAULTS,
      ...d,
    } as DealsModalPublicFields;
    const rawEnd = d.countdownEndsAt;
    let endMs: number;
    if (typeof rawEnd === "number" && Number.isFinite(rawEnd)) {
      endMs = rawEnd;
    } else if (typeof rawEnd === "string" && rawEnd.trim()) {
      endMs = new Date(rawEnd).getTime();
    } else {
      endMs = NaN;
    }
    merged.countdownEndsAt = Number.isFinite(endMs)
      ? new Date(endMs).toISOString()
      : DEALS_MODAL_STATIC_DEFAULTS.countdownEndsAt;
    return merged;
  } catch {
    return null;
  }
}
