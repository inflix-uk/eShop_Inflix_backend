import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

function apiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "";
  return raw.replace(/\/$/, "");
}

export type AnnouncementBarItemPublic = {
  id: string;
  message: string;
  linkUrl: string;
  linkLabel: string;
  backgroundColor: string;
  textColor: string;
  dismissible: boolean;
  /** When true, link/CTA is shown before the message text */
  ctaFirst: boolean;
};

const SOCIAL_KINDS = new Set([
  "facebook",
  "instagram",
  "linkedin",
  "youtube",
  "twitter",
  "github",
  "tiktok",
  "mail",
  "globe",
  "custom",
]);

export type AnnouncementSocialLinkPublic = {
  id: string;
  kind: string;
  url: string;
  customIcon: string;
};

export type AnnouncementBannerPublic = {
  enabled: boolean;
  updatedAt: string | null;
  items: AnnouncementBarItemPublic[];
  socialLinks: AnnouncementSocialLinkPublic[];
};

const EMPTY: AnnouncementBannerPublic = {
  enabled: false,
  updatedAt: null,
  items: [],
  socialLinks: [],
};

function parseEnabled(v: unknown): boolean {
  return v === true || v === "true" || v === 1;
}

function parseItem(raw: unknown): AnnouncementBarItemPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  return {
    id,
    message: typeof o.message === "string" ? o.message : "",
    linkUrl: typeof o.linkUrl === "string" ? o.linkUrl : "",
    linkLabel: typeof o.linkLabel === "string" ? o.linkLabel : "",
    backgroundColor:
      typeof o.backgroundColor === "string" ? o.backgroundColor : "#0f172a",
    textColor: typeof o.textColor === "string" ? o.textColor : "#ffffff",
    dismissible: o.dismissible !== false && o.dismissible !== "false",
    ctaFirst: o.ctaFirst === true || o.ctaFirst === "true",
  };
}

function parseSocial(raw: unknown): AnnouncementSocialLinkPublic | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const kindRaw = typeof o.kind === "string" ? o.kind.toLowerCase() : "globe";
  const kind = SOCIAL_KINDS.has(kindRaw) ? kindRaw : "globe";
  const url = typeof o.url === "string" ? o.url : "";
  const customIcon =
    typeof o.customIcon === "string" ? o.customIcon : "";
  return { id, kind, url, customIcon };
}

export async function getAnnouncementBannerPublic(): Promise<AnnouncementBannerPublic> {
  const base = apiBase();
  if (!base) {
    return EMPTY;
  }
  try {
    const response = await cmsTimedFetch(`${base}/announcement-banner/public`, {
      method: "GET",
      headers: { Accept: "application/json" },
      ...cmsPublicFetchInit(),
      next: { revalidate: 0 },
    });
    if (!response.ok) {
      return EMPTY;
    }
    const json = await response.json();
    if (!json.success || !json.data) {
      return EMPTY;
    }
    const d = json.data;
    const itemsRaw = Array.isArray(d.items) ? d.items : [];
    const items = itemsRaw
      .map(parseItem)
      .filter(
        (x: AnnouncementBarItemPublic | null): x is AnnouncementBarItemPublic =>
          x != null
      );
    const socialRaw = Array.isArray(d.socialLinks) ? d.socialLinks : [];
    const socialLinks = socialRaw
      .map(parseSocial)
      .filter(
        (x: AnnouncementSocialLinkPublic | null): x is AnnouncementSocialLinkPublic =>
          x != null && String(x.url || "").trim().length > 0
      );
    return {
      enabled: parseEnabled(d.enabled) && items.length > 0,
      updatedAt:
        typeof d.updatedAt === "string"
          ? d.updatedAt
          : d.updatedAt
            ? new Date(d.updatedAt as string | number | Date).toISOString()
            : null,
      items,
      socialLinks,
    };
  } catch {
    return EMPTY;
  }
}
