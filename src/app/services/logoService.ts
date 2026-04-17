/**
 * Logo Service
 * Fetches the website logo from the backend API
 */

// Get API base URL from environment variable
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface LogoResponse {
  success: boolean;
  data: {
    logoUrl: string;
    altText?: string;
    faviconUrl?: string;
    updatedAt?: string | null;
  } | null;
  message?: string;
}

export interface LogoSettings {
  logoUrl: string | null;
  altText: string;
  faviconUrl: string | null;
}

/**
 * Constructs the full image URL from a relative path
 * Handles various path formats from the backend API
 * CRITICAL: Prepends /uploads/ if path starts with /logo/ but not /uploads/logo/
 */
export const getLogoUrl = (logoPath: string | undefined | null): string | null => {
  if (!logoPath || logoPath.trim() === '') {
    return null;
  }

  const trimmedPath = logoPath.trim();

  // If already a full URL, return as-is
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath;
  }

  // If data URL, return as-is
  if (trimmedPath.startsWith('data:')) {
    return trimmedPath;
  }

  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  let path = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

  // If path starts with /logo/ or /favicon/ but not under /uploads/, prepend /uploads/
  if (
    (path.startsWith('/logo/') || path.startsWith('/favicon/')) &&
    !path.startsWith('/uploads/')
  ) {
    path = `/uploads${path}`;
  } else if (!path.startsWith('/uploads/')) {
    path = `/uploads${path}`;
  }

  const fullUrl = `${baseUrl}${path}`;
  return fullUrl;
};

/**
 * Fetches logo from the API
 * NO CACHING - Always fetches fresh data to reflect admin dashboard changes immediately
 * @returns Promise with logo data or null if not set/active/invalid
 */
export async function getLogo(): Promise<{ logoUrl: string; altText: string } | null> {
  try {
    // Try both endpoint patterns (some APIs use /api/get/, others use /get/)
    const endpoints = [
      `${API_BASE_URL}/get/logo/public`,
      `${API_BASE_URL}/api/get/logo/public`,
      `${API_BASE_URL}/get/logo`,
      `${API_BASE_URL}/api/get/logo`,
    ];

    // Try each endpoint until one succeeds
    for (const apiUrl of endpoints) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          if (response.status === 404) {
            continue; // Try next endpoint
          }
          continue; // Try next endpoint
        }

        const data: LogoResponse = await response.json();

        // Check if logo exists and is valid
        if (data.success && data.data && data.data.logoUrl && data.data.logoUrl.trim() !== '') {
          const fullUrl = getLogoUrl(data.data.logoUrl);
          if (fullUrl) {
            const altText = data.data.altText || 'Zextons';
            return { logoUrl: fullUrl, altText };
          }
        } else {
          return null;
        }
      } catch {
        continue; // Try next endpoint
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Public logo + favicon settings for metadata and branding.
 * Returns resolved URLs (or null) even when only one of logo/favicon is set.
 */
export async function getLogoSettingsPublic(): Promise<LogoSettings | null> {
  try {
    const endpoints = [
      `${API_BASE_URL}/get/logo/public`,
      `${API_BASE_URL}/api/get/logo/public`,
      `${API_BASE_URL}/get/logo`,
      `${API_BASE_URL}/api/get/logo`,
    ];

    for (const apiUrl of endpoints) {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        });

        if (!response.ok) continue;

        const data: LogoResponse = await response.json();
        if (!data.success || !data.data) continue;

        const logoPath = data.data.logoUrl?.trim();
        const faviconPath = data.data.faviconUrl?.trim();
        const logoUrl = logoPath ? getLogoUrl(logoPath) : null;
        const faviconUrl = faviconPath ? getLogoUrl(faviconPath) : null;

        return {
          logoUrl,
          altText: data.data.altText || 'Zextons',
          faviconUrl,
        };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}
