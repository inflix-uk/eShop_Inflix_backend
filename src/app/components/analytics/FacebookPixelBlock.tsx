import Script from "next/script";

/**
 * When true, Meta/Facebook Pixel will not load even if GTM injects the tag:
 * the official bootstrap does `if (f.fbq) return` before fetching fbevents.js.
 * Set to false (or remove this component) to re-enable pixel.
 */
export const TEMPORARILY_BLOCK_FACEBOOK_PIXEL = true;

/**
 * Optional override without a code change: set NEXT_PUBLIC_ENABLE_FACEBOOK_PIXEL=true
 * in env to force pixel on even while TEMPORARILY_BLOCK_FACEBOOK_PIXEL is true.
 */
function shouldBlock(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_PIXEL === "true") {
    return false;
  }
  return TEMPORARILY_BLOCK_FACEBOOK_PIXEL;
}

export default function FacebookPixelBlock() {
  if (!shouldBlock()) return null;

  return (
    <Script
      id="fb-pixel-stub"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(w){var n=function(){};n.queue=[];n.loaded=!0;n.version="2.0";n.callMethod=n.push=function(){};w.fbq=n;w._fbq=n}(window);`,
      }}
    />
  );
}
