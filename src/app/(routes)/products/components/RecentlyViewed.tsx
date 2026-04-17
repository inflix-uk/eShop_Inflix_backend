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
import { useAppSelector } from "@/app/lib/hooks";
import { Product, ProductData } from "../../../../../types";
import { useRouter } from "next/navigation";

interface RecentlyViewedProps {
  product: ProductData;
}

const RecentlyViewed: React.FC<RecentlyViewedProps> = ({ product }) => {
  const router = useRouter();
  const recentlyViewed: Product[] = useAppSelector(
    (state) => state.recentlyViewed.products
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

  // Autoplay functionality
  const autoplay = useCallback(() => {
    if (emblaApi) {
      autoplayRef.current = setInterval(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        } else {
          emblaApi.scrollTo(0);
        }
      }, 1500);
    }
  }, [emblaApi]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!autoplayRef.current) {
      autoplay();
    }
  }, [autoplay]);

  useEffect(() => {
    if (emblaApi) {
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
  }, [emblaApi, autoplay, stopAutoplay]);

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

  const currentProductId = product?._id;
  const productsToDisplay = recentlyViewed.filter(
    (p) => p._id !== currentProductId
  );

  const handleRecentlyViewedClick = (
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

  return (
    <div className="max-w-screen-xl mx-auto w-full border-t border-gray-200 px-4 my-5">
      <h2 className="text-2xl font-bold mb-4 mt-2">Recently Viewed Products</h2>
      {productsToDisplay.length === 0 ? (
        <p className="text-gray-500">
          {`You haven't viewed any products yet. Start exploring our catalog!`}
        </p>
      ) : (
        <div className="relative">
          <div
            className="embla overflow-hidden"
            ref={emblaRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="embla__container flex">
              {productsToDisplay
                .filter((product) => product && product.name)
                .map((product) => (
                  <div
                    key={product._id}
                    className={`embla__slide flex-[0_0_50%] md:flex-[0_0_75%] lg:flex-[0_0_50%] xl:flex-[0_0_25%] px-1.5`}
                    onClick={(event) =>
                      handleRecentlyViewedClick(product, event)
                    }
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
      )}
    </div>
  );
};

export default RecentlyViewed;
