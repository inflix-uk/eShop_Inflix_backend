
import { useId } from "react";

/** Strip scripts and external stylesheets; keep fragment-only markup safe for innerHTML. */
function sanitizeHtmlFragment(html: string): string {
  let s = html ?? "";
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  s = s.replace(/<\/?script\b[^>]*>/gi, "");
  s = s.replace(/<link\b[^>]*>/gi, "");
  return s;
}

/**
 * Prevent `</style`-like sequences in admin CSS from closing the surrounding
 * &lt;style&gt; tag when emitted in HTML.
 */
function sanitizeCssForStyleElement(css: string): string {
  return String(css ?? "").replace(/<\/style/gi, "<\u200c/style");
}

export default function BlogHtmlCssWidget({
  html = "",
  css = "",
}: {
  html?: string;
  css?: string;
}) {
  const reactId = useId();
  const scopeToken =
    reactId.replace(/[^a-zA-Z0-9]/g, "") || "cmshtmlcss";

  const cleanHtml = sanitizeHtmlFragment(html);
  const hasHtml = cleanHtml.trim().length > 0;
  const rawCss = String(css ?? "");
  const hasCss = rawCss.trim().length > 0;

  if (!hasHtml && !hasCss) {
    return null;
  }

  const safeCss = sanitizeCssForStyleElement(rawCss);
  /** Limits admin rules to this subtree (evergreen browsers; same isolation idea as shadow DOM). */
  const scopedCss = hasCss
    ? `@scope ([data-cms-html-css="${scopeToken}"]) {\n${safeCss}\n}`
    : "";

  return (
    <div
      className="cms-html-css-widget w-full"
      data-widget="html-css"
      data-cms-html-css={scopeToken}
    >
      {hasCss ? (
        <style
          dangerouslySetInnerHTML={{
            __html: scopedCss,
          }}
        />
      ) : null}
      {hasHtml ? (
        <div
          className="prose prose-sm sm:prose-base max-w-none blog-content cms-html-css-widget-inner"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      ) : null}
    </div>
  );
}
