"use client";

import HeroSlider2, {
  type InlineBannerBlockPayload,
} from "@/app/components/HeroSlider2";

type Props = {
  items?: InlineBannerBlockPayload[];
};

/**
 * Renders banner slides stored in the page block (created in the admin block editor).
 */
export default function BlogSiteBannersWidget({ items = [] }: Props) {
  if (!items.length) return null;

  return (
    <div className="w-full max-w-full">
      <HeroSlider2 inlineBanners={items} embedded />
    </div>
  );
}
