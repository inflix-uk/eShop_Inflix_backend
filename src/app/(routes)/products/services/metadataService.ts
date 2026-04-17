import { ProductData, SelectedVariant } from "../../../../../types";

/**
 * Generate variant title for metadata
 */
export const generateVariantTitle = (
  product: ProductData, 
  variant: SelectedVariant, 
  options: Record<string, string>
): string => {
  if (!product || !variant) return '';
  
  // Extract variant components
  const storage = (options as { storage: string })["storage"] || "";
  const color = (options as { color: string })["color"] || "";
  const condition = (options as { condition: string })["condition"] || "";
  
  // Create a formatted title
  let title = product.name || "";
  
  // Add variant details to the title
  const variantDetails = [condition, color, storage].filter(Boolean).join(" - ");
  if (variantDetails) {
    title = `${title} - ${variantDetails}`;
  }
  
  return title;
};

/**
 * Update page metadata based on selected variant
 */
export const updatePageMetadata = (
  product: ProductData,
  selectedVariant: SelectedVariant,
  options: Record<string, string>
): void => {
  if (!product || !selectedVariant) return;
  if (typeof document === "undefined" || typeof window === "undefined") return;
  
  // Create a title based on variant information if metaTitle is not available
  const variantTitle = selectedVariant.metaTitle || generateVariantTitle(product, selectedVariant, options);
  if (variantTitle) {
    document.title = variantTitle;
    
    // Update the title meta tag
    let metaTitleTag = document.querySelector('meta[property="og:title"]');
    if (!metaTitleTag) {
      metaTitleTag = document.createElement('meta');
      metaTitleTag.setAttribute('property', 'og:title');
      document.head.appendChild(metaTitleTag);
    }
    metaTitleTag.setAttribute('content', variantTitle);
    
    // Update the h1 title in the DOM if it exists
    const titleElements = document.querySelectorAll('h1.product-title');
    if (titleElements.length > 0) {
      titleElements.forEach(el => {
        el.textContent = variantTitle;
      });
    }
  }
  
  // Update meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  if (selectedVariant.metaDescription) {
    metaDescription.setAttribute('content', selectedVariant.metaDescription);
  }
  
  // Update meta keywords
  let metaKeywords = document.querySelector('meta[name="keywords"]');
  if (!metaKeywords) {
    metaKeywords = document.createElement('meta');
    metaKeywords.setAttribute('name', 'keywords');
    document.head.appendChild(metaKeywords);
  }
  if (selectedVariant.metaKeywords) {
    metaKeywords.setAttribute('content', selectedVariant.metaKeywords);
  }
};

/**
 * Update JSON-LD schema markup in the document
 */
export const updateSchemaMarkup = (schemas: any[]): void => {
  if (!schemas || schemas.length === 0) return;
  if (typeof document === "undefined") return;
  
  // Remove existing schema scripts
  const existingSchemas = document.querySelectorAll('script[type="application/ld+json"]');
  existingSchemas.forEach(script => script.remove());
  
  // Add new schema scripts
  schemas.forEach((schema, index) => {
    try {
      const parsedSchema = typeof schema === "string" ? JSON.parse(schema) : schema;
      
      // Ensure parsedSchema is a valid object
      if (parsedSchema && typeof parsedSchema === "object" && Object.keys(parsedSchema).length > 0) {
        const scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.textContent = JSON.stringify(parsedSchema);
        document.head.appendChild(scriptTag);
      }
    } catch (error) {
      console.error(`Error parsing schema at index ${index}:`, error);
    }
  });
};
