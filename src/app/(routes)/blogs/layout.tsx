import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
  description:
    "Explore our blog for expert tips, exclusive tech deals, and in-depth reviews of the latest gadgets. Stay updated and make informed purchase decisions with us.",
  keywords:
    "tech blog, gadget reviews, tech deals, tech tips, latest gadgets, tech product sale, Zextons blog",
  robots: "index, follow",
  openGraph: {
    siteName: "Zextons Tech Store",
    title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
    url: "https://zextons.co.uk/blogs",
    description:
      "Explore our blog for expert tech tips, exclusive deals, and detailed reviews of the latest gadgets. Stay informed with Zextons.",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ZextonsTechStore",
    title: "Tech Products Sale Blog | Latest Tips, Deals, and Reviews",
    description:
      "Stay updated with the latest in tech! Explore expert tips, exclusive tech deals, and in-depth reviews of gadgets on our Zextons blog.",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  alternates: {
    canonical: "https://zextons.co.uk/blogs",
    languages: { "en-gb": "https://zextons.co.uk/blogs" },
  },
};

export default function BlogsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    {children}
    </>
  );
}
