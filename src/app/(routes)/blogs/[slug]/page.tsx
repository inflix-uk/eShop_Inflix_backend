import { cache } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TableOfContentsWrapper from "./TableOfContentsWrapper";
import DateDisplay from "./DateDisplay";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import ClientBlogPage from "../new/[slug]/ClientBlogPage";
import { getFullImageUrl } from "../new/[slug]/blogUtils";
import { metaSchemaEntryToJsonLdString } from "@/app/lib/homepageJsonLd";

interface BlogData {
  _id: string;
  name: string;
  slug: string;
  content: string;
  blogImage: string;
  blogImageAlt?: string;
  blogShortDescription: string;
  blogCategory: string;
  createdAt: string;
  updatedAt: string;
  blogpublisheddate: string;
  metaschemas?: string[];
  // SEO overrides from backend
  metaTitle?: string;
  metaDescription?: string;
  metakeywords?: string;
  metaImage?: string;
  metaImageAlt?: string;
}

/** New admin blog posts (NewBlog model) — same API as /blogs/new/[slug] */
const fetchNewBlogBySlug = cache(async (slug: string): Promise<Record<string, unknown> | null> => {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base || !slug) return null;
  try {
    const res = await fetch(
      `${base}/newblog/blog/postsBySlugWithoutCache/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.data) return null;
    const post = data.data as Record<string, unknown>;
    const isDev = process.env.NODE_ENV === "development";
    // Production: only published. Dev: allow drafts so /blogs/[slug] matches admin without publishing.
    if (
      post.publishStatus &&
      post.publishStatus !== "published" &&
      !isDev
    ) {
      return null;
    }
    return post;
  } catch {
    return null;
  }
});

export const dynamic = "force-dynamic";

const getLegacyBlog = cache(async (slug: string): Promise<BlogData | null> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/blog/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.status === 201 ? (data.blog as BlogData) : null;
  } catch {
    return null;
  }
});

function getStaticContent(html: string): string {
  if (!html) return "<p>No content available</p>";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

function formatDateGB(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`; // deterministic SSR/CSR
}

// Return YYYY-MM-DD in UTC, suitable for schema.org date fields (date-only)
function formatDateISO(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // fallback: best-effort slice if already a string
    return (dateStr || "").slice(0, 10);
  }
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildNewBlogBlogPostingJsonLd(
  post: Record<string, unknown>,
  slug: string
): Record<string, unknown> {
  const title = typeof post.title === "string" ? post.title : "";
  const metaTitle =
    typeof post.metaTitle === "string" ? post.metaTitle.trim() : "";
  const headline = metaTitle || title;
  const excerpt = typeof post.excerpt === "string" ? post.excerpt : "";
  const metaDesc =
    typeof post.metaDescription === "string" ? post.metaDescription.trim() : "";
  const description = metaDesc || excerpt;
  const content = typeof post.content === "string" ? post.content : "";
  const staticContent = getStaticContent(content);
  const plainBody = staticContent.replace(/<[^>]*>/g, "");
  const publishRaw =
    (post.publishDate as string) ||
    (post.createdAt as string) ||
    new Date().toISOString();
  const modifiedRaw = (post.updatedAt as string) || publishRaw;
  const banner =
    typeof post.bannerImage === "string" ? post.bannerImage : "";
  const featured =
    typeof post.featuredImage === "string" ? post.featuredImage : "";
  const imagePath = banner || featured;
  const imageUrl = imagePath ? getFullImageUrl(imagePath) : undefined;
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "https://zextons.co.uk";
  const pageUrl = `${base}/blogs/${slug}`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
  const logoUrl = apiUrl
    ? `${apiUrl}/uploads/web/Zextons.webp`
    : "https://zextons.co.uk/logo.png";

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    datePublished: formatDateISO(String(publishRaw)),
    dateModified: formatDateISO(String(modifiedRaw)),
    author: {
      "@type": "Organization",
      name: "Zextons",
      url: "https://zextons.co.uk",
    },
    publisher: {
      "@type": "Organization",
      name: "Zextons",
      logo: { "@type": "ImageObject", url: logoUrl },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };
  if (imageUrl) {
    jsonLd.image = imageUrl;
  }
  if (plainBody.trim()) {
    jsonLd.articleBody = plainBody;
    jsonLd.wordCount = plainBody.split(/\s+/).filter(Boolean).length;
  }
  return jsonLd;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const newBlog = await fetchNewBlogBySlug(slug);
  if (newBlog && typeof newBlog.title === "string") {
    const title = newBlog.title as string;
    const metaTitle =
      typeof newBlog.metaTitle === "string" ? newBlog.metaTitle.trim() : "";
    const displayTitle = metaTitle || title;
    const excerpt =
      typeof newBlog.excerpt === "string" ? newBlog.excerpt : "";
    const metaDesc =
      typeof newBlog.metaDescription === "string"
        ? newBlog.metaDescription.trim()
        : "";
    const description =
      metaDesc || excerpt || "Read our latest blog post on Zextons";
    const banner =
      typeof newBlog.bannerImage === "string" ? newBlog.bannerImage : "";
    const featured =
      typeof newBlog.featuredImage === "string" ? newBlog.featuredImage : "";
    const rawImg = banner || featured;
    const ogImage = rawImg ? getFullImageUrl(rawImg) : undefined;
    const keywords =
      Array.isArray(newBlog.metaTags) && newBlog.metaTags.length
        ? newBlog.metaTags
            .filter((t): t is string => typeof t === "string")
            .join(", ")
        : undefined;

    return {
      title: `${displayTitle} | Zextons`,
      description,
      ...(keywords ? { keywords } : {}),
      robots: "index, follow, max-image-preview:large, max-snippet:-1",
      openGraph: {
        title: displayTitle,
        description,
        type: "article",
        publishedTime: newBlog.publishDate as string | undefined,
        modifiedTime: newBlog.updatedAt as string | undefined,
        url: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
        images: ogImage ? [ogImage] : [],
      },
      twitter: {
        card: "summary_large_image",
        site: "@ZextonsTechStore",
        title: displayTitle,
        description,
        images: ogImage ? [ogImage] : [],
      },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
      },
    };
  }

  const blog = await getLegacyBlog(slug);

  if (!blog) {
    return {
      title: "Blog Not Found | Zextons",
      description: "The requested blog post could not be found.",
      robots: "noindex, nofollow",
    };
  }

  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
  const rawOgImage = (blog.metaImage && blog.metaImage) || blog.blogImage;
  const ogImage = rawOgImage?.startsWith("http")
    ? rawOgImage
    : `${baseUrl}/${rawOgImage}`;
  const ogImageAlt = blog.metaImageAlt || blog.blogImageAlt || blog.name;

  // SEO field fallbacks
  const seoTitle = blog.metaTitle || blog.name;
  const seoDesc = blog.metaDescription || blog.blogShortDescription;
  const seoKeywords = blog.metakeywords || blog.blogCategory;
  const publishedISO = (blog.blogpublisheddate || blog.createdAt);

  return {
    title: `${seoTitle} | Zextons`,
    description: seoDesc,
    keywords: seoKeywords,
    robots: "index, follow, max-image-preview:large, max-snippet:-1",
    openGraph: {
      title: seoTitle,
      description: seoDesc,
      type: "article",
      publishedTime: publishedISO,
      modifiedTime: blog.updatedAt,
      authors: ["Zextons"],
      siteName: "Zextons",
      locale: "en_GB",
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDesc,
      images: [ogImage],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const newBlog = await fetchNewBlogBySlug(slug);
  if (newBlog) {
    const blogPostingLd = buildNewBlogBlogPostingJsonLd(newBlog, slug);
    const metaSchemaRaw = newBlog.metaSchema;
    const metaSchemaList = Array.isArray(metaSchemaRaw)
      ? metaSchemaRaw.filter((x): x is string => typeof x === "string")
      : [];
    const extraJsonLdStrings = metaSchemaList
      .map((entry) => metaSchemaEntryToJsonLdString(entry))
      .filter((s): s is string => s != null && s.length > 0);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogPostingLd),
          }}
        />
        {extraJsonLdStrings.map((json, i) => (
          <script
            key={`blog-meta-schema-${i}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        ))}
        <ClientBlogPage blog={newBlog as never} />
      </>
    );
  }

  const blog = await getLegacyBlog(slug);
  if (!blog) notFound();

  const baseUrl = `${process.env.NEXT_PUBLIC_API_URL}`;
  const heroImage = blog.blogImage.startsWith("http")
    ? blog.blogImage
    : `${baseUrl}/${blog.blogImage}`;

  const staticContent = getStaticContent(blog.content);
  const publishedRaw = blog.blogpublisheddate || blog.createdAt;
  const dateDisplay = formatDateGB(publishedRaw);
  const dateModifiedISO = formatDateISO(blog.updatedAt);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.metaTitle || blog.name,
    description: blog.metaDescription || blog.blogShortDescription,
    image: heroImage,
    datePublished: formatDateISO(publishedRaw),
    dateModified: dateModifiedISO,
    articleBody: staticContent.replace(/<[^>]*>/g, ""),
    wordCount: staticContent.split(/\s+/).length,
    author: { "@type": "Organization", name: "Zextons", url: "https://zextons.co.uk" },
    publisher: {
      "@type": "Organization",
      name: "Zextons",
      logo: { "@type": "ImageObject", url: "https://zextons.co.uk/logo.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://zextons.co.uk/blogs/${slug}` },
  };

  // Parse any backend-provided metaschemas (array of JSON strings)
  const extraSchemas = Array.isArray(blog.metaschemas)
    ? blog.metaschemas
        .map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return null; // skip invalid JSON to avoid injecting malformed data
          }
        })
        .filter(Boolean)
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {extraSchemas.map((schema: unknown, idx: number) => (
        <script
          key={`ldjson-extra-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <TopBar />
      <Nav /> 

      <article className="px-3 sm:px-4 py-6 sm:py-10 min-w-0">
        {/* HERO (server-rendered) */}
        <header className="max-w-7xl mx-auto bg-white rounded-lg overflow-hidden shadow-lg">
          <div className="relative">
            <Image
              src={heroImage}
              alt={blog.blogImageAlt || blog.name}
              className="w-full h-[14rem] xs:h-[18rem] sm:h-[22rem] md:h-[28rem] lg:h-[35rem] object-cover"
              width={1200}
              height={700}
              fetchPriority="high"
              priority
              quality={90}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
            {blog.blogCategory && (
              <div className="absolute top-3 right-3 sm:top-5 sm:right-6 md:right-10 max-w-[calc(100%-1.5rem)]">
                <span className="relative z-10 inline-block max-w-full truncate rounded-full bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">
                  {blog.blogCategory}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-4 sm:p-6">
              <div className="text-white max-w-screen-md min-w-0">
                <DateDisplay 
                  dateString={publishedRaw}
                  dateTime={publishedRaw}
                  className="text-white"
                  fallbackText={dateDisplay}
                />
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight mt-3">
                  {blog.name}
                </h1>
                <p className="mt-3 text-md sm:text-lg text-gray-200">
                  {blog.metaDescription || blog.blogShortDescription}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* LAYOUT: ToC (client) + Content (server) */}
        <div className="w-full max-w-screen-xl mx-auto my-5 md:flex md:flex-row gap-4 md:gap-6 min-w-0">
          {/* Table of Contents - Client Component */}
          <TableOfContentsWrapper content={staticContent} />

          {/* Main Content - Server Rendered */}
          <main
            id="blog-content"
            className="flex-1 min-w-0 p-4 sm:p-6 space-y-6 shadow-lg border rounded-lg bg-white"
          >
            <div
              className="prose prose-lg max-w-none blog-content
                prose-headings:scroll-mt-20
                prose-h1:text-3xl prose-h1:font-bold
                prose-h2:text-2xl prose-h2:font-semibold
                prose-h3:text-xl prose-h3:font-medium
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                prose-img:rounded-lg prose-img:shadow-md
                prose-ul:list-disc prose-ul:pl-6
                prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-gray-700
                prose-blockquote:border-l-4 prose-blockquote:border-gray-300
                prose-blockquote:pl-4 prose-blockquote:italic
                prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
                prose-pre:bg-gray-900 prose-pre:text-gray-100"
              dangerouslySetInnerHTML={{ __html: staticContent }}
            />
          </main>
        </div>
      </article>

      </>
  );
}