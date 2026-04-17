"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/app/context/Auth";
import Zextons from "@/app/assets/ZEXTONS-LOGO-WHITE1.png";
import Ecologi from "@/app/assets/ecologinewlogo.png";
import PaymentLogos from "../PaymentLogos";
import NewsletterSignupWidget from "@/app/(routes)/blogs/new/[slug]/NewsletterSignupWidget";
import type {
  FooterLink,
  FooterSection2,
  FooterSettings,
  SocialMediaItem,
} from "./footerTypes";
import { DEFAULT_FOOTER } from "./footerDefaults";

// Social media SVG components for fallback
const SocialMediaIcons: Record<string, JSX.Element> = {
  Twitter: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 209"
    >
      <path
        fill="#55acee"
        d="M256 25.45a105 105 0 0 1-30.166 8.27c10.845-6.5 19.172-16.793 23.093-29.057a105.2 105.2 0 0 1-33.351 12.745C205.995 7.201 192.346.822 177.239.822c-29.006 0-52.523 23.516-52.523 52.52c0 4.117.465 8.125 1.36 11.97c-43.65-2.191-82.35-23.1-108.255-54.876c-4.52 7.757-7.11 16.78-7.11 26.404c0 18.222 9.273 34.297 23.365 43.716a52.3 52.3 0 0 1-23.79-6.57q-.004.33-.003.661c0 25.447 18.104 46.675 42.13 51.5a52.6 52.6 0 0 1-23.718.9c6.683 20.866 26.08 36.05 49.062 36.475c-17.975 14.086-40.622 22.483-65.228 22.483c-4.24 0-8.42-.249-12.529-.734c23.243 14.902 50.85 23.597 80.51 23.597c96.607 0 149.434-80.031 149.434-149.435q0-3.417-.152-6.795A106.8 106.8 0 0 0 256 25.45"
      />
    </svg>
  ),
  YouTube: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 180"
    >
      <path
        fill="#f00"
        d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
      />
      <path fill="#fff" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
    </svg>
  ),
  Instagram: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 256"
    >
      <g fill="none">
        <rect width="256" height="256" fill="url(#SVGWRUqebek)" rx="60" />
        <rect width="256" height="256" fill="url(#SVGfkNpldMH)" rx="60" />
        <path
          fill="#fff"
          d="M128.009 28c-27.158 0-30.567.119-41.233.604c-10.646.488-17.913 2.173-24.271 4.646c-6.578 2.554-12.157 5.971-17.715 11.531c-5.563 5.559-8.98 11.138-11.542 17.713c-2.48 6.36-4.167 13.63-4.646 24.271c-.477 10.667-.602 14.077-.602 41.236s.12 30.557.604 41.223c.49 10.646 2.175 17.913 4.646 24.271c2.556 6.578 5.973 12.157 11.533 17.715c5.557 5.563 11.136 8.988 17.709 11.542c6.363 2.473 13.631 4.158 24.275 4.646c10.667.485 14.073.604 41.23.604c27.161 0 30.559-.119 41.225-.604c10.646-.488 17.921-2.173 24.284-4.646c6.575-2.554 12.146-5.979 17.702-11.542c5.563-5.558 8.979-11.137 11.542-17.712c2.458-6.361 4.146-13.63 4.646-24.272c.479-10.666.604-14.066.604-41.225s-.125-30.567-.604-41.234c-.5-10.646-2.188-17.912-4.646-24.27c-2.563-6.578-5.979-12.157-11.542-17.716c-5.562-5.562-11.125-8.979-17.708-11.53c-6.375-2.474-13.646-4.16-24.292-4.647c-10.667-.485-14.063-.604-41.23-.604zm-8.971 18.021c2.663-.004 5.634 0 8.971 0c26.701 0 29.865.096 40.409.575c9.75.446 15.042 2.075 18.567 3.444c4.667 1.812 7.994 3.979 11.492 7.48c3.5 3.5 5.666 6.833 7.483 11.5c1.369 3.52 3 8.812 3.444 18.562c.479 10.542.583 13.708.583 40.396s-.104 29.855-.583 40.396c-.446 9.75-2.075 15.042-3.444 18.563c-1.812 4.667-3.983 7.99-7.483 11.488c-3.5 3.5-6.823 5.666-11.492 7.479c-3.521 1.375-8.817 3-18.567 3.446c-10.542.479-13.708.583-40.409.583c-26.702 0-29.867-.104-40.408-.583c-9.75-.45-15.042-2.079-18.57-3.448c-4.666-1.813-8-3.979-11.5-7.479s-5.666-6.825-7.483-11.494c-1.369-3.521-3-8.813-3.444-18.563c-.479-10.542-.575-13.708-.575-40.413s.096-29.854.575-40.396c.446-9.75 2.075-15.042 3.444-18.567c1.813-4.667 3.983-8 7.484-11.5s6.833-5.667 11.5-7.483c3.525-1.375 8.819-3 18.569-3.448c9.225-.417 12.8-.542 31.437-.563zm62.351 16.604c-6.625 0-12 5.37-12 11.996c0 6.625 5.375 12 12 12s12-5.375 12-12s-5.375-12-12-12zm-53.38 14.021c-28.36 0-51.354 22.994-51.354 51.355s22.994 51.344 51.354 51.344c28.361 0 51.347-22.983 51.347-51.344c0-28.36-22.988-51.355-51.349-51.355zm0 18.021c18.409 0 33.334 14.923 33.334 33.334c0 18.409-14.925 33.334-33.334 33.334s-33.333-14.925-33.333-33.334c0-18.411 14.923-33.334 33.333-33.334"
        />
        <defs>
          <radialGradient
            id="SVGWRUqebek"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(0 -253.715 235.975 0 68 275.717)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fd5" />
            <stop offset=".1" stopColor="#fd5" />
            <stop offset=".5" stopColor="#ff543e" />
            <stop offset="1" stopColor="#c837ab" />
          </radialGradient>
          <radialGradient
            id="SVGfkNpldMH"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(22.25952 111.2061 -458.39518 91.75449 -42.881 18.441)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3771c8" />
            <stop offset=".128" stopColor="#3771c8" />
            <stop offset="1" stopColor="#60f" stopOpacity="0" />
          </radialGradient>
        </defs>
      </g>
    </svg>
  ),
  TikTok: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 290"
    >
      <path
        fill="#ff004f"
        d="M189.72 104.421c18.678 13.345 41.56 21.197 66.273 21.197v-47.53a67 67 0 0 1-13.918-1.456v37.413c-24.711 0-47.59-7.851-66.272-21.195v96.996c0 48.523-39.356 87.855-87.9 87.855c-18.113 0-34.949-5.473-48.934-14.86c15.962 16.313 38.222 26.432 62.848 26.432c48.548 0 87.905-39.332 87.905-87.857v-96.995zm17.17-47.952c-9.546-10.423-15.814-23.893-17.17-38.785v-6.113h-13.189c3.32 18.927 14.644 35.097 30.358 44.898M69.673 225.607a40 40 0 0 1-8.203-24.33c0-22.192 18.001-40.186 40.21-40.186a40.3 40.3 0 0 1 12.197 1.883v-48.593c-4.61-.631-9.262-.9-13.912-.801v37.822a40.3 40.3 0 0 0-12.203-1.882c-22.208 0-40.208 17.992-40.208 40.187c0 15.694 8.997 29.281 22.119 35.9"
      />
      <path d="M175.803 92.849c18.683 13.344 41.56 21.195 66.272 21.195V76.631c-13.794-2.937-26.005-10.141-35.186-20.162c-15.715-9.802-27.038-25.972-30.358-44.898h-34.643v189.843c-.079 22.132-18.049 40.052-40.21 40.052c-13.058 0-24.66-6.221-32.007-15.86c-13.12-6.618-22.118-20.206-22.118-35.898c0-22.193 18-40.187 40.208-40.187c4.255 0 8.356.662 12.203 1.882v-37.822c-47.692.985-86.047 39.933-86.047 87.834c0 23.912 9.551 45.589 25.053 61.428c13.985 9.385 30.82 14.86 48.934 14.86c48.545 0 87.9-39.335 87.9-87.857z" />
      <path
        fill="#00f2ea"
        d="M242.075 76.63V66.516a66.3 66.3 0 0 1-35.186-10.047a66.47 66.47 0 0 0 35.186 20.163M176.53 11.57a68 68 0 0 1-.728-5.457V0h-47.834v189.845c-.076 22.13-18.046 40.05-40.208 40.05a40.06 40.06 0 0 1-18.09-4.287c7.347 9.637 18.949 15.857 32.007 15.857c22.16 0 40.132-17.918 40.21-40.05V11.571zM99.966 113.58v-10.769a89 89 0 0 0-12.061-.818C39.355 101.993 0 141.327 0 189.845c0 30.419 15.467 57.227 38.971 72.996c-15.502-15.838-25.053-37.516-25.053-61.427c0-47.9 38.354-86.848 86.048-87.833"
      />
    </svg>
  ),
  Facebook: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 256"
    >
      <path
        fill="#1877f2"
        d="M256 128C256 57.308 198.692 0 128 0S0 57.308 0 128c0 63.888 46.808 116.843 108 126.445V165H75.5v-37H108V99.8c0-32.08 19.11-49.8 48.348-49.8C170.352 50 185 52.5 185 52.5V84h-16.14C152.959 84 148 93.867 148 103.99V128h35.5l-5.675 37H148v89.445c61.192-9.602 108-62.556 108-126.445"
      />
      <path
        fill="#fff"
        d="m177.825 165l5.675-37H148v-24.01C148 93.866 152.959 84 168.86 84H185V52.5S170.352 50 156.347 50C127.11 50 108 67.72 108 99.8V128H75.5v37H108v89.445A129 129 0 0 0 128 256a129 129 0 0 0 20-1.555V165z"
      />
    </svg>
  ),
  Pinterest: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.8em"
      height="1.8em"
      viewBox="0 0 256 256"
    >
      <path
        fill="#cb1f27"
        d="M0 128.002c0 52.414 31.518 97.442 76.619 117.239c-.36-8.938-.064-19.668 2.228-29.393c2.461-10.391 16.47-69.748 16.47-69.748s-4.089-8.173-4.089-20.252c0-18.969 10.994-33.136 24.686-33.136c11.643 0 17.268 8.745 17.268 19.217c0 11.704-7.465 29.211-11.304 45.426c-3.207 13.578 6.808 24.653 20.203 24.653c24.252 0 40.586-31.149 40.586-68.055c0-28.054-18.895-49.052-53.262-49.052c-38.828 0-63.017 28.956-63.017 61.3c0 11.152 3.288 19.016 8.438 25.106c2.368 2.797 2.697 3.922 1.84 7.134c-.614 2.355-2.024 8.025-2.608 10.272c-.852 3.242-3.479 4.401-6.409 3.204c-17.884-7.301-26.213-26.886-26.213-48.902c0-36.361 30.666-79.961 91.482-79.961c48.87 0 81.035 35.364 81.035 73.325c0 50.213-27.916 87.726-69.066 87.726c-13.819 0-26.818-7.47-31.271-15.955c0 0-7.431 29.492-9.005 35.187c-2.714 9.869-8.026 19.733-12.883 27.421a127.9 127.9 0 0 0 36.277 5.249c70.684 0 127.996-57.309 127.996-128.005C256.001 57.309 198.689 0 128.005 0C57.314 0 0 57.309 0 128.002"
      />
    </svg>
  ),
};

