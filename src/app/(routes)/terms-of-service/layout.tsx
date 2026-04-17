import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return null;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/terms-of-service")}`,
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
      title: "Terms of Service",
      description: "Terms of service",
      robots: "index, follow",
    };
  }

  return {
    title: metaData.titleTag,
    description: metaData.metaDescription,
    keywords: metaData.metaKeywords,
    robots: "index, follow",
    openGraph: {
      title: metaData.titleTag,
      description: metaData.metaDescription,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: metaData.titleTag,
      description: metaData.metaDescription,
    },
  };
}

export default async function TermsOfServiceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaData = await getMetaData();

  return (
    <>
      <SpeedInsights />
      {metaData?.metaSchemas?.map((schema: string, index: number) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schema }}
        />
      ))}
      {children}
    </>
  );
}
