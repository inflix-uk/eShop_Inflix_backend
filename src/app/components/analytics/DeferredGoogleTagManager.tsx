"use client";

import Script from "next/script";

const GTM_ID = "GTM-P938DWL3";

/**
 * GTM after browser idle (lazyOnload) to cut main-thread JS during TBT/Lighthouse.
 * Replaces @next/third-parties default, which loads sooner.
 */
export default function DeferredGoogleTagManager() {
  return (
    <>
      <Script
        id="_next-gtm-init"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `(function(w,l){w[l]=w[l]||[];w[l].push({'gtm.start':Date.now(),event:'gtm.js'});})(window,'dataLayer');`,
        }}
      />
      <Script
        id="_next-gtm"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`}
      />
    </>
  );
}
