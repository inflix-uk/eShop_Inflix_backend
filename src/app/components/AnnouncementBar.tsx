"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import AnnouncementSocialRail from "@/app/components/AnnouncementSocialRail";
import type {
  AnnouncementBannerPublic,
  AnnouncementBarItemPublic,
  AnnouncementSocialLinkPublic,
} from "@/app/services/announcementBannerService";

const STORAGE_KEY = "zextons_announcement_dismissed_updated_at";

type Props = {
  initial: AnnouncementBannerPublic;
};

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) || /^mailto:/i.test(url);
}

function stripDismissible(items: AnnouncementBarItemPublic[]): boolean {
  if (!items.length) return true;
  return items.every((it) => it.dismissible !== false);
}

function shouldShow(data: AnnouncementBannerPublic): boolean {
  if (!data.enabled || !data.items.length) {
    return false;
  }
  if (!stripDismissible(data.items)) {
    return true;
  }
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && data.updatedAt && dismissed === data.updatedAt) {
      return false;
    }
  } catch {
    /* ignore */
  }
  return true;
}

function AnnouncementSlide({
  item,
  socialLinks,
  multi,
  onPrev,
}: {
  item: AnnouncementBarItemPublic;
  socialLinks: AnnouncementSocialLinkPublic[];
  multi: boolean;
  onPrev: () => void;
}) {
  const showLink =
    item.linkUrl &&
    item.linkLabel &&
    String(item.linkUrl).trim() &&
    String(item.linkLabel).trim();

  const linkEl = showLink ? (
    <>
      {isExternalUrl(item.linkUrl) ? (
        <a
          href={item.linkUrl}
          className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-90"
          target={/^https?:/i.test(item.linkUrl) ? "_blank" : undefined}
          rel={/^https?:/i.test(item.linkUrl) ? "noopener noreferrer" : undefined}
        >
          {item.linkLabel}
        </a>
      ) : (
        <Link
          href={item.linkUrl}
          className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-90"
        >
          {item.linkLabel}
        </Link>
      )}
    </>
  ) : null;

  const textEl = <span className="min-w-0">{item.message}</span>;

  return (
    <div
      className="flex min-w-0 flex-[0_0_100%] flex-row items-stretch"
      style={{
        backgroundColor: item.backgroundColor || "#0f172a",
        color: item.textColor || "#ffffff",
      }}
    >
      {multi ? (
        <div className="flex shrink-0 items-stretch border-r border-white/15">
          <button
            type="button"
            onClick={onPrev}
            className="flex items-center px-1.5 text-white/90 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/40 sm:px-2"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}

      <AnnouncementSocialRail links={socialLinks} embedded />

      <div className="flex min-w-0 flex-1 items-center px-3 py-2.5 sm:px-4">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-center gap-2 text-center text-sm sm:text-base sm:gap-3">
          <div
            className={`flex min-w-0 flex-1 flex-wrap items-center justify-center gap-2 sm:gap-3 ${
              item.ctaFirst ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {textEl}
            {linkEl}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementBar({ initial }: Props) {
  const [show, setShow] = useState(false);
  const items = initial.items ?? [];
  const socialLinks = initial.socialLinks ?? [];
  const multi = items.length > 1;
  const itemsRevKey = items
    .map(
      (i) =>
        `${i.id}:${i.message}:${i.dismissible}:${i.ctaFirst}:${i.linkUrl}:${i.linkLabel}:${i.backgroundColor}:${i.textColor}`
    )
    .join("|");
  const socialKey = socialLinks
    .map((s) => `${s.id}:${s.kind}:${s.url}:${s.customIcon}`)
    .join("|");
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: multi,
    align: "start",
    containScroll: multi ? false : "keepSnaps",
    skipSnaps: false,
    duration: 20,
  });

  useLayoutEffect(() => {
    setShow(shouldShow(initial));
  }, [initial.enabled, initial.updatedAt, itemsRevKey, socialKey]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit();
  }, [emblaApi, items.length, itemsRevKey, socialKey]);

  useEffect(() => {
    if (!emblaApi || !multi || !show) return;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, 6000);
    return () => window.clearInterval(id);
  }, [emblaApi, multi, show]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const dismiss = () => {
    if (!stripDismissible(items)) return;
    try {
      if (initial.updatedAt) {
        localStorage.setItem(STORAGE_KEY, initial.updatedAt);
      }
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  if (!show || !items.length) {
    return null;
  }

  const canDismiss = stripDismissible(items);

  return (
    <div
      role="region"
      aria-label="Site announcements"
      className="w-full shrink-0 border-b border-white/10"
    >
      <div className="relative min-w-0">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {items.map((item) => (
              <AnnouncementSlide
                key={item.id}
                item={item}
                socialLinks={socialLinks}
                multi={multi}
                onPrev={scrollPrev}
              />
            ))}
          </div>
        </div>

        {multi ? (
          <button
            type="button"
            onClick={scrollNext}
            className="absolute right-8 top-1/2 z-[1] -translate-y-1/2 rounded-md bg-black/25 p-1.5 text-white hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-white/50 sm:right-10"
            aria-label="Next announcement"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        ) : null}

        {canDismiss ? (
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 z-[2] rounded-md p-1 text-white/90 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Dismiss announcements"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
