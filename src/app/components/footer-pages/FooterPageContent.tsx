"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CmsWidgetAndProductBlock } from "@/app/components/cms/CmsWidgetAndProductBlock";
import type { ContentBlock } from "@/app/services/homepageDataService";
import { getImageUrl, type FooterPage } from "@/app/services/footerPageService";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
  getSiteWidgetSettingsPublic,
  type SiteWidgetVisibility,
} from "@/app/services/siteWidgetSettingsService";

/**
 * Renders a text block with HTML content
 */
function TextBlock({ content }: { content: string }) {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:text-primary prose-a:text-primary prose-strong:text-gray-900"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

/**
 * Renders an image block with optional heading and external link
 */
function ImageBlock({
  block,
}: {
  block: {
    content: {
      url?: string;
      alt?: string;
      heading?: string;
      externalLink?: string;
    };
  };
}) {
  const imageUrl = getImageUrl(block.content.url);
  const hasLink = block.content.externalLink;

  const imageElement = (
    <div className="my-6">
      {block.content.heading && (
        <h3 className="text-xl font-semibold mb-3 text-gray-900">
          {block.content.heading}
        </h3>
      )}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={block.content.alt || block.content.heading || "Image"}
          width={1200}
          height={600}
          className="w-full h-auto rounded-lg shadow-md"
          unoptimized={true}
        />
      ) : (
        <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-500">Image not available</span>
        </div>
      )}
    </div>
  );

  if (hasLink) {
    return (
      <a
        href={hasLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-90 transition-opacity"
      >
        {imageElement}
      </a>
    );
  }

  return imageElement;
}

/**
 * Renders a single block based on its type
 */
function BlockRenderer({
  block,
  widgetVisibility,
}: {
  block: any;
  widgetVisibility: SiteWidgetVisibility;
}) {
  if (block.type === "text") {
    return (
      <TextBlock
        content={typeof block.content === "string" ? block.content : ""}
      />
    );
  }

  if (block.type === "image") {
    return <ImageBlock block={block} />;
  }

  if (block.type === "products" || block.type === "widget") {
    return (
      <CmsWidgetAndProductBlock
        block={block as ContentBlock}
        widgetVisibility={widgetVisibility}
        resolveImageUrl={(path) => getImageUrl(path ?? undefined)}
      />
    );
  }

  // Fallback for unknown block types
  return (
    <div className="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
      <p className="text-sm text-yellow-800">
        Unknown block type: {block.type}
      </p>
    </div>
  );
}

/**
 * Renders a column with its blocks
 */
