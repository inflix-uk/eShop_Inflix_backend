/**
 * Pure helpers + types for homepage / widget hero banners (shared by client slider + server prefetch).
 */

export interface BannerContent {
  title?: string;
  subtitle?: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
  warranty?: string[];
  titleColor?: string;
  subtitleColor?: string;
  paragraphColor?: string;
  priceColor?: string;
  titleSize?: string;
  subtitleSize?: string;
  paragraphSize?: string;
  priceSize?: string;
  textAlign?: "left" | "center" | "right";
  textPosition?: "left" | "center" | "right";
}

export interface Banner {
  id: string;
  srcLarge: string;
  srcSmall: string;
  alt: string;
  content?: BannerContent;
  extraImage?: string;
  buttonText?: string;
  buttonLink?: string;
  type: "simple" | "full";
}

export interface ApiBannerContent {
  title?: string;
  subtitle?: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
  warranty?: string[];
  titleColor?: string;
  subtitleColor?: string;
  paragraphColor?: string;
  priceColor?: string;
  titleSize?: string;
  subtitleSize?: string;
  paragraphSize?: string;
  priceSize?: string;
  textAlign?: "left" | "center" | "right";
  textPosition?: "left" | "center" | "right";
}

export interface ApiBanner {
  _id: string;
  type: "simple" | "full";
  imageLarge: string;
  imageSmall: string;
  altText: string;
  buttonText?: string;
  buttonLink?: string;
  content?: ApiBannerContent;
  extraImage?: string;
  order?: number;
}

export type InlineBannerBlockPayload = {
  id?: string;
  type?: "simple" | "full";
  imageLarge?: string;
  imageSmall?: string;
  extraImage?: string;
  altText?: string;
  buttonText?: string;
  buttonLink?: string;
  content?: ApiBannerContent;
  order?: number;
  isActive?: boolean;
};

type HAlign = "left" | "center" | "right";

function resolveBannerTextAlign(content?: { textAlign?: string }): HAlign {
  const a = (content?.textAlign ?? "").toString().trim().toLowerCase();
  if (a === "center" || a === "right") return a;
  return "left";
}

function resolveTextPosition(content?: { textPosition?: string }): HAlign {
  const p = (content?.textPosition ?? "").toString().trim().toLowerCase();
  if (p === "left" || p === "center" || p === "right") return p;
  return "right";
}

export function getBannerImageUrl(url: string | undefined, apiBase: string): string {
  if (!url || url.trim() === "") {
    return "";
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    try {
      const urlObj = new URL(trimmedUrl);
      const pathSegments = urlObj.pathname.split("/").filter(Boolean);
      const encodedSegments = pathSegments.map((segment) =>
        encodeURIComponent(segment)
      );
      const encodedPathname = "/" + encodedSegments.join("/");
      return `${urlObj.protocol}//${urlObj.host}${encodedPathname}${urlObj.search}${urlObj.hash}`;
    } catch {
      return trimmedUrl;
    }
  }

  if (trimmedUrl.startsWith("data:")) {
    return trimmedUrl;
  }

  let finalPath = "";

  if (trimmedUrl.startsWith("/uploads/")) {
    finalPath = trimmedUrl;
  } else if (trimmedUrl.startsWith("/")) {
    const pathWithoutSlash = trimmedUrl.substring(1);
    finalPath = `/uploads/${pathWithoutSlash}`;
  } else {
    finalPath = `/uploads/${trimmedUrl}`;
  }

  const pathSegments = finalPath.split("/").filter(Boolean);
  const encodedSegments = pathSegments.map((segment) =>
    encodeURIComponent(segment)
  );
  const encodedPath = "/" + encodedSegments.join("/");

  const cleanBase = apiBase.replace(/\/$/, "");
  return `${cleanBase}${encodedPath}`;
}

