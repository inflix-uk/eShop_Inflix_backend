"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Check,
  Info,
  Sparkles,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

interface ConditionOption {
  id: string;
  title: string;
  originalPrice?: string;
  isSelected?: boolean;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
}

interface InteractiveConditionSelectorProps {
  conditionOptions: ConditionOption[];
  getImageForCondition: (conditionId: string) => any;
  getGradientForCondition: (conditionId: string) => string;
  getImagesForCondition: (
    conditionId: string
  ) => Array<{ src: any; alt: string }>;
}

const InteractiveConditionSelector: React.FC<
  InteractiveConditionSelectorProps
> = ({
  conditionOptions,
  getGradientForCondition,
  getImagesForCondition,
}) => {
  const [selectedCondition, setSelectedCondition] = useState("excellent");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const selectedOption = conditionOptions.find(
    (option) => option.id === selectedCondition
  );

  const images = getImagesForCondition(selectedCondition);

  const scrollPrev = useCallback(
    () => emblaApi && emblaApi.scrollPrev(),
    [emblaApi]
  );

  const scrollNext = useCallback(
    () => emblaApi && emblaApi.scrollNext(),
    [emblaApi]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="pb-8 px-4 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-bold text-slate-900 mb-4">
            Choose Your Device Condition
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select the condition that matches your device. All refurbished items
            undergo our comprehensive 90-point quality inspection.
          </p>
        </div>

        <div className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {conditionOptions.map((condition) => (
              <button
                key={condition.id}
                onClick={() => setSelectedCondition(condition.id)}
                className={`relative px-6 md:px-20 py-4 rounded-xl border-2 transition-all duration-200 min-w-[140px] ${
                  selectedCondition === condition.id
                    ? "border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCondition === condition.id
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedCondition === condition.id && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    {condition.icon}
                    {/* {condition.badge && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" />
                      </span>
                    )} */}
                  </div>

                  <div className="text-center">
                    <h4 className="font-serif font-bold text-slate-900 text-lg">
                      {condition.title}
                    </h4>
                  </div>
                </div>

                {selectedCondition === condition.id && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Enhanced Image display with Carousel */}
          <div className="relative">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Background decoration */}
              <div className="absolute -inset-4 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 rounded-3xl opacity-60 blur-xl"></div>

              {/* Main image container with Carousel */}
              <div
                className={`relative w-full h-full bg-gradient-to-br ${getGradientForCondition(
                  selectedCondition
                )} rounded-2xl overflow-hidden shadow-2xl border border-white/20`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>

                {/* Embla Carousel */}
                <div className="embla h-full" ref={emblaRef}>
                  <div className="embla__container h-full">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="embla__slide h-full flex-[0_0_100%]"
                      >
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          className="object-cover transition-all duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Carousel Navigation Buttons */}
                <button
                  onClick={scrollPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 z-10"
                >
                  <ChevronRightIcon className="w-5 h-5 text-slate-700" />
                </button>

                {/* Carousel Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => emblaApi?.scrollTo(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === selectedIndex
                          ? "bg-white scale-125"
                          : "bg-white/50 hover:bg-white/75"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Condition badge */}
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                    <span className="font-serif font-semibold text-slate-900 capitalize">
                      {selectedCondition}
                    </span>
                  </div>
                </div>

                {/* Image counter */}
                <div className="absolute top-4 right-4">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg">
                    <span className="text-white text-sm font-medium">
                      {selectedIndex + 1} / {images.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Selected condition details */}
          <div className="space-y-8">
            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Info className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-indigo-900 mb-2">
                    Quality Guaranteed
                  </h4>
                  <p className="text-indigo-700 text-sm leading-relaxed">
                    All refurbished devices are restored to high quality
                    standards through our comprehensive 90-point inspection
                    process.
                  </p>
                </div>
              </div>
            </div>

            {selectedOption && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-serif text-2xl font-bold text-slate-900">
                    {selectedOption.title}
                  </h3>
                  {selectedOption.icon}
                  {selectedOption.badge && (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full">
                      <Sparkles className="w-4 h-4" />
                      {selectedOption.badge}
                    </span>
                  )}
                </div>

                {selectedOption.description && (
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    {selectedOption.description}
                  </p>
                )}

                {/* Image descriptions */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">
                    What you&apos;ll see:
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-600">
                    {images.map((image, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            index === selectedIndex
                              ? "bg-indigo-500"
                              : "bg-slate-300"
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                        {image.alt}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveConditionSelector;
