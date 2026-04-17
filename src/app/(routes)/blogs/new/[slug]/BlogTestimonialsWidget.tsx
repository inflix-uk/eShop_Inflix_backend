"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

export type TestimonialItem = {
  id?: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  /** 0–5 */
  rating?: number;
  avatarUrl?: string;
};

/** Gap between cards (must match `gap-3` on scroller = 0.75rem) */
const CARD_GAP_PX = 12;
/** Auto-advance: next slide on an infinite loop (ms) */
const AUTO_SLIDE_MS = 6000;

function scrollLeftForSlideIndex(scroller: HTMLDivElement, index: number): number {
  const articles = scroller.querySelectorAll("article");
  if (index <= 0 || articles.length === 0) return 0;

  let left = 0;
  const stop = Math.min(index, articles.length);
  for (let i = 0; i < stop; i++) {
    left += (articles[i] as HTMLElement).offsetWidth + CARD_GAP_PX;
  }
  const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  return Math.min(left, max);
}

function nearestSlideIndex(scroller: HTMLDivElement, listLen: number): number {
  const articles = scroller.querySelectorAll("article");
  if (articles.length === 0) return 0;

  const sl = scroller.scrollLeft;
  let best = 0;
  let bestDist = Infinity;

  for (let i = 0; i < Math.min(listLen, articles.length); i++) {
    const target = scrollLeftForSlideIndex(scroller, i);
    const dist = Math.abs(target - sl);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }

  return best;
}

function clampRating(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

function StarRow({ rating }: { rating: number }) {
  if (rating <= 0) return null;
  return (
    <div className="mb-3 flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem] ${
            i < rating ? "fill-primary text-primary" : "fill-gray-200 text-gray-200"
          }`}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

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

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
      />
    </svg>
  );
}

export default function BlogTestimonialsWidget({
  items,
  heading,
  description,
  resolveImageUrl,
}: {
  items: TestimonialItem[];
  heading?: string;
  /** Optional intro under the section heading */
  description?: string;
  resolveImageUrl: (path: string | undefined) => string;
}) {
  const list = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (it) => it?.quote && String(it.quote).trim().length > 0
      ),
    [items]
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const scrollToIndex = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el || list.length === 0) return;

      const idx = Math.max(0, Math.min(i, list.length - 1));
      activeIndexRef.current = idx;
      setActiveIndex(idx);

      el.scrollTo({
        left: scrollLeftForSlideIndex(el, idx),
        behavior: "smooth",
      });
    },
    [list.length]
  );

  const scrollPrev = useCallback(() => {
    scrollToIndex((activeIndex - 1 + list.length) % list.length);
  }, [activeIndex, list.length, scrollToIndex]);

  const scrollNext = useCallback(() => {
    scrollToIndex((activeIndex + 1) % list.length);
  }, [activeIndex, list.length, scrollToIndex]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || list.length === 0) return;

    const onScroll = () => {
      const next = nearestSlideIndex(el, list.length);
      activeIndexRef.current = next;
      setActiveIndex(next);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [list.length]);

  /** Infinite auto-advance (always “next”, wraps last → first) */
  useEffect(() => {
    if (list.length <= 1 || hoverPaused || prefersReducedMotion) return;

    const tick = () => {
      const el = scrollerRef.current;
      if (!el || list.length === 0) return;
      const next = (activeIndexRef.current + 1) % list.length;
      activeIndexRef.current = next;
      setActiveIndex(next);
      el.scrollTo({
        left: scrollLeftForSlideIndex(el, next),
        behavior: "smooth",
      });
    };

    const id = window.setInterval(tick, AUTO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [list.length, hoverPaused, prefersReducedMotion]);

  if (list.length === 0) return null;

  const showHeading = Boolean(heading?.trim());
  const descTrim = description?.trim() ?? "";
  const showDescription = Boolean(descTrim);
  const multi = list.length > 1;

  return (
    <section
      className="relative w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-green-100 bg-gradient-to-b from-green-50/90 to-white py-6 shadow-sm sm:py-8"
      aria-label={showHeading ? heading!.trim() : "Testimonials"}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div className="mb-4 flex flex-col gap-3 px-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          {showHeading ? (
            <h2 className="text-xl font-semibold text-primary sm:text-2xl">{heading!.trim()}</h2>
          ) : (
            <span className="sr-only">Testimonials</span>
          )}
          {showDescription ? (
            <p className="max-w-3xl text-sm leading-relaxed text-gray-600 sm:text-base">{descTrim}</p>
          ) : null}
        </div>

        {multi ? (
          <div className="flex shrink-0 justify-center gap-2 sm:justify-end sm:pt-0.5">
            <button
              type="button"
              onClick={scrollPrev}
              className="rounded-full border border-green-200 bg-white p-2 text-green-800 shadow-sm transition hover:bg-green-50"
              aria-label="Previous testimonial"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="rounded-full border border-green-200 bg-white p-2 text-green-800 shadow-sm transition hover:bg-green-50"
              aria-label="Next testimonial"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="px-4 sm:px-6">
        <div
          ref={scrollerRef}
          className="embla__container flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((item, index) => {
            const rating = clampRating(item.rating);
            const avatarSrc = resolveImageUrl(item.avatarUrl);
            const hasAvatar = Boolean(avatarSrc);

            return (
              <article
                key={item.id || `tm-${index}`}
                className="snap-start flex w-full shrink-0 basis-full justify-center px-1 sm:basis-[calc((100%-0.75rem)/2)] sm:px-2"
              >
                <div className="w-full overflow-hidden rounded-xl border border-green-100/80 bg-white/95 p-5 shadow-sm ring-1 ring-green-50 sm:p-6">
                  <StarRow rating={rating} />
                  <blockquote className="flex-1 border-l-4 border-green-200 pl-4 text-base italic leading-relaxed text-gray-700 sm:text-lg">
                    <p className="not-italic text-gray-700">{item.quote!.trim()}</p>
                  </blockquote>
                  <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                    {hasAvatar ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-2 ring-white shadow-sm">
                        <Image
                          src={avatarSrc}
                          alt={
                            item.authorName?.trim()
                              ? `${item.authorName.trim()} avatar`
                              : "Customer avatar"
                          }
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized={avatarSrc.startsWith("http://localhost")}
                        />
                      </div>
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800"
                        aria-hidden
                      >
                        {(item.authorName?.trim() || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      {item.authorName?.trim() ? (
                        <p className="font-semibold text-gray-900">{item.authorName.trim()}</p>
                      ) : null}
                      {item.authorRole?.trim() ? (
                        <p className="text-sm text-gray-600">{item.authorRole.trim()}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {multi ? (
        <div className="mt-3 flex justify-center gap-1.5 px-4 sm:px-6">
          {list.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-primary" : "w-2 bg-green-200"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
