
import dynamic from "next/dynamic";
import {
  getHomepageImageUrl,
  type ContentBlock,
  type WidgetSliderContent,
  type WidgetNewsletterContent,
  type WidgetFaqContent,
  type WidgetVideoContent,
  type WidgetMapContent,
  type WidgetGalleryContent,
  type WidgetIconBoxContent,
  type WidgetTestimonialsContent,
  type WidgetTrustpilotContent,
  type WidgetSiteBannersContent,
  type WidgetCategoryCardsContent,
  type WidgetPromotionalSectionsContent,
  type WidgetLatestBlogsContent,
  type WidgetHtmlCssContent,
  type ProductSliderBlockContent,
} from "@/app/services/homepageDataService";
import type { SiteWidgetVisibility } from "@/app/services/siteWidgetSettingsService";

function WidgetChunkFallback() {
  return (
    <div
      className="min-h-[160px] animate-pulse rounded-lg bg-gray-100 my-6"
      aria-hidden
    />
  );
}

const ContentProductSlider = dynamic(
  () => import("@/app/components/ContentProductSlider"),
  { loading: WidgetChunkFallback }
);
const BlogSliderWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogSliderWidget"),
  { loading: WidgetChunkFallback }
);
const BlogVideoWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogVideoWidget"),
  { loading: WidgetChunkFallback }
);
const BlogMapWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogMapWidget"),
  { loading: WidgetChunkFallback }
);
const BlogGalleryWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogGalleryWidget"),
  { loading: WidgetChunkFallback }
);
const BlogIconBoxWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogIconBoxWidget"),
  { loading: WidgetChunkFallback }
);
const BlogTestimonialsWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogTestimonialsWidget"),
  { loading: WidgetChunkFallback }
);
const BlogTrustpilotEmbedWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogTrustpilotEmbedWidget"),
  { loading: WidgetChunkFallback }
);
const BlogSiteBannersWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogSiteBannersWidget"),
  { loading: WidgetChunkFallback }
);
const BlogCategoryCardsWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogCategoryCardsWidget"),
  { loading: WidgetChunkFallback }
);
const BlogPromotionalSectionsWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogPromotionalSectionsWidget"),
  { loading: WidgetChunkFallback }
);
const BlogLatestBlogsWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogLatestBlogsWidget"),
  { loading: WidgetChunkFallback }
);
const NewsletterSignupWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/NewsletterSignupWidget"),
  { loading: WidgetChunkFallback }
);
const FaqWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/FaqWidget"),
  { loading: WidgetChunkFallback }
);
const BlogHtmlCssWidget = dynamic(
  () => import("@/app/(routes)/blogs/new/[slug]/BlogHtmlCssWidget"),
  { loading: WidgetChunkFallback }
);

export type CmsWidgetAndProductBlockProps = {
  block: ContentBlock;
  widgetVisibility: SiteWidgetVisibility;
  /** For gallery, testimonials, promotional widgets; defaults to homepage image URL builder. */
  resolveImageUrl?: (path: string | null | undefined) => string;
};

/**
 * Renders `products` and `widget` CMS blocks (same shape as homepage / blog editor).
 * Used by homepage content and footer CMS pages.
 */
