/**
 * Promotional Sections Service
 * Fetches Buy Now Pay Later, Sell/Buy Cards, and Tiny Phone Banner from the API
 */

import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
} from "@/app/lib/cmsTimedFetch";

const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return `${process.env.NEXT_PUBLIC_API_URL}`;
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface BuyNowPayLater {
  heading: string;
  paragraph: string;
  backgroundImage: string;
  paymentImages: string[];
}

export interface SellBuyCard {
  heading: string;
  paragraph: string;
  buttonName: string;
  buttonLink: string;
  backgroundImage: string;
  productImage?: string;
}

export interface SellBuyCards {
  sellCard: SellBuyCard;
  buyCard: SellBuyCard;
}

export interface TinyPhoneBanner {
  heading: string;
  paragraph: string;
  buttonName: string;
  buttonLink: string;
  backgroundImage: string;
  centerImage?: string;
  rightImage?: string;
}

/**
 * Builds full image URL from API path (prepends base URL, handles /uploads/)
 */
export const getPromoImageUrl = (
  imagePath: string | undefined | null
): string => {
  if (!imagePath || !imagePath.trim()) return "";
  const trimmed = imagePath.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  )
    return trimmed;
  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.startsWith("/uploads/")) {
    return `${baseUrl}${path}`;
  }
  return `${baseUrl}/uploads${path}`;
};

async function fetchSection<T>(path: string): Promise<T | null> {
  try {
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const response = await cmsTimedFetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      ...cmsPublicFetchInit(),
    });
    if (response.status === 404 || !response.ok) return null;
    const result = await response.json();
    if (result.success && result.data) return result.data as T;
    return null;
  } catch (err) {
    if (!isCmsFetchAbortError(err)) {
      console.error(`[Promo] Error fetching ${path}:`, err);
    }
    return null;
  }
}

export async function getBuyNowPayLater(): Promise<BuyNowPayLater | null> {
  return fetchSection<BuyNowPayLater>("/get/buy-now-pay-later/active");
}

export async function getSellBuyCards(): Promise<SellBuyCards | null> {
  return fetchSection<SellBuyCards>("/get/sell-buy-cards/active");
}

export async function getTinyPhoneBanner(): Promise<TinyPhoneBanner | null> {
  return fetchSection<TinyPhoneBanner>("/get/tiny-phone-banner/active");
}
