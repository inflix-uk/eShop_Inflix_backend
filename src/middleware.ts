import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Enforce lowercase URLs for /categories/ routes
  if (pathname.startsWith("/categories/")) {
    const lowercased = pathname.toLowerCase();
    if (pathname !== lowercased) {
      const url = request.nextUrl.clone();
      url.pathname = lowercased;
      return NextResponse.redirect(url, 301);
    }
  }

  // Redirect old /subcategory/ URLs to new /categories/ structure
  if (pathname.startsWith("/subcategory/")) {
    const subcategorySlug = pathname.replace("/subcategory/", "");

    if (!subcategorySlug) return NextResponse.next();

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get/subcategory/somedetails/${encodeURIComponent(subcategorySlug)}`,
        { next: { revalidate: 60 } }
      );

      if (res.ok) {
        const data = await res.json();
        const parentCategory = data.subcategoryDetails?.parentCategorySlug
          || data.subcategoryDetails?.parentCategory;

        if (parentCategory) {
          const url = request.nextUrl.clone();
          url.pathname = `/categories/${parentCategory.toLowerCase()}/${subcategorySlug.toLowerCase()}`;
          return NextResponse.redirect(url, 301);
        }
      }
    } catch (error) {
      console.error("Middleware redirect error:", error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/subcategory/:path*", "/categories/:path*"],
};
