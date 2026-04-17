import type { Metadata } from "next";

function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getSubCategoryData(subcategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategorydetails/${encodeURIComponent(subcategoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && subcategoryName !== toOriginalCase(subcategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategorydetails/${encodeURIComponent(toOriginalCase(subcategoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching subcategory data:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}): Promise<Metadata> {
  const { slug, subcategory } = await params;

  if (!subcategory) {
    throw new Error("Invalid slug provided for subcategory.");
  }

  const response = await getSubCategoryData(subcategory);

  if (!response) {
    return {
      title: subcategory.replace(/-/g, " "),
    };
  }
  const { metaTitle, metaDescription, metaKeywords, banner } = response;

  return {
    title:
      metaTitle ||
      `Buy Affordable and Cheap Deals on ${subcategory} Tech Products, at Zextons`,
    description: metaDescription || "",
    keywords: metaKeywords || "",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title:
        metaTitle ||
        `Buy Affordable and Cheap Deals on ${subcategory} Tech Products, at Zextons`,
      url: `https://zextons.co.uk/categories/${slug}/${subcategory}`,
      description: metaDescription,
      type: "website",
      images: [
        {
          url: banner?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${banner.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title:
        metaTitle ||
        `Buy Affordable and Cheap Deals on ${subcategory} Tech Products, at Zextons`,
      description: metaDescription,
      images: [
        {
          url: banner?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${banner.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
    },
    alternates: {
      canonical: `https://zextons.co.uk/categories/${slug}/${subcategory}`,
      languages: {
        "en-gb": `https://zextons.co.uk/categories/${slug}/${subcategory}`,
      },
    },
  };
}

export default async function SubCategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; subcategory: string }>;
}) {
  return <>{children}</>;
}
