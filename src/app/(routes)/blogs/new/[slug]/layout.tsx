import type { Metadata } from "next";

// Type for your props
type Props = {
  params: Promise<{ slug: string }>;
};

// Define the blog data type
interface BlogData {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  metaImage?: string;
  metaImageAlt?: string;
  [key: string]: any;
}

// Fetch function
async function getBlogData(slug: string): Promise<BlogData | undefined> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/newblog/blog/postsBySlugWithoutCache/${slug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.data;
  } catch (error) {
    console.error('Error:', error);
    return undefined;
  }
}

// Metadata function
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const blogData = await getBlogData(slug);

  const title = blogData?.metaTitle || 'Default Blog Title';
  const description = blogData?.metaDescription || 'Default Blog Description';
  const imageUrl = blogData?.metaImage
    ? `${process.env.NEXT_PUBLIC_API_URL}/${blogData.metaImage}`
    : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`;
  const imageAlt = blogData?.metaImageAlt || 'Zextons Blog Image';
  const url = `https://zextons.co.uk/blogs/new/${slug}`;

  return {
    title,
    description,
    keywords: blogData?.metaKeywords || '',
    robots: 'index, follow',
    openGraph: {
      siteName: 'Zextons Tech Store',
      title,
      description,
      url,
      type: 'article',
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@ZextonsTechStore',
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    alternates: {
      canonical: url,
      languages: { 'en-gb': url },
    },
  };
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}