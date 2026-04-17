import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ProductPage from "@/app/(routes)/products/[...slug]/ProductPage";
import Loading from "@/app/components/Loading";
import VariantLinksSSR from "@/app/(routes)/products/components/VariantLinksSSR";
import ProductSEOContent from "@/app/(routes)/products/components/ProductSEOContent";

// Force dynamic rendering since we use cache: "no-store" for fresh product data
export const dynamic = 'force-dynamic';

async function getProductData(productName: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get/product/by/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producturl: productName }),
       cache: "no-store"
    });

    if (!res.ok) {
      console.error(`Failed to fetch product data: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.product || null;
  } catch (error) {
    console.error("Error fetching product data:", error);
    return null;
  }
}

// Parse slug array into product URL and variant info
// URL format: /products/{productUrl} or /products/{productUrl}/{variantSlug}
function parseSlugArray(slugArray: string[]): { productUrl: string; variantSlug: string } {
  if (!slugArray || slugArray.length === 0) {
    return { productUrl: '', variantSlug: '' };
  }

  // First segment is always the product URL
  const productUrl = slugArray[0];

  // Second segment (if exists) is the variant slug
  const variantSlug = slugArray.length > 1 ? slugArray[1] : '';

  return { productUrl, variantSlug };
}

// Generate static params for popular products (optional - improves performance)
export async function generateStaticParams() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) return [];

    const res = await fetch(`${base}/get/popular/products`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const trimmed = text?.trim() ?? "";
    if (!trimmed) {
      console.warn(
        "[generateStaticParams] Empty body from /get/popular/products (skipping prerender paths)"
      );
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      console.error(
        "[generateStaticParams] Invalid JSON from /get/popular/products"
      );
      return [];
    }

    let list: unknown[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { products?: unknown[] }).products)
    ) {
      list = (parsed as { products: unknown[] }).products;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { data?: unknown[] }).data)
    ) {
      list = (parsed as { data: unknown[] }).data;
    } else {
      return [];
    }

    return list
      .slice(0, 100)
      .map((product: unknown) => {
        const p = product as { url?: string; name?: string };
        const slug =
          p.url ||
          (typeof p.name === "string"
            ? p.name.toLowerCase().replace(/\s+/g, "-")
            : "");
        return slug ? { slug: [slug] } : null;
      })
      .filter(
        (param): param is { slug: string[] } =>
          param != null && Boolean(param.slug[0])
      );
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

// Helper function to find matching variant from URL slug
// Uses slug field first (new SEO format), then variantId, then fuzzy match
function findVariantFromSlug(product: any, variantInfo: string) {
  if (!variantInfo || !product.variantValues || product.variantValues.length === 0) {
    return null;
  }

  const normalizedUrlSlug = variantInfo.toLowerCase().replace(/_/g, '-');

  // 1. Try exact match on slug field (new SEO format)
  const bySlug = product.variantValues.find((variant: any) => variant.slug === normalizedUrlSlug);
  if (bySlug) return bySlug;

  // 2. Try match on variantId
  const byVariantId = product.variantValues.find((variant: any) => variant.variantId === variantInfo);
  if (byVariantId) return byVariantId;

  // 3. Try fuzzy match on name (convert name to slug format and compare)
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/_/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  };

  const byNameFuzzy = product.variantValues.find((variant: any) => {
    if (!variant.name) return false;
    const nameSlug = generateSlug(variant.name);
    return nameSlug === normalizedUrlSlug;
  });
  if (byNameFuzzy) return byNameFuzzy;

  // 4. Fallback: Try partial match (all URL parts exist in variant name)
  const urlParts = normalizedUrlSlug.split('-').filter(Boolean);
  return product.variantValues.find((variant: any) => {
    if (!variant.name) return false;

    // Normalize variant name (e.g., "Excellent-Black (#000000)-64GB" -> "excellent black 64gb")
    const normalizedVariantName = variant.name
      .toLowerCase()
      .replace(/\s*\(#[0-9a-f]+\)/g, '') // Remove color codes like (#000000)
      .replace(/[-_]/g, ' '); // Replace dashes and underscores with spaces

    // Check if all URL parts are present in the variant name
    return urlParts.every(part => normalizedVariantName.includes(part));
  });
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { productUrl, variantSlug } = parseSlugArray(slug);
    const product = await getProductData(productUrl);

    // Build the full URL path for canonical
    const fullSlugPath = slug.join('/');

    if (!product) {
      return {
        title: "Product Not Found | Zextons Tech Store",
        description: "The requested product could not be found. Browse our collection of refurbished and new tech products.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    // Check if this is a variant-specific URL
    const selectedVariant = findVariantFromSlug(product, variantSlug);

    // Determine if we should use variant meta or product meta
    const isVariantSelected = !!(selectedVariant && variantSlug);

    let title, description, keywords;

    if (isVariantSelected) {
      // Variant is selected - use ONLY variant meta (even if empty, NO fallback to product meta)
      title = selectedVariant.metaTitle || '';
      description = selectedVariant.metaDescription || '';
      keywords = selectedVariant.metaKeywords || '';
    } else {
      // No variant selected - use base product Seo_Meta with fallbacks
      const productCondition = product.condition?.toLowerCase().includes('new') ? 'New' : 'Refurbished';
      const metaTitle = product.Seo_Meta?.metaTitle;
      const metaDescription = product.Seo_Meta?.metaDescription;
      const metaKeywords = product.Seo_Meta?.metaKeywords;

      title = metaTitle || `${product.name} ${productCondition} | ${product.brand || ''} | Zextons UK`.trim();

      const cleanDescription = product.Product_description?.replace(/<[^>]*>/g, '').trim() || product.description || '';
      description = metaDescription ||
        (cleanDescription ? cleanDescription.substring(0, 155) + '...' :
        `Buy ${productCondition} ${product.name} with 18-month warranty, free UK delivery & 30-day returns. Best prices guaranteed at Zextons.`);

      keywords = metaKeywords || [
        product.brand,
        product.name,
        product.category,
        productCondition.toLowerCase(),
        product.model,
        'UK delivery'
      ].filter(Boolean).join(', ');
    }

    // Use meta_Image if available, otherwise use Gallery_Images
    const metaImageUrl = product.meta_Image?.path
      ? `${process.env.NEXT_PUBLIC_API_URL}/${product.meta_Image.path}`
      : null;
    const galleryImages = product.Gallery_Images?.map((img: any) => `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`) || [];
    const images = metaImageUrl ? [metaImageUrl, ...galleryImages] : galleryImages;
    const canonicalUrl = `https://zextons.co.uk/products/${fullSlugPath}`;

    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Zextons Tech Store",
        images: images.slice(0, 4).map((img: string) => ({
          url: img,
          width: 800,
          height: 600,
          alt: product.name,
        })),
        type: "website",
        locale: "en_GB",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: images.slice(0, 1),
        site: "@ZextonsTech",
      },
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "Product | Zextons Tech Store",
      description: "Discover amazing deals on refurbished and new tech products at Zextons.",
    };
  }

}

