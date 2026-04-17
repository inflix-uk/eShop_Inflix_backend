"use client";

import { useRef } from "react";
import DynamicTrustpilotWidget from "@/app/components/DynamicTrustpilotWidget";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "./useBlogContentFullBleed";

/**
 * Block widget: paste Trustpilot embed HTML (must include an element with class `trustpilot-widget`).
 * Uses the same bootstrap + loadFromElement flow as homepage/product Trustpilot settings.
 */
export default function BlogTrustpilotEmbedWidget({
  embedScript,
}: {
  embedScript?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const s = embedScript?.trim();
  const bleed = useBlogContentFullBleed(rootRef, Boolean(s));

  if (!s) return null;

  return (
    <div
      ref={rootRef}
      className="relative my-8 min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50/80 py-3 shadow-sm sm:py-4"
      style={bleedStyle(bleed)}
    >
      <div className="px-3 sm:px-4">
        <DynamicTrustpilotWidget
          scriptHtml={s}
          className="trustpilot-block-widget w-full"
          loadingMinHeightPx={0}
        />
      </div>
    </div>
  );
}
