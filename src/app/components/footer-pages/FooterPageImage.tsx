"use client";

import Image from "next/image";
import { useState } from "react";
import { getImageUrl } from "@/app/services/footerPageService";

interface FooterPageImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Client-side image component with error handling and fallback
 */
export default function FooterPageImage({
  src,
  alt,
  title,
  width = 1200,
  height = 600,
  className = "w-full h-auto rounded-lg shadow-md",
  priority = false,
}: FooterPageImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageUrl, setImageUrl] = useState(() => getImageUrl(src));

  // Log the image URL for debugging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[FooterPageImage] Rendering image:`, {
      original: src,
      constructed: imageUrl,
      error: imageError,
    });
  }

  if (imageError || !imageUrl) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex flex-col items-center justify-center gap-2">
        <span className="text-gray-500 text-sm">Image not available</span>
        <span className="text-gray-400 text-xs">URL: {src || "N/A"}</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      title={title}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={true}
      onError={(e) => {
        console.error(`[FooterPageImage] Failed to load image:`, {
          original: src,
          constructed: imageUrl,
        });
        setImageError(true);
      }}
      onLoad={() => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[FooterPageImage] Successfully loaded: ${imageUrl}`);
        }
      }}
    />
  );
}
