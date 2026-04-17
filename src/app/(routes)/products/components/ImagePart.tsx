import { useAuth } from "@/app/context/Auth";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import VariantPrice from "@/app/(routes)/products/components/VariantPrice";
import Loading from "@/app/components/Loading";
const Tab = dynamic(() => import("@headlessui/react").then((mod) => mod.Tab));
import { TabList, TabGroup } from "@headlessui/react";
// const TabList = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.TabList)
// );
// const TabGroup = dynamic(() =>
//   import("@headlessui/react").then((mod) => mod.TabGroup)
// );
export default function ImagePart({
  images,
  product,
  selectedVariant,
  isZoomed,
  setIsZoomed,
  isOutOfStock = false,
  checkingStock,
  stockData,
}: {
  images: any;
  product: any;
  selectedVariant: any;
  isZoomed: boolean;
  setIsZoomed: (isZoomed: boolean) => void;
  isOutOfStock?: boolean;
  checkingStock?: boolean;
  stockData?: {
    availableQuantity: number;
    inStock: boolean;
  } | null;
}) {
  const auth = useAuth();
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showStockNotification, setShowStockNotification] =
    useState<boolean>(false);
  // Helper to get image URL - prefer direct url, fallback to constructing from path
  const getImageUrl = (image: { url?: string; path?: string }) => {
    if (image?.url) return image.url;
    if (image?.path) return `${auth.ip}${image.path}`;
    return '';
  };

  // Helper to get image alt text - prefer custom altText, fallback to generated
  const getImageAlt = (image: { altText?: string }, index: number) => {
    if (image?.altText) return image.altText;
    return `${product?.name || "Product"} - ${selectedVariant?.name || "Image"} ${index + 1}`;
  };

  const handleZoomClick = (index: number) => {
    setCurrentIndex(index);
    setCurrentImage(getImageUrl(images[index]));
    setIsZoomed(true);
  };

  // Function to close zoomed image view
  const closeZoom = () => {
    setIsZoomed(false);
    setCurrentImage(null);
  };

  // Function to handle the next image
  const handleNextImage = () => {
    if (images?.length > 0) {
      const nextIndex = (currentIndex + 1) % images.length;
      setCurrentIndex(nextIndex);
      if (isZoomed) {
        setCurrentImage(getImageUrl(images[nextIndex]));
      }
    }
  };

  // Function to handle the previous image
  const handlePreviousImage = () => {
    if (images?.length > 0) {
      const prevIndex =
        currentIndex === 0 ? images?.length - 1 : currentIndex - 1;
      setCurrentIndex(prevIndex);
      if (isZoomed) {
        setCurrentImage(getImageUrl(images[prevIndex]));
      }
    }
  };

  // Reset current index when images change (e.g., when selecting a different color)
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentImage(null);
  }, [images]);

  // Handle stock notification display and auto-dismiss
  useEffect(() => {
    // Show notification when checking stock or when stock data is available
    if (checkingStock) {
      setShowStockNotification(true);
    } else if (stockData) {
      setShowStockNotification(true);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowStockNotification(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [stockData, checkingStock]);

  // Get stock notification message and styling
  const getStockNotificationContent = () => {
    if (checkingStock) {
      return {
        message: "Checking stock...",
        bgColor: "bg-blue-500/90",
        icon: (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ),
      };
    }

    if (!stockData) return null;

    if (!stockData.inStock || stockData.availableQuantity === 0) {
      return {
        message: "Out of Stock",
        bgColor: "bg-red-500/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ),
      };
    }

    const quantity = stockData.availableQuantity;

    // 1 available - Red
    if (quantity === 1) {
      return {
        message: "Last One – Hurry, before it's gone!",
        bgColor: "bg-red-500/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    }

    // 2 available - Red
    if (quantity === 2) {
      return {
        message: "Only 2 left – Going Fast!",
        bgColor: "bg-red-500/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    }

    // 3-5 available - Red
    if (quantity >= 3 && quantity <= 5) {
      return {
        message: "Only a few left – Selling Fast!",
        bgColor: "bg-red-500/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    }

    // 6-9 available - Yellow
    if (quantity >= 6 && quantity <= 9) {
      return {
        message: "Limited Stock – Fewer than 10 left!",
        bgColor: "bg-yellow-500/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      };
    }

    // Exactly 10 available - Green
    if (quantity === 10) {
      return {
        message: "10 units available – Order soon!",
        bgColor: "bg-primary/90",
        icon: (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
      };
    }

    // More than 10 - Green
    return {
      message: "In Stock – Ready to Ship!",
      bgColor: "bg-primary/90",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ),
    };
  };

  const stockNotification = getStockNotificationContent();

  if (!images || images.length === 0) {
    return <Loading />;
  }
  // console.log(images);
  return (
    <>
      <TabGroup
        as="div"
        className="flex flex-col-reverse xl:flex-row lg:sticky top-28"
      >
        {/* Image selector */}
        <div className="mx-auto mt-2 max-w-2xl md:w-fit w-full">
          <TabList className="grid grid-cols-4 xl:grid-cols-1 md:gap-6 gap-2 mt-4 px-4 justify-end">
            {images?.map(
              (
                image: { filename?: string; id?: string; path?: string; altText?: string },
                index: number
              ) => {
                return (
                  <Tab
                    key={image?.filename || image?.id}
                    className={`tab-rotate-on-load relative flex md:w-20 h-24 cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring focus:ring-opacity-50 focus:ring-offset-4 ${
                      currentIndex === index
                        ? "ring-green-500 pointer-events-none absolute inset-0 rounded-md ring-2 ring-offset-2"
                        : ""
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {() => (
                      <>
                        <span className="sr-only">{image?.altText || image?.filename}</span>
                        <span className="absolute inset-0 overflow-hidden rounded-md">
                          <Image
                            src={getImageUrl(image)}
                            alt={getImageAlt(image, index)}
                            className="object-contain object-center"
                            fill
                            sizes="(min-width: 768px) 5rem, 25vw"
                            placeholder="blur"
                            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                            priority={index === 0}
                            quality={75}
                            loading={index === 0 ? "eager" : "lazy"}
                          />
                        </span>
                        <span
                          className={
                            currentIndex === index
                              ? `ring-green-500 pointer-events-none absolute inset-0 rounded-md ring-2 ring-offset-2`
                              : `ring-transparent pointer-events-none absolute inset-0 rounded-md ring-2 ring-offset-2`
                          }
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Tab>
                );
              }
            )}{" "}
          </TabList>{" "}
        </div>

        <div className="mx-auto relative w-full md:ms-3 flex justify-center">
          <div className="absolute top-2 md:-top-5 left-2 md:left-0">
            <VariantPrice selectedVariant={selectedVariant} />
          </div>
          <div className="w-72 md:w-96 lg:h-[34rem] h-[22rem] relative flex items-center justify-center main-image-slider">
            <span className="absolute inset-0 overflow-hidden rounded-md">
              <Image
                src={getImageUrl(images[currentIndex])}
                alt={getImageAlt(images[currentIndex], currentIndex)}
                title={images[currentIndex]?.description || undefined}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
                className={`lg:h-[32rem] h-full w-full object-contain object-center mt-4 ${
                  isOutOfStock ? "opacity-60" : ""
                }`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
                fetchPriority="high"
                quality={85}
                loading="eager"
              />
            </span>

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg transform -rotate-12">
                  <span className="text-xl font-bold">Out of Stock</span>
                </div>
              </div>
            )}

            {/* Stock Availability Notification Toaster */}
            {showStockNotification && stockNotification && (
              <div className="absolute top-3 left-2 right-2 z-30 animate-slideDown">
                <div
                  className={`${stockNotification.bgColor} backdrop-blur-md rounded-xl shadow-2xl border border-white/20 px-4 py-3 flex items-center justify-between gap-3 transition-all duration-300 w-full`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-white flex-shrink-0">
                      {stockNotification.icon}
                    </div>
                    <p className="text-white font-semibold text-sm md:text-base flex-1">
                      {stockNotification.message}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStockNotification(false)}
                    className="text-white/80 hover:text-white transition-colors flex-shrink-0 p-1 rounded-full hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label="Dismiss notification"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Previous Button */}
            <button
              type="button"
              aria-label="Previous image"
              className="absolute -left-10 bg-gray-700 bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={handlePreviousImage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M15.25 6.35q.3.3.3.713t-.3.712l-4.2 4.225l4.2 4.2q.275.275.287.688t-.287.712q-.3.3-.713.3t-.712-.3L9.1 12.725q-.3-.3-.3-.713t.3-.712l4.725-4.725q.3-.3.713-.3t.712.3Z"
                />
              </svg>
            </button>

            {/* Next Button */}
            <button
              type="button"
              aria-label="Next image"
              className="absolute -right-10  bg-gray-700 bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={handleNextImage}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M8.75 17.65q-.3-.3-.3-.713t.3-.712l4.2-4.225l-4.2-4.2q-.275-.275-.287-.688T8.75 6.35q.3-.3.713-.3t.712.3l4.725 4.725q.3.3.3.713t-.3.712L10.175 17.65q-.3.3-.713.3t-.712-.3Z"
                />
              </svg>
            </button>

            {/* Zoom Button */}
            <button
              type="button"
              aria-label="Zoom image"
              className="absolute top-2 -right-10  bg-gray-700 bg-opacity-50 p-1 rounded-full text-white hover:bg-opacity-75 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={() => handleZoomClick(currentIndex)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="2em"
                height="2em"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M5.708 19H8.5q.213 0 .356.144t.144.357t-.144.356T8.5 20H4.808q-.343 0-.576-.232T4 19.192V15.5q0-.213.144-.356T4.501 15t.356.144T5 15.5v2.792l3.246-3.246q.14-.14.344-.15t.364.15t.16.354t-.16.354zm12.584 0l-3.246-3.246q-.14-.14-.15-.344t.15-.364t.354-.16t.354.16L19 18.292V15.5q0-.213.144-.356t.357-.144t.356.144t.143.356v3.692q0 .344-.232.576t-.576.232H15.5q-.213 0-.356-.144T15 19.499t.144-.356T15.5 19zM5 5.708V8.5q0 .213-.144.356T4.499 9t-.356-.144T4 8.5V4.808q0-.343.232-.576T4.808 4H8.5q.213 0 .356.144T9 4.501t-.144.356T8.5 5H5.708l3.246 3.246q.14.14.15.344t-.15.364t-.354.16t-.354-.16zm14 0l-3.246 3.246q-.14.14-.344.15t-.364-.15t-.16-.354t.16-.354L18.292 5H15.5q-.213 0-.356-.144T15 4.499t.144-.356T15.5 4h3.692q.344 0 .576.232t.232.576V8.5q0 .213-.144.356T19.499 9t-.356-.144T19 8.5z"
                />
              </svg>
            </button>
          </div>

          {/* Full-screen Zoom Modal */}
          {isZoomed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white top-[90px]">
              <span className="absolute inset-0 z-50">
                <Image
                  src={currentImage}
                  alt={getImageAlt(images[currentIndex], currentIndex)}
                  title={images[currentIndex]?.description || undefined}
                  className="object-contain Zoomed"
                  fill
                  sizes="100vw"
                  quality={90}
                  priority
                />
              </span>

              {/* Previous Button */}
              <button
                type="button"
                aria-label="Previous image"
                className="absolute left-4 bg-gray-700 bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={handlePreviousImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M15.25 6.35q.3.3.3.713t-.3.712l-4.2 4.225l4.2 4.2q.275.275.287.688t-.287.712q-.3.3-.713.3t-.712-.3L9.1 12.725q-.3-.3-.3-.713t.3-.712l4.725-4.725q.3-.3.713-.3t.712.3Z"
                  />
                </svg>
              </button>

              {/* Next Button */}
              <button
                type="button"
                aria-label="Next image"
                className="absolute right-4 bg-gray-700 bg-opacity-50 p-2 rounded-full text-white hover:bg-opacity-75 z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={handleNextImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="2em"
                  height="2em"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M8.75 17.65q-.3-.3-.3-.713t.3-.712l4.2-4.225l-4.2-4.2q-.275-.275-.287-.688T8.75 6.35q.3-.3.713-.3t.712.3l4.725 4.725q.3.3.3.713t-.3.712L10.175 17.65q-.3.3-.713.3t-.712-.3Z"
                  />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Close zoom"
                className="absolute top-4 right-4 text-white p-2 bg-gray-700 bg-opacity-50 rounded-full hover:bg-opacity-75 z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                onClick={closeZoom}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </TabGroup>
    </>
  );
}
