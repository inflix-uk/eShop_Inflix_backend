"use client";

import { useMemo, useRef } from "react";
import { getFullImageUrl } from "./blogUtils";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "./useBlogContentFullBleed";

type EmbedResult =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  | { kind: "file"; src: string }
  | null;

const YT_ID = /^[\w-]{11}$/;

function parseYouTubeId(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  const withProto = href.startsWith("http") ? href : `https://${href}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || "";
      return YT_ID.test(id) ? id : null;
    }
    if (!host.endsWith("youtube.com")) return null;
    if (u.pathname.startsWith("/embed/")) {
      const id = u.pathname.slice(7).split("/")[0];
      return YT_ID.test(id) ? id : null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.slice(8).split("/")[0];
      return YT_ID.test(id) ? id : null;
    }
    const v = u.searchParams.get("v");
    return v && YT_ID.test(v) ? v : null;
  } catch {
    return null;
  }
}

function parseVimeoId(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  const withProto = href.startsWith("http") ? href : `https://${href}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./, "");
    if (!host.endsWith("vimeo.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && /^\d+$/.test(parts[1] || "")) return parts[1];
    if (/^\d+$/.test(parts[0] || "")) return parts[0];
    return null;
  } catch {
    return null;
  }
}

function parseDirectVideo(raw: string): string | null {
  const t = raw.trim();
  if (!t || /^javascript:/i.test(t)) return null;
  if (t.startsWith("/") && !t.startsWith("//")) {
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(t)) return t;
    return null;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function resolveEmbed(videoUrl: string): EmbedResult {
  const yt = parseYouTubeId(videoUrl);
  if (yt) return { kind: "youtube", id: yt };
  const vm = parseVimeoId(videoUrl);
  if (vm) return { kind: "vimeo", id: vm };
  const direct = parseDirectVideo(videoUrl);
  if (direct) {
    const src =
      direct.startsWith("http://") || direct.startsWith("https://")
        ? direct
        : getFullImageUrl(direct.replace(/^\//, ""));
    if (src && !src.includes("placeholder")) return { kind: "file", src };
  }
  return null;
}

export default function BlogVideoWidget({
  videoUrl,
  heading,
  caption,
}: {
  videoUrl?: string;
  heading?: string;
  caption?: string;
}) {
  const embed = useMemo(
    () => resolveEmbed(String(videoUrl || "").trim()),
    [videoUrl]
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const bleed = useBlogContentFullBleed(rootRef, Boolean(embed));

  if (!embed) return null;

  return (
    <div
      ref={rootRef}
      className="relative my-8 min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 py-3 shadow-sm sm:py-4"
      style={bleedStyle(bleed)}
    >
      {heading?.trim() ? (
        <h3 className="mb-2 px-3 text-lg font-semibold text-gray-900 sm:mb-3 sm:px-4">
          {heading.trim()}
        </h3>
      ) : (
        <div className="mb-2 px-3 sm:mb-3 sm:px-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Video
          </span>
        </div>
      )}

      <div className="px-1 sm:px-2">
        <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
          {embed.kind === "youtube" ? (
            <iframe
              title={heading?.trim() || "YouTube video"}
              src={`https://www.youtube.com/embed/${embed.id}`}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : embed.kind === "vimeo" ? (
            <iframe
              title={heading?.trim() || "Vimeo video"}
              src={`https://player.vimeo.com/video/${embed.id}`}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <video
              className="absolute inset-0 h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
              src={embed.src}
            />
          )}
        </div>
      </div>

      {caption?.trim() ? (
        <p className="mt-3 px-3 text-sm text-gray-600 sm:px-4">{caption.trim()}</p>
      ) : null}
    </div>
  );
}
