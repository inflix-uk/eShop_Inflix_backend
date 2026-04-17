import { cache } from "react";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
} from "@/app/lib/cmsTimedFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Admin Homepage SEO (`PATCH /homepage-data/seo`) exposed publicly for metadata */
export interface HomepagePublicSeo {
  metaTitle: string;
  metaDescription: string;
  metaTags: string[];
  metaSchema: string[];
  updatedAt: string | null;
}

export interface HomepageData {
  blocks: HomepageBlock[];
  updatedAt: string | null;
}

export interface HomepageBlock {
  id?: string;
  type?: string;
  columns: HomepageColumn[];
}

export interface HomepageColumn {
  width: number;
  blocks: ContentBlock[];
}

export interface SliderSlide {
  id?: string;
  heading?: string;
  description?: string;
  imageUrl?: string;
}

export interface WidgetSliderContent {
  widgetType: "slider";
  /** Optional title above the slider on the public site */
  sectionHeading?: string;
  /** Optional intro text below the title */
  sectionDescription?: string;
  slides: SliderSlide[];
}

export interface WidgetNewsletterContent {
  widgetType: "newsletter";
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  imageUrl?: string;
}

export interface FaqItemContent {
  id?: string;
  question?: string;
  answer?: string;
}

export interface WidgetFaqContent {
  widgetType: "faq";
  sectionHeading?: string;
  items?: FaqItemContent[];
}

export interface WidgetVideoContent {
  widgetType: "video";
  videoUrl?: string;
  heading?: string;
  caption?: string;
}

export interface WidgetMapContent {
  widgetType: "map";
  embedUrl?: string;
  heading?: string;
  /** Iframe height in px (clamped 200–800 on the public site). */
  heightPx?: number;
}

export interface GalleryImageItem {
  id?: string;
  imageUrl?: string;
  caption?: string;
  alt?: string;
}

export interface WidgetGalleryContent {
  widgetType: "gallery";
  heading?: string;
  items?: GalleryImageItem[];
}

export interface IconBoxItemContent {
  id?: string;
  iconCode?: string;
  title?: string;
  description?: string;
}

export interface WidgetIconBoxContent {
  widgetType: "iconBox";
  heading?: string;
  items?: IconBoxItemContent[];
}

export interface TestimonialItemContent {
  id?: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  rating?: number;
  avatarUrl?: string;
}

export interface WidgetTestimonialsContent {
  widgetType: "testimonials";
  heading?: string;
  /** Optional intro under the section heading */
  description?: string;
  items?: TestimonialItemContent[];
}

/** Paste Trustpilot’s embed snippet (HTML with a `.trustpilot-widget` root). */
export interface WidgetTrustpilotContent {
  widgetType: "trustpilot";
  embedScript?: string;
}

/** Banner slides authored inside the block editor (same fields as Banners admin). */
export interface SiteBannerBlockItem {
  id?: string;
  type?: "simple" | "full";
  imageLarge?: string;
  imageSmall?: string;
  extraImage?: string;
  altText?: string;
  buttonText?: string;
  buttonLink?: string;
  content?: Record<string, unknown>;
  order?: number;
  isActive?: boolean;
}

export interface WidgetSiteBannersContent {
  widgetType: "siteBanners";
  items?: SiteBannerBlockItem[];
}

/** Category tiles authored in blocks (same shape as Category cards admin). */
export interface CategoryCardBlockItemContent {
  id?: string;
  categoryName?: string;
  categoryNameColor?: string;
  itemCountColor?: string;
  overlayColor?: string;
  shopNowLink?: string;
  itemCount?: number;
  backgroundImage?: string;
  categoryImage?: string;
  order?: number;
  isActive?: boolean;
}

export interface WidgetCategoryCardsContent {
  widgetType: "categoryCards";
  headingText?: string;
  headingColor?: string;
  dividerColor?: string;
  sectionBackgroundColor?: string;
  items?: CategoryCardBlockItemContent[];
}

/** Inline Buy Now Pay Later, Sell/Buy cards, Tiny Phone (block editor). */
export interface PromotionalBnplBlockContent {
  heading?: string;
  paragraph?: string;
  backgroundImage?: string;
  paymentImages?: string[];
}

export interface PromotionalSellBuyCardBlockContent {
  heading?: string;
  paragraph?: string;
  buttonName?: string;
  buttonLink?: string;
  backgroundImage?: string;
  productImage?: string;
}

export interface PromotionalSellBuyBlockContent {
  sellCard?: PromotionalSellBuyCardBlockContent;
  buyCard?: PromotionalSellBuyCardBlockContent;
}

export interface PromotionalTinyPhoneBlockContent {
  heading?: string;
  paragraph?: string;
  buttonName?: string;
  buttonLink?: string;
  backgroundImage?: string;
  centerImage?: string;
  rightImage?: string;
}

