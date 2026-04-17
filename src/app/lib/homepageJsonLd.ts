/**
 * Homepage JSON-LD from admin "Meta Schema" rows + server fallback.
 */

const SCHEMA_CONTEXT = "https://schema.org";

/** Strip optional <script type="application/ld+json">…</script> wrapper from pasted admin content */
function unwrapScriptWrapper(raw: string): string {
  const t = raw.trim();
  const typed = t.match(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (typed) return typed[1].trim();
  const any = t.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  if (any) return any[1].trim();
  return t;
}

/** Add @context (and @graph for bare arrays) so fragments like `{ "@type": "Organization", ... }` validate */
function ensureSchemaOrgContext(parsed: unknown): unknown {
  if (parsed === null || typeof parsed !== "object") return parsed;
  if (Array.isArray(parsed)) {
    return {
      "@context": SCHEMA_CONTEXT,
      "@graph": parsed,
    };
  }
  const o = parsed as Record<string, unknown>;
  if (!("@context" in o)) {
    return { "@context": SCHEMA_CONTEXT, ...o };
  }
  return parsed;
}

/**
 * Turn Homepage SEO "Meta Schema" rows into JSON-LD for <script type="application/ld+json">.
 * - Strips surrounding <script>…</script> if pasted from examples.
 * - Valid JSON object or array: adds @context / @graph when missing, then stringifies.
 * - Plain http(s) URL → minimal WebPage node.
 */
export function metaSchemaEntryToJsonLdString(raw: string): string | null {
  const unwrapped = unwrapScriptWrapper(raw);
  if (!unwrapped) return null;

  const first = unwrapped[0];
  if (first === "{" || first === "[") {
    try {
      const parsed = JSON.parse(unwrapped) as unknown;
      const withContext = ensureSchemaOrgContext(parsed);
      return JSON.stringify(withContext);
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(unwrapped)) {
    return JSON.stringify({
      "@context": SCHEMA_CONTEXT,
      "@type": "WebPage",
      url: unwrapped,
    });
  }

  return null;
}

/**
 * Fallback when admin Meta Schema has no valid entries.
 * WebSite only — root layout already injects Organization JSON-LD.
 */
export function getDefaultHomepageJsonLdString(): string {
  return JSON.stringify({
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    name: "Zextons Tech Store",
    url: "https://zextons.co.uk/",
    description:
      "Refurbished and new mobile phones in the UK. Shop with warranty and fast delivery.",
  });
}
