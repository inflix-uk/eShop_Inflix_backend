"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import type React from "react";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Fade from "embla-carousel-fade";
import {
  type Banner,
  type InlineBannerBlockPayload,
  bannersFromInlinePayload,
  buildHeroBannersFromApiPayload,
} from "@/app/lib/homepageBannerShared";

export type { InlineBannerBlockPayload } from "@/app/lib/homepageBannerShared";

// Get API base URL
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn('NEXT_PUBLIC_API_URL is not set in environment variables. Using default.');
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

/** Homepage hero — match Canva: large (desktop) + small (mobile). Embedded widgets keep their own ratios. */
const HERO_LARGE_WIDTH = 1440;
const HERO_LARGE_HEIGHT = 500;
const HERO_SMALL_WIDTH = 1200;
const HERO_SMALL_HEIGHT = 900;

const heroHomeLargeAspectStyle = {
  aspectRatio: `${HERO_LARGE_WIDTH} / ${HERO_LARGE_HEIGHT}`,
} as const;
const heroHomeSmallAspectStyle = {
  aspectRatio: `${HERO_SMALL_WIDTH} / ${HERO_SMALL_HEIGHT}`,
} as const;

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

/** Horizontal placement of the text column (full-width row + narrow column). */
function desktopTextBlockRowJustify(pos: HAlign): string {
  if (pos === "center") return "justify-center";
  if (pos === "left") return "justify-start";
  return "justify-end";
}

/** Matches image layer so slide height is never below the original hero min-heights. */
function fullBannerMinHeightClass(embedded: boolean): string {
  return embedded
    ? "min-h-[clamp(200px,52vw,320px)] sm:min-h-[clamp(220px,32vw,380px)]"
    : "min-h-[420px] sm:min-h-[300px] md:min-h-[500px]";
}

/** Horizontal padding + max-width (desktop). Vertical: flex-1 spacers + pb match original layout. */
function desktopTextBlockFlowClass(pos: HAlign, embedded: boolean): string {
  /** Homepage hero (`embedded=false`): wider copy column. Widget embeds keep the original caps. */
  const maxLeftRight = embedded
    ? "max-w-[min(32rem,calc(50vw-1rem))]"
    : "max-w-[min(44rem,calc(58vw-1rem))]";
  const maxCenter = embedded
    ? "max-w-[min(42rem,92vw)]"
    : "max-w-[min(52rem,94vw)]";
  if (pos === "left") {
    return `pl-3 md:pl-8 lg:pl-14 pr-2 ${maxLeftRight} min-w-0`;
  }
  if (pos === "center") {
    return `w-auto ${maxCenter} min-w-0 px-3 md:px-4`;
  }
  return `pl-2 pr-3 md:pr-8 lg:pr-14 ${maxLeftRight} min-w-0`;
}

/** Long CMS copy: wrap long words / URLs and work with line-clamp */
const bannerCopyWrap =
  "min-w-0 max-w-full break-words [overflow-wrap:anywhere] [hyphens:auto]";

function flexItemsForTextAlign(align: HAlign): string {
  if (align === "center") return "items-center";
  if (align === "right") return "items-end";
  return "items-start";
}