// Helper functions
const isExternalUrl = (url: string): boolean => {
  return url.startsWith("http://") || url.startsWith("https://");
};

// Get backend URL from environment variable only
const getBackendUrl = (): string => {
  // Only use environment variable from .env file
  return process.env.NEXT_PUBLIC_API_URL || "";
};

const getImageUrl = (path: string | undefined, backendUrl: string): string => {
  if (!path) return "";

  // If it's already a full URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Clean backend URL (remove trailing slash)
  const cleanBackendUrl = backendUrl?.replace(/\/$/, "") || "";

  // If path already has /uploads/, use it directly
  if (path.startsWith("/uploads/")) {
    return `${cleanBackendUrl}${path}`;
  }

  // If path starts with /footer/, convert to /uploads/footer/
  if (path.startsWith("/footer/")) {
    return `${cleanBackendUrl}/uploads${path}`;
  }

  // If path starts with /, prepend /uploads
  if (path.startsWith("/")) {
    return `${cleanBackendUrl}/uploads${path}`;
  }

  // Otherwise, add /uploads/ prefix
  return `${cleanBackendUrl}/uploads/${path}`;
};

/** One pattern for all main footer columns: tight vertical stack */
const footerCol =
  "flex min-w-0 w-full flex-col gap-2 self-start";
