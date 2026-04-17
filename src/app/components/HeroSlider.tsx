"use client";
import { useState, useRef, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import Image from "next/image";

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
  // keep both, but we'll pass the *large* one to <Image> and control bytes via `sizes`
  srcLarge: string;
  srcSmall: string;
  alt: string;
  content?: BannerContent;
  extraImage?: string;
}

const banners: Banner[] = [/* …same as yours… */];

const HeroSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade()]);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayInterval = 5000;

  // start/stop autoplay safely
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => setCurrentSlide(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);

    const start = () => {
      stop();
      autoplayRef.current = setInterval(() => emblaApi.scrollNext(), autoplayInterval);
    };
    const stop = () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    };

    // pause when tab hidden to save main-thread time
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", vis);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", vis);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const handleDotClick = (i: number) => emblaApi?.scrollTo(i);

  return (
    <div className="relative">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="embla__container flex">
          {banners.map((banner, index) => {
            const isFirst = index === 0; // only first slide should be LCP
            return (
              <div key={banner.id} className="embla__slide flex-[0_0_100%]">
                <div className="relative w-full">
                  {/* Use Next/Image alone. Control bytes with `sizes`, not a manual <picture>. */}
                  <Image
                    src={banner.srcLarge}
                    alt={banner.alt}
                    // keep intrinsic aspect to prevent CLS
                    width={1440}
                    height={500}
                    // Make only the first slide LCP
                    priority={isFirst}
                    fetchPriority={isFirst ? "high" : "auto"}
                    loading={isFirst ? "eager" : "lazy"}
                    placeholder="blur"
                    // Serve smaller files to small screens
                    sizes="(max-width: 640px) 100vw, 100vw"
                    className="w-full h-auto"
                    quality={85}
                  />

                  {banner.content && (
                    <div className="absolute inset-y-5 md:inset-y-10 md:inset-x-8">
                      <h2
                        className={`${banner.id === 2 ? "text-white" : "text-black"} 2xl:text-5xl xl:text-6xl md:text-2xl lg:text-3xl text-xl py-2 px-4 md:p-4 font-bold ${
                          currentSlide === index ? "animate-fadeIn" : "opacity-0"
                        }`}
                      >
                        {banner.content.title}
                      </h2>
                      <h3
                        className={`${banner.id === 2 ? "text-white" : "text-gray-500"} xl:text-5xl md:text-2xl lg:text-3xl text-xl px-5 lg:py-5 py-2 font-bold ${
                          currentSlide === index ? "animate-fadeIn" : "opacity-0"
                        }`}
                      >
                        {banner.content.subtitle}
                      </h3>
                      {banner.content.paragraph && (
                        <p
                          className={`${banner.id === 2 ? "text-white" : "text-gray-500"} lg:text-2xl md:text-xl text-xs px-5 lg:py-5 py-2 font-bold ${
                            currentSlide === index ? "animate-fadeIn" : "opacity-0"
                          }`}
                        >
                          {banner.content.paragraph}
                        </p>
                      )}
                      {banner.content.price && (
                        <p
                          className={`${banner.id === 2 ? "text-white" : "text-red-500"} lg:text-5xl md:text-3xl text-xl px-5 lg:py-5 py-2 font-bold ${
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
                        currentSlide === index ? "animate-slideUp" : "animate-slideRight"
                      }`}
                      src={banner.extraImage}
                      alt={`${banner.alt} decoration`}
                      width={400}
                      height={400}
                      // never mark decorative image as priority
                      loading="lazy"
                      sizes="(min-width:1280px) 400px, (min-width:768px) 280px, 160px"
                      quality={85}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-1.5 w-1.5 md:w-3 md:h-3 rounded-full ${
              currentSlide === i ? "bg-primary" : "bg-gray-100"
            } transition-colors`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
