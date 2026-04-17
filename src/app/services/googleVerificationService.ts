/**
 * Google Search Console Verification Service
 * Fetches the verification code from the backend API
 */

import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

// Get API base URL from environment variable
const getApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    console.warn('NEXT_PUBLIC_API_URL is not set in environment variables. Using default.');
    return `${process.env.NEXT_PUBLIC_API_URL}`;
  }
  return apiUrl;
};

const API_BASE_URL = getApiBaseUrl();

export interface GoogleVerificationResponse {
  success: boolean;
  data: {
    verificationCode: string;
    isActive: boolean;
  } | null;
  message?: string;
}

/**
 * Fetches Google Search Console verification code from the API
 * NO CACHING - Always fetches fresh data to reflect admin dashboard changes immediately
 * @returns Promise with verification code or null if not set/active/invalid
 */
export async function getGoogleVerificationCode(): Promise<string | null> {
  try {
    // Use the correct endpoint pattern
    const endpoints = [
      `${API_BASE_URL}/get/google-search-console-verification`,
    ];
    
    let lastError: Error | null = null;
    
    // Try each endpoint until one succeeds
    for (const apiUrl of endpoints) {
      try {
        console.log('[GoogleVerification] Fetching from API:', apiUrl);
        console.log('[GoogleVerification] API Base URL:', API_BASE_URL);
        
        const response = await cmsTimedFetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // NO CACHING - Always fetch fresh data
          cache: 'no-store',
        });

        console.log('[GoogleVerification] Response status:', response.status, response.statusText);

        if (!response.ok) {
          // If 404, try next endpoint; otherwise log and continue
          if (response.status === 404) {
            console.log(`[GoogleVerification] Endpoint not found (404), trying alternative...`);
            lastError = new Error(`Endpoint returned 404: ${apiUrl}`);
            continue; // Try next endpoint
          }
          
          console.warn(
            `[GoogleVerification] Failed to fetch verification code: ${response.status} ${response.statusText}`
          );
          console.warn('[GoogleVerification] API endpoint may require authentication or have different path');
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          continue; // Try next endpoint
        }

        const data: GoogleVerificationResponse = await response.json();
        console.log('[GoogleVerification] API Response:', JSON.stringify(data, null, 2));

        // STRICT VALIDATION: Only return code if ALL conditions are met
        if (
          data.success &&
          data.data &&
          data.data.verificationCode &&
          data.data.verificationCode.trim() !== '' &&
          data.data.isActive === true
        ) {
          const code = data.data.verificationCode.trim();
          console.log('[GoogleVerification] ✅ Successfully fetched active verification code:', code);
          console.log('[GoogleVerification] Meta tag will be added to HTML head');
          return code;
        }

        // If data is null or inactive, don't add meta tag
        if (data.success && (!data.data || !data.data.isActive)) {
          console.log('[GoogleVerification] ⚠️ No active verification code set in backend');
          console.log('[GoogleVerification] Meta tag will NOT be added (code is null or inactive)');
          return null;
        }

        console.warn('[GoogleVerification] ❌ Invalid response format or inactive code');
        console.warn('[GoogleVerification] Response data:', data);
        console.warn('[GoogleVerification] Meta tag will NOT be added');
        return null;
      } catch (fetchError) {
        // Network error or JSON parse error for this endpoint
        console.warn(`[GoogleVerification] Error with endpoint ${apiUrl}:`, fetchError);
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        continue; // Try next endpoint
      }
    }
    
    // If we get here, all endpoints failed
    console.error('[GoogleVerification] ❌ All API endpoints failed');
    if (lastError) {
      console.error('[GoogleVerification] Last error:', lastError.message);
    }
    console.warn('[GoogleVerification] Meta tag will NOT be added (all API calls failed)');
    return null;
  } catch (error) {
    console.error('[GoogleVerification] ❌ Unexpected error fetching verification code:', error);
    console.error('[GoogleVerification] Error details:', error instanceof Error ? error.message : String(error));
    console.warn('[GoogleVerification] Meta tag will NOT be added (unexpected error)');
    // Don't throw - gracefully handle errors, don't add meta tag
    return null;
  }
}
