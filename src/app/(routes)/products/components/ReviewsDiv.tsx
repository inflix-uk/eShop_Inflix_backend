import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/app/context/Auth";
import axios from "axios";
import { StarIcon } from "@heroicons/react/20/solid";
import useEmblaCarousel from "embla-carousel-react";
import { EmblaOptionsType } from "embla-carousel";
export default function ReviewsDiv({
  product,
  reviewsDiv,
  isZoomed,
  averageRating,
  setAverageRating,
  totalReviews,
  setTotalReviews,
}: {
  product: any;
  reviewsDiv: boolean;
  isZoomed: boolean;
  averageRating: number;
  setAverageRating: (averageRating: number) => void;
  totalReviews: number;
  setTotalReviews: (totalReviews: number) => void;
}) {
  const auth = useAuth();
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewsCount, setReviewsCount] = useState({});
  const [customerReviews, setCustomerReviews] = useState<any>([]);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  function classNames(
    ...classes: (string | undefined | null | false)[]
  ): string {
    return classes.filter(Boolean).join(" ");
  }
  const handleRatingChange = (index: number) => {
    setRating(index);
  };

  // Function to toggle review expansion
  const toggleReviewExpansion = (index: number) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  // console.log('auth', auth.ip);
  const handleSubmitReviews = async () => {
    if (!reviewText || rating === 0) {
      console.log("Please provide a rating and review text.");
      return;
    }
    if (!auth.user) {
      console.log("User is not authenticated.");
      return;
    }
    const fullName = `${auth.user.firstname} ${auth.user.lastname}`;
    const userEmail = auth.user.email; // Note the case for 'userEmail'
    const data = {
      fullName,
      userEmail,
      rating,
      review: reviewText,
      productId: product._id,
    };

    // console.log('Review Data', data);

    try {
      const response = await axios.post(`${auth.ip}post/product/reviews`, {
        reviewDetails: data,
      });

      // console.log('Response:', response.data);

      if (response.data.status === 201) {
        console.log(response.data.message);
        setReviewText("");
        return true;
      } else {
        console.log(response.data.message);

        return false;
      }
    } catch (error) {
      console.error(error);
      console.log("An error occurred during submitting reviews.");

      return false;
    }
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmitReviews();
  };

