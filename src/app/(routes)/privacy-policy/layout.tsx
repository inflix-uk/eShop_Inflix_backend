import type { Metadata } from "next";

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/privacy-policy")}`,
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
      title: "Privacy Policy | Zextons Tech Store",
      description: "Privacy policy for Zextons Tech Store",
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
      url: "https://zextons.co.uk/privacy-policy",
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
      canonical: "https://zextons.co.uk/privacy-policy",
      languages: { "en-gb": "https://zextons.co.uk/privacy-policy" },
    },
  };
}

export default async function PrivacyandPolicyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      {children}
    </>
  );
}
