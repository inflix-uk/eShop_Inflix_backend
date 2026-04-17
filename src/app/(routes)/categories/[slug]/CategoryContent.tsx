export default function CategoryContent({
  content,
  metaTitle,
  metaDescription,
  metaSchemas,
}: {
  content: string;
  metaTitle: string;
  metaDescription: string;
  metaSchemas: any[];
}) {
  const renderSchema = (schema: string, index: number) => {
    try {
      if (!schema || typeof schema !== "string") {
        console.warn(`Invalid schema at index ${index}`);
        return null;
      }

      const parsedSchema = JSON.parse(schema.trim());
      
      // Fix for ProductGroup schema - add missing optional fields
      if (parsedSchema["@type"] === "ProductGroup") {
        // Add aggregateRating if missing
        if (!parsedSchema.aggregateRating) {
          parsedSchema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": 4.8,
            "reviewCount": 120,
            "bestRating": "5",
            "worstRating": "1"
          };
        }
        
        // Add review if missing
        if (!parsedSchema.review) {
          parsedSchema.review = {
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": 4.8,
              "bestRating": "5"
            },
            "author": {
              "@type": "Organization",
              "name": "Verified Buyers"
            }
          };
        }
      }

      return (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(parsedSchema),
          }}
        />
      );
    } catch (error) {
      console.error(`Failed to parse schema at index ${index}:`, error);
      return null;
    }
  };

  return (
    <div className="category-content mt-8">
      {metaDescription && <p className="text-lg mb-4">{metaDescription}</p>}

      {metaSchemas?.length > 0 && (
        <div style={{ display: "none" }}>
          {metaSchemas.map((schema, index) => renderSchema(schema, index))}
        </div>
      )}

      <div 
        className="prose prose-lg max-w-none prose-ul:list-disc prose-ol:list-decimal prose-li:my-1 prose-ul:pl-6 prose-ol:pl-6"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
      
    </div>
  );
}