function ColumnRenderer({
  column,
  widgetVisibility,
}: {
  column: { width: number; blocks: any[] };
  widgetVisibility: SiteWidgetVisibility;
}) {
  return (
    <div
      className="flex-1 w-full sm:w-auto"
      style={{ maxWidth: `${column.width}%`, minWidth: "250px" }}
    >
      <div className="space-y-4">
        {column.blocks.map((block, blockIndex) => (
          <BlockRenderer
            key={blockIndex}
            block={block}
            widgetVisibility={widgetVisibility}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a row with its columns
 */
function RowRenderer({
  row,
  widgetVisibility,
}: {
  row: { columns: any[] };
  widgetVisibility: SiteWidgetVisibility;
}) {
  return (
    <div className="flex flex-wrap gap-4 sm:gap-6 my-6 sm:my-8">
      {row.columns.map((column, colIndex) => (
        <ColumnRenderer
          key={colIndex}
          column={column}
          widgetVisibility={widgetVisibility}
        />
      ))}
    </div>
  );
}

function stripTagsForCompare(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse to alphanumerics so "Terms of Service" matches TinyMCE variants. */
function normalizeComparable(s: string) {
  return stripTagsForCompare(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function extraTitleAliases(slug: string): string[] {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  if (s === "refund-policy") {
    return [
      "Refund Policy",
      "Refund and Return Policy",
      "Refund & Return Policy",
      "Returns and Refunds",
    ];
  }
  if (s === "terms-of-service") {
    return [
      "Terms of Service",
      "Terms Of Service",
      "Terms and Conditions",
      "Terms & Conditions",
    ];
  }
  return [];
}

function titlesToMatch(pageTitle: string, slug: string): string[] {
  const set = new Set<string>();
  const t = pageTitle?.trim();
  if (t) set.add(t);
  for (const a of extraTitleAliases(slug)) set.add(a);
  return [...set];
}

/** Remove leading empty paragraphs / breaks TinyMCE adds before the first heading. */
function trimLeadingEditorNoise(html: string): string {
  let h = html;
  for (let i = 0; i < 20; i += 1) {
    const before = h;
    h = h.replace(/^\s+/, "");
    h = h.replace(/^<p\b[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>\s*/i, "");
    h = h.replace(/^(?:<br\s*\/?>\s*)+/i, "");
    h = h.replace(/^<div\b[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/div>\s*/i, "");
    if (h === before) break;
  }
  return h;
}

/**
 * Strip the first h1–h6 when its visible text matches the page title or common
 * aliases for this slug (TinyMCE duplicates the title under the banner).
 */
function stripLeadingDuplicateHeading(
  html: string,
  pageTitle: string,
  slug: string
): string {
  if (!html?.trim()) return html;
  const keys = new Set(
    titlesToMatch(pageTitle, slug)
      .map(normalizeComparable)
      .filter(Boolean)
  );
  if (keys.size === 0) return html;

  const h = trimLeadingEditorNoise(html);
  const m = h.match(/^<h([1-6])\b[^>]*>([\s\S]*?)<\/h\s*\1>\s*/i);
  if (!m) return html;
  const innerKey = normalizeComparable(m[2]);
  if (keys.has(innerKey)) {
    return h.slice(m[0].length).trimStart();
  }
  return html;
}

function stripDuplicateTitleFromFirstTextBlock(
  blocks: FooterPage["blocks"],
  pageTitle: string,
  slug: string
): FooterPage["blocks"] {
  if (!blocks?.length) return blocks;
  const next = JSON.parse(JSON.stringify(blocks)) as FooterPage["blocks"];
  outer: for (const row of next) {
    for (const column of row.columns || []) {
      for (const block of column.blocks || []) {
        if (block.type === "text" && typeof block.content === "string") {
          const raw = block.content;
          if (!String(raw).trim()) continue;
          block.content = stripLeadingDuplicateHeading(
            raw,
            pageTitle,
            slug
          );
          break outer;
        }
      }
    }
  }
  return next;
}

/**
 * Footer Page Content Component
 * Renders the content of a footer page (banner + blocks; no separate top h1)
 */
export default function FooterPageContent({ page }: { page: FooterPage }) {
  const [widgetVisibility, setWidgetVisibility] = useState<SiteWidgetVisibility>(
    DEFAULT_SITE_WIDGET_VISIBILITY
  );

  const blocksForRender = useMemo(
    () =>
      stripDuplicateTitleFromFirstTextBlock(
        page.blocks || [],
        page.title || "",
        page.slug || ""
      ),
    [page.blocks, page.title, page.slug]
  );

  useEffect(() => {
    getSiteWidgetSettingsPublic().then(setWidgetVisibility);
  }, []);

  return (
    <>
      {/* Banner Image */}
      {page.bannerImage && (
        <div className="mb-8">
          <Image
            src={getImageUrl(page.bannerImage)}
            alt={page.bannerImageAlt || page.title}
            title={page.bannerImageDescription || undefined}
            width={1440}
            height={400}
            className="w-full h-auto rounded-lg shadow-lg"
            priority
            unoptimized={true}
          />
        </div>
      )}

      {/* Page Title */}
      {/* <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
        {page.title}
      </h1> */}

      {/* Page Content - Blocks */}
      <div className="prose prose-lg max-w-none">
        {blocksForRender && blocksForRender.length > 0 ? (
          blocksForRender.map((row, rowIndex) => (
            <RowRenderer
              key={rowIndex}
              row={row}
              widgetVisibility={widgetVisibility}
            />
          ))
        ) : (
          <div className="text-gray-500 italic">
            No content available for this page.
          </div>
        )}
      </div>
    </>
  );
}
