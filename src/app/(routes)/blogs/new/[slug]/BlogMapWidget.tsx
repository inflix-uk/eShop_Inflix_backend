"use client";

import { useMemo, useRef } from "react";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "./useBlogContentFullBleed";

const MIN_H = 260;
const MAX_H = 900;

function sanitizeGoogleMapsEmbedUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  try {
    const u = new URL(s);

    if (u.protocol !== "https:") return null;

    const host = u.hostname.toLowerCase();
    if (!host.includes("google.")) return null;

    if (!u.pathname.includes("/maps/embed")) return null;

    return u.toString();
  } catch {
    return null;
  }
}

function clampHeight(n?: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 500;
  return Math.min(MAX_H, Math.max(MIN_H, Math.round(v)));
}

export default function BlogMapWidget({
  embedUrl,
  heading,
  heightPx,
}: {
  embedUrl?: string;
  heading?: string;
  heightPx?: number;
}) {
  const safeSrc = useMemo(
    () => sanitizeGoogleMapsEmbedUrl(String(embedUrl || "")),
    [embedUrl]
  );

  const h = clampHeight(heightPx);
  const rootRef = useRef<HTMLDivElement>(null);
  const bleed = useBlogContentFullBleed(rootRef, Boolean(safeSrc));

  if (!safeSrc) return null;

  return (
    <div
      ref={rootRef}
      className="my-8 min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 py-3 shadow-sm sm:py-4"
      style={bleedStyle(bleed)}
    >
      {heading?.trim() ? (
        <h3 className="px-3 text-lg font-semibold text-gray-900 sm:px-4">
          {heading.trim()}
        </h3>
      ) : (
        <div className="px-3 sm:px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Map
          </span>
        </div>
      )}

      <div
        className="relative mt-2 w-full border-t border-gray-200 bg-gray-100 px-1 sm:mt-3 sm:px-2"
        style={{
          height: h,
          minHeight: MIN_H,
          maxHeight: "min(75vh, 900px)",
        }}
      >
        <iframe
          title={heading?.trim() || "Google Map"}
          src={safeSrc}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
