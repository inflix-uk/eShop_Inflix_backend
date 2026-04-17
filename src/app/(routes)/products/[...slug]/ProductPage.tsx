/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import TopBar from "@/app/topbar/page";
import Nav from "@/app/components/navbar/Nav";
import ProductBattery from "@/app/(routes)/products/components/ProductBattery";
import ProductCart from "@/app/(routes)/products/components/ProductCart";
import ProductPerks from "@/app/(routes)/products/components/ProductPerks";
import ProductFAQS from "@/app/(routes)/products/components/ProductFAQS";
import ProductTopSection, { TopSectionItem } from "@/app/(routes)/products/components/ProductTopSection";
import ProductWarranty from "@/app/(routes)/products/components/ProductWarranty";
import ProductSpecs from "@/app/(routes)/products/components/ProductSpecs";
import ProductVerifiedRefurbished from "@/app/(routes)/products/components/ProductVerifiedRefurbished";
import ProductSimOptions from "@/app/(routes)/products/components/ProductSimOptions";
import ProductNotIncluded from "@/app/(routes)/products/components/ProductNotIncluded";
import BuyNow from "@/app/(routes)/products/components/BuyNow";
import ImagePart from "@/app/(routes)/products/components/ImagePart";
import RecentlyViewed from "@/app/(routes)/products/components/RecentlyViewed";
import ProductsYouMayLike from "@/app/(routes)/products/components/ProductsYouMayLike";
import ProductSummary from "@/app/(routes)/products/components/ProductSummary";
import ProductDescription from "@/app/(routes)/products/components/ProductDescription";
import DialogList from "@/app/(routes)/products/components/DialogList";
import { useParams } from "next/navigation";
import {
  CartItem,
  ConditionPrices,
  ProductData,
  SelectedVariant,
  VariantDetails,
} from "../../../../../types";
import ComesWith, { ComesWithItem } from "../components/ComesWith";
import ComesWithSlider from "../components/ComesWithSlider";
import SimOptions from "../components/SimOptions";
import DeliverySection from "../components/DeliverySection";
import ProductInfo from "../components/ProductInfo";
import BatterySect from "../components/BatterySect";
import VariantFields from "../components/VariantFields";
// import ClipLoader from "react-spinners/ClipLoader";
import BreadCrumb from "@/app/components/common/Breadcrumb";
import NewsletterModal from "@/app/components/common/NewsletterModal";
import ConditionDescription from "../components/ConditionDescription";
import ReviewsDiv from "../components/ReviewsDiv";
import Loading from "@/app/components/Loading";
import ProductExpressCheckout from "../components/ProductExpressCheckout";

import TrustBoxWidget from "@/app/components/trusBoxWidget";
import ReliablePowerSection from "../components/product-detail/reliable-power-section";
import ProductShowcase from "../components/product-detail/whats-in-the-box-section";
import WarrantySection from "../components/product-detail/warranty-section";
import SustainabilitySection from "../components/product-detail/sustainability-section";
import CertificationSection from "../components/product-detail/certification-section";
import ReviewsSection from "../components/product-detail/reviews-section";
import {
  DATE_FORMAT_OPTIONS,
  DELIVERY_TIME_CUTOFF_HOUR,
  BATTERY_OPTION_NAMES,
  isStorageValue,
  parseStorageValue,
} from "../services/constants";
import {
  parseVariantParts,
  slugToReadable,
  parseUrlVariantParts,
} from "../utils/variantUtils";
import {
  addToCart as addToCartService,
  removeFromCart as removeFromCartService,
  updateCartQuantity as updateCartQuantityService,
  calculateTotalSalePrice as calculateTotalSalePriceService,
  getCart,
  saveCart,
} from "../services/cartService";
import { checkStockAvailability } from "@/utils/stockApi";
import { toast } from "react-toastify";

