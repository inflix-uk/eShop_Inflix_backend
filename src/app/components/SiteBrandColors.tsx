"use client";

import { useEffect } from "react";
import { resolveSiteTheme } from "@/app/lib/siteThemeUtils";

/**
 * Re-applies theme after client navigation / when API may have updated.
 * First paint is handled by `SiteThemeInlineStyles` in root layout.
 */
export default function SiteBrandColors() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/site-theme", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled || !json?.success || !json?.data) return;

        const t = resolveSiteTheme(
          String(json.data.primaryColor ?? ""),
          String(json.data.secondaryColor ?? "")
        );

        const root = document.documentElement;
        root.style.setProperty("--primary", t.primaryColor);
        root.style.setProperty("--secondary", t.secondaryColor);
        root.style.setProperty("--primary-rgb", t.primaryRgb);
        root.style.setProperty("--secondary-rgb", t.secondaryRgb);
      } catch {
        /* defaults from globals.css + layout inline theme */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
