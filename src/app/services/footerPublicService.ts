import { cmsServerFetchJson } from "@/app/lib/cmsServerFetch";
import { DEFAULT_FOOTER } from "@/app/components/footer/footerDefaults";
import type {
  FooterSection2,
  FooterSettings,
} from "@/app/components/footer/footerTypes";

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
}

export function normalizeFooterApiData(raw: FooterSettings): FooterSettings {
  const data: FooterSettings = JSON.parse(JSON.stringify(raw)) as FooterSettings;

  if (data.section1?.socialMedia) {
    data.section1.socialMedia = data.section1.socialMedia
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order);
  }

  (["section2", "section3", "section4"] as const).forEach((sectionKey) => {
    const section = data[sectionKey] as FooterSection2;
    if (section?.links) {
      section.links = section.links
        .filter((link) => link.isActive)
        .sort((a, b) => a.order - b.order);
    }
  });

  if (data.section5?.paymentMethods?.logos) {
    data.section5.paymentMethods.logos = data.section5.paymentMethods.logos
      .filter((logo) => logo.isActive)
      .sort((a, b) => a.order - b.order);
  }

  data.bottomBar = {
    ...DEFAULT_FOOTER.bottomBar,
    ...(data.bottomBar ?? {}),
  };

  return data;
}

/** Footer CMS with ISR + in-memory cache (per server instance). */
export async function getFooterSettingsCached(): Promise<FooterSettings> {
  const base = apiBase();
  if (!base) return DEFAULT_FOOTER;

  try {
    const responseJson = await cmsServerFetchJson<{
      data?: FooterSettings;
      success?: boolean;
    }>(`${base}/footer/settings`);

    const apiData = responseJson.data;
    if (!apiData?.section1 || !apiData?.section2) {
      return DEFAULT_FOOTER;
    }
    return normalizeFooterApiData(apiData);
  } catch (e) {
    console.warn("[footerPublicService] fetch failed:", e);
    return DEFAULT_FOOTER;
  }
}