const footerColTitle =
  "m-0 text-base font-medium leading-tight text-white";
const footerLinkStack = "flex flex-col gap-1";

type FooterProps = {
  /** When set (e.g. from FooterShell), skips client fetch and uses ISR-prefetched CMS data. */
  initialFooterSettings?: FooterSettings;
  /** From request host (SSR); must match client rules for localhost image URLs to avoid hydration mismatch. */
  siteHostIsLocal?: boolean;
  /** Snapshot year from server for copyright line (avoids rare SSR/client boundary mismatches). */
  copyrightYear?: number;
};

const Footer: React.FC<FooterProps> = ({
  initialFooterSettings,
  siteHostIsLocal = false,
  copyrightYear,
}) => {
  const auth = useAuth();
  const [footerData, setFooterData] = useState<FooterSettings | null>(() =>
    initialFooterSettings !== undefined ? initialFooterSettings : null
  );
  const [isLoading, setIsLoading] = useState(
    () => initialFooterSettings === undefined
  );
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Cache key for localStorage
  const CACHE_KEY = "footer_settings_cache";
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  // Fetch footer settings from API
  const fetchFooterSettings = useCallback(async () => {
    const backendUrl = getBackendUrl();

    if (!backendUrl) {
      console.error(
        "NEXT_PUBLIC_API_URL is not set in environment variables - using defaults"
      );
      setFooterData(DEFAULT_FOOTER);
      setIsLoading(false);
      return;
    }

 
  

    try {
      const cleanBackendUrl = backendUrl.endsWith("/")
        ? backendUrl.slice(0, -1)
        : backendUrl;
      const apiUrl = `${cleanBackendUrl}/footer/settings`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

     

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();

      // Extract data from response (API returns { success: true, data: {...} })
      const apiData = responseJson.data || responseJson;
      const data: FooterSettings = apiData;


      // Filter and sort data
      if (data.section1?.socialMedia) {
        data.section1.socialMedia = data.section1.socialMedia
          .filter((item) => item.isActive)
          .sort((a, b) => a.order - b.order);
      }

      ["section2", "section3", "section4"].forEach((sectionKey) => {
        const section = data[
          sectionKey as keyof FooterSettings
        ] as FooterSection2;
        if (section?.links) {
          section.links = section.links
            .filter((link) => link.isActive)
            .sort((a, b) => a.order - b.order);
        }
      });

      if (data.section5?.paymentMethods?.logos) {
        data.section5.paymentMethods.logos = data.section5.paymentMethods.logos
          .filter((logo) => logo.isActive)
          .sort((a, b) => a.order - b.order);
      }

      setFooterData(data);

      // Cache the data
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        } catch (error) {
          console.warn("Failed to cache footer data:", error);
        }
      }
    } catch (error) {
      console.warn(
        "Failed to fetch footer settings from API, using fallback:",
        error
      );
      setFooterData(DEFAULT_FOOTER);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFooterSettings !== undefined) return;
    window.scrollTo(0, 0);
    console.log("Footer component mounted, fetching footer settings...");
    fetchFooterSettings().catch((error) => {
      console.error("Footer fetchFooterSettings error:", error);
    });
  }, [fetchFooterSettings, initialFooterSettings]);

  // Use footer data or fallback to default
  const footer = useMemo(() => {
    const data = footerData ?? DEFAULT_FOOTER;
    return {
      ...DEFAULT_FOOTER,
      ...data,
      bottomBar: {
        ...DEFAULT_FOOTER.bottomBar,
        ...(data.bottomBar ?? {}),
      },
    };
  }, [footerData]);

  const bottomBarDisplay = useMemo(() => {
    const bb =
      footer.bottomBar ??
      DEFAULT_FOOTER.bottomBar ?? {
        textBeforeCredit: "",
        creditLabel: "",
        creditUrl: "",
      };
    const year = copyrightYear ?? new Date().getFullYear();
    const before = (bb.textBeforeCredit ?? "")
      .replace(/\{\{\s*year\s*\}\}/gi, String(year))
      .replace(/\{year\}/gi, String(year));
    const label = bb.creditLabel?.trim() ?? "";
    const url = bb.creditUrl?.trim() ?? "";
    const isHttpUrl = /^https?:\/\//i.test(url);
    return { before, label, url, isHttpUrl };
  }, [footer.bottomBar, copyrightYear]);

  // Handle image error
  const handleImageError = useCallback((imagePath: string) => {
    setImageErrors((prev) => new Set(prev).add(imagePath));
  }, []);

  // Render link component (internal or external)
  const renderLink = useCallback((link: FooterLink, index: number) => {
    const href = link.link;
    const isExternal = isExternalUrl(href);
    const className =
      "hover:text-gray-200 inline-block py-0.5 text-sm leading-snug";
    const props = {
      className,
      ...(link.ariaLabel && { "aria-label": link.ariaLabel }),
    };

    if (isExternal) {
      return (
        <a key={index} href={href} rel="noopener noreferrer" {...props}>
          {link.text}
        </a>
      );
    }

    return (
      <Link key={index} href={href} {...props}>
        {link.text}
      </Link>
    );
  }, []);

  // Render social media icon
  const renderSocialIcon = useCallback(
    (social: SocialMediaItem, index: number) => {
      const hasCustomIcon = social.icon && !imageErrors.has(social.icon);
      const iconUrl = social.icon
        ? getImageUrl(social.icon, getBackendUrl())
        : null;
      const iconName = social.name;

      return (
        <li
          key={index}
          className="text-center hover:scale-105 duration-300"
        >
          <a
            href={social.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-200 inline-block rounded py-0.5 text-sm leading-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2"
            aria-label={social.ariaLabel || `Visit Zextons on ${iconName}`}
          >
            {hasCustomIcon && iconUrl ? (
              <Image
                src={iconUrl}
                alt={iconName}
                width={28}
                height={28}
                onError={() => iconUrl && handleImageError(iconUrl)}
              />
            ) : (
              SocialMediaIcons[iconName] ||
              SocialMediaIcons[iconName.split(" ")[0]] || (
                <span>{iconName}</span>
              )
            )}
          </a>
        </li>
      );
    },
    [imageErrors, handleImageError]
  );

  // Get logo URL - handle both string and object formats
  const logoUrl = useMemo(() => {
    if (!footer.section1?.logo) return null;
    const logoPath =
      typeof footer.section1.logo === "string"
        ? footer.section1.logo
        : footer.section1.logo.image;
    if (!logoPath) return null;
    const url = getImageUrl(logoPath, getBackendUrl());
    if (url && url.includes("localhost") && !siteHostIsLocal) {
      return null;
    }
    return url;
  }, [footer.section1?.logo, siteHostIsLocal]);

  // Get logo link
  const logoLink = useMemo(() => {
    if (!footer.section1?.logo) return "/";
    if (typeof footer.section1.logo === "string") return "/";
    return footer.section1.logo.link || "/";
  }, [footer.section1?.logo]);

  // Get Ecologi logo URL
  const ecologiLogoUrl = useMemo(() => {
    if (!footer.section5?.ecologiLogo) return null;
    const url = getImageUrl(footer.section5.ecologiLogo, getBackendUrl());
    if (url && url.includes("localhost") && !siteHostIsLocal) {
      return null;
    }
    return url;
  }, [footer.section5?.ecologiLogo, siteHostIsLocal]);

  // Filter sections with active items
  const hasActiveLinks = (links: FooterLink[] | undefined): boolean => {
    return links ? links.length > 0 : false;
  };

  const section2Links = footer.section2?.links || [];
  const section3Links = footer.section3?.links || [];
  const socialMedia = footer.section1?.socialMedia || [];
  const newsletterDefaults = DEFAULT_FOOTER.sectionNewsletter!;
  const sectionNewsletter = footer.sectionNewsletter;
  const showFooterNewsletter = sectionNewsletter?.isEnabled !== false;

  return (
    <footer
      className="bg-[#212121] py-5 text-gray-400 md:py-6"
      aria-label="Footer"
    >
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 md:pb-0 md:pt-6 lg:px-8">
        {isLoading ? (
          <div
            className="grid grid-cols-1 items-start gap-3 md:grid-cols-4 md:gap-4"
            aria-label="Footer Sections"
          >
            {[1, 2, 3, 4].map((i) => (
              <section key={i} className={`${footerCol} animate-pulse`}>
                <div className="mb-0 h-5 w-3/4 rounded bg-gray-700" />
                <div className="flex flex-col gap-1">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={j}
                      className="h-3.5 w-full rounded bg-gray-700"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 items-start gap-3 md:grid-cols-4 md:gap-4"
            aria-label="Footer Sections"
          >
            <section
              aria-labelledby="footer-logo"
              className={`${footerCol} items-center md:items-start max-md:mt-0 md:-mt-4 max-md:pt-3 max-md:pb-3`}
            >
              <Link
                id="footer-logo"
                href={logoLink}
                aria-label="Go to Zextons Home"
                className="block shrink-0 leading-none"
              >
                {logoUrl && !imageErrors.has(logoUrl) ? (
                  <Image
                    src={logoUrl}
                    alt="Zextons Tech Store Logo"
                    width={180}
                    height={80}
                    className="block h-20 w-[150px] max-w-full object-cover object-center md:object-left"
                    sizes="180px"
                    loading="lazy"
                    onError={() => {
                      if (logoUrl) handleImageError(logoUrl);
                    }}
                    unoptimized={logoUrl.startsWith("http://localhost")}
                  />
                ) : (
                  <Image
                    src={Zextons}
                    alt="Zextons Tech Store Logo"
                    width={180}
                    height={80}
                    className="block h-20 w-[180px] max-w-full object-contain object-center md:object-left"
                    sizes="180px"
                    loading="lazy"
                  />
                )}
              </Link>

              {footer.section1?.description?.trim() ? (
                <p
                  className="max-w-xs mt-4 pb-4 sm:pb-0 whitespace-pre-line text-center text-sm leading-snug text-gray-400 md:text-left"
                  id="footer-description"
                >
                  {footer.section1.description.trim()}
                </p>
              ) : null}

              {socialMedia.length > 0 && (
                <section
                  aria-labelledby="social-links"
                  className="flex w-full min-w-0 flex-col items-center md:items-start gap-2"
                >
                  <h3 id="social-links" className={footerColTitle}>
                    Follow Us
                  </h3>
                  <ul className="flex flex-wrap justify-center md:justify-start gap-1.5" role="list">
                    {socialMedia.map((social, index) =>
                      renderSocialIcon(social, index)
                    )}
                  </ul>
                </section>
              )}
            </section>

            {footer.section2?.title && (
              <section aria-labelledby="useful-links" className={`${footerCol} pb-4`}>
                <h3 id="useful-links" className={footerColTitle}>
                  {footer.section2.title}
                </h3>
                {hasActiveLinks(section2Links) && (
                  <ul className={footerLinkStack} role="list">
                    {section2Links.map((link, index) => (
                      <li key={index}>{renderLink(link, index)}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {footer.section3?.title && (
              <section aria-labelledby="customer-care" className={`${footerCol} pb-4`}>
                <h3 id="customer-care" className={footerColTitle}>
                  {footer.section3.title}
                </h3>
                {hasActiveLinks(section3Links) && (
                  <ul className={footerLinkStack} role="list">
                    {section3Links.map((link, index) => (
                      <li key={index}>{renderLink(link, index)}</li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {showFooterNewsletter && (
              <section
                aria-labelledby="footer-newsletter-heading"
                className={`${footerCol} md:col-span-1`}
              >
                <NewsletterSignupWidget
                  heading={
                    sectionNewsletter?.heading?.trim() ||
                    newsletterDefaults.heading ||
                    "Stay in the loop"
                  }
                  description={
                    sectionNewsletter?.description?.trim() ||
                    newsletterDefaults.description ||
                    ""
                  }
                  placeholder={
                    sectionNewsletter?.placeholder?.trim() ||
                    newsletterDefaults.placeholder
                  }
                  buttonLabel={
                    sectionNewsletter?.buttonLabel?.trim() ||
                    newsletterDefaults.buttonLabel ||
                    "Subscribe"
                  }
                  imageUrl={
                    sectionNewsletter?.imageUrl?.trim() ||
                    newsletterDefaults.imageUrl ||
                    ""
                  }
                  subscribeMode="footer_cms"
                />
              </section>
            )}

            {/* Hot Selling Gadgets */}
            {/* {footer.section4?.title && (
              <section aria-labelledby="hot-selling-gadgets">
                <h3
                  id="hot-selling-gadgets"
                  className="text-white text-lg font-medium"
                >
                  {footer.section4.title}
                </h3>
                {hasActiveLinks(section4Links) && (
                  <ul className="mt-4 space-y-2">
                    {section4Links.map((link, index) => (
                      <li key={index}>{renderLink(link, index)}</li>
                    ))}
                  </ul>
                )}
              </section>
            )} */}

            {/* Climate Impact */}
            {/* <div>
              <h3 className="text-white text-lg font-medium">
                {footer.section5?.title || "Our Climate Impact"}
              </h3>
              <div className="mt-4 text-white">
                {footer.section5?.text && <p>{footer.section5.text}</p>}
                {(footer.section5?.ecologiLink ||
                  footer.section5?.ecologiLogo) && (
                  <a
                    href={
                      footer.section5.ecologiLink ||
                      "https://ecologi.com/zextons"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit Ecologi to plant a tree"
                  >
                    {ecologiLogoUrl && !imageErrors.has(ecologiLogoUrl) ? (
                      <Image
                        src={ecologiLogoUrl}
                        alt="Ecologi"
                        className="w-auto mt-4"
                        width={230}
                        height={200}
                        loading="lazy"
                        onError={() => {
                          if (ecologiLogoUrl) handleImageError(ecologiLogoUrl);
                        }}
                        unoptimized={ecologiLogoUrl.startsWith(
                          "http://localhost"
                        )}
                      />
                    ) : (
                      <Image
                        src={Ecologi}
                        alt="Ecologi"
                        className="w-auto mt-4"
                        width={230}
                        height={200}
                        loading="lazy"
                      />
                    )}
                  </a>
                )}
                {footer.section5?.paymentMethods?.logos &&
                  footer.section5.paymentMethods.logos.length > 0 && (
                    <div
                      className={`mt-4 ${
                        false ? "pt-4 border-t border-gray-200" : ""
                      }`}
                    >
                      {footer.section5.paymentMethods.heading && (
                        <p className="text-sm text-white mb-3 text-center">
                          {footer.section5.paymentMethods.heading}
                        </p>
                      )}
                      <div className="flex flex-wrap justify-center items-center gap-3">
                        {footer.section5.paymentMethods.logos.map(
                          (logo, index) => {
                            const logoUrl = getImageUrl(
                              logo.logo,
                              getBackendUrl()
                            );
                            // Skip localhost URLs in production
                            const isLocalhostUrl = logoUrl && logoUrl.includes("localhost");
                            const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
                            if (isLocalhostUrl && isProduction) return null;
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-center p-1 bg-white rounded-md border border-gray-200 hover:border-gray-300 transition-colors flex-shrink-0"
                                title={logo.name}
                              >
                                <Image
                                  src={logoUrl}
                                  alt={logo.name}
                                  width={40}
                                  height={24}
                                  className="h-6 w-10 object-contain"
                                  onError={() => {
                                    handleImageError(logoUrl);
                                  }}
                                  unoptimized={logoUrl.startsWith(
                                    "http://localhost"
                                  )}
                                />
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}
                {(!footer.section5?.paymentMethods?.logos ||
                  footer.section5.paymentMethods.logos.length === 0) && (
                  <PaymentLogos showBorder={false} headingColor="text-white" />
                )}
              </div>
            </div> */}
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-gray-700 pt-3">
        <p className="text-center text-gray-400 text-sm">
          {bottomBarDisplay.before}
          {bottomBarDisplay.label && bottomBarDisplay.isHttpUrl ? (
            <>
              {" "}
              <a
                href={bottomBarDisplay.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                aria-label={`Visit ${bottomBarDisplay.label} website`}
              >
                {bottomBarDisplay.label}
              </a>
            </>
          ) : bottomBarDisplay.label ? (
            <>
              {" "}
              <span className="underline">{bottomBarDisplay.label}</span>
            </>
          ) : null}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
