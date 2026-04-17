"use client";
import { useState, useRef, useEffect } from "react";
import type React from "react";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Fade from "embla-carousel-fade";

// Import your existing images
// Note: You'll need to use your actual image imports from your project
import ipadhero from "@/app/assets/ipad-hero.webp";
import banner3 from "@/app/assets/banner3.webp";
import smbanner3 from "@/app/assets/smbanner3.webp";
import newbggg from "@/app/assets/newbggg.webp";
import samsunggalaxys25ultra from "@/app/assets/samsunggalaxys25ultra.webp";
import smallnewbggg from "@/app/assets/smallnewbggg.webp";
import newbgggblack from "@/app/assets/newbgggblack.webp";
import ipad9gen from "@/app/assets/ipad9gen.webp";
import newbgggblacksmall from "@/app/assets/newbgggblacksmall.webp";
// Define the banner type
interface BannerContent {
  title: string;
  subtitle: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
  warranty?: string[];
}

interface Banner {
  id: number;
  srcLarge: string;
  srcSmall: string;
  alt: string;
  content?: BannerContent;
  extraImage?: string;
}

const banners: Banner[] = [
  {
    id: 1,
    srcLarge: newbggg.src, // Use your banner1 image for the background
    srcSmall: smallnewbggg.src, // Use your smbanner1 image for mobile
    alt: "Black Friday Samsung Galaxy S25 Ultra",
    content: {
      title: "LIMITED TIME DISCOUNT",
      subtitle: "UPTO 70% OFF",
      warranty: ["1-YEAR APPLE WARRANTY", "NON-ACTIVE", "SEALED"],
    },
    extraImage: samsunggalaxys25ultra.src, // Use your iphonehero image for the phone
  },
  // You can add more banners here if needed, using your other banner images
  {
    id: 2,
    srcLarge: newbgggblack.src,
    srcSmall: newbgggblacksmall.src,
    alt: "iPhone 14 Pro Max",
    content: {
      title: "🌟 Apple iPad 🌟",
      subtitle: "9th Generation",
      paragraph:
        "POWER MEETS PORTABILITY! GET THE APPLE IPAD 9TH GEN AT AN UNBEATABLE PRICE ONLY AT ZEXTONS TECH STORE! 💥 WORK, STUDY, OR PLAY – THIS SLEEK, HIGH-PERFORMANCE TABLET IS BUILT FOR IT ALL. DON'T MISS OUT!",
      buynow: "#",
    },
    extraImage: ipad9gen.src,
  },
  {
    id: 3,
    srcLarge: banner3.src,
    srcSmall: smbanner3.src,
    alt: "iPad Hero",
    content: {
      title: "✨ Apple iPad 9th Generation (2021) ✨",
      subtitle: "64GB | WiFi | Brand New",
      paragraph: " 🎉Limited Time Offer – Don't Miss Out! 🎉",
      price: "Christmas Deal – £229.99 Only! 🔥",
    },
    extraImage: ipadhero.src,
  },
];