function textAlignTailwind(align: HAlign): string {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

function paragraphAlignClass(align: HAlign): string {
  if (align === "center") return "mx-auto";
  if (align === "right") return "ml-auto mr-0";
  return "";
}

function warrantyOuterClass(align: HAlign): string {
  if (align === "center") return "flex flex-col items-center";
  if (align === "right") return "flex flex-col items-end";
  return "";
}

function warrantyRowClass(align: HAlign): string {
  const base = "flex items-center gap-2 lg:font-semibold";
  if (align === "center") return `${base} justify-center`;
  if (align === "right") return `${base} justify-end`;
  return base;
}

function mobileStackClass(pos: HAlign): string {
  if (pos === "left") return "items-start";
  if (pos === "right") return "items-end";
  return "items-center";
}

type BlackFridayBannerProps = {
  /**
   * When set, uses these slides only (no API). Used by homepage/blog Banners widgets.
   * When omitted, top hero loads Admin → Banners via `/get/banners/active` only.
   */
  inlineBanners?: InlineBannerBlockPayload[];
  /**
   * In-page blocks (blog / homepage content): tighter frame, no social strip, clearer CTAs/dots.
   */
  embedded?: boolean;
  /** Server-prefetched slides (ISR); skips client fetch when provided (including `[]`). */
  serverBanners?: Banner[];
};

const BlackFridayBanner: React.FC<BlackFridayBannerProps> = ({
  inlineBanners: inlineBannersProp,
  embedded = false,
  serverBanners,
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade()]);
  const autoplayInterval = 5000;
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const [banners, setBanners] = useState<Banner[]>(
    () => serverBanners ?? []
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (inlineBannersProp !== undefined) return false;
    return serverBanners === undefined;
  });
  const [error, setError] = useState<string | null>(null);

  const inlineBannersList = useMemo((): Banner[] | null => {
    if (inlineBannersProp === undefined) return null;
    return bannersFromInlinePayload(inlineBannersProp, API_BASE_URL);
  }, [inlineBannersProp]);

  // Inline slides from page blocks (no API)
  useEffect(() => {
    if (inlineBannersList === null) return;
    setBanners(inlineBannersList);
    setLoading(false);
    setError(null);
  }, [inlineBannersList]);

  useEffect(() => {
    if (inlineBannersProp !== undefined) return;
    if (serverBanners === undefined) return;
    setBanners(serverBanners);
    setLoading(false);
    setError(null);
  }, [inlineBannersProp, serverBanners]);

  // Fetch banners from API (homepage hero only) when not inline and no server payload
  useEffect(() => {
    if (inlineBannersProp !== undefined) return;
    if (serverBanners !== undefined) return;

    async function fetchBanners() {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = `${API_BASE_URL}/get/banners/active`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch banners: ${response.statusText}`);
        }

        const data: unknown = await response.json();
        setBanners(buildHeroBannersFromApiPayload(data, API_BASE_URL));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load banners");
        setBanners([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBanners();
  }, [inlineBannersProp, serverBanners]);

  useEffect(() => {
    if (emblaApi && banners.length > 0) {
      emblaApi.on("select", () => {
        setCurrentSlide(emblaApi.selectedScrollSnap());
      });

      // Reinitialize carousel when banners change
      emblaApi.reInit();

      // Start autoplay when the component is mounted
      autoplayRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, autoplayInterval);

      // Clear autoplay on component unmount
      return () => {
        if (autoplayRef.current) {
          clearInterval(autoplayRef.current);
        }
      };
    }
  }, [emblaApi, banners.length]);

  // Function to handle pagination dot click
  const handleDotClick = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  useEffect(() => {
    // Add animation styles to document
    const style = document.createElement("style");
    style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.8s ease forwards;
    }
    .animate-fadeIn {
      animation: fadeIn 0.8s ease forwards;
    }
    .text-shadow {
      text-shadow: 0 1px 3px rgba(0,0,0,0.8);
    }
  `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get button link for a banner
  const getButtonLink = (banner: Banner): string => {
    if (banner.type === "simple") {
      return banner.buttonLink || "#";
    } else {
      // Full type: use content.buynow
      return banner.content?.buynow || "#";
    }
  };

  // Get button text for a banner
  const getButtonText = (banner: Banner): string => {
    if (banner.type === "simple") {
      return banner.buttonText || "SHOP NOW";
    } else {
      // Full type: use buttonText from API or default
      return banner.buttonText || "SHOP NOW";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={
          embedded
            ? "relative w-full min-h-[200px] sm:min-h-[260px] max-h-[360px] rounded-xl bg-gray-100 animate-pulse flex items-center justify-center ring-1 ring-gray-200/80"
            : "relative w-full min-h-[420px] sm:min-h-0 sm:aspect-[1440/500] aspect-[1200/900] bg-gray-200 animate-pulse flex items-center justify-center"
        }
      >
        <div className="text-sm text-gray-500">Loading banners…</div>
      </div>
    );
  }

  if (error && banners.length === 0) {
    return (
      <div
        className={
          embedded
            ? "relative w-full min-h-[160px] rounded-xl bg-gray-50 flex items-center justify-center ring-1 ring-gray-200/80 px-4 py-8"
            : "relative w-full min-h-[420px] sm:min-h-0 sm:aspect-[1440/500] aspect-[1200/900] bg-gray-100 flex items-center justify-center"
        }
      >
        <div className="text-sm text-gray-600 text-center">Error: {error}</div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const ctaBtnClass =
    "shadow-lg hover:shadow-xl hover:brightness-[1.02] active:scale-[0.98] transition-all duration-200";

  return (
    <div
      className={
        embedded
          ? "relative w-full overflow-x-hidden overflow-y-visible rounded-xl bg-gray-100 ring-1 ring-gray-200/70 shadow-md"
          : "relative w-full"
      }
    >
      <div ref={emblaRef} className="overflow-x-hidden overflow-y-visible">
        <div className="embla__container flex">
          {banners.map((banner, index) => {
            const textAlign = resolveBannerTextAlign(banner.content);
            const textPos = resolveTextPosition(banner.content);
            return (
            <div key={banner.id} className="embla__slide flex-[0_0_100%]">
              <div
                className={
                  banner.type === "full"
                    ? `relative isolate grid grid-cols-1 ${fullBannerMinHeightClass(embedded)}`
                    : "relative w-full"
                }
              >
                {/* Responsive banner image */}
                {banner.type === "full" ? (
                  <div
                    className={
                      embedded
                        ? "relative col-start-1 row-start-1 h-full min-h-[clamp(200px,52vw,320px)] sm:min-h-[clamp(220px,32vw,380px)]"
                        : "relative col-start-1 row-start-1 h-full w-full min-h-[420px] aspect-[1200/900] sm:min-h-0 sm:h-auto sm:aspect-[1440/500]"
                    }
                  >
                    <div className="absolute inset-0 sm:hidden">
                      <Image
                        src={banner.srcSmall || banner.srcLarge || "/placeholder.svg"}
                        alt={banner.alt}
                        fill
                        className="object-cover object-center"
                        sizes="100vw"
                        fetchPriority={index === 0 ? "high" : "auto"}
                        priority={index === 0}
                        quality={90}
                        unoptimized={banner.srcSmall?.startsWith('http') || banner.srcLarge?.startsWith('http') ? true : false}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target && banner.srcSmall && banner.srcLarge && target.src.includes(banner.srcSmall)) {
                            target.src = banner.srcLarge;
                          }
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 hidden sm:block">
                      <Image
                        src={banner.srcLarge || banner.srcSmall || "/placeholder.svg"}
                        alt={banner.alt}
                        fill
                        className="object-cover object-center"
                        sizes="100vw"
                        fetchPriority={index === 0 ? "high" : "auto"}
                        priority={index === 0}
                        quality={90}
                        unoptimized={banner.srcLarge?.startsWith('http') || banner.srcSmall?.startsWith('http') ? true : false}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target && banner.srcLarge && banner.srcSmall && target.src.includes(banner.srcLarge)) {
                            target.src = banner.srcSmall;
                          }
                        }}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 z-[1] hidden sm:block">
                      {banner.extraImage && (
                        <div className="absolute bottom-0 left-1/2 flex w-full max-w-[min(520px,42vw)] -translate-x-1/2 justify-center">
                          <Image
                            className={`hidden sm:block -rotate-12 ${
                              currentSlide === index
                                ? "animate-slideUp"
                                : "opacity-0"
                            }`}
                            src={banner.extraImage || "/placeholder.svg"}
                            alt={`${banner.alt} device`}
                            width={600}
                            height={600}
                            fetchPriority={index === 0 ? "high" : "auto"}
                            priority={index === 0}
                            unoptimized={
                              banner.extraImage?.startsWith("http")
                                ? true
                                : false
                            }
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target) target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Simple banners: sized box + fill avoids h-auto CLS when intrinsic dimensions load */}
                    <div
                      className={
                        embedded
                          ? "relative z-0 w-full overflow-hidden sm:hidden min-h-[clamp(200px,52vw,320px)] aspect-[5/4]"
                          : "relative z-0 w-full overflow-hidden sm:hidden min-h-[420px]"
                      }
                      style={!embedded ? heroHomeSmallAspectStyle : undefined}
                    >
                      <Image
                        src={banner.srcSmall || banner.srcLarge || "/placeholder.svg"}
                        alt={banner.alt}
                        fill
                        className="object-cover object-center"
                        sizes="100vw"
                        fetchPriority={index === 0 ? "high" : "auto"}
                        priority={index === 0}
                        quality={90}
                        unoptimized={
                          banner.srcSmall?.startsWith("http") ||
                          banner.srcLarge?.startsWith("http")
                            ? true
                            : false
                        }
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (
                            target &&
                            banner.srcSmall &&
                            banner.srcLarge &&
                            target.src.includes(banner.srcSmall)
                          ) {
                            target.src = banner.srcLarge;
                          }
                        }}
                      />
                    </div>
                    <div
                      className={
                        embedded
                          ? "relative z-0 hidden sm:block w-full overflow-hidden min-h-[clamp(220px,32vw,380px)] aspect-[21/9]"
                          : "relative z-0 hidden sm:block w-full overflow-hidden min-h-[300px] md:min-h-[500px]"
                      }
                      style={!embedded ? heroHomeLargeAspectStyle : undefined}
                    >
                      <Image
                        src={banner.srcLarge || banner.srcSmall || "/placeholder.svg"}
                        alt={banner.alt}
                        fill
                        className="object-cover object-center"
                        sizes="100vw"
                        fetchPriority={index === 0 ? "high" : "auto"}
                        priority={index === 0}
                        quality={90}
                        unoptimized={
                          banner.srcLarge?.startsWith("http") ||
                          banner.srcSmall?.startsWith("http")
                            ? true
                            : false
                        }
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (
                            target &&
                            banner.srcLarge &&
                            banner.srcSmall &&
                            target.src.includes(banner.srcLarge)
                          ) {
                            target.src = banner.srcSmall;
                          }
                        }}
                      />
                    </div>
                  </>
                )}

                {/* Desktop: full banners — same min-h as image; flex-1 spacers vertically center copy without shrinking the hero */}
                {banner.type === "full" && (
                  <>
                    <div
                      className={`pointer-events-none col-start-1 row-start-1 z-[5] hidden sm:flex w-full min-w-0 flex-row self-stretch ${desktopTextBlockRowJustify(
                        textPos
                      )}`}
                    >
                      {banner.content && (
                        <div
                          className={`pointer-events-auto flex h-full min-w-0 shrink flex-col self-stretch pb-8 md:pb-12 ${fullBannerMinHeightClass(
                            embedded
                          )} ${desktopTextBlockFlowClass(textPos, embedded)} ${
                            currentSlide === index && index !== 0
                              ? "animate-fadeIn"
                              : currentSlide === index && index === 0
                                ? "opacity-100"
                                : "opacity-0"
                          }`}
                        >
                          <div className="min-h-0 min-w-0 flex-1" aria-hidden />
                          <div
                            className={`flex min-w-0 shrink-0 flex-col ${flexItemsForTextAlign(
                              textAlign
                            )} ${textAlignTailwind(textAlign)}`}
                          >
                            <div
                              className={`font-bold tracking-wider text-white ${bannerCopyWrap} pb-1`}
                              style={{
                                fontSize: banner.content.titleSize || "24px",
                                lineHeight: 1.8,
                                color: banner.content.titleColor || "#FFFFFF",
                              }}
                              title={banner.content.title}
                            >
                              {banner.content.title}
                            </div>
                            {banner.content.subtitle && (
                              <div
                                className={`font-extrabold tracking-wide text-primary ${bannerCopyWrap} line-clamp-2`}
                                style={{
                                  fontSize:
                                    banner.content.subtitleSize || "32px",
                                  lineHeight: 1.35,
                                  color:
                                    banner.content.subtitleColor || "#FFFFFF",
                                }}
                                title={banner.content.subtitle}
                              >
                                {banner.content.subtitle}
                              </div>
                            )}
                            {banner.content.paragraph && (
                              <p
                                className={`mt-2 text-white ${
                                  embedded
                                    ? "max-w-[90%] lg:max-w-[85%]"
                                    : "max-w-full"
                                } ${bannerCopyWrap} ${paragraphAlignClass(
                                  textAlign
                                )}`}
                                style={{
                                  fontSize:
                                    banner.content.paragraphSize || "18px",
                                  lineHeight: 1.6,
                                  color:
                                    banner.content.paragraphColor || "#FFFFFF",
                                }}
                                title={banner.content.paragraph}
                              >
                                {banner.content.paragraph}
                              </p>
                            )}
                            {banner.content.price && (
                              <p
                                className={`mt-2 font-bold text-red-500 ${bannerCopyWrap} line-clamp-2`}
                                style={{
                                  fontSize: banner.content.priceSize || "20px",
                                  lineHeight: 1.35,
                                  color: banner.content.priceColor || "#FF0000",
                                }}
                              >
                                {banner.content.price}
                              </p>
                            )}
                            {banner.content.warranty && (
                              <div
                                className={`mt-2 max-h-[min(7.5rem,22vh)] overflow-y-auto overscroll-y-contain text-white [font-size:1rem] [line-height:1.5] lg:mt-4 lg:max-h-[min(9rem,26vh)] lg:[font-size:1.5rem] lg:[line-height:1.55] ${warrantyOuterClass(
                                  textAlign
                                )}`}
                              >
                                {banner.content.warranty.map((item, i) => (
                                  <div
                                    key={i}
                                    className={warrantyRowClass(textAlign)}
                                  >
                                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white lg:h-2 lg:w-2"></div>
                                    <span className={`${bannerCopyWrap} line-clamp-2`}>
                                      {item}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <a
                              href={getButtonLink(banner)}
                              title={getButtonText(banner)}
                              className={`mt-5 inline-flex min-w-0 max-w-[min(20rem,100%)] items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black ring-1 ring-black/5 lg:max-w-[min(22rem,92%)] lg:px-7 lg:py-2.5 lg:text-base ${ctaBtnClass}`}
                            >
                              <span
                                className={`min-w-0 ${bannerCopyWrap} line-clamp-2 text-left leading-tight`}
                              >
                                {getButtonText(banner)}
                              </span>
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-lg bg-black text-white lg:h-5 lg:w-5">
                                →
                              </span>
                            </a>
                          </div>
                          <div className="min-h-0 min-w-0 flex-1" aria-hidden />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Desktop: simple banners — button left, optional product center */}
                {banner.type === "simple" && (
                  embedded ? (
                    <div className="absolute inset-0 z-[5] hidden sm:flex items-end justify-start p-6 md:p-8">
                      <a
                        href={getButtonLink(banner)}
                        title={getButtonText(banner)}
                        className={`inline-flex min-w-0 max-w-[min(18rem,90%)] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-black ring-1 ring-black/5 pointer-events-auto ${ctaBtnClass}`}
                      >
                        <span
                          className={`min-w-0 ${bannerCopyWrap} line-clamp-2 text-left leading-tight`}
                        >
                          {getButtonText(banner)}
                        </span>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-black text-sm text-white">
                          →
                        </span>
                      </a>
                    </div>
                  ) : (
                    <div className="absolute inset-0 hidden sm:flex">
                      <div className="relative z-[5] flex w-3/12 items-end pb-6 pl-6 md:w-2/12 lg:w-2/12">
                        <a
                          href={getButtonLink(banner)}
                          title={getButtonText(banner)}
                          className={`inline-flex min-w-0 max-w-[min(16rem,95%)] items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black ring-1 ring-black/5 lg:max-w-[min(18rem,92%)] lg:px-6 lg:py-2.5 lg:text-base pointer-events-auto ${ctaBtnClass}`}
                        >
                          <span
                            className={`min-w-0 ${bannerCopyWrap} line-clamp-2 text-left leading-tight`}
                          >
                            {getButtonText(banner)}
                          </span>
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-lg bg-black text-white lg:h-5 lg:w-5">
                            →
                          </span>
                        </a>
                      </div>
                      <div className="relative -rotate-12 md:w-4/12 lg:w-4/12">
                        {banner.extraImage && (
                          <Image
                            className={`absolute -bottom-5 hidden -translate-y-1/4 transform sm:block ${
                              currentSlide === index
                                ? "animate-slideUp"
                                : "opacity-0"
                            }`}
                            src={banner.extraImage || "/placeholder.svg"}
                            alt={`${banner.alt} device`}
                            width={600}
                            height={600}
                            fetchPriority={index === 0 ? "high" : "auto"}
                            priority={index === 0}
                            unoptimized={
                              banner.extraImage?.startsWith("http")
                                ? true
                                : false
                            }
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target) target.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="w-6/12 lg:w-6/12" aria-hidden />
                    </div>
                  )
                )}

                {/* Social Media - Fixed at top right (full hero only) */}
                {!embedded && (
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 text-white hidden sm:block">
                  <div className="text-xs sm:text-sm font-medium mb-1">
                    Follow Us Now
                  </div>
                  <div className="flex gap-1 sm:gap-2">
                    <a
                      href="https://www.facebook.com/zextonstechstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-full p-1 text-primary"
                      aria-label="Visit Zextons Facebook Page"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                    <a
                      href="https://twitter.com/zextons_uk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-full p-1 text-primary"
                      aria-label="Follow Zextons on Twitter"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                      </svg>
                    </a>
                    <a
                      href="https://www.youtube.com/channel/UCb5pBW9HkmUo7CjszeJwqqQ"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-full p-1 text-primary"
                      aria-label="Visit Zextons YouTube Channel"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                      </svg>
                    </a>
                    <a
                      href="https://www.instagram.com/zextons.co.uk/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-full p-1 text-primary"
                      aria-label="Follow Zextons on Instagram"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        ></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                </div>
                )}

                {/* Mobile: full banners — vertically centered in slide; horizontal alignment from CMS */}
                {banner.type === "full" && (
                <div
                  className={`pointer-events-none absolute inset-0 z-[5] flex min-h-0 w-full flex-col justify-center gap-3 p-3 sm:hidden ${mobileStackClass(
                    textPos
                  )} ${textAlignTailwind(textAlign)}`}
                >
                  {banner.extraImage && (
                    <div
                      className={`pointer-events-auto w-full max-w-[150px] ${
                        textPos === "center"
                          ? "mx-auto"
                          : textPos === "right"
                            ? "ml-auto"
                            : "mr-auto"
                      } ${
                        currentSlide === index ? "animate-slideUp" : "opacity-0"
                      }`}
                    >
                      <Image
                        src={banner.extraImage || "/placeholder.svg"}
                        alt={`${banner.alt} device`}
                        width={520}
                        height={520}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        priority={index === 0}
                        className="object-contain w-full h-auto"
                        unoptimized={banner.extraImage?.startsWith('http') ? true : false}
                        onError={(e) => {
                          // Hide the image element on error
                          const target = e.target as HTMLImageElement;
                          if (target) target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {banner.content && (
                    <div
                      className={`pointer-events-auto flex min-w-0 ${
                        embedded
                          ? "max-w-[min(100%,32rem)]"
                          : "max-w-[min(100%,42rem)]"
                      } flex-col ${flexItemsForTextAlign(
                        textAlign
                      )} ${textAlignTailwind(textAlign)} ${
                        currentSlide === index ? "animate-fadeIn" : "opacity-0"
                      }`}
                    >
                      <h2
                        className={`mb-1 text-xl font-bold tracking-wide text-shadow text-white ${bannerCopyWrap}`}
                        style={{
                          color: banner.content.titleColor || "#FFFFFF",
                          lineHeight: 1.6,
                        }}
                        title={banner.content.title}
                      >
                        {banner.content.title}
                      </h2>
                      <h3
                        className={`mb-1 text-[24px] font-bold leading-tight tracking-wide text-shadow text-white ${bannerCopyWrap} `}
                        style={{
                          color: banner.content.subtitleColor || "#FFFFFF",
                        }}
                        title={banner.content.subtitle}
                      >
                        {banner.content.subtitle}
                      </h3>
                      {banner.content.paragraph && (
                        <p
                          className={`mb-1 max-w-full text-[13px] leading-relaxed text-shadow text-white ${bannerCopyWrap} ${paragraphAlignClass(
                            textAlign
                          )}`}
                          style={{
                            color: banner.content.paragraphColor || "#FFFFFF",
                          }}
                          title={banner.content.paragraph}
                        >
                          {banner.content.paragraph}
                        </p>
                      )}
                      {banner.content.price && (
                        <p
                          className={`mb-1 text-sm font-bold text-shadow text-red-500 ${bannerCopyWrap} line-clamp-2`}
                          style={{
                            color: banner.content.priceColor || "#FF0000",
                          }}
                        >
                          {banner.content.price}
                        </p>
                      )}
                      {banner.content.warranty && (
                        <div
                          className={`mb-2 max-h-24 overflow-y-auto text-xs text-shadow text-white ${warrantyOuterClass(
                            textAlign
                          )}`}
                        >
                          {banner.content.warranty.map((item, i) => (
                            <div
                              key={i}
                              className={`mb-0.5 ${warrantyRowClass(textAlign)}`}
                            >
                              <span className="shrink-0 opacity-90">•</span>
                              <span className={`${bannerCopyWrap} line-clamp-2`}>
                                {item}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <a
                        href={getButtonLink(banner)}
                        title={getButtonText(banner)}
                        className={`mt-2 flex max-w-[min(100%,18rem)] items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black ring-1 ring-black/10 ${ctaBtnClass}`}
                      >
                        <span
                          className={`min-w-0 flex-1 ${bannerCopyWrap} line-clamp-2 text-left leading-tight`}
                        >
                          {getButtonText(banner)}
                        </span>
                        <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-black text-[8px] text-white">
                          →
                        </span>
                      </a>
                    </div>
                  )}
                </div>
                )}

                {banner.type === "simple" && (
                  <div className="absolute bottom-6 left-1/2 z-[7] w-[min(100%,18rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 transform sm:hidden">
                    <a
                      href={getButtonLink(banner)}
                      title={getButtonText(banner)}
                      className={`${
                        currentSlide === index
                          ? "animate-fadeIn"
                          : "opacity-0"
                      } mx-auto flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black shadow-lg ring-1 ring-black/10 ${ctaBtnClass}`}
                    >
                      <span
                        className={`min-w-0 flex-1 ${bannerCopyWrap} line-clamp-2 text-center leading-tight`}
                      >
                        {getButtonText(banner)}
                      </span>
                      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-black text-[8px] text-white">
                        →
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Bottom gradient so dots + CTAs read on light photography */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[6] bg-gradient-to-t from-black/45 via-black/15 to-transparent ${
          embedded ? "h-24 sm:h-28" : "h-32 sm:h-36"
        }`}
        aria-hidden
      />

      {/* Pagination Dots */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-md ring-1 ring-white/25 ${
          embedded ? "bottom-3" : "bottom-2 sm:bottom-4"
        }`}
      >
        {banners.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleDotClick(index)}
            className="flex h-3 w-3 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900/80 sm:h-3.5 sm:w-3.5"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={currentSlide === index ? "true" : undefined}
          >
            <span
              className={`block rounded-full transition-transform duration-200 ${
                currentSlide === index
                  ? "h-2.5 w-2.5 scale-110 bg-primary shadow-[0_0_0_2px_rgba(255,255,255,0.35)] sm:h-3 sm:w-3"
                  : "h-2 w-2 bg-white/85 hover:bg-white sm:h-2.5 sm:w-2.5"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default BlackFridayBanner;
