"use client";
import { useState, useEffect, useCallback, FC, Suspense } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType } from "embla-carousel";
import Link from "next/link";

interface SwiperComponentProps {
  items: Array<{
    _id: string;
    [key: string]: any; // Use more specific types based on your actual item structure
  }>;
  renderCard: (item: any) => JSX.Element; // Adjust this type based on what renderCard returns
  /** When empty, the title is plain text and the extra “View all” slide is omitted. */
  link?: string;
  linkText: string;
  title: string;
}

const SwiperComponent: FC<SwiperComponentProps> = ({
  items,
  renderCard,
  link,
  linkText,
  title,
}) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    skipSnaps: false,
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

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (emblaApi) {
      setSelectedIndex(emblaApi.selectedScrollSnap());

      const onSelect = () => {
        setSelectedIndex(emblaApi.selectedScrollSnap());
      };

      emblaApi.on("select", onSelect);

      return () => {
        emblaApi.off("select", onSelect);
      };
    }
  }, [emblaApi]);

  // Navigation handlers
  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

  if (!items || items.length === 0) {
    return null; // Or render a placeholder
  }

  // Pagination dots list
  const scrollSnapList = emblaApi?.scrollSnapList() || [];

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-x-hidden pt-0 sm:pt-1 pb-2 sm:pb-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0 shrink pr-2">
          {link ? (
            <Link href={link} className="block min-w-0">
              <h2 className="truncate text-xl font-semibold text-primary sm:text-2xl">
                {title}
              </h2>
            </Link>
          ) : (
            <h2 className="truncate text-xl font-semibold text-primary sm:text-2xl">
              {title}
            </h2>
          )}
        </div>
        <div
          className="min-h-0 min-w-0 flex-grow border-b border-primary mt-1"
          aria-hidden
        />
        <div className="flex shrink-0 gap-2 sm:gap-4">
          <button
            onClick={scrollPrev}
            aria-label="Previous Slide"
            type="button"
            className="bg-primary hover:bg-green-900 rounded-full transition w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-white"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            aria-label="Next Slide"
            type="button"
            className="bg-primary hover:bg-green-900 rounded-full transition w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-white"
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="embla mt-4 w-full min-w-0 overflow-hidden" ref={emblaRef}>
        <div className="embla__container flex">
          {items.slice(0, 8).map((item) => (
            <div
              key={item._id}
              className="embla__slide min-w-0 flex-[0_0_85%] shrink-0 xs:flex-[0_0_50%] sm:flex-[0_0_46%] md:flex-[0_0_31%] lg:flex-[0_0_24%] xl:flex-[0_0_25%] px-1.5"
            >
              <div className="h-full min-h-[22rem] min-w-0">
                <Suspense
                  fallback={
                    <div
                      className="h-[22rem] w-full animate-pulse rounded-lg bg-gray-100"
                      aria-hidden
                    />
                  }
                >
                  {renderCard(item)}
                </Suspense>
              </div>
            </div>
          ))}
          {items.length > 8 && link && (
            <div className="embla__slide min-w-0 flex-[0_0_85%] shrink-0 xs:flex-[0_0_50%] sm:flex-[0_0_46%] md:flex-[0_0_31%] lg:flex-[0_0_24%] px-2">
              <div className="flex flex-col justify-center items-center h-full">
                <Link href={link}>
                  <p className="bg-primary-dark text-white py-3 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out flex items-center gap-2">
                    {linkText}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </p>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 space-x-3">
        {Array.from({ length: scrollSnapList.length }).map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => emblaApi?.scrollTo(index)}
            className="w-4 h-4 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label={`Go to slide ${index + 1}`}
            aria-current={selectedIndex === index ? "true" : undefined}
          >
            <span
              className={`${
                selectedIndex === index ? "bg-primary" : "bg-gray-300"
              } block w-2.5 h-2.5 rounded-full`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
export default SwiperComponent;
