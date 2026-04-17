"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import SwiperComponent from "@/app/components/SwiperComponent";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import type { Product } from "../../../types";
import {
  getHomepageImageUrl,
  type ProductSliderBlockContent,
} from "@/app/services/homepageDataService";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "@/app/(routes)/blogs/new/[slug]/useBlogContentFullBleed";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";

const LATEST_SLIDER_COUNT = 6;

function normalizeProductThumb(p: Product): Product {
  const thumb = p.thumbnail_image;
  if (!thumb) return p;
  const raw = (thumb as { url?: string; path?: string }).url || (thumb as { path?: string }).path;
  if (!raw) return p;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return p;
  return {
    ...p,
    thumbnail_image: {
      ...thumb,
      url: getHomepageImageUrl(raw),
    },
  };
}

function thumbnailPathFromAggregate(thumb: unknown): string {
  if (!thumb) return "";
  if (typeof thumb === "string") return thumb;
  if (typeof thumb === "object" && thumb !== null) {
    const o = thumb as Record<string, string>;
    return o.url || o.path || "";
  }
  return "";
}

/** Map `/get/latest/products/homepage` aggregate docs to `Product` for cards. */
function mapHomepageAggregateToProduct(p: Record<string, unknown>): Product {
  const id = String(p._id ?? "");
  const minP = Number(p.minPrice);
  const minS = Number(p.minSalePrice);
  const safeMin = Number.isFinite(minP) && minP > 0 ? minP : 1;
  const safeSale = Number.isFinite(minS) && minS >= 0 ? minS : safeMin;
  const totalStock = Number(p.totalStock);
  const hasStock = Number.isFinite(totalStock) ? totalStock > 0 : true;
  const path = thumbnailPathFromAggregate(p.thumbnail_image);

  return {
    _id: id,
    name: String(p.name ?? ""),
    category: String(p.category ?? ""),
    subCategory: String(p.subCategory ?? ""),
    brand: p.brand != null ? String(p.brand) : undefined,
    condition: String(p.condition ?? "Refurbished"),
    is_featured: Boolean(p.is_featured),
    thumbnail_image: {
      filename: "",
      path,
      url: path && path.startsWith("http") ? path : undefined,
    },
    createdAt: String(p.createdAt ?? ""),
    updatedAt: String(p.updatedAt ?? ""),
    producturl: String(p.producturl ?? ""),
    minPrice: safeMin,
    minSalePrice: safeSale,
    averageRating:
      typeof p.averageRating === "number" && Number.isFinite(p.averageRating)
        ? p.averageRating
        : null,
    hasStock,
  };
}

export default function ContentProductSlider({
  content,
}: {
  content: ProductSliderBlockContent;
}) {
  const isLatest = content.productSource === "latest";
  const ids = useMemo(
    () => (content.productIds || []).map(String).filter(Boolean),
    [content.productIds]
  );
  const title =
    (content.sectionTitle && String(content.sectionTitle).trim()) || "Products";

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(() => isLatest || ids.length > 0);

  const rootRef = useRef<HTMLDivElement>(null);
  const bleedActive = (isLatest || ids.length > 0) && (loading || items.length > 0);
  const bleed = useBlogContentFullBleed(rootRef, bleedActive);

  const fetchProducts = useCallback(async () => {
    if (!API_URL) {
      setItems([]);
      setLoading(false);
      return;
    }

    if (isLatest) {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/get/latest/products/homepage`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        const raw: Record<string, unknown>[] = Array.isArray(data.products)
          ? data.products
          : [];
        const sliced = raw.slice(0, LATEST_SLIDER_COUNT);
        setItems(
          sliced.map((p) => normalizeProductThumb(mapHomepageAggregateToProduct(p)))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qs = encodeURIComponent(ids.join(","));
      const res = await fetch(`${API_URL}/get/products/by-ids/public?ids=${qs}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const raw: Product[] = Array.isArray(data.products) ? data.products : [];
      setItems(raw.map(normalizeProductThumb));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [isLatest, ids.join(",")]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (!isLatest && ids.length === 0) {
    return null;
  }

  if (loading && items.length === 0) {
    return (
      <div
        ref={rootRef}
        className="w-full min-w-0 max-w-full"
        style={bleedStyle(bleed)}
      >
        <div className="py-8 text-center text-sm text-gray-500" aria-live="polite">
          Loading products…
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="w-full min-w-0 max-w-full"
      style={bleedStyle(bleed)}
    >
      <SwiperComponent
        title={title}
        items={items}
        renderCard={(product) => (
          <ProductCardWithStock product={product} checkStockRealTime={true} />
        )}
        linkText="View All"
      />
    </div>
  );
}
