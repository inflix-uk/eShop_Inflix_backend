import type { Metadata } from "next";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";

interface FooterPageLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generates metadata for the footer page
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let page: FooterPage | null = null;

  try {
    page = await fetchFooterPageBySlug(slug);
  } catch (error) {
    console.error("Error fetching page for metadata:", error);
  }

  if (!page) {
    return {
      title: "Page Not Found | Zextons Tech Store",
      description: "The page you're looking for doesn't exist.",
      robots: "noindex, nofollow",
    };
  }

  const title = page.metaTitle || page.title;
  const description =
    page.metaDescription || `Read about ${page.title} at Zextons Tech Store`;
  // Get base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:4000";
  const pageUrl = `${baseUrl}/footer-pages/${slug}`;

  // Get API URL for image construction
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const metadata: Metadata = {
    title: `${title} | Zextons Tech Store`,
    description: description,
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: title,
      url: pageUrl,
      description: description,
      type: "website",
      images: page.bannerImage
        ? [
            {
              url: page.bannerImage.startsWith("http")
                ? page.bannerImage
                : `${apiUrl}/uploads/${page.bannerImage}`,
            },
          ]
        : [{ url: `${apiUrl}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: title,
      description: description,
      images: page.bannerImage
        ? [
            {
              url: page.bannerImage.startsWith("http")
                ? page.bannerImage
                : `${apiUrl}/uploads/${page.bannerImage}`,
            },
          ]
        : [{ url: `${apiUrl}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: pageUrl,
      languages: { "en-gb": pageUrl },
    },
  };

  // Add meta tags if provided
  if (page.metaTags && page.metaTags.length > 0) {
    metadata.keywords = page.metaTags.join(", ");
  }

  return metadata;
}

/**
 * Layout component that includes meta schemas
 */
export default async function FooterPageLayout({
  children,
  params,
}: FooterPageLayoutProps) {
  const { slug } = await params;
  let page: FooterPage | null = null;

  try {
    page = await fetchFooterPageBySlug(slug);
  } catch (error) {
    console.error("Error fetching page for layout:", error);
  }

  return (
    <>
      {/* Render meta schemas if available */}
      {page?.metaSchema &&
        page.metaSchema.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: schema }}
          />
        ))}
      {children}
    </>
  );
}