export default async function Product({
  params,
}: {
    params: Promise<{ slug: string[] }>
}) {
  try {
    const { slug } = await params;

    // Validate slug format - must be an array with at least one element
    if (!slug || !Array.isArray(slug) || slug.length === 0 || slug.length > 2) {
      console.error('Invalid slug format:', slug);
      notFound();
    }

    const { productUrl, variantSlug } = parseSlugArray(slug);

    if (!productUrl) {
      console.error('Could not extract product URL from slug:', slug);
      notFound();
    }

    const product = await getProductData(productUrl);

    if (!product) {
      console.error('Product not found for productUrl:', productUrl);
      notFound();
    }

    // Validate required product data
    if (!product.name) {
      console.error('Product missing required name field:', product);
      notFound();
    }

    // Get schemas based on variant selection
    const selectedVariant = findVariantFromSlug(product, variantSlug);
    const isVariantSelected = !!(selectedVariant && variantSlug);

    let schemas: string[] = [];

    if (isVariantSelected) {
      // Variant is selected - use ONLY variant schemas (no fallback to product schemas)
      schemas = selectedVariant.metaSchemas?.filter((schema: string) => schema && schema.trim()) || [];
    } else {
      // No variant selected - use base product schemas
      schemas = product.Seo_Meta?.metaSchemas?.filter((schema: string) => schema && schema.trim()) || [];
    }

  return (
    <>
      {/* JSON-LD Structured Data Schemas */}
      {schemas.map((schema, index) => {
        try {
          // Parse to validate JSON and ensure it's valid
          const parsedSchema = typeof schema === 'string' ? JSON.parse(schema) : schema;
          return (
            <script
              key={`schema-${index}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(parsedSchema),
              }}
            />
          );
        } catch (error) {
          console.error('Invalid schema JSON at index', index, error);
          return null;
        }
      })}

      <VariantLinksSSR product={product} />
      <Suspense fallback={<Loading />}>
        <ProductPage product={product} initialVariantSlug={variantSlug} />
      </Suspense>
      <ProductSEOContent product={product} />
    </>
  );
  } catch (error) {
    console.error('Unexpected error in Product page:', error);
    notFound();
  }
}
