import { ProductData } from "../../../../../types";

interface ReviewData {
  averageRating: number;
  totalReviews: number;
  reviews: any[];
}

export const generateOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Zextons Tech Store",
    "url": "https://zextons.co.uk",
    "logo": "https://zextons.co.uk/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+44-XXX-XXXX",
      "contactType": "customer service",
      "availableLanguage": "English"
    }
  };
};

export const generateProductSchema = (
  product: ProductData,
  slug: string,
  reviewData: ReviewData
) => {
  const { averageRating, totalReviews, reviews } = reviewData;

  // Get first variant for SKU/MPN/GTIN if not on product level
  const firstVariant = product.variantValues?.[0];

  // Calculate min and max prices from variantValues
  const prices = product.variantValues?.map((v: any) => parseFloat(v.salePrice) || v.Price).filter(Boolean) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Check if any variant is in stock
  const hasStock = product.variantValues?.some((v: any) => v.Quantity > 0) || false;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.Product_description?.replace(/<[^>]*>/g, '').substring(0, 200) || product.description,
    "image": product.Gallery_Images?.map((img: any) => `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`) || [],
    "sku": firstVariant?.SKU ,
    "mpn": firstVariant?.MPN || undefined,
    "gtin": firstVariant?.EIN || undefined,
    "productID": product._id,
    "productGroupID": product._id,
    ...(product.brand ? {
      "brand": {
        "@type": "Brand",
        "name": product.brand
      }
    } : {}),
    "manufacturer": {
      "@type": "Organization",
      "name": product.brand || "Original Manufacturer"
    },
    "category": product.category || "Electronics",
    ...(product.variantValues && product.variantValues.length > 0 ? {
      "hasVariant": product.variantValues.map((variant: any) => ({
        "@type": "Product",
        "name": variant.name || `${product.name} - ${variant.name}`,
        "description": product.Product_description?.replace(/<[^>]*>/g, '').substring(0, 200) || product.description || `${product.name} in ${variant.name}`,
        "image": variant.variantImages?.length > 0
          ? variant.variantImages.map((img: any) => `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`)
          : product.Gallery_Images?.map((img: any) => `${process.env.NEXT_PUBLIC_API_URL}/${img.path}`) || [],
        "sku": variant.SKU || variant._id,
        "mpn": variant.MPN || undefined,
        "gtin": variant.EIN || undefined,
        "productGroupID": product._id,
        "offers": {
          "@type": "Offer",
          "price": (variant.salePrice || variant.Price)?.toString(),
          "priceCurrency": "GBP",
          "availability": variant.Quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "itemCondition": variant.name?.toLowerCase().includes('new') || variant.name?.toLowerCase().includes('brand-new') ?
            "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": "0",
              "currency": "GBP"
            },
            "shippingDestination": {
              "@type": "DefinedRegion",
              "addressCountry": "GB"
            },
            "deliveryTime": {
              "@type": "ShippingDeliveryTime",
              "handlingTime": {
                "@type": "QuantitativeValue",
                "minValue": 0,
                "maxValue": 1,
                "unitCode": "DAY"
              },
              "transitTime": {
                "@type": "QuantitativeValue",
                "minValue": 1,
                "maxValue": 2,
                "unitCode": "DAY"
              }
            }
          },
          "hasMerchantReturnPolicy": {
            "@type": "MerchantReturnPolicy",
            "applicableCountry": "GB",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 30,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn"
          }
        }
      }))
    } : {}),
    "offers": {
      "@type": "AggregateOffer" as const,
      "url": `https://zextons.co.uk/products/${slug}`,
      "offerCount": product.variantValues?.length || 1,
      "lowPrice": minPrice,
      "highPrice": maxPrice,
      "priceCurrency": "GBP",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": hasStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": product.variantValues?.[0]?.name?.toLowerCase().includes("new") ? "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition",
      "seller": {
        "@type": "Organization",
        "name": "Zextons Tech Store",
        "url": "https://zextons.co.uk",
        "logo": "https://zextons.co.uk/logo.png"
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "0",
          "currency": "GBP"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "GB"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 1,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 2,
            "unitCode": "DAY"
          }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "GB",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      },
      "warranty": {
        "@type": "WarrantyPromise",
        "durationOfWarranty": {
          "@type": "QuantitativeValue",
          "value": 18,
          "unitCode": "MON"
        },
        "warrantyScope": product.variantValues?.[0]?.name?.toLowerCase().includes('new') ?
          "https://schema.org/NewCondition" : "https://schema.org/RefurbishedCondition"
      }
    },
    ...(averageRating > 0 && totalReviews > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": averageRating,
        "reviewCount": totalReviews,
        "bestRating": "5",
        "worstRating": "1"
      },
      "review": reviews.map((review: any) => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.name || "Anonymous"
        },
        "datePublished": new Date(review.DateTime || review.createdAt).toISOString().split('T')[0],
        "reviewBody": review.comment,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating,
          "bestRating": "5",
          "worstRating": "1"
        }
      }))
    } : {}),
    "url": `https://zextons.co.uk/products/${slug}`
  };
};

export const generateBreadcrumbSchema = (
  product: ProductData,
  slug: string
) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://zextons.co.uk"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": "https://zextons.co.uk/products"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.category || "Electronics",
        "item": `https://zextons.co.uk/categories/${encodeURIComponent(product.category || 'electronics')}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": product.name,
        "item": `https://zextons.co.uk/products/${slug}`
      }
    ]
  };
};