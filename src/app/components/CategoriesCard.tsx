"use client";
import { useState, useEffect, useCallback, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import {
  getCategoryCards,
  getCategoryCardImageUrl,
  type CategoryCard,
} from "@/app/services/categoryCardsService";

/**
 * Background overlay from admin (hex). 8- and 4-digit hex include alpha.
 * 6- and 3-digit hex get a default 40% opacity so the photo still reads through.
 * Legacy rgba() values from older data are still applied as-is.
 */
function overlayLayerStyle(
  overlayRaw: string | undefined | null
): CSSProperties | undefined {
  const t = overlayRaw?.trim();
  if (!t) return undefined;
  if (/^#[0-9A-Fa-f]{8}$/i.test(t)) {
    return { backgroundColor: t };
  }
  if (/^#[0-9A-Fa-f]{4}$/i.test(t)) {
    return { backgroundColor: t };
  }
  if (/^rgba?\(/i.test(t)) {
    return { backgroundColor: t };
  }
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
    const r = parseInt(t.slice(1, 3), 16);
    const g = parseInt(t.slice(3, 5), 16);
    const b = parseInt(t.slice(5, 7), 16);
    return { backgroundColor: `rgba(${r},${g},${b},0.4)` };
  }
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = parseInt(t[1] + t[1], 16);
    const g = parseInt(t[2] + t[2], 16);
    const b = parseInt(t[3] + t[3], 16);
    return { backgroundColor: `rgba(${r},${g},${b},0.4)` };
  }
  return { backgroundColor: t };
}

