"use client";

import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

/** Matches `id="blog-content"` in ClientBlogPage — widgets span this full width inside narrow block columns */
export const BLOG_CONTENT_ELEMENT_ID = "blog-content";

export type BlogContentBleedLayout = { width: number; marginLeft: number };

/**
 * Measures `#blog-content` and returns width + negative margin so a nested widget
 * can align to the article column’s full width.
 *
 * @param active Set false when the host returns null (no ref on DOM) so the effect
 *   can re-run once the widget actually mounts.
 */
export function useBlogContentFullBleed(
  ref: RefObject<HTMLElement | null>,
  active = true
): BlogContentBleedLayout | null {
  const [layout, setLayout] = useState<BlogContentBleedLayout | null>(null);

  useLayoutEffect(() => {
    if (!active) {
      setLayout(null);
      return;
    }

    const outer = ref.current;
    const article = document.getElementById(BLOG_CONTENT_ELEMENT_ID);
    if (!outer || !article) return;

    let raf = 0;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const ar = article.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        const offsetLeft = er.left - ar.left;
        const next: BlogContentBleedLayout = {
          width: ar.width,
          marginLeft: -offsetLeft,
        };
        setLayout((prev) =>
          prev &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.marginLeft - next.marginLeft) < 0.5
            ? prev
            : next
        );
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(article);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, active]);

  return layout;
}

export function bleedStyle(
  bleed: BlogContentBleedLayout | null
): CSSProperties {
  return bleed
    ? {
        position: "relative",
        width: bleed.width,
        maxWidth: bleed.width,
        marginLeft: bleed.marginLeft,
      }
    : { width: "100%" };
}