export default function ProductPage({ product, initialVariantSlug }: { product: ProductData; initialVariantSlug?: string }) {
  const { slug } = useParams();
  // slug is now an array: [productUrl] or [productUrl, variantSlug]
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const productName = slugArray[0];
  const urlVariantSlug = slugArray[1] || initialVariantSlug || '';
  const [products, setProducts] = useState<CartItem[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [selectedVariant, setSelectedVariant] =
    useState<SelectedVariant | null>(null);
  const [conditionPrices, setConditionPrices] = useState<ConditionPrices[]>([]);
  const [openConditionDescription, setOpenConditionDescription] =
    useState<boolean>(false);
  const [openCart, setOpenCart] = useState<boolean>(false);
  const [openBattery, setOpenBattery] = useState<boolean>(false);
  const [openPerks, setOpenPerks] = useState<boolean>(false);
  const [openFAQs, setOpenFAQs] = useState<boolean>(false);
  const [openTopSection, setOpenTopSection] = useState<boolean>(false);
  const [selectedTopSectionItem, setSelectedTopSectionItem] = useState<TopSectionItem | null>(null);
  const [openComesWithSlider, setOpenComesWithSlider] = useState<boolean>(false);
  const [selectedComesWithItem, setSelectedComesWithItem] = useState<ComesWithItem | null>(null);
  const [openSpecs, setOpenSpecs] = useState<boolean>(false);
  const [openWarranty, setOpenWarranty] = useState<boolean>(false);
  const [verifiedRefurbished, setVerifiedRefurbished] =
    useState<boolean>(false);
  const [simOptions, setSimOptions] = useState<boolean>(false);
  const [notIncluded, setNotIncluded] = useState<boolean>(false);
  const [reviewsDiv, setReviewsDiv] = useState<boolean>(false);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [selectedSim, setSelectedSim] = useState<string>("");
  const [isBuyButtonDisabled, setIsBuyButtonDisabled] =
    useState<boolean>(false);
  const [initialLoad, setInitialLoad] = useState<boolean>(true);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [variantDesc, setVariantDesc] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<string>("");
  const [variantSchemas, setVariantSchemas] = useState<any[]>([]);
  const [checkingStock, setCheckingStock] = useState<boolean>(false);
  const [stockData, setStockData] = useState<{
    availableQuantity: number;
    inStock: boolean;
  } | null>(null);

  const breadcrumb = [
    { name: product?.name, link: `/products/${productName}`, current: true },
  ];
  const today = new Date();
  // Get the current time
  const currentHour = today.getHours();
  // Calculate delivery dates based on the current time
  const deliveryStart = new Date(today);
  const deliveryEnd = new Date(today);
  if (currentHour < DELIVERY_TIME_CUTOFF_HOUR) {
    // Before 4 PM
    deliveryStart.setDate(today.getDate() + 1);
    deliveryEnd.setDate(today.getDate() + 4);
  } else {
    // After 4 PM
    deliveryStart.setDate(today.getDate() + 2);
    deliveryEnd.setDate(today.getDate() + 5);
  }
  // Format dates to a readable string
  const options = DATE_FORMAT_OPTIONS;
  const deliveryStartStr = deliveryStart.toLocaleDateString("en-GB", options);
  const deliveryEndStr = deliveryEnd.toLocaleDateString("en-GB", options);
  // Images
  const images = useMemo(() => {
    if (product?.productType?.type === "single") {
      return product?.Gallery_Images || [];
    } else {
      // For variant products, show variant images if selected, otherwise show default product images
      const hasVariantImages = selectedVariant?.variantImages && selectedVariant.variantImages.length > 0;

      if (hasVariantImages) {
        return selectedVariant.variantImages;
      }

      // If no complete variant selected, check if any selected option matches a varImgGroup
      // This handles any variant type (color, flavours, etc.) that has images
      if (product?.varImgGroup && Array.isArray(product.varImgGroup) && selectedOptions) {
        // Normalize function to handle both spaces and underscores
        const normalize = (str: string) => str?.toLowerCase()?.replace(/[\s_-]+/g, '_')?.trim() || '';

        for (const optionKey of Object.keys(selectedOptions)) {
          const selectedValue = normalize(selectedOptions[optionKey] || '');
          if (selectedValue) {
            const imgGroup = product.varImgGroup.find(
              (group: any) => normalize(group.name || '') === selectedValue
            );
            if (imgGroup?.varImg && imgGroup.varImg.length > 0) {
              return imgGroup.varImg;
            }
          }
        }
      }

      return product?.Gallery_Images || [];
    }
  }, [product, selectedVariant, selectedOptions]);
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <ClipLoader color={"#36D7B7"} loading={isLoading} size={100} />
  //     </div>
  //   );
  // }

  /**
   * Parse URL variant parts dynamically using product's variant names
   * Converts URL format (hyphens) back to slug format (underscores for multi-word values)
   */
  const parseUrlVariantPartsLocal = (urlParts: string[]): string[] => {
    if (!product?.variantNames) {
      return urlParts;
    }

    // Build a list of all option slugs from product's variant names
    const allOptionSlugs: string[] = [];
    product.variantNames.forEach((variant: any) => {
      variant.options?.forEach((option: any) => {
        if (option.slug) {
          allOptionSlugs.push(option.slug.toLowerCase());
        }
      });
    });

    // Sort by length descending to match longer slugs first
    allOptionSlugs.sort((a, b) => b.length - a.length);

    // Join URL parts and try to match against known slugs
    // URL now preserves underscores, so match directly
    const urlString = urlParts.join('-').toLowerCase();
    const matchedSlugs: string[] = [];
    let remainingUrl = urlString;

    for (const slug of allOptionSlugs) {
      // Match slug directly since URLs now preserve underscores
      if (remainingUrl.includes(slug)) {
        matchedSlugs.push(slug);
        remainingUrl = remainingUrl
          .replace(slug, '')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');
      }
    }

    return matchedSlugs;
  };
  const checkIfSoldOut = (variantCombination: {
    Quantity: number | null;
  }): boolean => {
    return (
      variantCombination &&
      (variantCombination.Quantity === null ||
        variantCombination.Quantity === 0)
    );
  };

  const updateSelectedVariant = (selectedOptions: Record<string, string>) => {
    // Normalize function for matching
    const normalize = (str: string) => str?.toLowerCase()?.replace(/[\s_-]+/g, '_')?.trim() || '';

    // Find matching variant based on all selected options
    const selectedVariantCombination = product?.variantValues?.find(
      (variant) => {
        return product.variantNames.every((v) => {
          const optionKey = v.name.trim();
          const optionKeyLower = optionKey.toLowerCase();
          let selectedOption = selectedOptions[optionKey] || selectedOptions[optionKeyLower];
          if (!selectedOption) return false;
          selectedOption = processOptionValue(optionKey, selectedOption);

          // Normalize both for comparison
          const normalizedVariantName = normalize(variant.name);
          const normalizedOption = normalize(selectedOption);

          return normalizedVariantName.includes(normalizedOption);
        });
      }
    );

    // Check if product has storage/condition structure (for condition prices display)
    const hasStorageVariant = product?.variantNames?.some(
      (v: any) => v.name.trim().toLowerCase() === "storage"
    );
    const hasConditionVariant = product?.variantNames?.some(
      (v: any) => v.name.trim().toLowerCase() === "condition"
    );

    const selectedStorage = selectedOptions["storage"] || selectedOptions["Storage"];
    const selectedColor = selectedOptions["color"] || selectedOptions["Color"];
    const hasStorageSelected = selectedStorage && selectedStorage.trim() !== "";

    // Only process condition prices for products with storage/condition structure
    if (hasStorageVariant && hasConditionVariant && hasStorageSelected) {
      // Filter variants based on storage (and color if available)
      const filteredVariants = product?.variantValues.filter((variant) => {
        const variantName = variant.name.toLowerCase();
        // Parse variant name using dynamic naming convention (underscore=same word, hyphen=separator)
        const parts = variantName.split('-');

        // Find storage part (matches pattern like "256gb", "1tb", "512gb_ssd")
        const storagePart = parts.find((part: string) => isStorageValue(part));
        // Find color part (not condition, not storage)
        const colorPart = parts.find((part: string) =>
          !isStorageValue(part) && parts.indexOf(part) > 0
        );

        const variantStorage = storagePart || "";
        const variantColor = colorPart || "";
        // Use storage directly (already includes disk type with underscore convention)
        const variantFullStorage = variantStorage;

        // Normalize values for comparison (handle both slug and readable formats)
        const normalizeValue = (val: string) => val?.toLowerCase().replace(/[\s_-]+/g, '_').trim() || "";
        const normalizedSelectedStorage = normalizeValue(selectedStorage);
        const normalizedSelectedColor = normalizeValue(selectedColor);
        const normalizedVariantStorage = normalizeValue(variantFullStorage);
        const normalizedVariantColor = normalizeValue(variantColor);

        // Filter by storage only if color is not selected yet
        if (!selectedColor || selectedColor.trim() === "") {
          return normalizedVariantStorage === normalizedSelectedStorage;
        }

        // Filter by both storage and color if both are selected
        return (
          normalizedVariantColor === normalizedSelectedColor &&
          normalizedVariantStorage === normalizedSelectedStorage
        );
      });
      const conditionPricesRaw =
        filteredVariants?.map((variant) => {
          const variantName = variant.name;
          const parts = parseVariantParts(variantName);

          let condition: string | null = null;
          let color: string | null = null;
          let storage: string | null = null;

          for (const part of parts) {
            if (isStorageValue(part)) {
              const parsed = parseStorageValue(part);
              storage = parsed.diskType
                ? `${parsed.capacity.toUpperCase()} ${parsed.diskType.toUpperCase()}`
                : parsed.capacity.toUpperCase();
            } else if (!condition) {
              condition = slugToReadable(part);
            } else if (!color) {
              color = slugToReadable(part);
            }
          }

          return {
            condition: `${condition} - ${color} - ${storage}`,
            conditionName: condition,
            price: variant.Price,
            salePrice: variant.salePrice,
          };
        }) ?? [];

      // If only storage is selected (no color), deduplicate by condition
      // Show the first available variant for each condition
      const conditionPrices =
        !selectedColor || selectedColor.trim() === ""
          ? conditionPricesRaw.filter(
              (item, index, self) =>
                index ===
                self.findIndex((t) => t.conditionName === item.conditionName)
            )
          : conditionPricesRaw;

      setConditionPrices(conditionPrices ?? []);

      // Only set selectedVariant if we have a complete match (storage + color + condition)
      if (selectedVariantCombination) {
        setSelectedVariant(selectedVariantCombination);
      } else if (selectedColor && selectedColor.trim() !== "") {
        // If color is selected but no complete match, clear variant
        setSelectedVariant(null);
      }
      // If only storage is selected, keep previous variant or set to null
      else {
        setSelectedVariant(null);
      }
    } else {
      // For products without storage/condition structure (e.g., flavours only)
      // Just set the selected variant directly if found
      setConditionPrices([]);
      if (selectedVariantCombination) {
        setSelectedVariant(selectedVariantCombination);
      }
    }
  };
  const findInitialSelectedVariant = () => {
    const variant = product?.variantValues.find((variant) => {
      return product.variantNames.every((v) => {
        const optionKey = v.name.trim();
        return variant.name.includes(optionKey);
      });
    });
    return variant;
  };
  useEffect(() => {
    if (
      product &&
      Array.isArray(product.variantValues) &&
      Array.isArray(product.variantNames) &&
      product.variantValues.length > 0
    ) {
      const initialSelectedVariant = findInitialSelectedVariant();

      if (initialSelectedVariant) {
        const initialSelectedOptions = product.variantNames.reduce(
          (acc: Record<string, string>, v) => {
            const optionKey = v.name.trim();
            const optionValue = initialSelectedVariant.name.includes(optionKey)
              ? "true"
              : "false";
            acc[optionKey] = optionValue;
            return acc;
          },
          {}
        );

        const isSelectedVariantSoldOut = checkIfSoldOut(initialSelectedVariant);
        setSelectedVariant(initialSelectedVariant);
        setIsBuyButtonDisabled(isSelectedVariantSoldOut);
        setSelectedOptions(initialSelectedOptions);
        updateSelectedVariant(initialSelectedOptions);
      }
    }
  }, [product]);
  useEffect(() => {
    if (!initialLoad && selectedVariant) {
      const isSelectedVariantSoldOut = checkIfSoldOut(selectedVariant);
      setIsBuyButtonDisabled(isSelectedVariantSoldOut);
    }
    setInitialLoad(false);
  }, [initialLoad, selectedVariant]);

  const processOptionValue = (variantName: string, optionValue: string | { value?: string; slug?: string; name?: string }) => {
    // Handle object values (extract string from value, slug, or name property)
    let rawValue: string;
    if (typeof optionValue === 'object' && optionValue !== null) {
      rawValue = optionValue.value || optionValue.slug || optionValue.name || '';
    } else {
      rawValue = String(optionValue || '');
    }

    let processedValue = rawValue.trim();
    if (variantName.toLowerCase() === "color") {
      // Remove color codes like "(#000000)"
      processedValue = processedValue.replace(/\s*\(#\w+\)/, "").trim();
    }
    // Keep spaces between multi-word conditions like 'brand new'
    if (variantName.toLowerCase() === "condition") {
      return processedValue.toLowerCase().trim();
    }
    return processedValue.toLowerCase();
  };
  const handleOptionChange = (variantName: string, selectedOption: any) => {
    const processedSelectedOption = processOptionValue(
      variantName,
      selectedOption
    );

    setSelectedOptions((prevSelectedOptions) => {
      const newSelectedOptions = {
        ...prevSelectedOptions,
        [variantName.trim()]: processedSelectedOption,
      };

      const selectedVariantCombination =
        product?.variantValues.find((variant) => {
          return product.variantNames.every((v) => {
            const optionKey = v.name.trim();
            const optionKeyLower = optionKey.toLowerCase();

            // Case-insensitive key lookup
            let optionValue = newSelectedOptions[optionKey] ||
              newSelectedOptions[optionKeyLower] ||
              newSelectedOptions[optionKey.charAt(0).toUpperCase() + optionKey.slice(1).toLowerCase()];

            if (!optionValue) return false;

            optionValue = processOptionValue(optionKey, optionValue);

            // Normalize variant name for matching (handle underscores and dashes)
            const normalizedVariantName = variant.name
              .toLowerCase()
              .replace(/_/g, ' ')  // Convert underscores to spaces
              .replace(/-/g, ' '); // Convert dashes to spaces

            // Normalize option value (handle spaces and underscores)
            const normalizedOptionValue = optionValue
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/-/g, ' ')
              .trim();

            // Check if the option value exists in the variant name
            return normalizedVariantName.includes(normalizedOptionValue);
          });
        }) ?? null;
      const isSelectedVariantSoldOut = selectedVariantCombination
        ? checkIfSoldOut({ Quantity: selectedVariantCombination.Quantity })
        : true;

      setSelectedVariant(selectedVariantCombination as VariantDetails | null);
      setIsBuyButtonDisabled(isSelectedVariantSoldOut);
      updateSelectedVariant(newSelectedOptions);

      // Immediately update URL after state changes
      setTimeout(() => {
        updateProductUrl(selectedVariantCombination, newSelectedOptions);
      }, 0);

      return newSelectedOptions;
    });
  };

  const findVariant = (selectedOptions: Record<string, string>) => {
    return product?.variantValues.find((variant: any) => {
      return product.variantNames.every((v) => {
        const optionKey = v.name.trim();
        const optionKeyLower = optionKey.toLowerCase();

        // Case-insensitive key lookup
        let optionValue = selectedOptions[optionKey] ||
          selectedOptions[optionKeyLower] ||
          selectedOptions[optionKey.charAt(0).toUpperCase() + optionKey.slice(1).toLowerCase()];

        if (!optionValue) return false;

        optionValue = processOptionValue(optionKey, optionValue);

        // Normalize variant name for matching (handle underscores and dashes)
        const normalizedVariantName = variant.name
          .toLowerCase()
          .replace(/_/g, ' ')  // Convert underscores to spaces
          .replace(/-/g, ' '); // Convert dashes to spaces

        // Normalize option value (handle spaces and underscores)
        const normalizedOptionValue = optionValue
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/-/g, ' ')
          .trim();

        // Check if the option value exists in the variant name
        return normalizedVariantName.includes(normalizedOptionValue);
      });
    });
  };
  const initialOptionsSet = useRef(false);
  useEffect(() => {
    if (product && product.variantNames && !initialOptionsSet.current) {
      const initialSelectedOptions: { [key: string]: string } = {};
      let variantFound = false;

      // NEW URL FORMAT: variant slug comes as second segment /products/{productUrl}/{variantSlug}
      // Use urlVariantSlug which is already extracted from the URL path array
      const variantInfo = urlVariantSlug;

      // Only process variants if they exist in the URL
      if (variantInfo) {
        // DYNAMIC: Parse URL variant parts using product's variant names
        const urlVariantParts = variantInfo.split("-");
        const parsedSlugs = parseUrlVariantPartsLocal(urlVariantParts);

        // Build a map of option slugs to their variant name
        const optionSlugToVariantName: { [slug: string]: string } = {};
        product.variantNames.forEach((variant: any) => {
          const variantName = variant.name.trim();
          variant.options?.forEach((option: any) => {
            const slug = option.slug?.toLowerCase();
            if (slug) {
              optionSlugToVariantName[slug] = variantName;
            }
          });
        });

        // Match parsed slugs to their variant names
        // Convert slug to the format used by processOptionValue (hyphens → spaces)
        parsedSlugs.forEach((slug) => {
          const variantName = optionSlugToVariantName[slug];
          if (variantName) {
            // Convert hyphen-separated slug to space-separated for matching with processOptionValue
            // "refurbished-good" → "refurbished good"
            // "titanium-black" → "titanium black"
            const normalizedValue = slug.replace(/-/g, ' ');
            initialSelectedOptions[variantName] = normalizedValue;
          }
        });

        const selectedVariantFromURL = findVariant(initialSelectedOptions);

        if (selectedVariantFromURL) {
          setSelectedVariant(selectedVariantFromURL);
          setSelectedOptions(initialSelectedOptions);
          updateSelectedVariant(initialSelectedOptions);
          initialOptionsSet.current = true;
          variantFound = true;
        } else {
          console.warn(
            "No matching variant found for selected options from URL"
          );
        }
      }

      // No auto-selection - let user select all options manually
      if (!variantFound) {
        setSelectedOptions({});
        setSelectedVariant(null);
        initialOptionsSet.current = true;
      }
    }
  }, [
    product,
    urlVariantSlug,
    setSelectedVariant,
    updateSelectedVariant,
    setSelectedOptions,
    findVariant,
  ]);

  // Check stock when variant changes or for single products
  useEffect(() => {
    const checkVariantStock = async () => {
      if (!product) return;

      const isSingleProduct = product?.productType?.type === "single";

      // For variant products, wait for a variant to be selected
      if (!isSingleProduct && !selectedVariant) return;

      try {
        const productIdToCheck = product._id;
        const variantIdToCheck = isSingleProduct
          ? undefined
          : selectedVariant?._id;

        const stockCheck = await checkStockAvailability(
          productIdToCheck,
          variantIdToCheck
        );

        if (stockCheck.success && stockCheck.data) {
          setStockData({
            availableQuantity: stockCheck.data.availableQuantity,
            inStock: stockCheck.data.inStock,
          });

          // Update button disable state based on stock
          const isOutOfStock =
            !stockCheck.data.inStock || stockCheck.data.availableQuantity === 0;
          if (isOutOfStock) {
            setIsBuyButtonDisabled(true);
          } else {
            // Re-enable button if stock is available
            setIsBuyButtonDisabled(false);
          }
        }
      } catch (error) {
        console.error("Error checking variant stock:", error);
      }
    };

    checkVariantStock();
  }, [selectedVariant, product]);

  // Cart Data
  useEffect(() => {
    const cart = getCart();
    setProducts(cart);
  }, []);

  // Refresh cart when cart modal is opened
  useEffect(() => {
    if (openCart) {
      const cart = getCart();
      setProducts(cart);
    }
  }, [openCart]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Function to update product URL based on selected options
  // Function to generate a title based on variant information
  const generateVariantTitle = (
    product: ProductData,
    variant: SelectedVariant,
    options: Record<string, string>
  ) => {
    if (!product || !variant) return "";

    // Extract variant components
    const storage = (options as { storage: string })["storage"] || "";
    const color = (options as { color: string })["color"] || "";
    const condition = (options as { condition: string })["condition"] || "";

    // Create a formatted title
    let title = product.name || "";

    // Add variant details to the title
    const variantDetails = [condition, color, storage]
      .filter(Boolean)
      .join(" - ");
    if (variantDetails) {
      title = `${title} - ${variantDetails}`;
    }

    return title;
  };

  const updateProductUrl = useCallback(
    (selectedVariant: any, currentOptions: Record<string, string>) => {
      if (!product || !product.producturl) return;

      // DYNAMIC: Get existing variants in their original order from product
      const orderedExistingVariants = product?.variantNames?.map((v: any) =>
        v?.name?.trim().toLowerCase()
      ) || [];

      // Build selections object for existing variants only
      const selections: { [key: string]: string } = {};
      for (const variantName of orderedExistingVariants) {
        selections[variantName] = currentOptions[variantName] || "";
      }

      // Check if ALL existing variants are selected
      const hasAllRequiredVariants = orderedExistingVariants.every(
        (variantName) => selections[variantName] && selections[variantName].trim() !== ""
      );

      const baseSlug = product.producturl?.replace(/-\d{13}$/, "") ?? product.producturl;

      if (!hasAllRequiredVariants) {
        const expectedUrl = `/products/${baseSlug}`;
        if (location.pathname !== expectedUrl) {
          window.history.replaceState({}, "", expectedUrl);
          updateCanonicalUrl(baseSlug);
        }
        return;
      }

      const toUrlSlug = (value: string): string => {
        if (!value) return "";
        return value
          .toLowerCase()
          .replace(/_/g, "-")
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-+/g, "-");
      };

      let variantName: string;

      if (selectedVariant && selectedVariant.slug) {
        variantName = selectedVariant.slug;
      } else {
        variantName = orderedExistingVariants
          .map((variantKey) => selections[variantKey])
          .filter(Boolean)
          .map(toUrlSlug)
          .join("-");
      }

      const expectedUrl = `/products/${baseSlug}/${variantName}`;

      if (location.pathname !== expectedUrl) {
        window.history.replaceState({}, "", expectedUrl);
        updateCanonicalUrl(`${baseSlug}/${variantName}`);
      }
    },
    [product]
  );

  // Function to update canonical URL tag
  const updateCanonicalUrl = (productUrlWithVariant: string) => {
    // Find existing canonical link or create a new one
    let canonicalLink = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;

    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.rel = "canonical";
      document.head.appendChild(canonicalLink);
    }

    // Update the href attribute with the new URL
    const fullCanonicalUrl = `${window.location.origin}/products/${productUrlWithVariant}`;
    canonicalLink.href = fullCanonicalUrl;
  };

  // Initial URL update on component mount and when product/variant changes
  useEffect(() => {
    if (product && selectedVariant && selectedOptions) {
      updateProductUrl(selectedVariant, selectedOptions);

      // Update page metadata when variant changes
      // Create a title based on variant information if metaTitle is not available
      const variantTitle =
        selectedVariant.metaTitle ||
        generateVariantTitle(product, selectedVariant, selectedOptions);
      if (variantTitle) {
        document.title = variantTitle;

        // Also update the title meta tag
        let metaTitleTag = document.querySelector('meta[property="og:title"]');
        if (!metaTitleTag) {
          metaTitleTag = document.createElement("meta");
          metaTitleTag.setAttribute("property", "og:title");
          document.head.appendChild(metaTitleTag);
        }
        metaTitleTag.setAttribute("content", variantTitle);

        // Update the h1 title in the DOM if it exists
        const titleElements = document.querySelectorAll("h1.product-title");
        if (titleElements.length > 0) {
          titleElements.forEach((el) => {
            el.textContent = variantTitle;
          });
        }
      }

      // Update meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      if (selectedVariant.metaDescription) {
        metaDescription.setAttribute(
          "content",
          selectedVariant.metaDescription
        );
      }

      // Update meta keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement("meta");
        metaKeywords.setAttribute("name", "keywords");
        document.head.appendChild(metaKeywords);
      }
      if (selectedVariant.metaKeywords) {
        metaKeywords.setAttribute("content", selectedVariant.metaKeywords);
      }
    }
  }, [product, selectedVariant, selectedOptions, updateProductUrl]);

  // Set canonical URL on initial page load
  useEffect(() => {
    if (product && product.producturl) {
      // Get current URL path without domain
      const currentPath = window.location.pathname;
      const productSlug =
        currentPath.split("/products/")[1] || (product.producturl?.replace(/-\d{13}$/, "") ?? "");

      // Update canonical URL with current path
      updateCanonicalUrl(productSlug);
    }
  }, [product]);

  const addToCart = async (
    variant: { [x: string]: string; _id: string } | null
  ): Promise<boolean> => {
    if (!variant) {
      toast.error("Please select a variant before adding to cart");
      return false;
    }

    // Set loading state
    setCheckingStock(true);

    try {
      // Determine if this is a single product or variant product
      const isSingleProduct = product?.productType?.type === "single";
      const productIdToCheck = isSingleProduct ? product._id : product._id;
      const variantIdToCheck = isSingleProduct ? undefined : variant._id;

      // Check stock availability from API
      const stockCheck = await checkStockAvailability(
        productIdToCheck,
        variantIdToCheck
      );

      if (!stockCheck.success || !stockCheck.data) {
        toast.error("Failed to check stock availability. Please try again.");
        setCheckingStock(false);
        return false;
      }

      const { availableQuantity, inStock } = stockCheck.data;

      // Store stock data for display
      setStockData({ availableQuantity, inStock });

      // Check if item is out of stock
      if (!inStock || availableQuantity === 0) {
        toast.error(
          `Sorry, "${variant.name || product.name}" is currently out of stock.`
        );
        setCheckingStock(false);
        return false;
      }

      // Check if adding one more would exceed available stock
      const cart = getCart();
      const existingItem = cart.find(
        (item: CartItem) => item._id === variant._id
      );
      const currentQtyInCart = existingItem ? existingItem.qty : 0;
      const newTotalQty = currentQtyInCart + 1;

      if (newTotalQty > availableQuantity) {
        toast.warning(
          `Only ${availableQuantity} item${
            availableQuantity === 1 ? "" : "s"
          } available. You already have ${currentQtyInCart} in your cart.`
        );
        setCheckingStock(false);
        return false;
      }

      // Stock is available, proceed with adding to cart
      const updatedCart = addToCartService(
        variant,
        product,
        selectedSim,
        updatedPrice
      );
      setProducts(updatedCart);
      setCheckingStock(false);
      return true;
    } catch (error) {
      console.error("Error checking stock:", error);
      toast.error("Failed to add to cart. Please try again.");
      setCheckingStock(false);
      return false;
    }
  };

  const removeFromCart = (id: string) => {
    const updatedCart = removeFromCartService(id);
    setProducts(updatedCart);
  };
  const updateCartQuantity = (quantity: number, id: string) => {
    const updatedCart = updateCartQuantityService(quantity, id);
    setProducts(updatedCart);
  };
  const calculateTotalSalePrice = calculateTotalSalePriceService;
  // Batter option
  const batteryJson = JSON.parse(product?.battery?.[0] || "{}");
  const batteryPrice = batteryJson?.batteryPrice
    ? parseFloat(batteryJson.batteryPrice)
    : 0;
  const standardBatteryPrice = selectedVariant && selectedVariant.salePrice != null && !isNaN(Number(selectedVariant.salePrice))
    ? parseFloat(selectedVariant.salePrice).toFixed(2)
    : product?.variantValues && product.variantValues.length > 0 && product.variantValues[0]?.salePrice != null
    ? parseFloat(product?.variantValues[0]?.salePrice).toFixed(2)
    : "0.00";

  const initialBatteryOption = `£${standardBatteryPrice}`;
  const [updatedPrice, setUpdatedPrice] = useState<number>(
    parseFloat(standardBatteryPrice.toString())
  );

  const [selectedBatteryOption, setSelectedBatteryOption] = useState("");
  useEffect(() => {
    setSelectedBatteryOption(initialBatteryOption);
    setUpdatedPrice(parseFloat(standardBatteryPrice.toString()));
  }, [initialBatteryOption, standardBatteryPrice]);

  // Update schemas when selectedVariant changes
  useEffect(() => {
    if (selectedVariant) {
      // Process schemas and update state instead of direct DOM manipulation
      if (
        selectedVariant.metaSchemas &&
        Array.isArray(selectedVariant.metaSchemas)
      ) {
        const processedSchemas = selectedVariant.metaSchemas
          .filter(
            (schema: any) =>
              schema && (typeof schema === "string" ? schema.trim() : true)
          )
          .map((schema: any) => {
            try {
              return typeof schema === "string" ? JSON.parse(schema) : schema;
            } catch (e) {
              console.error("Error parsing schema:", e);
              return null;
            }
          })
          .filter(
            (schema: any) =>
              schema &&
              typeof schema === "object" &&
              Object.keys(schema).length > 0
          );

        setVariantSchemas(processedSchemas);
      } else {
        setVariantSchemas([]);
      }
    }
  }, [selectedVariant]);

  const handleBatteryOptionChange = (selectedOption: string) => {
    setSelectedBatteryOption(selectedOption);
    const selectedVariantId = selectedVariant?._id;
    if (selectedOption === `£${batteryPrice.toFixed(2)}`) {
      const standardPrice = selectedVariant?.salePrice
        ? parseFloat(selectedVariant.salePrice)
        : 0;
      const newPrice = standardPrice + parseFloat(batteryPrice.toFixed(2));
      setUpdatedPrice(newPrice);

      // Update the salePrice of the product in the cart
      const cart = getCart();
      const existingProductIndex = cart.findIndex(
        (item: CartItem) => item._id === selectedVariantId
      );
      if (existingProductIndex !== -1) {
        cart[existingProductIndex].salePrice = newPrice;
        saveCart(cart);
        setProducts(cart);
      }
    } else if (selectedOption === initialBatteryOption) {
      setUpdatedPrice(parseFloat(standardBatteryPrice.toString()));

      // Update the salePrice of the product in the cart
      const cart = getCart();

      const existingProductIndex = cart.findIndex(
        (item: CartItem) => item._id === selectedVariantId
      );
      if (existingProductIndex !== -1) {
        cart[existingProductIndex].salePrice = parseFloat(
          standardBatteryPrice.toString()
        );
        saveCart(cart);
        setProducts(cart);
      }
    }
  };
  const batteryOptions = [
    {
      name: BATTERY_OPTION_NAMES.STANDARD,
      value: `£${standardBatteryPrice}`,
    },
    {
      name: BATTERY_OPTION_NAMES.NEW,
      value: `£${batteryPrice.toFixed(2)}`,
    },
  ];
  const batteryStatus = product?.battery?.[0]
    ? JSON.parse(product.battery[0]).status
    : false;
  const totalSalePrice = calculateTotalSalePrice(products);
  return (
    <>
      {/* Render variant schemas in React */}
      {variantSchemas.map((schema, index) => (
        <script
          key={`variant-schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <NewsletterModal mode="product" />
      <header className="relative">
        {/* <TopBar /> */}
        <Nav />
      </header>
      <BreadCrumb
        breadcrumb={breadcrumb.map((item) => ({
          ...item,
          name: item.name ?? "",
        }))}
      />

      <main className="mx-auto max-w-7xl sm:px-6 sm:pt-16 lg:px-8 md:pb-20 pb-10">
        {/* All JSON-LD structured data removed - handled in page.tsx server component for proper SEO */}
        <div className="mx-auto max-w-2xl lg:max-w-none">
          {/* Product */}
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
            {/* Image gallery */}
            <ImagePart
              images={images}
              product={product}
              selectedVariant={selectedVariant}
              isZoomed={isZoomed}
              setIsZoomed={setIsZoomed}
              isOutOfStock={isBuyButtonDisabled}
              checkingStock={checkingStock}
              stockData={stockData}
            />
            {/* Product info */}
            <div
              className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0"
              data-product-details
            >
              <ProductInfo
                product={product}
                totalReviews={totalReviews}
                averageRating={averageRating}
                selectedOptions={selectedOptions}
                selectedVariant={selectedVariant}
              />

              <DeliverySection
                product={product}
                isZoomed={isZoomed}
                topSectionItemsPopulated={product?.topSectionItemsPopulated}
                onItemClick={(item: TopSectionItem) => {
                  setSelectedTopSectionItem(item);
                  setOpenTopSection(true);
                }}
              />
              <div
                className={`mt-6 space-y-5 relative ${
                  isZoomed ? "-z-10" : "z-0"
                }`}
              >
                <VariantFields
                  product={product}
                  setOpenConditionDescription={setOpenConditionDescription}
                  setVariantDesc={setVariantDesc}
                  setActiveTab={setActiveTab}
                  selectedOptions={selectedOptions}
                  handleOptionChange={handleOptionChange}
                  processOptionValue={processOptionValue}
                  checkIfSoldOut={checkIfSoldOut}
                  conditionPrices={conditionPrices}
                />
                <BatterySect
                  batteryStatus={batteryStatus}
                  batteryOptions={batteryOptions}
                  selectedBatteryOption={selectedBatteryOption}
                  handleBatteryOptionChange={handleBatteryOptionChange}
                  setOpenBattery={setOpenBattery}
                />
                {/* Comes With */}
                <ComesWith
                  product={product}
                  comesWithItemsPopulated={product?.comesWithItemsPopulated}
                  onItemClick={(item: ComesWithItem) => {
                    setSelectedComesWithItem(item);
                    setOpenComesWithSlider(true);
                  }}
                />

                <SimOptions
                  product={product}
                  selectedSim={selectedSim}
                  setSelectedSim={setSelectedSim}
                  setNotIncluded={setNotIncluded}
                />
              </div>
              <div className="flex justify-center my-6">
                <klarna-placement
                  data-key="top-strip-promotion-badge"
                  data-locale="en-GB"
                ></klarna-placement>
              </div>

              {/* Express Checkout - Apple Pay / Google Pay */}
              <ProductExpressCheckout
                product={product}
                selectedVariant={selectedVariant}
                updatedPrice={updatedPrice}
                disabled={isBuyButtonDisabled || !selectedVariant}
              />

              {/* summary/spec Button */}
              <DialogList
                product={product}
                selectedVariant={selectedVariant}
                openFAQs={openFAQs}
                setOpenFAQs={setOpenFAQs}
                openPerks={openPerks}
                setOpenPerks={setOpenPerks}
                openSpecs={openSpecs}
                setOpenSpecs={setOpenSpecs}
                checkIfSoldOut={checkIfSoldOut}
                isBuyButtonDisabled={isBuyButtonDisabled}
                setOpenCart={setOpenCart}
                isZoomed={isZoomed}
                addToCart={addToCart}
                reviewsDiv={reviewsDiv}
                setReviewsDiv={setReviewsDiv}
              />
            </div>
          </div>
          <div>
            <ReviewsDiv
              product={product}
              reviewsDiv={reviewsDiv}
              isZoomed={isZoomed}
              averageRating={averageRating}
              setAverageRating={setAverageRating}
              totalReviews={totalReviews}
              setTotalReviews={setTotalReviews}
            />

            <TrustBoxWidget />
            <Suspense fallback={<Loading />}>
              <RecentlyViewed product={product!} />
            </Suspense>
            <Suspense fallback={<Loading />}>
              <ProductsYouMayLike
                productId={product._id}
                currentProductName={product.name}
              />
            </Suspense>
            <div className="max-w-screen-xl mx-auto w-full px-4">
              <div className="bg-white rounded-lg shadow-xl border border-gray-200  px-4 sm:px-6 py-3 relative -z-20">
                <ProductSummary product={product} />
                <ProductDescription product={product} />
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Only show product-detail components for Refurbished products */}
      {product.condition === "Refurbished" && (
        <>
          <ReliablePowerSection productName={product.name} />
          <ProductShowcase productName={product.name} />
          <WarrantySection productName={product.name} />
          <SustainabilitySection productName={product.name} />
          <CertificationSection productName={product.name} />
          <ReviewsSection productName={product.name} product={product} />
        </>
      )}
      <ProductBattery
        openBattery={openBattery}
        setOpenBattery={setOpenBattery}
      />
      <BuyNow
        setOpenCart={setOpenCart}
        product={product}
        deliveryStartStr={deliveryStartStr}
        deliveryEndStr={deliveryEndStr}
        selectedVariant={selectedVariant}
        selectedSim={selectedSim}
        addToCart={addToCart}
        selectedOptions={selectedOptions}
        isBuyButtonDisabled={isBuyButtonDisabled}
        updatedPrice={updatedPrice}
        checkingStock={checkingStock}
        stockData={stockData}
      />

      <ProductCart
        openCart={openCart}
        setOpenCart={setOpenCart}
        isZoomed={isZoomed}
        totalSalePrice={Number(totalSalePrice)}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        products={products}
      />

      <ProductPerks openPerks={openPerks} setOpenPerks={setOpenPerks} product={product} />
      <ProductFAQS
        openFAQs={openFAQs}
        setOpenFAQs={setOpenFAQs}
        productFAQs={product?.faqDetails || []}
      />
      <ProductTopSection
        open={openTopSection}
        setOpen={(open) => {
          setOpenTopSection(open);
          if (!open) setSelectedTopSectionItem(null);
        }}
        topSectionItems={product?.topSectionItemsPopulated || []}
        selectedItem={selectedTopSectionItem}
      />
      <ComesWithSlider
        open={openComesWithSlider}
        setOpen={(open) => {
          setOpenComesWithSlider(open);
          if (!open) setSelectedComesWithItem(null);
        }}
        selectedItem={selectedComesWithItem}
      />
      <ConditionDescription
        openConditionDescription={openConditionDescription}
        setActiveTab={setActiveTab}
        setOpenConditionDescription={setOpenConditionDescription}
        variantDesc={variantDesc}
        activeTab={activeTab}
      />

      <ProductSpecs
        openSpecs={openSpecs}
        setOpenSpecs={setOpenSpecs}
        product={product}
      />
      <ProductWarranty
        openWarranty={openWarranty}
        setOpenWarranty={setOpenWarranty}
      />
      <ProductVerifiedRefurbished
        verifiedRefurbished={verifiedRefurbished}
        setVerifiedRefurbished={setVerifiedRefurbished}
      />
      <ProductSimOptions
        simOptions={simOptions}
        setSimOptions={setSimOptions}
      />
      <ProductNotIncluded
        notIncluded={notIncluded}
        setNotIncluded={setNotIncluded}
      />
    </>
  );
}
