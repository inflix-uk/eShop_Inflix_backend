/**
 * Homepage Features Service
 * Fetches the homepage features section from the backend API
 */

import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

// Get API base URL from environment variable
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn(
      "NEXT_PUBLIC_API_URL is not set in environment variables. Using default."
    );
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface HomepageFeature {
  _id: string;
  title: string;
  subtitle: string;
  iconImage?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface HomepageFeaturesResponse {
  success: boolean;
  data: HomepageFeature[] | null;
  message?: string;
}

/**
 * Constructs the full image URL from a relative path for feature icons.
 * Handles various path formats from the backend API.
 * CRITICAL: Prepends /uploads/ if path starts with /homepage-features/ but not /uploads/
 */
export const getFeatureImageUrl = (
  imagePath: string | undefined | null
): string | null => {
  if (!imagePath || imagePath.trim() === "") {
    return null;
  }

  const trimmedPath = imagePath.trim();

  // If already a full URL, return as-is
  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://")
  ) {
    return trimmedPath;
  }

  // If data URL, return as-is
  if (trimmedPath.startsWith("data:")) {
    return trimmedPath;
  }

  const baseUrl = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  let path = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

  // CRITICAL: If path starts with /homepage-features/ but not /uploads/homepage-features/, prepend /uploads/
  if (
    path.startsWith("/homepage-features/") &&
    !path.startsWith("/uploads/homepage-features/")
  ) {
    path = `/uploads${path}`;
  }
  // If path doesn't start with /uploads/ at all, prepend it
  else if (!path.startsWith("/uploads/")) {
    path = `/uploads${path}`;
  }

  return `${baseUrl}${path}`;
};

/**
 * Fetches homepage features from the API.
 * NO CACHING - Always fetches fresh data to reflect admin dashboard changes.
 * @returns Promise with array of active features sorted by order, or [] on error
 */
export async function getHomepageFeatures(): Promise<HomepageFeature[]> {
  try {
    const endpoints = [
      `${API_BASE_URL}/get/homepage-features/active`,
      `${API_BASE_URL}/api/get/homepage-features/active`,
      `${API_BASE_URL}/get/homepage-features`,
      `${API_BASE_URL}/api/get/homepage-features`,
    ];

    let lastError: Error | null = null;

    for (const apiUrl of endpoints) {
      try {
        const response = await cmsTimedFetch(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          ...cmsPublicFetchInit(),
        });

        if (!response.ok) {
          if (response.status === 404) {
            lastError = new Error(`Endpoint returned 404: ${apiUrl}`);
            continue;
          }
          lastError = new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
          continue;
        }

        const data: HomepageFeaturesResponse = await response.json();

        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          // Filter active only and sort by order
          const features = data.data
            .filter((f) => f.isActive !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          return features;
        }

        return [];
      } catch (fetchError) {
        lastError =
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError));
        continue;
      }
    }

    if (lastError) {
      console.warn("[HomepageFeatures] All endpoints failed:", lastError.message);
    }
    return [];
  } catch (error) {
    console.error("[HomepageFeatures] Error fetching features:", error);
    return [];
  }
}
