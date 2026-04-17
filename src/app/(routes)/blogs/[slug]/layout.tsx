import type { Metadata } from "next";

// Type for your props
type Props = {
  params: Promise<{ slug: string }>;
};

async function getBlogData(permalink: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/get/blog/${encodeURIComponent(permalink)}`,
    { next: { revalidate: 60 } }
  );
  const data = await res.json();
  return data.blog;
}

// generateMetadata should return a Metadata object
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (!slug) {
    throw new Error("Invalid slug provided for blog.");
  }

  const blogData = await getBlogData(slug);

  return {
    title: blogData?.metaTitle || "Default Blog Title",
    description: blogData?.metaDescription || "Default Blog Description",
    keywords: blogData?.metaKeywords || "",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: blogData?.metaTitle || "Default Blog Title",
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
      description: blogData?.metaDescription || "Default Blog Description",
      type: "article",
      images: [
        {
          url: blogData?.metaImage
            ? `${process.env.NEXT_PUBLIC_API_URL}/${blogData.metaImage}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
          alt: blogData?.metaImageAlt || "Zextons Blog Image",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: blogData?.metaTitle || "Default Blog Title",
      description: blogData?.metaDescription || "Default Blog Description",
      images: [
        {
          url: blogData?.metaImage
            ? `${process.env.NEXT_PUBLIC_API_URL}/${blogData.metaImage}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
          alt: blogData?.metaImageAlt || "Zextons Blog Image",
        },
      ],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
      languages: {
        "en-gb": `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`,
      },
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
