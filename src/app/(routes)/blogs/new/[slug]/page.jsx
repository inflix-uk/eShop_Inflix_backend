import { notFound } from "next/navigation";
import PropTypes from "prop-types";
import ClientBlogPage from "./ClientBlogPage";
import { getFullImageUrl } from "./blogUtils";

// Server-side data fetching function
async function getBlogPostBySlugWithoutCache(slug) {
  try {
    const response = await fetch( `${process.env.NEXT_PUBLIC_API_URL}/newblog/blog/postsBySlugWithoutCache/${slug}`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting blog post:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { slug } = params;

  // Validate slug exists
  if (!slug || slug.trim() === "") {
    return {
      title: 'Invalid Blog URL - Zextons',
      description: 'The requested blog URL is invalid.',
      robots: 'noindex, nofollow'
    };
  }

  const blog = await getBlogPostBySlugWithoutCache(slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found - Zextons',
      description: 'The requested blog post could not be found.',
      robots: 'noindex, nofollow'
    };
  }

  return {
    title: `${blog.title} - Zextons`,
    description: blog.excerpt || 'Read our latest blog post on Zextons',
    openGraph: {
      title: blog.title,
      description: blog.excerpt || 'Read our latest blog post on Zextons',
      images: blog.bannerImage ? [getFullImageUrl(blog.bannerImage)] : [],
      type: 'article',
      publishedTime: blog.publishDate,
      modifiedTime: blog.updatedAt,
      tags: blog.tags || [],
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/new/${slug}`
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/new/${slug}`,
    }
  };
}

// Main Component
export default async function BlogPreviewPage({ params }) {
  const { slug } = params;

  // Validate slug exists
  if (!slug || slug.trim() === "") {
    notFound();
  }

  const blog = await getBlogPostBySlugWithoutCache(slug);

  // If blog not found, show 404
  if (!blog) {
    notFound();
  }
  
  // Add structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blog.title,
    "datePublished": blog.publishDate,
    "dateModified": blog.updatedAt,
    "author": {
      "@type": "Organization",
      "name": "Zextons"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Zextons",
      "logo": {
        "@type": "ImageObject",
        "url": "https://zextons.co.uk/logo.png"
      }
    },
    "description": blog.excerpt || ""
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ClientBlogPage blog={blog} />
    </>
  );
}

BlogPreviewPage.propTypes = {
  params: PropTypes.shape({
    slug: PropTypes.string.isRequired,
  }).isRequired,
};
