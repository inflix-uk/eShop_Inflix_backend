/**
 * Server-rendered hidden content for SEO.
 * Specs, Perks, FAQs, and Reviews live inside modals/client components
 * that only mount on user interaction, so crawlers never see them.
 * This component keeps the same content always in the DOM.
 */
export default function ProductSEOContent({ product }: { product: any }) {
  const specs = product?.product_Specifications || [];
  const faqs = (product?.faqDetails || []).filter(
    (faq: any) => faq.status === "Published" && faq.question && faq.answer
  );
  const hasDynamicPerks =
    product?.perks_and_benefits?.status &&
    product?.perks_and_benefits?.description;
  const reviews = product?.reviewDetails || [];

  return (
    <div className="sr-only">
      {specs.length > 0 && (
        <section aria-label="Product Specifications">
          <h2>Product Specifications</h2>
          {specs.map((spec: { key: string; value: string }, i: number) => (
            <h5 key={i}>{spec.key}: {spec.value}</h5>
          ))}
        </section>
      )}

      <section aria-label="Perks and Benefits">
        <h2>Perks &amp; Benefits</h2>
        {hasDynamicPerks ? (
          <div dangerouslySetInnerHTML={{ __html: product.perks_and_benefits.description }} />
        ) : (
          <>
            <h3>Warranty</h3>
            <h6>Refurbished devices include an 18-month warranty. If the item has a technical defect within 18 months, we will repair or replace it.</h6>
            <h6>All brand new devices come with a standard 12-month manufacturer warranty. With some brands, this warranty may be extended to up to 24 months.</h6>
            <h3>30-Day Return Policy</h3>
            <h6>You can return your item within the first 30 days of receiving it, no questions asked.</h6>
            <h3>Fast Free Shipping</h3>
            <h6>Enjoy fast, free delivery on all orders over £30.</h6>
            <h3>Customer Support</h3>
            <h6>We are here for you. Expect a response within 1 business day.</h6>
            <h3>Pay in Instalments</h3>
            <h6>Spread the cost with easy monthly payments over 3, 6, or 12 months using Klarna or PayPal.</h6>
          </>
        )}
      </section>

      {faqs.length > 0 && (
        <section aria-label="Frequently Asked Questions">
          <h2>FAQs</h2>
          {faqs.map((faq: { question: string; answer: string }, i: number) => (
            <div key={i}>
              <h3>{faq.question}</h3>
              <h6 dangerouslySetInnerHTML={{ __html: faq.answer }} />
            </div>
          ))}
        </section>
      )}

      {reviews.length > 0 && (
        <section aria-label="Customer Reviews">
          <h2>Customer Reviews</h2>
          {reviews.map((review: any, i: number) => (
            <h5 key={i}>{review.name || "Customer"} — {review.rating || 5}/5 stars: {review.comment || review.review || ""}</h5>
          ))}
        </section>
      )}
    </div>
  );
}
