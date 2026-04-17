"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import BlogCard from "@/app/components/blogs/BlogCard";
import type { Blog } from "../../../../../../types";

export type BlogLatestBlogsWidgetProps = {
  sectionHeading?: string;
  maxPosts?: number;
  viewAllLabel?: string;
};

function clampMaxPosts(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 6;
  return Math.min(12, Math.max(6, x));
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

export default function BlogLatestBlogsWidget({
  sectionHeading = "Latest blogs",
  maxPosts = 6,
  viewAllLabel = "View all blogs",
}: BlogLatestBlogsWidgetProps) {
  const limit = useMemo(() => clampMaxPosts(maxPosts), [maxPosts]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = usePrefersReducedMotion();

  const emblaOptions = useMemo<EmblaOptionsType>(
    () => ({
      loop: blogs.length > 1,
      align: "start",
      axis: "x",
      duration: prefersReducedMotion ? 0 : 42,
      skipSnaps: false,
      dragFree: false,
      containScroll: "trimSnaps",
    }),
    [blogs.length, prefersReducedMotion]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/blogs/latest", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        const raw = Array.isArray(json?.data) ? json.data : [];
        if (!cancelled) {
          setBlogs(raw.slice(0, limit) as Blog[]);
        }
      } catch {
        if (!cancelled) setBlogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, blogs.length, prefersReducedMotion]);

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


  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const heading =
    (sectionHeading && String(sectionHeading).trim()) || "Latest blogs";

  if (loading) {
    return (
      <div
        className="my-8 rounded-lg border border-gray-100 bg-gray-50/80 p-6 animate-pulse"
        aria-busy="true"
      >
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="overflow-hidden">
          <div className="embla__container flex [-webkit-tap-highlight-color:transparent]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="embla__slide mr-3 min-w-0 shrink-0 flex-[0_0_calc((100%-0.75rem)/2)] sm:flex-[0_0_calc((100%-1rem)/2)] lg:flex-[0_0_calc((100%-3rem)/3)] px-1"
              >
                <div className="h-40 sm:h-64 bg-gray-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!blogs.length) return null;

  const multi = blogs.length > 1;

  return (
    <section className="my-8" aria-label={heading}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-primary">
          {heading}
        </h2>
        {multi ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              className="bg-primary rounded-full transition w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Previous blogs"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="bg-primary rounded-full transition w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Next blogs"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/40 py-2 shadow-sm">
        <div className="overflow-hidden px-1 sm:px-2" ref={emblaRef}>
          <div className="embla__container flex [-webkit-tap-highlight-color:transparent] [backface-visibility:hidden]">
            {blogs.map((blog) => (
              <BlogCard key={blog._id} {...blog} carouselSlide />
            ))}
          </div>
        </div>

        {multi ? (
          <div className="mt-3 flex justify-center gap-1.5 px-4 pb-2">
            {blogs.map((blog, i) => (
              <button
                type="button"
                key={blog._id}
                onClick={() => scrollTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ease-out ${
                  i === selectedIndex
                    ? "w-6 bg-primary"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to blog ${i + 1}`}
                aria-current={i === selectedIndex ? "true" : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      className="h-5 w-5 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === "left" ? "M15.75 19.5 8.25 12l7.5-7.5" : "m8.25 4.5 7.5 7.5-7.5 7.5"}
      />
    </svg>
  );
}
