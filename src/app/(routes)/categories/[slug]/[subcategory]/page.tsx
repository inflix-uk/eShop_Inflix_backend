import { Suspense } from "react";
import Nav from "@/app/components/navbar/Nav";
// import TopBar from "@/app/topbar/page";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SubCategoryContent from "./SubCategoryContent";
import ProductList from "./ProductList";
import TrustBoxWidget from "@/app/components/trusBoxWidget";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getSubCategoryData(subCategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(subCategoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && subCategoryName !== toOriginalCase(subCategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(toOriginalCase(subCategoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.subcategoryDetails || null;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}

async function getProducts(subCategoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/product/by/subcategory/${encodeURIComponent(subCategoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && subCategoryName !== toOriginalCase(subCategoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/product/by/subcategory/${encodeURIComponent(toOriginalCase(subCategoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.products || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}
export default async function SubCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}) {
  const { slug, subcategory } = await params;
  const categoryData = await getSubCategoryData(subcategory);
  const products = await getProducts(subcategory);
  console.log("categoryData:", JSON.stringify(categoryData, null, 2));
  if (!categoryData) {
    notFound();
  }
  return (
    <>
      <header className="relative">
        <nav className="" aria-label="Top">
          {/* <TopBar /> */}
          <Nav />
        </nav>
      </header>
      <div className="max-w-7xl mx-auto p-3">
        <nav className="mb-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">»</span>
          <Link href={`/categories/${slug}/`} className="hover:underline capitalize">
            {slug.replace(/-/g, " ")}
          </Link>
          <span className="mx-2">»</span>
          <span className="capitalize">{subcategory.replace(/-/g, " ")}</span>
        </nav>

        <div className="relative mb-5">
          {categoryData.banner?.path || categoryData.banner?.url ? (
            <Image
              className="rounded-xl w-full"
              src={categoryData.banner.url || `${process.env.NEXT_PUBLIC_API_URL}/${categoryData.banner.path}`}
              alt={`${subcategory} Banner`}
              width={1920}
              height={500}
            />
          ) : (
            <div className="rounded-xl w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No Banner Available</span>
            </div>
          )}
        </div>

        <Suspense fallback={<div>Loading products...</div>}>
          <ProductList
            initialProducts={products}
            subCategoryName={subcategory}
          />
        </Suspense>
        <TrustBoxWidget />
        <SubCategoryContent
          content={categoryData.content}
          metaTitle={categoryData.metaTitle}
          metaDescription={categoryData.metaDescription}
          metaSchemas={categoryData.metaSchemas}
        />
      </div>
      </>
  );
}
