import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import Link from "next/link";
import React from "react";
import { Metadata } from "next";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/customer-reviews")}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const metaData = await getMetaData();

  if (!metaData) {
    return {
      title: "Customer Reviews | Zextons Tech Store",
      description: "Read customer reviews about Zextons Tech Store",
      robots: "index, follow",
    };
  }

  return {
    title: metaData.titleTag,
    description: metaData.metaDescription,
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title: metaData.titleTag,
      url: "https://zextons.co.uk/customer-reviews",
      description: metaData.metaDescription,
      type: "website",
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title: metaData.titleTag,
      description: metaData.metaDescription,
      images: [{ url: `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp` }],
    },
    alternates: {
      canonical: "https://zextons.co.uk/customer-reviews",
      languages: { "en-gb": "https://zextons.co.uk/customer-reviews" },
    },
  };
}

export default async function CustomerReviews() {
  const metaData = await getMetaData();

  return (
    <>
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      <header className="relative">
        <nav aria-label="Top">
          <TopBar />
          <Nav />
        </nav>
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href="/customer-reviews" className="hover:underline">
            Customer Reviews
          </Link>
        </nav>
        <div className="mx-auto">
          <h3 className="text-2xl font-bold text-gray-600 my-10">
           {` We are proud to have received a range of feedback from our valued
            customers. At Zextons, we strive to provide top-quality service and
            products, and we're grateful for your support. Here are some of the
            latest reviews shared on Trustpilot: `}
          </h3>

          {/* <!-- TrustBox widget - Grid --> */}
          <div
            className="trustpilot-widget"
            data-locale="en-GB"
            data-template-id="539adbd6dec7e10e686debee"
            data-businessunit-id="62e8fdd30dc0c3a7268e8064"
            data-style-height="1900px"
            data-style-width="100%"
            data-stars="1,2,3,4,5"
            data-review-languages="en"
          >
            <a
              href="https://uk.trustpilot.com/review/zextons.co.uk"
              target="_blank"
              rel="noopener"
            >
              Trustpilot
            </a>
          </div>
          <div className="flex flex-wrap justify-center items-center pb-10">
            <p className="text-center text-2xl text-gray-600 font-bold">
              {`   If you’ve had a positive experience with us, we’d love to hear
              from you! Your feedback helps us continue to improve and serve you
              better. Leave a review today and let us know how we’re doing.
              Thank you for choosing Zextons! `}
            </p>
          </div>
        </div>
      </div>
      </>
  );
}