export interface WidgetPromotionalSectionsContent {
  widgetType: "promotionalSections";
  buyNowPayLater?: PromotionalBnplBlockContent;
  sellBuyCards?: PromotionalSellBuyBlockContent;
  tinyPhoneBanner?: PromotionalTinyPhoneBlockContent;
}

/** Latest posts grid (block editor); data from public /api/blogs/latest. */
export interface WidgetLatestBlogsContent {
  widgetType: "latestBlogs";
  sectionHeading?: string;
  maxPosts?: number;
  viewAllLabel?: string;
}

/** Fragment HTML + scoped CSS (rendered in a shadow root on the public site). */
export interface WidgetHtmlCssContent {
  widgetType: "htmlCss";
  /** Markup only — no DOCTYPE, html, head, or body wrappers. */
  html?: string;
  css?: string;
}

/** How the product slider is filled: manual/category picks, auto latest 6, or featured subset. */
export type ProductSliderSource = "manual" | "latest" | "featured";

/** Curated product carousel (admin picks products by category, latest auto, or featured). */
export interface ProductSliderBlockContent {
  sectionTitle?: string;
  productIds?: string[];
  selectedProductsMeta?: { _id?: string; name?: string }[];
  productSource?: ProductSliderSource;
}

export interface ContentBlock {
  id?: string;
  type: "text" | "image" | "widget" | "products";
  content:
    | string
    | ImageContent
    | WidgetSliderContent
    | WidgetNewsletterContent
    | WidgetFaqContent
    | WidgetVideoContent
    | WidgetMapContent
    | WidgetGalleryContent
    | WidgetIconBoxContent
    | WidgetTestimonialsContent
    | WidgetTrustpilotContent
    | WidgetSiteBannersContent
    | WidgetCategoryCardsContent
    | WidgetPromotionalSectionsContent
    | WidgetLatestBlogsContent
    | WidgetHtmlCssContent
    | ProductSliderBlockContent;
}

export interface ImageContent {
  url?: string;
  alt?: string;
  heading?: string;
  externalLink?: string;
}

/**
 * Get homepage data content from API
 */
export type HomepageNewsletterSingleton = {
  heading: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  imageUrl: string;
};

/**
 * Global newsletter widget from Homepage Widgets admin (singleton).
 */
export async function getHomepageNewsletterWidgetPublic(): Promise<HomepageNewsletterSingleton | null> {
  try {
    const response = await cmsTimedFetch(
      `${API_URL}/homepage-newsletter-widget/public`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...cmsPublicFetchInit(),
      }
    );

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      return null;
    }

    const d = json.data;
    return {
      heading: d.heading || "",
      description: d.description || "",
      placeholder: d.placeholder || "Enter your email",
      buttonLabel: d.buttonLabel || "Subscribe",
      imageUrl: d.imageUrl || "",
    };
  } catch (error) {
    if (!isCmsFetchAbortError(error)) {
      console.error("[HomepageDataService] newsletter widget:", error);
    }
    return null;
  }
}

export const getHomepagePublicSeo = cache(
  async (): Promise<HomepagePublicSeo | null> => {
    try {
      const response = await cmsTimedFetch(`${API_URL}/homepage-data/public/seo`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        ...cmsPublicFetchInit(),
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      if (!json.success || !json.data) {
        return null;
      }

      const d = json.data;
      return {
        metaTitle: typeof d.metaTitle === "string" ? d.metaTitle : "",
        metaDescription:
          typeof d.metaDescription === "string" ? d.metaDescription : "",
        metaTags: Array.isArray(d.metaTags) ? d.metaTags.map(String) : [],
        metaSchema: Array.isArray(d.metaSchema) ? d.metaSchema.map(String) : [],
        updatedAt: d.updatedAt ?? null,
      };
    } catch (error) {
      if (!isCmsFetchAbortError(error)) {
        console.error("[HomepageDataService] public SEO:", error);
      }
      return null;
    }
  }
);

export async function getHomepageData(): Promise<HomepageData | null> {
  try {
    const response = await cmsTimedFetch(`${API_URL}/homepage-data/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      ...cmsPublicFetchInit(),
    });

    if (!response.ok) {
      console.error("[HomepageDataService] Failed to fetch homepage data");
      return null;
    }

    const data = await response.json();

    if (data.success) {
      return data.data;
    }

    return null;
  } catch (error) {
    if (!isCmsFetchAbortError(error)) {
      console.error("[HomepageDataService] Error fetching homepage data:", error);
    }
    return null;
  }
}

/**
 * Get the full image URL from a relative path
 */
export function getHomepageImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return "";

  // If it's already a full URL, return as is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Construct the full URL
  return `${API_URL}/uploads${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}
