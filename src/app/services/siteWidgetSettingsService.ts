import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type SiteWidgetVisibility = {
  sliderEnabled: boolean;
  newsletterEnabled: boolean;
  faqEnabled: boolean;
  videoEnabled: boolean;
  mapEnabled: boolean;
  galleryEnabled: boolean;
  iconBoxEnabled: boolean;
  testimonialsEnabled: boolean;
  trustpilotWidgetEnabled: boolean;
  siteBannersEnabled: boolean;
  categoryCardsEnabled: boolean;
  promotionalSectionsEnabled: boolean;
  latestBlogsEnabled: boolean;
  htmlCssEnabled: boolean;
};

/** Default when API is unavailable; also used as initial client state before fetch. */
export const DEFAULT_SITE_WIDGET_VISIBILITY: SiteWidgetVisibility = {
  sliderEnabled: true,
  newsletterEnabled: true,
  faqEnabled: true,
  videoEnabled: true,
  mapEnabled: true,
  galleryEnabled: true,
  iconBoxEnabled: true,
  testimonialsEnabled: true,
  trustpilotWidgetEnabled: true,
  siteBannersEnabled: true,
  categoryCardsEnabled: true,
  promotionalSectionsEnabled: true,
  latestBlogsEnabled: true,
  htmlCssEnabled: true,
};

/**
 * Global widget visibility (slider, newsletter, FAQ) for the public site.
 */
export async function getSiteWidgetSettingsPublic(): Promise<SiteWidgetVisibility> {
  try {
    const response = await cmsTimedFetch(`${API_URL}/site-widget-settings/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...cmsPublicFetchInit(),
    });
    if (!response.ok) {
      return DEFAULT_SITE_WIDGET_VISIBILITY;
    }
    const json = await response.json();
    if (!json.success || !json.data) {
      return DEFAULT_SITE_WIDGET_VISIBILITY;
    }
    const d = json.data;
    return {
      sliderEnabled: d.sliderEnabled !== false,
      newsletterEnabled: d.newsletterEnabled !== false,
      faqEnabled: d.faqEnabled !== false,
      videoEnabled: d.videoEnabled !== false,
      mapEnabled: d.mapEnabled !== false,
      galleryEnabled: d.galleryEnabled !== false,
      iconBoxEnabled: d.iconBoxEnabled !== false,
      testimonialsEnabled: d.testimonialsEnabled !== false,
      trustpilotWidgetEnabled: d.trustpilotWidgetEnabled !== false,
      siteBannersEnabled: d.siteBannersEnabled !== false,
      categoryCardsEnabled: d.categoryCardsEnabled !== false,
      promotionalSectionsEnabled: d.promotionalSectionsEnabled !== false,
      latestBlogsEnabled: d.latestBlogsEnabled !== false,
      htmlCssEnabled: d.htmlCssEnabled !== false,
    };
  } catch {
    return DEFAULT_SITE_WIDGET_VISIBILITY;
  }
}
