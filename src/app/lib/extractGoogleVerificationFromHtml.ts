/**
 * Pull google-site-verification content from pasted HTML (Search Console).
 */
export function extractGoogleSiteVerificationFromHtml(
  html: string | null | undefined
): string | null {
  if (!html?.trim()) return null;
  const s = html.trim();
  const re1 =
    /name\s*=\s*["']google-site-verification["'][^>]*\scontent\s*=\s*["']([^"']+)["']/i;
  const re2 =
    /content\s*=\s*["']([^"']+)["'][^>]*\sname\s*=\s*["']google-site-verification["']/i;
  const m = s.match(re1) || s.match(re2);
  const code = m?.[1]?.trim();
  return code || null;
}
