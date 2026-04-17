import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/context/Auth";
import axios from "axios";

interface ReviewsSectionProps {
  productName?: string;
  product?: any;
}

export default function ReviewsSection({ productName = "iPhone 11", product }: ReviewsSectionProps) {
  const auth = useAuth();
  const [customerReviews, setCustomerReviews] = useState<any>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState({});

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // function classNames(
  //   ...classes: (string | undefined | null | false)[]
  // ): string {
  //   return classes.filter(Boolean).join(" ");
  // }

  useEffect(() => {
    const getProductReviews = (productId: string) => {
      axios
        .get(`${auth.ip}get/all/product/reviews/${productId}`)
        .then((response) => {
          if (response.data.status === 201) {
            const reviews = response.data.product.reviewDetails;

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
            setAverageRating(parseFloat(average));
            setTotalReviews(total);
            setReviewsCount(countByStars);
          }
        })
        .catch((error) => {
          console.error("Error fetching reviews:", error);
        });
    };

    if (product && product._id) {
      getProductReviews(product._id);
    }
  }, [auth.ip, product]);

  return (
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="md:text-2xl sm:text-xl text-lg font-bold text-gray-900 mb-4">
            {productName} <span className="text-primary">Customer Reviews</span>
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed max-w-4xl">
            We value the opinions of all of our customers, and we&apos;re sure
            that you do too! If you&apos;re still unsure about buying the {productName}
            you want, take a look at the reviews our customers have left for
            us.
          </p>
        </div>

        {/* Overall Rating */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className="w-6 h-6"
                style={{ fill: "var(--primary)" }}
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
            <span className="text-2xl font-bold text-gray-900 ml-2">{averageRating}/5</span>
          </div>
          <p className="text-gray-600">Based on {totalReviews} customer reviews</p>
        </div>

        {/* Reviews */}
        <div className="space-y-8">
          {customerReviews && customerReviews.length > 0 ? (
            customerReviews.slice(0, 5).map((review: any, index: number) => (
              <div key={index} className="bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-lg">
                      {review.name ? review.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.name || 'Anonymous'}</h3>
                    <p className="text-gray-500 text-sm">
                      {formatDate(review.DateTime?.toString() || review.createdAt?.toString() || new Date().toISOString())}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5"
                      style={{ fill: "var(--primary)" }}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>

                <p className="text-gray-700 mb-6 leading-relaxed">
                  {review.comment || review.review || 'No comment provided.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Value for money</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">
                      Overall performance
                    </span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Phone condition</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Battery</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">Delivery speed</span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm">
                      Recycled packaging
                    </span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-4 h-4 text-gray-900 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No reviews available yet.</p>
              <p className="text-gray-400 text-sm mt-2">Be the first to review this product!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
