export default function SubCategoryContent({
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
      {metaTitle && <h1 className="text-3xl font-bold mb-4">{metaTitle}</h1>}
      {metaDescription && <p className="text-lg mb-4">{metaDescription}</p>}

      {metaSchemas?.length > 0 && (
        <div style={{ display: "none" }}>
          {metaSchemas.map((schema, index) => renderSchema(schema, index))}
        </div>
      )}

      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
