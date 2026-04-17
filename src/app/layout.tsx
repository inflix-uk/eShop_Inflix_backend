// app/layout.tsx or app/RootLayout.tsx

import "./globals.css";
import type { Metadata, Viewport } from "next";
import StoreProvider from "@/app/StoreProvider";
import { AuthProvider } from "@/app/context/Auth";
import "react-toastify/dist/ReactToastify.css";
import Script from "next/script";
import DeferredGoogleTagManager from "@/app/components/analytics/DeferredGoogleTagManager";
import FacebookPixelBlock from "@/app/components/analytics/FacebookPixelBlock";
import SiteBrandColors from "@/app/components/SiteBrandColors";
import SiteThemeInlineStyles from "@/app/components/SiteThemeInlineStyles";
import SiteScriptsRaw from "@/app/components/SiteScriptsRaw";
import FooterShell from "@/app/components/footer/FooterShell";
import DeferredLayoutWidgets from "@/app/components/DeferredLayoutWidgets";
import AnnouncementBar from "@/app/components/AnnouncementBar";
import { getAnnouncementBannerPublic } from "@/app/services/announcementBannerService";
import { getSiteThemePublic } from "@/app/services/siteThemeService";
import { getGoogleVerificationCode } from "@/app/services/googleVerificationService";
import { extractGoogleSiteVerificationFromHtml } from "@/app/lib/extractGoogleVerificationFromHtml";
import {
  combineBodyEndScripts,
  combineBodyStartScripts,
  combineHeadScripts,
  getSiteScriptsPublic,
} from "@/app/services/siteScriptsService";
import { getLogoSettingsPublic } from "@/app/services/logoService";
import { getSiteWideSchemaPublic } from "@/app/services/siteWideSchemaService";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  let verificationCode: string | null = null;
  try {
    const siteScripts = await getSiteScriptsPublic();
    const fromSiteScriptsHtml = extractGoogleSiteVerificationFromHtml(
      siteScripts?.googleSearchConsoleScript
    );

    if (fromSiteScriptsHtml) {
      console.log(
        "[Layout] Google site verification will come from Site scripts (head HTML)"
      );
    } else {
      console.log(
        "[Layout] Fetching Google Search Console verification from legacy API…"
      );
      verificationCode = await getGoogleVerificationCode();
      if (verificationCode) {
        console.log(
          "[Layout] Verification code received, metadata.verification will be set"
        );
      } else {
        console.log(
          "[Layout] No verification code from legacy API or site scripts"
        );
      }
    }
  } catch (error) {
    console.error("[Layout] Error resolving Google verification:", error);
  }

  const siteBranding = await getLogoSettingsPublic();
  const faviconHref = siteBranding?.faviconUrl?.trim();
  const faviconIcons =
    faviconHref && faviconHref.length > 0
      ? {
          icons: {
            icon: [
              {
                url: faviconHref,
                type: faviconHref.toLowerCase().endsWith(".ico")
                  ? "image/x-icon"
                  : "image/png",
              },
            ],
            shortcut: faviconHref,
            apple: faviconHref,
          },
        }
      : {};

  const metadata: Metadata = {
    title: "Best Refurbished and New Mobile Phones - Zextons",
    description:
      "Zextons offers high-quality refurbished and new mobile phones at competitive prices. Shop now on eBay, Amazon, Back Market, or our own site!",
    keywords:
      "refurbished mobile phones, buy mobile phones, sell mobile phones, new phones, Zextons, eBay, Amazon, Back Market, mobile phone deals",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: "Buy Refurbished Mobile Phones in the UK | Zextons Tech Store",
      url: "https://zextons.co.uk/",
      description:
        "Zextons offers high-quality refurbished and new mobile phones at competitive prices. Shop now on eBay, Amazon, Back Market, or our own site!",
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: "Buy Refurbished Mobile Phones in the UK | Zextons Tech Store",
      description:
        "Zextons offers high-quality refurbished and new mobile phones at competitive prices. Shop now on eBay, Amazon, Back Market, or our own site!",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: "https://zextons.co.uk/",
      languages: { "en-gb": "https://zextons.co.uk/" },
    },
    // Skip metadata.verification when GSC meta is injected via Site scripts head HTML (avoids duplicate tags)
    ...(verificationCode && {
      verification: {
        google: verificationCode,
      },
    }),
    ...faviconIcons,
  };

  return metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [siteScripts, siteTheme, announcementBanner, siteWideSchemas] = await Promise.all([
    getSiteScriptsPublic(),
    getSiteThemePublic(),
    getAnnouncementBannerPublic(),
    getSiteWideSchemaPublic(),
  ]);
  const combinedHeadScripts = combineHeadScripts(siteScripts);
  const combinedBodyStart = combineBodyStartScripts(siteScripts);
  const combinedBodyEnd = combineBodyEndScripts(siteScripts);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="ahrefs-site-verification"
          content="e104a647a256b0215a2711b55f63420f2e8a84bf449ced9c3e942a98bccef408"
        />
        {/* Flaticon uicons for product features icons */}
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/2.6.0/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <FacebookPixelBlock />
        <DeferredGoogleTagManager />
        {/* Hardcoded Organization schema — kept as fallback reference
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Zextons",
              alternateName: "Zextons",
              url: "https://zextons.co.uk/",
              logo: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
            }),
          }}
        />
        */}
        {/* Dynamic site-wide schemas from admin panel */}
        {siteWideSchemas.map((jsonStr, i) => (
          <script
            key={`site-schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonStr }}
          />
        ))}
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="uvqeroCgZqjugCBgl++DGQ"
          strategy="lazyOnload"
        />
        <SiteScriptsRaw html={combinedHeadScripts} />
        {/* Microsoft Clarity Integration */}
        <Script
          id="microsoft-clarity-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);
                t.defer=true;
                t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];
                y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "ok17wd71hr");
            `,
          }}
        />
        {/* Klarna Web SDK */}
        <Script
          id="klarna-sdk"
          src="https://js.klarna.com/web-sdk/v1/klarna.js"
          data-environment="production"
          data-client-id="klarna_live_client_KVRVI2UlR2pJMWd6dko5OHBnZlNraSR4SSQhQjQ2IyosYjUyOWRmNTItNjQ5ZC00MjEwLTlmNmItNGVmN2ZiMDc5YmY3LDEsZlg3ZjJmeXRvL1NqR0lYemJteTZmZkFQT3pUY3NXQWNEZHd2LzRpenlKVT0"
          strategy="lazyOnload"
        />
        {/* PayPal SDK */}
        <Script
          id="paypal-sdk"
          src="https://www.paypal.com/sdk/js?client-id=Aft9jSD19fVZmU7VJd1je7hCfZ-JyG6WDhqCpJsCENqXlQuRpZYyJYqc7zP20_U0H_vB0NK_ZU407K3F&currency=GBP&components=messages"
          data-namespace="PayPalSDK"
          strategy="lazyOnload"
        />
        <SiteThemeInlineStyles theme={siteTheme} />
      </head>

      <body
        className="bg-white font-sans antialiased"
        suppressHydrationWarning
      >
        <SiteScriptsRaw html={combinedBodyStart} />
        <StoreProvider>
          <AuthProvider>
            <SiteBrandColors />
            <AnnouncementBar initial={announcementBanner} />
            {children}
            <FooterShell />
            <DeferredLayoutWidgets />
          </AuthProvider>
        </StoreProvider>
        <SiteScriptsRaw html={combinedBodyEnd} />
      </body>
    </html>
  );
}
