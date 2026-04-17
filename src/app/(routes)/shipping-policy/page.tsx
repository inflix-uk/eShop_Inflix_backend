import Nav from "@/app/components/navbar/Nav";
import Link from "next/link";
import FooterPageContent from "@/app/components/footer-pages/FooterPageContent";
import {
  fetchFooterPageBySlug,
  type FooterPage,
} from "@/app/services/footerPageService";
import { notFound } from "next/navigation";

const SHIPPING_SLUG = "shipping-policy";

export default async function ShippingPolicyPage() {
  let page: FooterPage | null = null;
  try {
    page = await fetchFooterPageBySlug(SHIPPING_SLUG);
  } catch {
    notFound();
  }

  if (!page) {
    notFound();
  }

  return (
    <>
      <header className="relative">
        <Nav />
      </header>
      <div className="max-w-7xl mx-auto p-6">
        <nav className="mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </nav>

        <FooterPageContent page={page} />
      </div>
    </>
  );
}