function MobileSlider({
  cards,
  renderCard,
}: {
  cards: CategoryCard[];
  renderCard: (card: CategoryCard) => React.ReactNode;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrent(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (cards.length === 0) return null;

  return (
    <div className="md:hidden relative w-full pt-5 pb-2">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {cards.map((card) => (
            <div
              key={card._id}
              className="flex-[0_0_100%] min-w-0 px-2"
            >
              {renderCard(card)}
            </div>
          ))}
        </div>
      </div>

      {cards.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-black/10"
            aria-label="Previous card"
          >
            <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-black/10"
            aria-label="Next card"
          >
            <svg className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="flex justify-center gap-1.5 mt-3">
            {cards.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-5 bg-gray-800" : "w-2 bg-gray-300"
                }`}
                aria-label={`Go to card ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface Category {
  name: string;
}

interface CategoriesCardProps {
  countItems: (categoryName: string) => number;
  newCategories: { categories: Category[] };
  /** When set, skip the API and render these cards (e.g. from homepage/blog blocks). */
  inlineCards?: CategoryCard[];
}

const CategoriesCard: React.FC<CategoriesCardProps> = ({
  countItems: _countItems,
  newCategories: _newCategories,
  inlineCards,
}) => {
  const isInline = inlineCards !== undefined;
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([]);
  const [loading, setLoading] = useState<boolean>(!isInline);
  const [error, setError] = useState<string | null>(null);

  const displayCards = isInline ? (inlineCards ?? []) : categoryCards;
  const showLoading = !isInline && loading;
  const cardCount = displayCards.length;

  useEffect(() => {
    if (isInline) return;
    let cancelled = false;
    async function fetchCategoryCards() {
      try {
        setLoading(true);
        setError(null);
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL}`;
        const apiEndpoint = `${apiUrl.replace(/\/$/, "")}/get/category-cards/active`;
        console.log("[CategoryCards] Fetching from:", apiEndpoint);

        const data = await getCategoryCards();
        if (cancelled) return;

        console.log("[CategoryCards] API response count:", data?.length ?? 0);

        // Show all active cards from the API (no filter by newCategories)
        setCategoryCards(data);
      } catch (err) {
        if (!cancelled) {
          console.error("[CategoryCards] Error fetching category cards:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load category cards"
          );
          setCategoryCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCategoryCards();
    return () => {
      cancelled = true;
    };
  }, [isInline]);

  if (showLoading) {
    return (
      <div className="relative w-full">
        <div
          className="grid w-full grid-cols-1 gap-4 md:[grid-template-columns:repeat(var(--cc),minmax(0,1fr))]"
          style={{ ["--cc" as string]: "3" } as CSSProperties}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-0 px-0 pt-5 pb-2 sm:pt-10 sm:pb-3">
              <div
                className="rounded-lg shadow-xl p-2 sm:p-5 animate-pulse border border-gray-200/80 bg-transparent"
                style={{ minHeight: "200px" }}
              >
                <div className="h-5 rounded bg-gray-200/60 w-1/3 mb-2" />
                <div className="h-4 rounded bg-gray-200/60 w-1/4 mb-4" />
                <div className="w-full max-w-[734px] aspect-[734/412] rounded border border-gray-200/60 bg-transparent" />
                <div className="mt-4 h-9 rounded bg-gray-200/60 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayCards.length === 0) {
    return (
      <div className="relative max-w-screen-xl mx-auto py-5 sm:py-10 px-2">
        <div className="rounded-lg border border-gray-200 p-6 text-center text-gray-600">
          {isInline
            ? "No category cards in this block."
            : error || "No category cards available."}
        </div>
      </div>
    );
  }

  const renderCard = (card: CategoryCard) => {
    const bgUrl = getCategoryCardImageUrl(card.backgroundImage);
    const imgUrl = getCategoryCardImageUrl(card.categoryImage);
    const shopLink =
      card.shopNowLink ||
      `/categories/${encodeURIComponent(card.categoryName)}`;
    const displayName = card.categoryName.replace(/-/g, " ");
    return (
      <Link href={shopLink} className="block h-full">
        <div className="relative overflow-hidden rounded-lg shadow-xl p-2 sm:p-5 mb-2 md:mb-0 cursor-pointer transition-all duration-[1200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.03] hover:shadow-card-shadow group h-full">
          {bgUrl ? (
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[1400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-110"
              style={{ backgroundImage: `url(${bgUrl})` }}
              aria-hidden
            />
          ) : null}
          {card.overlayColor?.trim() ? (
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={overlayLayerStyle(card.overlayColor)}
              aria-hidden
            />
          ) : null}
          <div className="relative z-10">
            <p
              className="text-lg font-bold mb-2 sm:line-clamp-1 line-clamp-2 relative z-10"
              style={{
                color: card.categoryNameColor?.trim() || "#000000",
              }}
            >
              {displayName}
            </p>
            <p
              className="mb-0"
              style={{
                color: card.itemCountColor?.trim() || "#6B7280",
              }}
            >
              {card.itemCount ?? 0} items
            </p>
            <div className="relative w-full min-w-0 max-w-[734px] aspect-[734/412] overflow-hidden rounded-md bg-transparent">
              {imgUrl ? (
                <Image
                  src={imgUrl}
                  alt={displayName}
                  fill
                  className="object-cover object-center transition-transform duration-[1400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-110"
                  sizes={
                    cardCount <= 1
                      ? "(max-width: 768px) 100vw, 734px"
                      : `(max-width: 768px) 100vw, min(734px, ${Math.ceil(100 / cardCount)}vw)`
                  }
                  loading="lazy"
                  unoptimized={imgUrl.startsWith("http://localhost")}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                  No image
                </div>
              )}
            </div>
            <div className="flex xs:flex-nowrap flex-wrap justify-between items-center md:mt-5">
              <span className="transition ease-in-out delay-100 relative z-10 text-gray-900 bg-white border border-gray-300 focus:outline-none group-hover:bg-gray-900 group-hover:text-white focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 md:py-2.5 py-1.5">
                Shop Now
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="relative w-full">
      {/* Mobile slider */}
      <MobileSlider cards={displayCards} renderCard={renderCard} />

      {/* Desktop grid */}
      <div
        className="hidden md:grid w-full grid-cols-1 gap-10 md:[grid-template-columns:repeat(var(--cc),minmax(0,1fr))]"
        style={
          {
            ["--cc" as string]: String(Math.max(1, cardCount)),
          } as CSSProperties
        }
      >
        {displayCards.map((card) => (
          <div key={card._id} className="min-w-0 px-0 pt-10 pb-3">
            {renderCard(card)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoriesCard;
