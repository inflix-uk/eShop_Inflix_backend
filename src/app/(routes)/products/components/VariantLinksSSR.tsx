import { ProductData } from "../../../../../types";
import { generateVariantUrl } from "../utils/variantUtils";

/**
 * Server-side rendered component that generates SEO-friendly links to all product variants
 * This ensures search engines can discover and crawl all variant pages
 * Hidden from users (sr-only) but visible to search engine crawlers
 */
export default function VariantLinksSSR({ product }: { product: ProductData }) {
  // If no variants exist, don't render anything
  if (!product.variantValues || product.variantValues.length === 0) {
    return null;
  }

  return (
    <div className="sr-only" aria-hidden="true">
      {/* <h2>All Available Configurations for {product.name}</h2>
      <p>
        Browse all variants and configurations of {product.name}. Each link
        represents a specific combination of storage, color, and condition.
      </p> */}
      <ul>
        {product.variantValues.map((variant) => {
          const url = `/products/${product.producturl?.replace(/-\d{13}$/, "") ?? ""}`;
          return (
            <li key={variant._id}>
              <a href={url} title={product.name}>
                {product.name}
              </a>
            </li>
          );
        })}
      </ul>
      {/* <p>
        All variants include {product.has_warranty.status ? `${product.has_warranty.Warranty_duration} ${product.has_warranty.Warranty_type} warranty` : "warranty"},
        {product.is_refundable.status && ` ${product.is_refundable.refund_duration} ${product.is_refundable.refund_type} returns`},
        and fast UK delivery.
      </p> */}
    </div>
  );
}
