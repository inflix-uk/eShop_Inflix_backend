import { SelectedVariant } from "../../../../../types";

/**
 * Process variant metaSchemas and convert them to proper JSON-LD objects
 */
export const processVariantSchemas = (metaSchemas: string[] | any[]): any[] => {
  if (!metaSchemas || !Array.isArray(metaSchemas)) return [];

  return metaSchemas
    .map((schema, index) => {
      try {
        // If schema is already an object, return it
        if (typeof schema === "object" && schema !== null) {
          return schema;
        }

        // If schema is a string, parse it
        if (typeof schema === "string" && schema.trim()) {
          return JSON.parse(schema);
        }

        return null;
      } catch (error) {
        console.error(`Error processing schema at index ${index}:`, error);
        return null;
      }
    })
    .filter(schema => schema !== null && typeof schema === "object" && Object.keys(schema).length > 0);
};

/**
 * Update variant-specific JSON-LD schema markup in the document
 */
export const updateVariantSchemas = (selectedVariant: SelectedVariant | null): void => {
  if (typeof document === "undefined") return;

  try {
    // Remove ALL existing schema scripts except organization and breadcrumb
    const allSchemas = document.querySelectorAll('script[type="application/ld+json"]');
    allSchemas.forEach(script => {
      const schemaContent = script.textContent || '';
      try {
        const parsed = JSON.parse(schemaContent);
        // Keep organization and breadcrumb schemas, remove everything else
        if (parsed['@type'] !== 'Organization' && parsed['@type'] !== 'BreadcrumbList') {
          script.remove();
        }
      } catch (e) {
        // If we can't parse it, remove it to be safe
        script.remove();
      }
    });

    console.log(`Processing metaSchemas for variant: ${selectedVariant?.name}`);
    console.log(`MetaSchemas array:`, selectedVariant?.metaSchemas);

    // Add new variant schemas if available
    if (selectedVariant?.metaSchemas && Array.isArray(selectedVariant.metaSchemas)) {
      const processedSchemas = processVariantSchemas(selectedVariant.metaSchemas);

      console.log(`Processed ${processedSchemas.length} valid schemas out of ${selectedVariant.metaSchemas.length} total`);

      if (processedSchemas.length === 0) {
        console.log("No valid schemas found in metaSchemas array");
      }

      processedSchemas.forEach((schema, index) => {
        try {
          const scriptTag = document.createElement('script');
          scriptTag.type = 'application/ld+json';
          scriptTag.setAttribute('data-variant', 'true'); // Mark as variant schema
          scriptTag.textContent = JSON.stringify(schema);
          document.head.appendChild(scriptTag);
          console.log(`Added variant schema ${index + 1}:`, schema);
        } catch (error) {
          console.error(`Error adding variant schema at index ${index}:`, error);
        }
      });

    } else {
      console.log("No metaSchemas found or metaSchemas is not an array");
    }
  } catch (error) {
    console.error("Error updating variant schemas:", error);
  }
};

/**
 * Initialize variant schemas on page load
 */
export const initializeVariantSchemas = (selectedVariant: SelectedVariant | null): void => {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateVariantSchemas(selectedVariant);
    });
  } else {
    updateVariantSchemas(selectedVariant);
  }
};

/**
 * Get count of active variant schemas
 */
export const getVariantSchemasCount = (): number => {
  if (typeof document === "undefined") return 0;

  const variantSchemas = document.querySelectorAll('script[type="application/ld+json"][data-variant="true"]');
  return variantSchemas.length;
};