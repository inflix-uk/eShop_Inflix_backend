/**
 * Category Cards Service
 * Fetches category cards from the backend API
 */

import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface CategoryCard {
  _id: string;
  categoryName: string;
  shopNowLink: string;
  itemCount?: number;
  categoryNameColor?: string;
  itemCountColor?: string;
  overlayColor?: string;
  backgroundImage: string;
  categoryImage: string;
  order: number;
  isActive: boolean;
}

export interface CategoryCardsSectionSettings {
  headingText: string;
  headingColor: string;
  dividerColor: string;
  sectionBackgroundColor: string;
}

export interface CategoryCardsResponse {
  success: boolean;
  data: CategoryCard[] | null;
  message?: string;
}

export interface CategoryCardsSectionResponse {
  success: boolean;
  data: CategoryCardsSectionSettings | null;
  message?: string;
}

/**
 * Constructs the full image URL from a relative path.
 * Prepends API base URL if path doesn't start with http/https.
 */
export const getCategoryCardImageUrl = (
  imagePath: string | undefined | null
): string => {
  if (!imagePath || imagePath.trim() === "") {
    return "";
  }
  const trimmed = imagePath.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.startsWith("/category-cards/") && !path.startsWith("/uploads/")) {
    return `${baseUrl}/uploads${path}`;
  }
  if (!path.startsWith("/uploads/")) {
    return `${baseUrl}/uploads${path}`;
  }
  return `${baseUrl}${path}`;
};

/**
 * Fetches active category cards from the API (no caching).
 */
export async function getCategoryCards(): Promise<CategoryCard[]> {
  try {
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const url = `${baseUrl}/get/category-cards/active`;
    console.log("[CategoryCards] Request URL:", url);
    const response = await cmsTimedFetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...cmsPublicFetchInit(),
    });
    console.log("[CategoryCards] Response status:", response.status, response.statusText);
    if (!response.ok) {
      console.warn("[CategoryCards] Fetch failed:", response.status);
      return [];
    }
    const data: CategoryCardsResponse = await response.json();
    if (!data.success || !Array.isArray(data.data)) {
      console.warn("[CategoryCards] Unexpected response structure:", data);
      return [];
    }
    if (data.data.length === 0) {
      console.log("[CategoryCards] API returned empty data array");
      return [];
    }
    return data.data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error("[CategoryCards] Error fetching category cards:", error);
    return [];
  }
}

const DEFAULT_SECTION: CategoryCardsSectionSettings = {
  headingText: "Popular Categories",
  headingColor: "var(--secondary)",
  dividerColor: "#000000",
  sectionBackgroundColor: "",
};

export async function getCategoryCardsSectionSettings(): Promise<CategoryCardsSectionSettings> {
  try {
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const url = `${baseUrl}/get/category-cards/section-settings`;
    const response = await cmsTimedFetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...cmsPublicFetchInit(),
    });
    if (!response.ok) {
      return { ...DEFAULT_SECTION };
    }
    const json: CategoryCardsSectionResponse = await response.json();
    if (!json.success || !json.data) {
      return { ...DEFAULT_SECTION };
    }
    return { ...DEFAULT_SECTION, ...json.data };
  } catch {
    return { ...DEFAULT_SECTION };
  }
}