export function transformApiBannerToBanner(
  apiBanner: ApiBanner,
  apiBase: string
): Banner {
  const hasContent =
    apiBanner.content &&
    (apiBanner.content.title ||
      apiBanner.content.subtitle ||
      apiBanner.content.paragraph ||
      apiBanner.content.price ||
      (apiBanner.content.warranty && apiBanner.content.warranty.length > 0));

  const rawLarge = getBannerImageUrl(apiBanner.imageLarge, apiBase);
  const rawSmall = getBannerImageUrl(apiBanner.imageSmall, apiBase);
  const srcLarge = rawLarge || rawSmall;
  const srcSmall = rawSmall || rawLarge;

  return {
    id: apiBanner._id,
    srcLarge,
    srcSmall,
    alt: apiBanner.altText || "Banner",
    content: hasContent
      ? {
          title: apiBanner.content?.title,
          subtitle: apiBanner.content?.subtitle,
          paragraph: apiBanner.content?.paragraph,
          price: apiBanner.content?.price,
          buynow: apiBanner.content?.buynow,
          sellnow: apiBanner.content?.sellnow,
          warranty:
            apiBanner.content?.warranty &&
            apiBanner.content.warranty.length > 0
              ? apiBanner.content.warranty
              : undefined,
          titleColor: apiBanner.content?.titleColor,
          subtitleColor: apiBanner.content?.subtitleColor,
          paragraphColor: apiBanner.content?.paragraphColor,
          priceColor: apiBanner.content?.priceColor,
          titleSize: apiBanner.content?.titleSize,
          subtitleSize: apiBanner.content?.subtitleSize,
          paragraphSize: apiBanner.content?.paragraphSize,
          priceSize: apiBanner.content?.priceSize,
          textAlign: resolveBannerTextAlign(apiBanner.content),
          textPosition: resolveTextPosition(apiBanner.content),
        }
      : undefined,
    extraImage: apiBanner.extraImage
      ? getBannerImageUrl(apiBanner.extraImage, apiBase)
      : undefined,
    buttonText: apiBanner.buttonText,
    buttonLink: apiBanner.buttonLink,
    type: apiBanner.type,
  };
}

export function extractApiBannersArray(data: unknown): ApiBanner[] {
  if (Array.isArray(data)) {
    return data as ApiBanner[];
  }
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as { success?: boolean }).success &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as unknown as { data: ApiBanner[] }).data;
  }
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { banners?: unknown }).banners)
  ) {
    return (data as unknown as { banners: ApiBanner[] }).banners;
  }
  return [];
}

export function buildHeroBannersFromApiPayload(
  data: unknown,
  apiBase: string
): Banner[] {
  const bannersArray = extractApiBannersArray(data);
  if (bannersArray.length === 0) return [];

  const sortedBanners = [...bannersArray].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    return orderA - orderB;
  });

  const transformedBanners = sortedBanners.map((banner) =>
    transformApiBannerToBanner(banner, apiBase)
  );

  return transformedBanners.filter(
    (banner) =>
      banner.srcLarge &&
      banner.srcLarge !== "" &&
      banner.srcSmall &&
      banner.srcSmall !== ""
  );
}

export function bannersFromInlinePayload(
  items: InlineBannerBlockPayload[],
  apiBase: string
): Banner[] {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const active = sorted.filter((b) => b.isActive !== false);
  const transformed = active.map((b, i) =>
    transformApiBannerToBanner(
      {
        _id: b.id || `inline-${i}`,
        type: (b.type === "full" ? "full" : "simple") as "simple" | "full",
        imageLarge: b.imageLarge || "",
        imageSmall: b.imageSmall || "",
        altText: b.altText || "Banner",
        buttonText: b.buttonText,
        buttonLink: b.buttonLink,
        content: b.content,
        extraImage: b.extraImage,
        order: b.order ?? i,
      },
      apiBase
    )
  );
  return transformed.filter(
    (banner) =>
      banner.srcLarge &&
      banner.srcLarge !== "" &&
      banner.srcSmall &&
      banner.srcSmall !== ""
  );
}
