"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType } from "embla-carousel";
import { fetchBlogs } from "@/app/lib/features/blogs/blogsSlice";
import { Blog } from "../../../../types";
import { RootState } from "../../lib/store";
import BlogCard from "./BlogCard";
import { useAppDispatch, useAppSelector } from "@/app/lib/hooks";

// Helper to robustly extract category name from blog object
function getCategoryName(blog: any) {
  // Handle undefined blog case
  if (!blog) return "";

  // Handle old blog format with blogCategory string
  if (blog.blogCategory) return blog.blogCategory;

  // Handle new blog format with categories array
  if (blog.categories && Array.isArray(blog.categories)) {
    // Handle empty categories array
    if (blog.categories.length === 0) return "";

    const cat = blog.categories[0];
    // Handle category as object with name property
    if (cat && typeof cat === "object" && cat.name) return cat.name;
    // Handle category as string
    if (typeof cat === "string") return cat;
  }

  // Default fallback
  return "";
}

export default function BlogsCard() {
  const dispatch = useAppDispatch();
  const { blogs, isLoading } = useAppSelector(
    (state: RootState) => state.blogs
  );

  useEffect(() => {
    dispatch(fetchBlogs() as any);
  }, [dispatch]);

  // Embla Carousel setup
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    skipSnaps: false,
    dragFree: false,
    align: "start",
    slidesToScroll: 1,
    slidesToShow: 3,
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

  if (!blogs || blogs.length === 0) {
    return null; // Or render a placeholder
  }

  // Example: Replace with your real search/filter state
  const searchTerm = ""; // e.g. from a search box or category selector
  const filteredBlogs = blogs.filter((blog) => {
    // Super defensive approach to prevent toLowerCase errors
    const categoryName = getCategoryName(blog) || "";
    const term = searchTerm || "";
    return categoryName.toLowerCase().includes(term.toLowerCase());
  });

  // Pagination dots list
  const scrollSnapList = emblaApi?.scrollSnapList() || [];

  return (
    <>
      <div className="flex items-center gap-3 mt-10">
        <h2 className="text-2xl font-semibold text-primary">Latest Blogs</h2>
        <div className="flex-grow border-b border-black mt-1"></div>
        {/* Navigation Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={scrollPrev}
            aria-label="Previous Slide"
            type="button"
            className="bg-primary hover:bg-green-900 rounded-full transition w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
              className="size-5 text-white"
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
            className="bg-primary hover:bg-green-900 rounded-full transition w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
              focusable="false"
              className="size-5 text-white"
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

      {isLoading ? (
        <div>Loading blogs...</div>
      ) : (
        <div className="max-w-screen-xl mx-auto my-10 sm:px-5 px-2 relative">
          <div className="embla overflow-hidden" ref={emblaRef}>
            <div className="embla__container flex">
              {filteredBlogs.slice(0, 3).map((blog: Blog) => (
                <BlogCard key={blog._id} {...blog} />
              ))}
              {filteredBlogs.length > 3 && (
                <div className="embla__slide flex-[0_0_100%]  md:flex-[0_0_33.33%]  px-1.5">
                  <div className="flex flex-col justify-center items-center h-full">
                    <Link href="/blogs">
                      <p className="bg-primary-dark text-white py-3 px-4 rounded-lg shadow-lg transition duration-300 ease-in-out flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                        View All
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                          focusable="false"
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
          <div className="absolute -bottom-[30px] left-1/2 transform -translate-x-1/2 flex space-x-2">
            {Array.from({ length: scrollSnapList.length }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                className="w-4 h-4 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                aria-label={`Go to slide ${index + 1}`}
                aria-current={selectedIndex === index ? "true" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={`block w-2.5 h-2.5 rounded-full ${
                    selectedIndex === index ? "bg-primary" : "bg-gray-300"
                  } transition-colors duration-300`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
