import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title:
    "About Zextons Tech Store - Your Trusted Source for Refurbished & New Tech in the UK",
  description:
    "At Zextons, we believe everyone deserves access to premium technology without overpaying or harming the planet. For over 15 years, we've been delivering refurbished and brand-new tech that combines quality, affordability, and sustainability.",
  keywords:
    "about Zextons, Zextons Tech Store, refurbished tech UK, refurbished phones, refurbished laptops, refurbished tablets, refurbished gaming consoles, sustainable technology, eco-friendly tech, quality assurance, 18-month warranty, bulk recycling, business clients, individual customers",
  robots: "index, follow",
  openGraph: {
    siteName: "Zextons Tech Store",
    title:
      "About Zextons Tech Store - Your Trusted Source for Refurbished & New Tech in the UK",
    url: "https://zextons.co.uk/about-zextons",
    description:
      "Learn about Zextons Tech Store - your trusted source for refurbished and new tech in the UK. We make premium technology accessible, affordable, and sustainable for everyone.",
    type: "website",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ZextonsTechStore",
    title:
      "About Zextons Tech Store - Your Trusted Source for Refurbished & New Tech in the UK",
    description:
      "At Zextons, we make premium technology accessible, affordable, and sustainable. Discover our mission, quality promise, and comprehensive range of refurbished and new tech products.",
    images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
  },
  alternates: {
    canonical: "https://zextons.co.uk/about-zextons",
    languages: { "en-gb": "https://zextons.co.uk/about-zextons" },
  },
};

export default function AboutUsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Corporation",
            name: "Zextons Tech Store",
            alternateName: "Zextons",
            url: "https://zextons.co.uk/",
            logo: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`,
            description:
              "Your trusted source for refurbished and new tech in the UK. We make premium technology accessible, affordable, and sustainable for everyone.",
            foundingDate: "2009",
            numberOfEmployees: "10-50",
            address: {
              "@type": "PostalAddress",
              addressCountry: "GB",
            },
            areaServed: "United Kingdom",
            knowsAbout: [
              "Refurbished Technology",
              "Sustainable Electronics",
              "Mobile Phones",
              "Laptops",
              "Tablets",
              "Gaming Consoles",
              "Smartwatches",
              "Tech Accessories",
            ],
            slogan: "Your Trusted Source for Refurbished & New Tech in the UK",
            mission:
              "Making premium technology accessible to everyone while reducing electronic waste and promoting a greener future",
          }),
        }}
      />
      <SpeedInsights />
      {children}
    </>
  );
}
