"use client";
import { useState, useRef, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import iphonehero from "@/app/assets/phone.webp";
import coinshero from "@/app/assets/coins.png";
import ipadhero from "@/app/assets/ipad-hero.webp";
import banner1 from "@/app/assets/banner1.png";
import smbanner1 from "@/app/assets/smbanner1.webp";
import banner2 from "@/app/assets/banner2.webp";
import smbanner2 from "@/app/assets/smbanner2.webp";
import banner3 from "@/app/assets/banner3.webp";
import smbanner3 from "@/app/assets/smbanner3.webp";
import Image from "next/image";
import Link from "next/link";
import Fade from "embla-carousel-fade";

// Define the banner type
interface BannerContent {
  title: string;
  subtitle: string;
  paragraph?: string;
  price?: string;
  buynow?: string;
  sellnow?: string;
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
    srcLarge: banner1.src,
    srcSmall: smbanner1.src,
    alt: "Cashback",
    content: {
      title: "Don't Miss Out! Get up to £600 for Your Old Tech!",
      subtitle: "Mobile Phones, Tablets, & Gadgets",
      sellnow: "",
    },
    extraImage: coinshero.src,
  },
  {
    id: 2,
    srcLarge: banner2.src,
    srcSmall: smbanner2.src,
    alt: "iPhone 14 Pro Max",
    content: {
      title: "🌟 iPhone 14 Pro Max 🌟",
      subtitle: "256GB | Unlocked | Apple Certified Refurbished",
      paragraph: "🔒 1 - Year Apple Warranty | Non - Active | Sealed",
      buynow:
        "https://zextons.co.uk/products/apple-iphone-14-pro-max-unlocked-brand-new-256gb-space-black-brand-new",
    },
    extraImage: iphonehero.src,
  },
  {
    id: 3,
    srcLarge: banner3.src,
    srcSmall: smbanner3.src,
    alt: "iPad Hero",
    content: {
      title: "✨ Apple iPad 9th Generation (2021) ✨",
      subtitle: "64GB | WiFi | Brand New",
      paragraph: "🎉Limited Time Offer – Don't Miss Out! 🎉",
      price: "Christmas Deal – £229.99 Only! 🔥",
    },
    extraImage: ipadhero.src,
  },
];

const HeroSlider: React.FC = () => {
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
                    src={banner.srcLarge}
                    alt={banner.alt}
                    className="w-full"
                    width={1440}
                    height={500}
                    priority={banner.id === 1}
                    quality={90}
                  />
                </picture>

                {banner.content && (
                  <div className="absolute inset-y-5 md:inset-y-10 md:inset-x-8">
                    <h2
                      className={`${
                        banner.id === 2 ? "text-white" : "text-black"
                      } 2xl:text-5xl xl:text-6xl md:text-2xl lg:text-3xl text-xl py-2 px-4 md:p-4 font-bold
                   ${currentSlide === index ? "animate-fadeIn" : "opacity-0"}`}
                    >
                      {banner.content.title}
                    </h2>
                    <h3
                      className={`${
                        banner.id === 2 ? "text-white" : "text-gray-500"
                      } xl:text-5xl md:text-2xl lg:text-3xl text-xl px-5 lg:py-5 py-2 font-bold
                   ${currentSlide === index ? "animate-fadeIn" : "opacity-0"}`}
                    >
                      {banner.content.subtitle}
                    </h3>
                    {banner.content.paragraph && (
                      <p
                        className={`${
                          banner.id === 2 ? "text-white" : "text-gray-500"
                        } lg:text-2xl md:text-xl text-xs px-5 lg:py-5 py-2 font-bold
                     ${
                       currentSlide === index ? "animate-fadeIn" : "opacity-0"
                     }`}
                      >
                        {banner.content.paragraph}
                      </p>
                    )}
                    {banner.content.price && (
                      <p
                        className={`${
                          banner.id === 2 ? "text-white" : "text-red-500"
                        } lg:text-5xl md:text-3xl text-xl px-5 lg:py-5 py-2 font-bold
                     ${
                       currentSlide === index ? "animate-fadeIn" : "opacity-0"
                     }`}
                      >
                        {banner.content.price}
                      </p>
                    )}
                  </div>
                )}

                {banner.extraImage && (
                  <Image
                    className={`absolute right-20 md:bottom-20 bottom-10 xl:block hidden ${
                      currentSlide === index
                        ? "animate-slideUp"
                        : "animate-slideRight"
                    }`}
                    src={banner.extraImage}
                    alt={`${banner.alt} decoration`}
                    width={400}
                    height={400}
                    priority={banner.id === 1}
                  />
                )}
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
            className={`h-1.5 w-1.5 md:w-3 md:h-3 rounded-full ${
              currentSlide === index ? "bg-primary" : "bg-gray-100"
            } transition-colors`}
          />
        ))}
      </div>
      <div className="absolute bottom-4 right-4 bg-opacity-50 bg-black text-white px-3 py-1 rounded hidden">
        Slide {currentSlide + 1} of {banners.length}
      </div>
    </div>
  );
};
export default HeroSlider;