export function CmsWidgetAndProductBlock({
  block,
  widgetVisibility,
  resolveImageUrl = getHomepageImageUrl,
}: CmsWidgetAndProductBlockProps) {
  if (block.type === "products") {
    return (
      <ContentProductSlider
        content={block.content as ProductSliderBlockContent}
      />
    );
  }

  if (block.type !== "widget") {
    return null;
  }

  const w = block.content as
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
    | WidgetHtmlCssContent;

  if (w?.widgetType === "slider") {
    if (!widgetVisibility.sliderEnabled) return null;
    return (
      <BlogSliderWidget
        slides={w.slides || []}
        sectionHeading={w.sectionHeading}
        sectionDescription={w.sectionDescription}
      />
    );
  }
  if (w?.widgetType === "newsletter") {
    if (!widgetVisibility.newsletterEnabled) return null;
    const n = w as WidgetNewsletterContent;
    return (
      <NewsletterSignupWidget
        heading={n.heading}
        description={n.description}
        placeholder={n.placeholder}
        buttonLabel={n.buttonLabel}
        imageUrl={n.imageUrl}
      />
    );
  }
  if (w?.widgetType === "faq") {
    if (!widgetVisibility.faqEnabled) return null;
    const f = w as WidgetFaqContent;
    return <FaqWidget sectionHeading={f.sectionHeading} items={f.items || []} />;
  }
  if (w?.widgetType === "video") {
    if (!widgetVisibility.videoEnabled) return null;
    const v = w as WidgetVideoContent;
    return (
      <BlogVideoWidget
        videoUrl={v.videoUrl}
        heading={v.heading}
        caption={v.caption}
      />
    );
  }
  if (w?.widgetType === "map") {
    if (!widgetVisibility.mapEnabled) return null;
    const m = w as WidgetMapContent;
    return (
      <BlogMapWidget
        embedUrl={m.embedUrl}
        heading={m.heading}
        heightPx={m.heightPx}
      />
    );
  }
  if (w?.widgetType === "gallery") {
    if (!widgetVisibility.galleryEnabled) return null;
    const g = w as WidgetGalleryContent;
    return (
      <BlogGalleryWidget
        items={g.items || []}
        heading={g.heading}
        resolveSrc={(path) => resolveImageUrl(path) || ""}
      />
    );
  }
  if (w?.widgetType === "iconBox") {
    if (!widgetVisibility.iconBoxEnabled) return null;
    const ib = w as WidgetIconBoxContent;
    return <BlogIconBoxWidget items={ib.items || []} heading={ib.heading} />;
  }
  if (w?.widgetType === "testimonials") {
    if (!widgetVisibility.testimonialsEnabled) return null;
    const t = w as WidgetTestimonialsContent;
    return (
      <BlogTestimonialsWidget
        items={t.items || []}
        heading={t.heading}
        description={t.description}
        resolveImageUrl={(path) => resolveImageUrl(path) || ""}
      />
    );
  }
  if (w?.widgetType === "trustpilot") {
    if (!widgetVisibility.trustpilotWidgetEnabled) return null;
    const tp = w as WidgetTrustpilotContent;
    return <BlogTrustpilotEmbedWidget embedScript={tp.embedScript} />;
  }
  if (w?.widgetType === "siteBanners") {
    if (!widgetVisibility.siteBannersEnabled) return null;
    const sb = w as WidgetSiteBannersContent;
    return <BlogSiteBannersWidget items={sb.items || []} />;
  }
  if (w?.widgetType === "categoryCards") {
    if (!widgetVisibility.categoryCardsEnabled) return null;
    const cc = w as WidgetCategoryCardsContent;
    return (
      <BlogCategoryCardsWidget
        headingText={cc.headingText}
        headingColor={cc.headingColor}
        dividerColor={cc.dividerColor}
        sectionBackgroundColor={cc.sectionBackgroundColor}
        items={cc.items || []}
      />
    );
  }
  if (w?.widgetType === "promotionalSections") {
    if (!widgetVisibility.promotionalSectionsEnabled) return null;
    const pr = w as WidgetPromotionalSectionsContent;
    return (
      <BlogPromotionalSectionsWidget
        buyNowPayLater={pr.buyNowPayLater}
        sellBuyCards={pr.sellBuyCards}
        tinyPhoneBanner={pr.tinyPhoneBanner}
        resolveImageUrl={(path) => resolveImageUrl(path) || ""}
      />
    );
  }
  if (w?.widgetType === "latestBlogs") {
    if (!widgetVisibility.latestBlogsEnabled) return null;
    const lb = w as WidgetLatestBlogsContent;
    return (
      <BlogLatestBlogsWidget
        sectionHeading={lb.sectionHeading}
        maxPosts={lb.maxPosts}
        viewAllLabel={lb.viewAllLabel}
      />
    );
  }
  if (w?.widgetType === "htmlCss") {
    if (!widgetVisibility.htmlCssEnabled) return null;
    const hc = w as WidgetHtmlCssContent;
    return <BlogHtmlCssWidget html={hc.html} css={hc.css} />;
  }

  return null;
}
