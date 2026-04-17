import SlugRouteHeader from "@/app/components/slug-route/SlugRouteHeader";
import Link from "next/link";
import React from "react";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
import { notFound } from "next/navigation";
import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";

interface FooterPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Main Footer Page Component
 */
export default async function FooterPage({ params }: FooterPageProps) {
  const { slug } = await params;
  
  // Decode the slug in case it was URL-encoded
  const decodedSlug = decodeURIComponent(slug);
  
  console.log(`[FooterPage] Rendering page with slug: "${decodedSlug}"`);
  
  const page = await fetchFooterPageBySlug(decodedSlug);

  if (!page) {
    console.warn(`[FooterPage] Page not found for slug: "${decodedSlug}"`);
    notFound();
  }

  // Log successful page load
  console.log(`[FooterPage] Successfully loaded page: "${page.title}" (slug: "${page.slug}")`);

  return (
    <>
      <SlugRouteHeader />

      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href={"/"} className="hover:underline">
            Home
          </Link>
        </nav>

        {/* Page Content */}
        <FooterPageContent page={page} />
      </div>

      </>
  );
}
