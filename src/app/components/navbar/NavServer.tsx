import Link from "next/link";
import type { NavbarItem } from "@/app/lib/features/navbarcategories/navbarTypes";
import { isNavbarCustom } from "@/app/lib/features/navbarcategories/navbarTypes";

interface NavServerProps {
  categories: NavbarItem[];
}

export default function NavServer({ categories }: NavServerProps) {
  return (
    <nav
      className="sr-only"
      aria-label="Site navigation for search engines only"
      role="navigation"
      itemScope
      itemType="https://schema.org/SiteNavigationElement"
    >
      <h1>Zextons - UK&apos;s Premium Refurbished Electronics Store</h1>
      <p>
        Browse all our product categories and pages - Hidden navigation for
        search engines
      </p>

      <h2>Shop by Category</h2>
      <ul>
        {categories.map((item) => {
          if (isNavbarCustom(item)) {
            const href = item.path.trim();
            const external = /^https?:\/\//i.test(href);
            return (
              <li key={item._id}>
                {external ? (
                  <a href={href} itemProp="url">
                    <span itemProp="name">{item.label}</span>
                  </a>
                ) : (
                  <Link href={href} itemProp="url">
                    <span itemProp="name">{item.label}</span>
                  </Link>
                )}
              </li>
            );
          }

          return (
            <li key={item._id}>
              <Link href={`/categories/${item.name.toLowerCase()}`} itemProp="url">
                <span itemProp="name">{item.name.replace(/-/g, " ")}</span>
              </Link>
              {item.subCategory && item.subCategory.length > 0 && (
                <ul>
                  {item.subCategory.map((subCat) => (
                    <li key={subCat}>
                      <Link
                        href={`/categories/${item.name.toLowerCase()}/${subCat.replace(/\s+/g, "-").toLowerCase()}`}
                        itemProp="url"
                      >
                        <span itemProp="name">{subCat}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h2>Important Pages</h2>
      <ul>
        <li>
          <Link href="/blogs">Blog</Link>
        </li>
        <li>
          <Link href="/why-buying-a-refurbished-iphone-is-a-good-idea">
            Why Buy Refurbished?
          </Link>
        </li>
        <li>
          <Link href="/customer-reviews">Customer Reviews</Link>
        </li>
        <li>
          <Link href="/recycle-mobile-phone">Bulk Recycling</Link>
        </li>
        <li>
          <Link href="/deals-and-discounts">Deals</Link>
        </li>
        <li>
          <Link href="/contact-us">Contact</Link>
        </li>
        <li>
          <Link href="/about-zextons">About</Link>
        </li>
        <li>
          <Link href="/faqs">FAQs</Link>
        </li>
        <li>
          <Link href="/terms-and-conditions">Terms</Link>
        </li>
        <li>
          <Link href="/privacy-policy">Privacy</Link>
        </li>
        <li>
          <Link href="/refund-and-return-policy">Returns</Link>
        </li>
        <li>
          <Link href="/shipping-policy">Shipping</Link>
        </li>
      </ul>
    </nav>
  );
}
