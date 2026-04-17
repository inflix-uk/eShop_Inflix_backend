"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { getFullImageUrl } from "./blogUtils";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "./useBlogContentFullBleed";

export type GalleryItem = {
  id?: string;
  imageUrl?: string;
  caption?: string;
  alt?: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export default function BlogGalleryWidget({
  items,
  heading,
  resolveSrc,
}: {
  items: GalleryItem[];
  heading?: string;
  /** Defaults to blog uploads URL helper; homepage passes getHomepageImageUrl. */
  resolveSrc?: (path: string) => string;
}) {
  const resolve = resolveSrc ?? getFullImageUrl;

  const list = useMemo(() => {
    return (Array.isArray(items) ? items : [])
      .filter((it) => it?.imageUrl && String(it.imageUrl).trim().length > 0)
      .filter((it) => {
        const t = String(it.imageUrl).trim();
        const src = resolve(t);
        return Boolean(src && !src.includes("placeholder"));
      });
  }, [items, resolveSrc]);

  const rootRef = useRef<HTMLDivElement>(null);
  const bleed = useBlogContentFullBleed(rootRef, list.length > 0);
  const prefersReducedMotion = usePrefersReducedMotion();

  const emblaOptions = useMemo<EmblaOptionsType>(
    () => ({
      loop: list.length > 1,
      align: "start",
      axis: "x",
      duration: prefersReducedMotion ? 0 : 42,
      skipSnaps: false,
      dragFree: false,
      containScroll: list.length > 1 ? false : "trimSnaps",
    }),
    [list.length, prefersReducedMotion]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, list.length, prefersReducedMotion]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const goPrev = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || list.length === 0) return null;
      return (i - 1 + list.length) % list.length;
    });
  }, [list.length]);
  const goNext = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || list.length === 0) return null;
      return (i + 1) % list.length;
    });
  }, [list.length]);

  const resolvedSrc = useCallback(
    (path: string): string => {
      const t = path.trim();
      if (!t) return "";
      return resolve(t);
    },
    [resolve]
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, close, goPrev, goNext]);

  const showArrows = list.length > 1;

  if (list.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className="relative my-8 min-w-0 max-w-full overflow-x-hidden rounded-xl border border-gray-200 bg-gray-50/80 py-3 shadow-sm sm:py-4"
      style={bleedStyle(bleed)}
    >
      {heading?.trim() ? (
        <h3 className="mb-2 px-3 text-lg font-semibold text-primary sm:mb-3 sm:px-4">
          {heading.trim()}
        </h3>
      ) : (
        <div className="mb-2 px-3 sm:mb-3 sm:px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Gallery
          </span>
        </div>
      )}

      <div className="relative min-w-0 px-2 sm:px-3">
        {showArrows ? (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition-colors duration-200 hover:bg-gray-50 active:scale-95 sm:left-1"
              aria-label="Scroll gallery left"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-2 text-gray-700 shadow-md transition-colors duration-200 hover:bg-gray-50 active:scale-95 sm:right-1"
              aria-label="Scroll gallery right"
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        ) : null}

        <div className="overflow-hidden px-8 sm:px-10" ref={emblaRef}>
          <div className="embla__container flex [-webkit-tap-highlight-color:transparent] [backface-visibility:hidden]">
            {list.map((item, index) => {
              const src = resolvedSrc(String(item.imageUrl));
              return (
                <div
                  key={item.id || `g-${index}`}
                  className="embla__slide min-w-0 shrink-0 flex-[0_0_min(82vw,280px)] px-1.5 sm:flex-[0_0_320px]"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-100 shadow-sm outline-none ring-green-600 transition-shadow duration-300 ease-out hover:shadow-md focus-visible:ring-2"
                  >
                    {/* Thumbnail: object-contain (no crop), same idea as image slider */}
                    <div className="relative flex h-44 w-full items-center justify-center bg-gray-100 p-2 sm:h-52 sm:p-3">
                      <img
                        src={src}
                        alt={
                          item.alt?.trim() ||
                          item.caption?.trim() ||
                          `Gallery image ${index + 1}`
                        }
                        className="max-h-full max-w-full object-contain transition-opacity duration-200 group-hover:opacity-95"
                        loading="lazy"
                        draggable={false}
                      />
                    </div>
                    {item.caption?.trim() ? (
                      <span className="pointer-events-none border-t border-gray-200 bg-white px-2 py-2 text-left text-xs text-gray-700 line-clamp-2">
                        {item.caption.trim()}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && list[lightboxIndex] ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onClick={close}
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={close}
            aria-label="Close gallery"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {list.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
                aria-label="Previous image"
              >
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
                aria-label="Next image"
              >
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : null}
          <div
            className="max-h-[90vh] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resolvedSrc(String(list[lightboxIndex].imageUrl))}
              alt={
                list[lightboxIndex].alt?.trim() ||
                list[lightboxIndex].caption?.trim() ||
                "Gallery image"
              }
              className="max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            {list[lightboxIndex].caption?.trim() ? (
              <p className="mt-3 text-center text-sm text-white/90">
                {list[lightboxIndex].caption!.trim()}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}
