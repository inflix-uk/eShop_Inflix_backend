import parse from "html-react-parser";

type Props = { html: string };

/**
 * Renders trusted admin-provided HTML (Semrush / Ahrefs / GSC / custom).
 */
export default function SiteScriptsRaw({ html }: Props) {
  if (!html?.trim()) return null;
  return <>{parse(html.trim())}</>;
}
