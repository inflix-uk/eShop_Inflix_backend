import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Why Buying a Refurbished iPhone is a Good Idea? | Zextons",
  description:
    "Choosing a refurbished iPhone helps reduce e-waste and supports sustainability. Save money and the planet with quality, eco-friendly devices from Zextons.",
  keywords:
    "refurbished iPhone benefits, eco-friendly iPhones, save money with refurbished phones, sustainable technology, refurbished devices, reduce e-waste",
  robots: "index, follow",
  openGraph: {
    siteName: "Zextons Tech Store",
    title: "Why Buying a Refurbished iPhone is a Good Idea? | Zextons",
    url: "https://zextons.co.uk/why-buying-a-refurbished-iphone-is-a-good-idea",
    description:
      "Discover the benefits of buying a refurbished iPhone from Zextons. Save money, reduce e-waste, and support sustainability with high-quality, eco-friendly devices.",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ZextonsTechStore",
    title: "Why Buying a Refurbished iPhone is a Good Idea? | Zextons",
    description:
      "Choosing a refurbished iPhone helps reduce e-waste and supports sustainability. Save money and the planet with quality, eco-friendly devices from Zextons.",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  alternates: {
    canonical:
      "https://zextons.co.uk/why-buying-a-refurbished-iphone-is-a-good-idea",
    languages: {
      "en-gb":
        "https://zextons.co.uk/why-buying-a-refurbished-iphone-is-a-good-idea",
    },
  },
};

export default function RefurbishedPhonesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SpeedInsights />
      {children}
    </>
  );
}
