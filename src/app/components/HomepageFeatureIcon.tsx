"use client";

import Image from "next/image";
import { useState } from "react";

interface HomepageFeatureIconProps {
  src: string;
  alt: string;
}

export default function HomepageFeatureIcon({ src, alt }: HomepageFeatureIconProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="w-[25px] h-[25px] bg-primary rounded shrink-0"
        aria-hidden
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={25}
      height={25}
      className="text-primary shrink-0"
      style={{ objectFit: "contain" }}
      unoptimized={src.startsWith("http://localhost")}
      onError={() => setFailed(true)}
    />
  );
}
