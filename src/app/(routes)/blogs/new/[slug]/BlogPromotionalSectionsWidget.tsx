"use client";

import Image from "next/image";
import Link from "next/link";
import type {
  PromotionalBnplBlockContent,
  PromotionalSellBuyBlockContent,
  PromotionalTinyPhoneBlockContent,
} from "@/app/services/homepageDataService";

export type BlogPromotionalSectionsWidgetProps = {
  buyNowPayLater?: PromotionalBnplBlockContent;
  sellBuyCards?: PromotionalSellBuyBlockContent;
  tinyPhoneBanner?: PromotionalTinyPhoneBlockContent;
  /** Resolve stored paths to absolute URLs (blog: getFullImageUrl, homepage: getHomepageImageUrl). */
  resolveImageUrl?: (path: string | undefined | null) => string;
};

function linkIsExternal(url: string) {
  return /^https?:\/\//i.test((url || "").trim());
}

function imgSrc(
  path: string | undefined,
  resolveImageUrl: (p: string | undefined | null) => string
) {
  const t = (path || "").trim();
  if (!t) return "";
  if (t.startsWith("data:") || t.startsWith("http://") || t.startsWith("https://")) return t;
  return resolveImageUrl(t) || "";
}

export default function BlogPromotionalSectionsWidget({
  buyNowPayLater: bnpl,
  sellBuyCards,
  tinyPhoneBanner: tiny,
  resolveImageUrl = (p) => (p ? String(p) : ""),
}: BlogPromotionalSectionsWidgetProps) {
  const sell = sellBuyCards?.sellCard;
  const buy = sellBuyCards?.buyCard;

  const showBnpl =
    bnpl?.heading?.trim() &&
    bnpl?.paragraph?.trim() &&
    bnpl?.backgroundImage?.trim();
  const showSell =
    sell?.heading?.trim() &&
    sell?.backgroundImage?.trim() &&
    sell?.buttonLink?.trim();
  const showBuy =
    buy?.heading?.trim() &&
    buy?.backgroundImage?.trim() &&
    buy?.buttonLink?.trim();
  const showTiny =
    tiny?.heading?.trim() &&
    tiny?.paragraph?.trim() &&
    tiny?.buttonName?.trim() &&
    tiny?.buttonLink?.trim();

  if (!showBnpl && !showSell && !showBuy && !showTiny) {
    return null;
  }

  const bnplBg = showBnpl ? imgSrc(bnpl?.backgroundImage, resolveImageUrl) : "";

  return (
    <div className="space-y-6">
 {showBnpl && bnpl && (
  <div
    className={`relative rounded-xl py-8 px-4 sm:py-12 sm:px-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8 min-h-[140px] overflow-hidden ${
      bnplBg
        ? "bg-cover bg-center"
        : "bg-gradient-to-r from-gray-500 to-gray-300"
    }`}
    style={bnplBg ? { backgroundImage: `url(${bnplBg})` } : undefined}
  >
    {/* Overlay for better text visibility */}
    {bnplBg && (
      <div className="absolute inset-0 bg-black/50 z-0"></div>
    )}

    {/* Content */}
    <div className="relative z-10 max-w-lg min-w-0 w-full">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">
        {bnpl.heading}
      </h2>
      <p className="text-sm md:text-base mt-2 text-white/90 leading-relaxed">
        {bnpl.paragraph}
      </p>
    </div>

    {/* Payment Images */}
    <div className="relative z-10 hidden lg:flex flex-wrap items-center justify-end gap-5 shrink-0">
      {(bnpl.paymentImages || [])
        .map((imgUrl, idx) => ({
          src: imgSrc(imgUrl, resolveImageUrl),
          idx,
        }))
        .filter((x) => x.src.length > 0)
        .map(({ src, idx }) => (
          <div
            key={idx}
            className="relative h-10 w-24 bg-white/10 backdrop-blur-sm rounded-md p-1"
          >
            <Image
              src={src}
              alt="Payment Option"
              loading="lazy"
              fill
              className="object-contain"
              sizes="(min-width: 1024px) 96px, 30vw"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                t.style.display = "none";
              }}
              unoptimized={
                src.startsWith("http://localhost") ||
                src.startsWith("https://localhost") ||
                src.startsWith("data:")
              }
            />
          </div>
        ))}
    </div>
  </div>
)}

      {(showSell || showBuy) && (
        <div className="flex flex-col xs:flex-row justify-between gap-4 xl:gap-x-20">
          {showSell && sell && (
            <div
              className="rounded-3xl w-full min-w-0 p-4 sm:p-6 flex flex-wrap items-center md:space-x-20 space-x-5 cursor-pointer transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-lg bg-cover bg-center min-h-[200px]"
              style={
                sell.backgroundImage
                  ? {
                      backgroundImage: `url(${imgSrc(sell.backgroundImage, resolveImageUrl)})`,
                    }
                  : { backgroundColor: "#FE1054" }
              }
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-white text-[20px] sm:text-[26px] font-bold mb-2 break-words">{sell.heading}</h2>
                <p className="text-white mt-4 mb-4 line-clamp-4 md:mb-10 md:line-clamp-none min-w-0">
                  {sell.paragraph}
                </p>
                {linkIsExternal(sell.buttonLink || "") ? (
                  <a
                    href={sell.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sell.buttonName}
                  </a>
                ) : (
                  <Link
                    href={sell.buttonLink || "#"}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {sell.buttonName}
                  </Link>
                )}
              </div>
              {sell.productImage?.trim() && (
                <div className="md:block hidden">
                  <div className="relative md:w-48 w-36 md:h-48 h-36 xl:-mb-6 md:mt-0 sm:mt-20 mt-10">
                    <Image
                      src={imgSrc(sell.productImage, resolveImageUrl)}
                      alt={sell.heading || ""}
                      loading="lazy"
                      fill
                      className="object-contain rounded-md"
                      sizes="(min-width: 1024px) 12rem, 9rem"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                      }}
                      unoptimized={imgSrc(sell.productImage, resolveImageUrl).startsWith("data:")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {showBuy && buy && (
            <div
              className={`rounded-3xl w-full min-w-0 p-4 sm:p-6 flex flex-wrap items-center md:space-x-20 space-x-5 cursor-pointer transition-transform duration-500 ease-in-out hover:scale-105 hover:shadow-lg min-h-[200px] relative ${
                buy.backgroundImage ? "bg-cover bg-center" : "bg-primary"
              }`}
              style={
                buy.backgroundImage
                  ? {
                      backgroundImage: `url(${imgSrc(buy.backgroundImage, resolveImageUrl)})`,
                    }
                  : undefined
              }
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-white text-[20px] sm:text-[26px] font-bold mb-2 break-words">{buy.heading}</h2>
                <p className="text-white mt-4 mb-4 line-clamp-4 md:mb-10 md:line-clamp-none min-w-0">
                  {buy.paragraph}
                </p>
                {linkIsExternal(buy.buttonLink || "") ? (
                  <a
                    href={buy.buttonLink}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {buy.buttonName}
                  </a>
                ) : (
                  <Link
                    href={buy.buttonLink || "#"}
                    className="bg-white px-4 py-2 rounded-lg font-semibold text-nowrap"
                  >
                    {buy.buttonName}
                  </Link>
                )}
              </div>
              {buy.productImage?.trim() && (
                <div className="md:block hidden">
                  <div className="relative md:w-48 w-36 md:h-48 h-36 xl:-mb-6 md:mt-0 sm:mt-20 mt-10">
                    <Image
                      src={imgSrc(buy.productImage, resolveImageUrl)}
                      alt={buy.heading || ""}
                      loading="lazy"
                      fill
                      className="object-contain rounded-md"
                      sizes="(min-width: 1024px) 12rem, 9rem"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.style.display = "none";
                      }}
                      unoptimized={imgSrc(buy.productImage, resolveImageUrl).startsWith("data:")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

{showTiny && tiny && (
  <div
    className="w-full rounded-2xl overflow-hidden relative shadow-lg"
    style={
      tiny.backgroundImage?.trim()
        ? {
            backgroundImage: `url(${imgSrc(tiny.backgroundImage, resolveImageUrl)})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : undefined
    }
  >
    {/* Overlay Gradient */}
    <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/90 via-[#1e293b]/80 to-[#0f172a]/70 backdrop-blur-[2px]" />

    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 px-6 sm:px-10 py-10 lg:py-12">
      
      {/* LEFT CONTENT */}
      <div className="max-w-xl text-center lg:text-left">
        <h2 className="text-white text-3xl sm:text-4xl font-bold leading-tight mb-4 tracking-tight">
          {tiny.heading}
        </h2>

        <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6">
          {tiny.paragraph}
        </p>

        {linkIsExternal(tiny.buttonLink || "") ? (
          <a
            href={tiny.buttonLink}
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200"
          >
            {tiny.buttonName}
            →
          </a>
        ) : (
          <Link
            href={tiny.buttonLink || "#"}
            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-full font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-200"
          >
            {tiny.buttonName}
            →
          </Link>
        )}
      </div>

      {/* RIGHT VISUALS */}
      {(tiny.centerImage?.trim() || tiny.rightImage?.trim()) && (
            <div className="flex flex-wrap items-end justify-center gap-4 w-full max-w-full lg:w-auto min-w-0">
          
          {/* Main Image */}
          {tiny.centerImage?.trim() && (
            <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-[4/1] rounded-xl bg-white/10 backdrop-blur-md p-3 ring-1 ring-white/20 shadow-xl">
              <Image
                src={imgSrc(tiny.centerImage, resolveImageUrl)}
                alt={tiny.heading || ""}
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
          )}

          {/* Side Image */}
          {tiny.rightImage?.trim() && (
            <div className="relative w-[90px] sm:w-[110px] aspect-square rounded-xl bg-white/10 backdrop-blur-md p-2 ring-1 ring-white/20 shadow-lg">
              <Image
                src={imgSrc(tiny.rightImage, resolveImageUrl)}
                alt=""
                fill
                className="object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
}
