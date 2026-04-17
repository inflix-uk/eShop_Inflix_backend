"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { getFullImageUrl } from "./blogUtils";

type Slide = {
  id?: string;
  heading?: string;
  description?: string;
  imageUrl?: string;
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

export default function BlogSliderWidget({
  slides,
  sectionHeading,
  sectionDescription,
}: {
  slides: Slide[];
  /** Shown above the slides on the public site */
  sectionHeading?: string;
  sectionDescription?: string;
}) {
  const list = useMemo(
    () =>
      (Array.isArray(slides) ? slides : []).filter(
        (s) =>
          (s.imageUrl && String(s.imageUrl).trim()) ||
          (s.heading && String(s.heading).trim()) ||
          (s.description && String(s.description).trim())
      ),
    [slides]
  );

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, list.length, prefersReducedMotion]);

  useEffect(() => {
    if (!emblaApi) return;

    setSelectedIndex(emblaApi.selectedScrollSnap());

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  /** Auto-advance in a loop when multiple slides; disabled if user prefers reduced motion */
  useEffect(() => {
    if (!emblaApi || list.length <= 1 || prefersReducedMotion) return;
    const intervalMs = 4500;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [emblaApi, list.length, prefersReducedMotion]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  if (list.length === 0) return null;

  const headingTrim = sectionHeading?.trim() ?? "";
  const descTrim = sectionDescription?.trim() ?? "";
  const hasSectionIntro = Boolean(headingTrim || descTrim);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 py-4 shadow-sm">
      {hasSectionIntro ? (
        <div className="mb-4 px-3 sm:px-5">
          {headingTrim ? (
            <h2 className="text-xl font-semibold text-primary sm:text-2xl">{headingTrim}</h2>
          ) : null}
          {descTrim ? (
            <p className="mt-2 text-sm text-gray-600 sm:text-base max-w-3xl leading-relaxed">
              {descTrim}
            </p>
          ) : null}
        </div>
      ) : null}

      {list.length > 1 ? (
        <div className="mb-3 flex justify-end px-3 sm:px-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 active:scale-95"
              aria-label="Previous slide"
            >
              <ChevronIcon dir="left" />
            </button>

            <button
              type="button"
              onClick={scrollNext}
              className="rounded-full border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 active:scale-95"
              aria-label="Next slide"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Embla viewport — smoother drag + scroll than native overflow */}
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
        <div className="overflow-hidden pb-2" ref={emblaRef}>
          <div className="embla__container flex [-webkit-tap-highlight-color:transparent] [backface-visibility:hidden]">
            {list.map((slide, i) => {
              const src = slide.imageUrl ? getFullImageUrl(slide.imageUrl) : "";

              return (
                <article
                  key={slide.id != null ? `${slide.id}-${i}` : `slide-${i}`}
                  className="embla__slide mr-4 flex min-w-0 shrink-0 flex-[0_0_100%] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-shadow duration-300 ease-out hover:shadow-lg sm:flex-[0_0_calc((100%-1rem)/2)] lg:flex-[0_0_calc((100%-3rem)/4)]"
                >
                  <div className="relative flex h-[200px] shrink-0 items-center justify-center bg-gray-100 p-2">
                    {src ? (
                      <img
                        src={src}
                        alt={slide.heading || "Slide"}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="border-t px-3 py-2">
                    {slide.heading ? (
                      <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                        {slide.heading}
                      </h3>
                    ) : (
                      <h3 className="text-sm text-gray-400 sm:text-base">No title</h3>
                    )}

                    {slide.description ? (
                      <div className="mt-2 min-h-[200px]">
                        <p className="text-sm leading-relaxed text-gray-600 sm:text-base">
                          {slide.description}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {list.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5 px-4 sm:px-6">
          {list.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                i === selectedIndex ? "w-6 bg-green-600" : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selectedIndex ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}
