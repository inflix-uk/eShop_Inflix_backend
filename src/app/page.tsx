import "./globals.css";
import HeroSlider2 from "./components/HeroSlider2";
import Nav from "./components/navbar/Nav";
import HomeClient from "./HomeClient";
import { Metadata } from "next";
import {
  getHomepageFeatures,
  getFeatureImageUrl,
  type HomepageFeature,
} from "./services/homepageFeaturesService";
import { getHomepagePublicSeo } from "./services/homepageDataService";
import { getHomepageHeroBannersCached } from "./services/activeBannersPublicService";
import { getHomeServerCmsBundle } from "./lib/homeServerCms";
import { cmsPublicFetchInit } from "./lib/cmsPublicFetchInit";
import { cmsTimedFetch } from "./lib/cmsTimedFetch";
import {
  getDefaultHomepageJsonLdString,
  metaSchemaEntryToJsonLdString,
} from "./lib/homepageJsonLd";
import HomepageFeatureIcon from "./components/HomepageFeatureIcon";

export const revalidate = 30;

async function getMetaData() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await cmsTimedFetch(
      `${apiUrl}/get/static-meta-page/path/${encodeURIComponent("/Homepage")}`,
      { ...cmsPublicFetchInit() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch  {
    return null;
  }
}

// Default features shown when API fails or returns no data
const DEFAULT_FEATURES: HomepageFeature[] = [
  { _id: "1", title: "Fully Tested Devices", subtitle: "Buy with confidence" },
  {
    _id: "2",
    title: "18 Months Warranty",
    subtitle: "On all refurbished devices",
  },
  { _id: "3", title: "Free & Fast Delivery", subtitle: "For all orders" },
  { _id: "4", title: "30 Days Free Return", subtitle: "100% Refund" },
];

const HOME_FALLBACK_TITLE = "Zextons Tech Store";
const HOME_FALLBACK_DESCRIPTION = "Buy refurbished and new phones in the UK";

export async function generateMetadata(): Promise<Metadata> {
  const [metaData, homepageSeo] = await Promise.all([
    getMetaData(),
    getHomepagePublicSeo(),
  ]);

  const titleFromCms = homepageSeo?.metaTitle?.trim();
  const descFromCms = homepageSeo?.metaDescription?.trim();
  const keywordsFromCms =
    homepageSeo?.metaTags?.length ? homepageSeo.metaTags.join(", ") : undefined;

  const title =
    titleFromCms ||
    metaData?.titleTag ||
    HOME_FALLBACK_TITLE;
  const description =
    descFromCms ||
    metaData?.metaDescription ||
    HOME_FALLBACK_DESCRIPTION;
  const keywords =
    keywordsFromCms ?? metaData?.metaKeywords;

  const ogImage = `${process.env.NEXT_PUBLIC_API_URL}/uploads/web/Zextons.webp`;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    robots: "index, follow",
    openGraph: {
      siteName: "Zextons",
      title,
      url: "https://zextons.co.uk/",
      description,
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@ZextonsTechStore",
      title,
      description,
      images: [{ url: ogImage }],
    },
    alternates: {
      canonical: "https://zextons.co.uk/",
      languages: { "en-gb": "https://zextons.co.uk/" },
    },
  };
}

export default async function Home() {
  const [homepageSeo, heroBanners, cmsBundle, features] = await Promise.all([
    getHomepagePublicSeo(),
    getHomepageHeroBannersCached(),
    getHomeServerCmsBundle(),
    getHomepageFeatures().catch((error) => {
      console.error("[Home] Error fetching homepage features:", error);
      return [] as HomepageFeature[];
    }),
  ]);
  const displayFeatures =
    features.length > 0 ? features : DEFAULT_FEATURES;

  const adminJsonLdStrings = (homepageSeo?.metaSchema ?? [])
    .map((entry) => metaSchemaEntryToJsonLdString(entry))
    .filter((s): s is string => s != null && s.length > 0);

  const homepageJsonLdToRender =
    adminJsonLdStrings.length > 0
      ? adminJsonLdStrings
      : [getDefaultHomepageJsonLdString()];

  return (
    <>
      {homepageJsonLdToRender.map((json, index) => (
        <script
          key={`homepage-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: json }}
        />
      ))}
      <header className="relative">
        <nav className="" aria-label="Top">
          <Nav />
        </nav>
      </header>
      {/* Top hero: Admin → Banners only (`/get/banners/active`). Homepage Banners widgets are separate. */}
      <HeroSlider2 serverBanners={heroBanners} />
      {displayFeatures.length > 0 && (
        <div className="bg-white text-black py-3 border-b border-gray-100 shadow-lg">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-between sm:items-center">            {displayFeatures.map((feature) => {
              const iconUrl = feature.iconImage
                ? getFeatureImageUrl(feature.iconImage)
                : null;
              return (
                <div
                  key={feature._id}
                  className="flex items-center space-x-2 my-1"
                >
                  {iconUrl ? (
                    <HomepageFeatureIcon src={iconUrl} alt={feature.title} />
                  ) : (
                    <div
                      className="w-[25px] h-[25px] bg-primary rounded shrink-0"
                      aria-hidden
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-primary font-bold text-sm">
                      {feature.title}
                    </span>
                    <span className="text-xs">{feature.subtitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <HomeClient cmsPrefetch={cmsBundle} />
    </>
  );
}
