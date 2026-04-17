import { cache } from "react";
import {
  getHomepageData,
  getHomepageNewsletterWidgetPublic,
  type HomepageBlock,
  type HomepageNewsletterSingleton,
} from "@/app/services/homepageDataService";
import {
  getSiteWidgetSettingsPublic,
  type SiteWidgetVisibility,
} from "@/app/services/siteWidgetSettingsService";
import {
  getTrustpilotSettings,
  type TrustpilotSettings,
} from "@/app/services/trustpilotService";
import {
  getCategoryCardsSectionSettings,
  type CategoryCardsSectionSettings,
} from "@/app/services/categoryCardsService";
import {
  getHomeNavLinksPublicServer,
  type HomeNavLink,
} from "@/app/services/homeNavLinksService";
import {
  getBuyNowPayLater,
  getSellBuyCards,
  getTinyPhoneBanner,
  type BuyNowPayLater,
  type SellBuyCards,
  type TinyPhoneBanner,
} from "@/app/services/promotionalSectionsService";

export type HomeServerCmsBundle = {
  homepageBlocks: HomepageBlock[];
  newsletterWidget: HomepageNewsletterSingleton | null;
  widgetVisibility: SiteWidgetVisibility;
  trustpilotSettings: TrustpilotSettings | null;
  categoryCardsSection: CategoryCardsSectionSettings;
  homeNavLinks: HomeNavLink[];
  buyNowPayLater: BuyNowPayLater | null;
  sellBuyCards: SellBuyCards | null;
  tinyPhoneBanner: TinyPhoneBanner | null;
};

/** One parallel CMS fetch for the homepage (ISR via per-service revalidate). */
export const getHomeServerCmsBundle = cache(
  async (): Promise<HomeServerCmsBundle> => {
    const [
      homepageData,
      newsletterWidget,
      widgetVisibility,
      trustpilotSettings,
      categoryCardsSection,
      homeNavLinks,
      buyNowPayLater,
      sellBuyCards,
      tinyPhoneBanner,
    ] = await Promise.all([
      getHomepageData(),
      getHomepageNewsletterWidgetPublic(),
      getSiteWidgetSettingsPublic(),
      getTrustpilotSettings(),
      getCategoryCardsSectionSettings(),
      getHomeNavLinksPublicServer(),
      getBuyNowPayLater(),
      getSellBuyCards(),
      getTinyPhoneBanner(),
    ]);

    return {
      homepageBlocks: homepageData?.blocks?.length ? homepageData.blocks : [],
      newsletterWidget,
      widgetVisibility,
      trustpilotSettings,
      categoryCardsSection,
      homeNavLinks,
      buyNowPayLater,
      sellBuyCards,
      tinyPhoneBanner,
    };
  }
);
