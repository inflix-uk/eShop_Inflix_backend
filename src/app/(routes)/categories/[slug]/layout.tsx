import type { Metadata } from "next";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getCategoryData(categoryName: string) {
  try {
    // Try original slug first
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetails/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    // If lowercase slug failed, try title-case version
    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetails/${encodeURIComponent(toOriginalCase(categoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.category;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!(await params)?.slug) {
    throw new Error("Invalid slug provided for category.");
  }

  // const categoryName = transformCategoryName((await params).slug);
  const categoryName = (await params).slug;
  const category = await getCategoryData(categoryName);

  if (!category) {
    return {
      title: categoryName.replace(/-/g, " "),
    };
  }

  return {
    title: category?.metaTitle,
    description: category?.metaDescription,
    keywords: category?.metaKeywords || "",
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons Tech Store",
      title: category?.metaTitle,
      url: `https://zextons.co.uk/categories/${(await params).slug}`,
      description: category?.metaDescription,
      type: "website",
      images: [
        {
          url: category?.bannerImage?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${category.bannerImage.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: category?.metaTitle,
      description: category?.metaDescription,
      images: [
        {
          url: category?.bannerImage?.path
            ? `${process.env.NEXT_PUBLIC_API_URL}/${category.bannerImage.path}`
            : `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
        },
      ],
    },
    alternates: {
      canonical: `https://zextons.co.uk/categories/${(await params).slug}`,
      languages: {
        "en-gb": `https://zextons.co.uk/categories/${(await params).slug}`,
      },
    },
  };
}

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return (
    <>
      {children}
    </>
  );
}
