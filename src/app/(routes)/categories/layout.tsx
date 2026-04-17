import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "Refurbished and Brand New Products | Explore All Categories | Zextons Tech Store",
  description:
    "Browse a wide range of refurbished and brand new products at Zextons Tech Store. Explore all categories and subcategories to find quality items at unbeatable prices. Shop now!",
  keywords:
    "refurbished products, brand new products, Zextons categories, tech store categories, electronics categories, product categories",
  robots: "index, follow",
  openGraph: {
    siteName: "Zextons Tech Store",
    title: "Refurbished and Brand New Products | Explore All Categories | Zextons Tech Store",
    url: "https://zextons.co.uk/categories",
    description:
      "Browse a wide range of refurbished and brand new products at Zextons Tech Store. Explore all categories and subcategories to find quality items at unbeatable prices. Shop now!",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ZextonsTechStore",
    title: "Refurbished and Brand New Products | Explore All Categories | Zextons Tech Store",
    description:
      "Browse a wide range of refurbished and brand new products at Zextons Tech Store. Explore all categories and subcategories to find quality items at unbeatable prices. Shop now!",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  alternates: {
    canonical: "https://zextons.co.uk/categories",
    languages: { "en-gb": "https://zextons.co.uk/categories" },
  },
};
export default async function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