useEffect(() => {
  const processReviews = (reviews: any[]) => {
    if (!reviews || reviews.length === 0) {
      setCustomerReviews([]);
      setAverageRating(0);
      setTotalReviews(0);
      setReviewsCount({});
      return;
    }

    // Calculate total reviews and average rating
    const total = reviews.length;
    const average = (
      reviews.reduce(
        (acc: number, review: { rating: number }) => acc + review.rating,
        0
      ) / total
    ).toFixed(1);

    // Count reviews by rating
    const countByStars = reviews.reduce(
      (acc: { [key: number]: number }, review: { rating: number }) => {
        acc[review.rating] = (acc[review.rating] || 0) + 1;
        return acc;
      },
      {}
    );

    setCustomerReviews(reviews);
    setAverageRating(parseFloat(average) || 0);
    setTotalReviews(total);
    setReviewsCount(countByStars);
  };

  // First, try to use reviewDetails from product (already fetched by getProductByproducturl)
  if (product?.reviewDetails && product.reviewDetails.length > 0) {
    processReviews(product.reviewDetails);
    return;
  }

  // Fallback: fetch from API if not available in product
  const getProductReviews = (productId: string) => {
    axios
      .get(`${auth.ip}get/all/product/reviews/${productId}`)
      .then((response) => {
        if (response.data.status === 201) {
          const reviews = response.data.product?.reviewDetails || [];
          processReviews(reviews);
        }
      })
      .catch((error) => {
        console.error('Error fetching reviews:', error);
      });
  };

  if (product && product._id) {
    getProductReviews(product._id);
  }
}, [
  auth.ip,
  product,
  setAverageRating,
  setTotalReviews,
]);

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
  return (
    <>
      {reviewsDiv && (
        <div className="bg-white p-6 rounded-lg shadow-lg mx-auto max-w-screen-xl border border-gray-200 mt-5">
          <div className="flex flex-col md:flex-row md:space-x-6">
            <div className="md:w-1/3">
              <h2 className="text-3xl font-semibold mb-2 text-gray-800">
                {averageRating} overall
              </h2>
              <p className="text-gray-500">Based on {totalReviews} reviews</p>

              <div className="space-y-2 mt-4">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, index) => (
                        <StarIcon
                          key={index}
                          className={classNames(
                            star > index ? "text-yellow-400" : "text-gray-300",
                            "h-5 w-5 flex-shrink-0"
                          )}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <div className="bg-gray-300 rounded-lg h-2 w-full">
                      <div
                        className="bg-[#057A55] h-2 rounded-full"
                        style={{
                          width: `${
                            ((reviewsCount[star as keyof typeof reviewsCount] ||
                              0) /
                              totalReviews) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      {reviewsCount[star as keyof typeof reviewsCount] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:w-2/3 mt-3 md:mt-0">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 mt-8">
                Add a Review
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="flex items-center mb-4">
                  <span className="mr-2 text-base text-gray-800">
                    Your Review:
                  </span>
                  <div className="flex">
                    {[...Array(5)].map((_, index) => (
                      <StarIcon
                        key={index}
                        onClick={() => handleRatingChange(index + 1)}
                        className={classNames(
                          rating > index ? "text-yellow-400" : "text-gray-300",
                          "h-5 w-5 flex-shrink-0 cursor-pointer"
                        )}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#057A55] focus:ring-[#057A55]"
                    placeholder="Write your review here..."
                    value={reviewText}
                    rows={5}
                    onChange={(e) => setReviewText(e.target.value)}
                    disabled={!auth.user} // Disable if user is not authenticated
                  ></textarea>
                </div>

                {auth.user ? (
                  <button
                    type="submit"
                    className="w-full max-w-40 bg-primary text-white p-3 rounded-lg font-semibold hover:bg-[#046144] transition duration-300"
                  >
                    Submit Review
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full max-w-40 bg-gray-300 text-gray-500 p-3 rounded-lg font-semibold cursor-not-allowed"
                    disabled
                  >
                    Login First
                  </button>
                )}
              </form>
            </div>
          </div>
          <div className={`mt-5 relative ${isZoomed ? "-z-10" : "z-0"}`}>
            <div className="relative">
              <div
                className="embla overflow-hidden"
                ref={emblaRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="embla__container flex">
                  {customerReviews &&
                    customerReviews.map(
                      (
                        review: {
                          DateTime: string | number | Date;
                          rating: number;
                          comment: string;
                          name: string;
                          createdAt: string | number | Date;
                        },
                        index: number
                      ) => (
                        <div
                          className="embla__slide flex-[0_0_50%] md:flex-[0_0_75%] lg:flex-[0_0_50%] xl:flex-[0_0_25%] px-1.5"
                          key={index}
                        >
                          <div className="p-6 bg-gray-50 rounded-lg shadow-lg max-w-screen-md mx-auto">
                            <div className="flex items-center mb-2">
                              {[...Array(5)].map((_, i) => (
                                <StarIcon
                                  key={i}
                                  className={classNames(
                                    review.rating > i
                                      ? "text-yellow-400"
                                      : "text-gray-300",
                                    "h-5 w-5 flex-shrink-0"
                                  )}
                                  aria-hidden="true"
                                />
                              ))}
                            </div>
                            <div className="text-gray-600 mb-2">
                              <p className={`mb-2 ${!expandedReviews.has(index) ? 'line-clamp-5' : ''}`}>
                                {review.comment}
                              </p>
                              <button
                                onClick={() => toggleReviewExpansion(index)}
                                className="text-[#057A55] hover:text-[#046144] font-medium text-sm transition-colors"
                              >
                                {expandedReviews.has(index) ? "Show less" : "Read more"}
                              </button>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800">
                              {review.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(review.DateTime.toString())}
                            </p>
                          </div>
                        </div>
                      )
                    )}{" "}
                </div>{" "}
              </div>

              {/* Pagination Dots */}
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {Array.from({ length: scrollSnapList.length }).map(
                  (_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollTo(index)}
                      className={`w-2 h-2 rounded-full ${
                        selectedIndex === index ? "bg-primary" : "bg-gray-300"
                      } transition-colors`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
