import { Suspense } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import CategoryContent from "./CategoryContent";
import ProductList from "./ProductList";
// import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import TrustBoxWidget from "@/app/components/trusBoxWidget";
function toOriginalCase(slug: string) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}

async function getCategoryData(categoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetailsFull/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/categorydetailsFull/${encodeURIComponent(toOriginalCase(categoryName))}`,
        { next: { revalidate: 60 } }
      );
    }

    if (!res.ok) return null;

    const data = await res.json();
    return data.category || null;
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}

async function getProducts(categoryName: string) {
  try {
    let res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/get/products/category/${encodeURIComponent(categoryName)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok && categoryName !== toOriginalCase(categoryName)) {
      res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/products/category/${encodeURIComponent(toOriginalCase(categoryName))}`,
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

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const categoryName = (await params).slug;
  const categoryData = await getCategoryData(categoryName);
  const products = await getProducts(categoryName);

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
          <Link href="/categories" className="hover:underline">
            Categories
          </Link>
          <span className="mx-2">»</span>
          <span>{categoryName.replace(/-/g, " ")}</span>
        </nav>

        <div className="relative mb-5">
          {categoryData.bannerImage?.path ? (
            <Image
              className="rounded-xl w-full"
              src={`${process.env.NEXT_PUBLIC_API_URL}/${categoryData.bannerImage.path}`}
              alt={`${categoryName} Banner`}
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
          <ProductList initialProducts={products} categoryName={categoryName} />
        </Suspense>
        <TrustBoxWidget />
        <CategoryContent
          content={categoryData.content}
          metaTitle={categoryData.metaTitle}
          metaDescription={categoryData.metaDescription}
          metaSchemas={categoryData.metaSchemas}
        />
        
      </div>
      </>
  );
}
