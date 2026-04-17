"use client";

import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CmsWidgetAndProductBlock } from "@/app/components/cms/CmsWidgetAndProductBlock";
import type { ContentBlock } from "@/app/services/homepageDataService";
import {
  fetchFooterPageBySlug,
  getImageUrl,
  type FooterPage,
} from "@/app/services/footerPageService";
import FooterPageImage from "@/app/components/footer-pages/FooterPageImage";
import {
  DEFAULT_SITE_WIDGET_VISIBILITY,
  getSiteWidgetSettingsPublic,
  type SiteWidgetVisibility,
} from "@/app/services/siteWidgetSettingsService";

// CSS styles for proper list and table rendering in footer page content
const pageContentStyles = `
  /* Lists - ul and ol */
  .page-content ul,
  .page-content ol {
    list-style-position: outside !important;
    margin: 1rem 0 !important;
    padding-left: 1.5rem !important;
  }
  
  .page-content ul {
    list-style-type: disc !important;
  }
  
  .page-content ol {
    list-style-type: decimal !important;
  }
  
  /* List items */
  .page-content li {
    display: list-item !important;
    margin: 0.375rem 0 !important;
  }
  
  /* Nested lists */
  .page-content ul ul,
  .page-content ol ol,
  .page-content ul ol,
  .page-content ol ul {
    margin: 0.25rem 0 !important;
  }
  
  /* List items containing paragraph tags - prevent spacing issues */
  .page-content ul li p,
  .page-content ol li p {
    display: inline !important;
    margin: 0 !important;
  }
  
  /* Tables */
  .page-content table {
    display: table !important;
    width: 100% !important;
    table-layout: fixed !important;
    border-collapse: collapse !important;
    margin: 1.25rem 0 !important;
    border: 1px solid #e5e7eb !important;
  }
  
  .page-content table td,
  .page-content table th {
    padding: 0.5rem !important;
    border: 1px solid #e5e7eb !important;
    vertical-align: top !important;
    word-break: break-word !important;
  }
  
  /* Responsive tables for mobile */
  @media (max-width: 640px) {
    .page-content table {
      font-size: 0.875rem !important;
      display: block !important;
      overflow-x: auto !important;
      white-space: nowrap !important;
    }
    
    .page-content table td,
    .page-content table th {
      padding: 0.25rem !important;
      min-width: 80px !important;
    }
  }
`;

interface DynamicPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Renders a text block with HTML content
 */
function TextBlock({ content }: { content: string }) {
  return (
    <div
      className="prose prose-lg max-w-none prose-headings:text-primary prose-a:text-primary prose-strong:text-gray-900 page-content"
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

  // Log image URL for debugging (server-side)
  if (imageUrl) {
    console.log(`[ImageBlock] Rendering image with URL: ${imageUrl}`);
    console.log(`[ImageBlock] Original URL from block: ${block.content.url}`);
  } else {
    console.warn(
      `[ImageBlock] No image URL available for block:`,
      block.content
    );
  }

  const imageElement = (
    <div className="my-6">
      {block.content.heading && (
        <h3 className="text-xl font-semibold mb-3 text-gray-900">
          {block.content.heading}
        </h3>
      )}
      {imageUrl ? (
        <FooterPageImage
          src={block.content.url || ""}
          alt={block.content.alt || block.content.heading || "Image"}
          width={1200}
          height={600}
          className="w-full h-auto rounded-lg shadow-md"
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
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 my-6 sm:my-8">
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

/**
 * Main Dynamic Footer Page Component
 * Handles any slug and fetches footer pages from the API (client-side)
 */
export default function DynamicFooterPage({ params }: DynamicPageProps) {
  const router = useRouter();
  const [slug, setSlug] = useState<string>("");

  const [page, setPage] = useState<FooterPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [widgetVisibility, setWidgetVisibility] =
    useState<SiteWidgetVisibility>(DEFAULT_SITE_WIDGET_VISIBILITY);

  // Resolve params (always a Promise in Next.js 15)
  useEffect(() => {
    async function resolveParams() {
      const resolved = await params;
      setSlug(resolved.slug);
    }
    resolveParams();
  }, [params]);

  useEffect(() => {
    getSiteWidgetSettingsPublic().then(setWidgetVisibility);
  }, []);

  useEffect(() => {
    if (!slug) return;

    async function loadPage() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        // Decode the slug in case it was URL-encoded
        const decodedSlug = decodeURIComponent(slug);

        console.log(
          `[DynamicFooterPage] Fetching page with slug: "${decodedSlug}"`
        );

        const pageData = await fetchFooterPageBySlug(decodedSlug);

        // Handle 404 if page doesn't exist
        if (!pageData) {
          console.warn(
            `[DynamicFooterPage] Page not found for slug: "${decodedSlug}"`
          );
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Handle 404 if page is not published
        if (pageData.publishStatus !== "published") {
          console.warn(
            `[DynamicFooterPage] Page exists but is not published. Slug: "${decodedSlug}", Status: "${pageData.publishStatus}"`
          );
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Log successful page load
        console.log(
          `[DynamicFooterPage] Successfully loaded page: "${pageData.title}" (slug: "${pageData.slug}", status: "${pageData.publishStatus}")`
        );
        console.log(`[DynamicFooterPage] bannerImageAlt: "${pageData.bannerImageAlt}"`);
        console.log(`[DynamicFooterPage] bannerImageDescription: "${pageData.bannerImageDescription}"`);

        setPage(pageData);
      } catch (err) {
        console.error(`[DynamicFooterPage] Error loading page:`, err);
        setError(err instanceof Error ? err.message : "Failed to load page");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug]);

  // Show loading state
  if (loading) {
    return (
      <>
        <SlugRouteHeader />

        <div className="max-w-7xl mx-auto p-6">
          {/* Breadcrumb Skeleton */}
          <div className="mb-4 h-5 w-64 bg-gray-200 rounded animate-pulse" />

          {/* Banner Skeleton */}
          <div className="mb-6 h-64 bg-gray-200 rounded-lg animate-pulse" />

          {/* Title Skeleton */}
          <div className="mb-6 h-10 w-96 bg-gray-200 rounded animate-pulse" />

          {/* Content Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <SlugRouteHeader />

        <div className="max-w-7xl mx-auto p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Something Went Wrong
            </h1>
            <p className="text-lg text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.refresh()}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>

      </>
    );
  }

  // Show not found state
  if (notFound || !page) {
    return (
      <>
        <SlugRouteHeader />

        <div className="max-w-7xl mx-auto p-6 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              The page you&apos;re looking for doesn&apos;t exist or is not available.
            </p>
            <Link
              href="/"
              className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>

      </>
    );
  }

  // Render page content
  return (
    <>
      {/* Inject CSS styles for lists and tables */}
      <style dangerouslySetInnerHTML={{ __html: pageContentStyles }} />

      <SlugRouteHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
        </nav>

        {/* Banner Image */}
        {page.bannerImage && (
          <div className="mb-8">
            <FooterPageImage
              src={page.bannerImage}
              alt={page.bannerImageAlt || page.title}
              title={page.bannerImageDescription || undefined}
              width={1440}
              height={400}
              className="w-full h-auto rounded-lg shadow-lg"
              priority={true}
            />
          </div>
        )}

        {/* Page Content - Blocks (document title is not rendered; add headings inside CMS blocks if needed) */}
        <div className="prose prose-lg max-w-none">
          {page.blocks && page.blocks.length > 0 ? (
            page.blocks.map((row, rowIndex) => (
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
      </div>

    </>
  );
}
