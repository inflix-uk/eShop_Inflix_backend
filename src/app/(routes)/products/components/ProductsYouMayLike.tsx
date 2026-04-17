"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType } from "embla-carousel";
import ProductCardWithStock from "@/app/components/ProductCardWithStock";
import { Product } from "../../../../../types";
import { useRouter } from "next/navigation";
import Loading from "@/app/components/Loading";

interface ProductsYouMayLikeProps {
  productId: string;
  currentProductName?: string;
}

const ProductsYouMayLike: React.FC<ProductsYouMayLikeProps> = ({
  productId,
  currentProductName,
}) => {
  const router = useRouter();
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inStockProducts, setInStockProducts] = useState<Set<string>>(
    new Set()
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    skipSnaps: false,
    dragFree: false,
    align: "start",
    slidesToScroll: 1,
    slidesToShow: 2,
    breakpoints: {
      1200: {
        slidesToScroll: 1,
        slidesToShow: 4,
      },
      1024: {
        slidesToScroll: 1,
        slidesToShow: 4,
      },
      768: {
        slidesToScroll: 1,
        slidesToShow: 3,
      },
    },
  } as EmblaOptionsType);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch related products with timeout
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchRelatedProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`/api/products/related/${productId}`, {
          signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (data.status === 200 && data.products && data.products.length > 0) {
          const filteredProducts = data.products
            .filter(
              (product: Product) =>
                product._id !== productId && product.name !== currentProductName
            )
            .slice(0, 8);

          setRelatedProducts(filteredProducts);
        } else {
          await fetchFallbackProducts();
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Error fetching related products:", err);
        await fetchFallbackProducts();
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    const fetchFallbackProducts = async () => {
      if (signal.aborted) return;
      try {
        const response = await fetch("/api/products/homepage", { signal });

        const data = await response.json();

        if (data.status === 200 && data.products && data.products.length > 0) {
          const fallbackProducts = data.products
            .filter(
              (product: Product) =>
                product._id !== productId && product.name !== currentProductName
            )
            .slice(0, 8);

          if (fallbackProducts.length > 0) {
            setRelatedProducts(fallbackProducts);
            return;
          }
        }

        setError("No related products available at the moment");
      } catch (fallbackErr: any) {
        if (fallbackErr?.name === "AbortError") return;
        console.error("Fallback fetch also failed:", fallbackErr);
        setError("Failed to load related products");
      }
    };

    if (productId) {
      fetchRelatedProducts();
    }

    return () => controller.abort();
  }, [productId, currentProductName]);

  // Autoplay functionality
  const autoplay = useCallback(() => {
    if (emblaApi && relatedProducts.length > 1) {
      autoplayRef.current = setInterval(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        } else {
          emblaApi.scrollTo(0);
        }
      }, 2000); // Slightly slower than recently viewed for better UX
    }
  }, [emblaApi, relatedProducts.length]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!autoplayRef.current && relatedProducts.length > 1) {
      autoplay();
    }
  }, [autoplay, relatedProducts.length]);

  useEffect(() => {
    if (emblaApi && relatedProducts.length > 0) {
      autoplay();
      setSelectedIndex(emblaApi.selectedScrollSnap());

      const onSelect = () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      };

      emblaApi.on("select", onSelect);

      return () => {
        emblaApi.off("select", onSelect);
        stopAutoplay();
      };
    }
  }, [emblaApi, autoplay, stopAutoplay, relatedProducts.length]);

  // Pagination dots handler
  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) {
        emblaApi.scrollTo(index);
      }
    },
    [emblaApi]
  );

  // Pagination dots list
  const scrollSnapList = emblaApi?.scrollSnapList() || [];

  // Event handlers
  const handleMouseEnter = () => {
    stopAutoplay();
  };

  const handleMouseLeave = () => {
    startAutoplay();
  };

  const handleProductClick = (
    product: Product,
    event: React.MouseEvent<HTMLElement>
  ) => {
    const productNameSlug = product.producturl?.replace(/-\d{13}$/, "") ?? "";
    const productUrl = `/products/${productNameSlug}`;

    // Only navigate if the current URL is different
    if (window.location.pathname !== productUrl) {
      router.push(productUrl);
    } else {
      // Prevent default link behavior if the URL is the same
      event.preventDefault();
    }
  };

  // Function to check stock status for products
  const checkProductStock = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/stock/${productId}`);
      const data = await response.json();
      return data.hasStock;
    } catch (error) {
      console.error(`Error checking stock for product ${productId}:`, error);
      return true; // Default to in stock on error
    }
  };

  // Check stock status for all related products
  useEffect(() => {
    if (relatedProducts.length > 0) {
      const checkAllStock = async () => {
        const stockChecks = relatedProducts.map(async (product) => {
          const hasStock = await checkProductStock(product._id);
          return { productId: product._id, hasStock };
        });

        const results = await Promise.all(stockChecks);
        const inStockSet = new Set(
          results
            .filter((result) => result.hasStock)
            .map((result) => result.productId)
        );
        setInStockProducts(inStockSet);
      };

      checkAllStock();
    }
  }, [relatedProducts]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto w-full border-t border-gray-200 px-4 my-5">
        <h2 className="text-2xl font-bold mb-4 mt-2">Products You May Like</h2>
        <div className="flex justify-center items-center h-48">
          <Loading />
        </div>
      </div>
    );
  }

  // Filter products to only show in-stock ones and remove duplicates
  const availableProducts = relatedProducts
    .filter(
      (product) => product && product.name && inStockProducts.has(product._id)
    )
    .filter(
      (product, index, self) =>
        index === self.findIndex((p) => p._id === product._id)
    );

  if (error || availableProducts.length === 0) {
    return (
      <div className="max-w-screen-xl mx-auto w-full border-t border-gray-200 px-4 my-5">
        <h2 className="text-2xl font-bold mb-4 mt-2">Products You May Like</h2>
        <p className="text-gray-500">
          {error || "No related products found at the moment."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto w-full border-t border-gray-200 px-4 my-5">
      <h2 className="text-2xl font-bold mb-4 mt-2">Products You May Like</h2>
      <div className="relative">
        <div
          className="embla overflow-hidden"
          ref={emblaRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="embla__container flex">
            {availableProducts.map((product) => (
              <div
                key={product._id}
                className={`embla__slide flex-[0_0_50%] md:flex-[0_0_75%] lg:flex-[0_0_50%] xl:flex-[0_0_25%] px-1.5`}
                onClick={(event) => handleProductClick(product, event)}
              >
                <div className="h-full">
                  <Suspense fallback={<div>Loading...</div>}>
                    <ProductCardWithStock
                      product={product}
                      checkStockRealTime={true}
                    />
                  </Suspense>
                </div>
              </div>
            ))}
          </div>
        </div>

        {scrollSnapList.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {Array.from({ length: scrollSnapList.length }).map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-2 h-2 rounded-full ${
                  selectedIndex === index ? "bg-primary" : "bg-gray-300"
                } transition-colors`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsYouMayLike;
