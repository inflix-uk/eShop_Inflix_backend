import { siteThemeRootStyleCss, type SiteThemeResolved } from "@/app/lib/siteThemeUtils";

/** Injects `:root` variables after `globals.css` so first paint uses DB theme. */
export default function SiteThemeInlineStyles({
  theme,
}: {
  theme: SiteThemeResolved;
}) {
  return (
    <style
      id="site-theme-root-vars"
      dangerouslySetInnerHTML={{ __html: siteThemeRootStyleCss(theme) }}
    />
  );
}