const BlackFridayBanner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade()]);
  const autoplayInterval = 5000; // 5 seconds for autoplay
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on("select", () => {
        setCurrentSlide(emblaApi.selectedScrollSnap());
      });

      // Start autoplay when the component is mounted
      autoplayRef.current = setInterval(() => {
        emblaApi.scrollNext();
      }, autoplayInterval);

      // Clear autoplay on component unmount
      return () => {
        if (autoplayRef.current) {
          clearInterval(autoplayRef.current);
        }
      };
    }
  }, [emblaApi]);

  // Function to handle pagination dot click
  const handleDotClick = (index: number) => {
    emblaApi?.scrollTo(index);
  };

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="embla__container flex">
          {banners.map((banner, index) => (
            <div key={banner.id} className="embla__slide flex-[0_0_100%]">
              <div className="relative w-full">
                {/* Responsive banner image */}
                <picture>
                  <source
                    srcSet={banner.srcLarge}
                    type="image/webp"
                    media="(min-width: 640px)"
                  />
                  <source
                    srcSet={banner.srcSmall}
                    type="image/webp"
                    media="(max-width: 639px)"
                  />
                  <Image
                    src={banner.srcLarge || "/placeholder.svg"}
                    alt={banner.alt}
                    className="w-full"
                    width={1440}
                    height={500}
                    priority={banner.id === 1}
                    quality={90}
                  />
                </picture>

                {/* Three-section layout for desktop */}
                <div className="absolute inset-0 hidden md:flex">
                  {/* Left section - Button */}
                  <div className="w-2/12 relative flex items-end pb-6 pl-6">
                    <button className="bg-white text-black font-bold py-3 px-6 rounded-lg flex items-center gap-2">
                      ORDER NOW
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white rounded-lg">
                        →
                      </span>
                    </button>
                  </div>

                  {/* Middle section - Empty space for the phone image */}
                  <div className="w-4/12 relative -rotate-6">
                    {/* Phone will be added as extraImage */}
                    {banner.extraImage && (
                      <Image
                        className={`absolute top-1/4 transform -translate-y-1/4 hidden md:block ${
                          currentSlide === index
                            ? "animate-slideUp"
                            : "opacity-0"
                        }`}
                        src={banner.extraImage || "/placeholder.svg"}
                        alt={`${banner.alt} device`}
                        width={743}
                        height={743}
                        priority={banner.id === 1}
                      />
                    )}
                  </div>

                  {/* Right section - Discount Text */}
                  <div className="w-6/12 relative -rotate-12">
                    <div className="absolute top-1/4 -translate-y-1/4 transform">
                      {banner.content && (
                        <div
                          className={`${
                            currentSlide === index
                              ? "animate-fadeIn"
                              : "opacity-0"
                          }`}
                        >
                          <div className="text-5xl font-bold tracking-wider text-white">
                            {banner.content.title}
                          </div>
                          {banner.content.subtitle && (
                            <div className="2xl:text-8xl md:text-5xl text-3xl font-extrabold leading-none tracking-wide text-white">
                              {banner.id === 1 ? (
                                <>
                                  UPTO
                                  <span className="text-yellow-300"> 70</span>
                                  <span className="text-yellow-300 align-top text-5xl">
                                    %
                                  </span>
                                  OFF
                                </>
                              ) : (
                                banner.content.subtitle
                              )}
                            </div>
                          )}
                          {banner.content.paragraph && (
                            <p className="text-white text-lg mt-2 md:text-2xl md:max-w-[70%]">
                              {banner.content.paragraph}
                            </p>
                          )}
                          {banner.content.price && (
                            <p className="text-red-500 text-3xl font-bold mt-2">
                              {banner.content.price}
                            </p>
                          )}
                          {banner.content.warranty && (
                            <div className="mt-4 md:text-2xl text-lg text-white">
                              {banner.content.warranty.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                  <span>{item}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Media - Fixed at top right */}
                <div className="absolute top-4 right-4 text-white hidden md:block">
                  <div className="text-sm font-medium mb-1">Follow Us Now</div>
                  <div className="flex gap-2">
                    <a href="#" className="bg-white rounded-full p-2 inline-block text-primary" aria-label="Facebook">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </a>
                    <a href="#" className="bg-white rounded-full p-2 inline-block text-primary" aria-label="Twitter">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                      </svg>
                    </a>
                    <a href="#" className="bg-white rounded-full p-2 inline-block text-primary" aria-label="YouTube">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                      </svg>
                    </a>
                    <a href="#" className="bg-white rounded-full p-2 inline-block text-primary" aria-label="Instagram">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <rect
                          x="2"
                          y="2"
                          width="20"
                          height="20"
                          rx="5"
                          ry="5"
                        ></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                </div>

                {/* Extra Image (Phone) */}

                {/* Mobile content display */}
                <div className="md:hidden absolute inset-0 flex flex-col justify-center items-center text-center p-4">
                  {banner.content && (
                    <div
                      className={`${
                        currentSlide === index ? "animate-fadeIn" : "opacity-0"
                      }`}
                    >
                      <h2 className="text-white text-xl font-bold mb-2">
                        {banner.content.title}
                      </h2>
                      <h3 className="text-white text-3xl font-bold mb-2">
                        {banner.content.subtitle}
                      </h3>
                      {banner.content.paragraph && (
                        <p className="text-white text-xs mb-2">
                          {banner.content.paragraph}
                        </p>
                      )}
                      {banner.content.price && (
                        <p className="text-red-500 text-xl font-bold mb-2">
                          {banner.content.price}
                        </p>
                      )}
                      {banner.content.warranty && (
                        <div className="text-white text-xs">
                          {banner.content.warranty.map((item, i) => (
                            <div key={i} className="mb-1">
                              • {item}
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="mt-4 bg-white text-black text-sm font-bold py-2 px-5 rounded-full flex items-center gap-1 mx-auto">
                        ORDER NOW
                        <span className="flex items-center justify-center w-5 h-5 bg-black text-white rounded-full text-xs">
                          →
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`h-3 w-3 md:w-4 md:h-4 rounded-full p-2 flex items-center justify-center ${
              currentSlide === index ? "bg-primary" : "bg-gray-100"
            } transition-colors`}
          >
            <span className={`block h-1.5 w-1.5 md:w-2 md:h-2 rounded-full ${
              currentSlide === index ? "bg-primary" : "bg-gray-100"
            }`}></span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BlackFridayBanner;
