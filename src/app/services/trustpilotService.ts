import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import {
  cmsTimedFetch,
  isCmsFetchAbortError,
} from "@/app/lib/cmsTimedFetch";

export interface TrustpilotSettings {
  productPageTopScript: string;
  productPageScript: string;
  homePageScript: string;
}

export const getTrustpilotSettings = async (): Promise<TrustpilotSettings | null> => {
  try {
    const response = await cmsTimedFetch(`${process.env.NEXT_PUBLIC_API_URL}/trustpilot/public`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...cmsPublicFetchInit(),
    });

    if (!response.ok) {
      console.error('Failed to fetch Trustpilot settings');
      return null;
    }

    const result = await response.json();
    return result.data || null;
  } catch (error) {
    if (isCmsFetchAbortError(error)) {
      return null;
    }
    console.error("Error fetching Trustpilot settings:", error);
    return null;
  }
};
