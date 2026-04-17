import { cache } from "react";
import { cmsPublicFetchInit } from "@/app/lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "@/app/lib/cmsTimedFetch";

export type SiteScriptPlacement = "head" | "bodyStart" | "bodyEnd";

export type SiteScriptCustomPublic = {
  placement: SiteScriptPlacement;
  content: string;
};

export type SiteScriptsPublic = {
  semrushScript: string;
  ahrefsScript: string;
  googleSearchConsoleScript: string;
  customScripts: SiteScriptCustomPublic[];
};

function apiBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

export const getSiteScriptsPublic = cache(
  async (): Promise<SiteScriptsPublic | null> => {
    const base = apiBase();
    if (!base) return null;
    try {
      const res = await cmsTimedFetch(`${base}/site-scripts/public`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        ...cmsPublicFetchInit(),
      });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success || !json.data) return null;
      const d = json.data;
      return {
        semrushScript: d.semrushScript || "",
        ahrefsScript: d.ahrefsScript || "",
        googleSearchConsoleScript: d.googleSearchConsoleScript || "",
        customScripts: Array.isArray(d.customScripts) ? d.customScripts : [],
      } as SiteScriptsPublic;
    } catch (e) {
      console.warn("[site-scripts] Public fetch failed:", e);
      return null;
    }
  }
);

function concatCustomByPlacement(
  data: SiteScriptsPublic | null,
  placement: SiteScriptPlacement
): string {
  if (!data?.customScripts?.length) return "";
  return data.customScripts
    .filter((c) => c.placement === placement && String(c.content || "").trim())
    .map((c) => c.content.trim())
    .join("\n");
}

export function combineHeadScripts(data: SiteScriptsPublic | null): string {
  if (!data) return "";
  const customHead = concatCustomByPlacement(data, "head");
  return [
    data.semrushScript,
    data.ahrefsScript,
    data.googleSearchConsoleScript,
    customHead,
  ]
    .filter((s) => s && String(s).trim())
    .join("\n");
}

export function combineBodyStartScripts(data: SiteScriptsPublic | null): string {
  return concatCustomByPlacement(data, "bodyStart");
}

export function combineBodyEndScripts(data: SiteScriptsPublic | null): string {
  return concatCustomByPlacement(data, "bodyEnd");
}
