import React from "react";
import premiumphone from "@/app/assets/premiumphone.png";
import goodphone from "@/app/assets/goodphone.png";
import fairphone from "@/app/assets/fairphone.png";
import excellentphone from "@/app/assets/excellentphone.png";
import mobileinhand from "@/app/assets/mobileinhand.png";
import mobileinhandbg from "@/app/assets/mobileinhandbg.png";
import frontphone from "@/app/assets/frontphone.webp";
import backphone from "@/app/assets/backphone.webp";
import phone from "@/app/assets/phone.webp";
import { DiamondIcon } from "./CustomComponents";

// Import the specific condition images
import exelentfirst from "@/app/assets/exelentfirst.png";
import exelentsecond from "@/app/assets/exelentsecond.png";
import exelentthird from "@/app/assets/exelentthird.png";
import fairfirst from "@/app/assets/fairfirst.png";
import fairsecond from "@/app/assets/fairsecond.png";
import fairthird from "@/app/assets/fairthird.png";
import goodfirst from "@/app/assets/goodfirst.png";
import goodsecond from "@/app/assets/goodsecond.png";
import goodthird from "@/app/assets/goodthird.png";

export interface Grade {
  title: string;
  description: string;
  image: any;
}

export interface ComparisonRow {
  grade: string;
  cosmeticCondition: string;
  functionality: string;
  whoItsFor: string;
  priceVsNew: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface ConditionOption {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  isSelected?: boolean;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
}

export interface ConditionSlide {
  id: string;
  title: string;
  backgroundGradient: string;
  tags: string[];
  image: any;
  conditions: ConditionOption[];
}

export const grades: Grade[] = [
  {
    title: "Brand New",
    description:
      "Factory‑sealed, unused, full accessories, manufacturer warranty.",
    image: premiumphone,
  },
  {
    title: "Refurbished – Excellent",
    description: "Like‑new with minimal/no marks, fully tested.",
    image: excellentphone,
  },
  {
    title: "Refurbished – Good",
    description: "Light cosmetic wear, fully tested.",
    image: goodphone,
  },
  {
    title: "Refurbished – Fair",
    description: "Visible cosmetic wear, fully tested.",
    image: fairphone,
  },
];

export const comparisonTable: ComparisonRow[] = [
  {
    grade: "Brand New",
    cosmeticCondition: "Sealed, pristine",
    functionality: "100%",
    whoItsFor: "Gift/like‑new",
    priceVsNew: "Highest",
  },
  {
    grade: "Excellent",
    cosmeticCondition: "Like‑new, minimal marks",
    functionality: "100%",
    whoItsFor: "Premium feel",
    priceVsNew: "Save big",
  },
  {
    grade: "Good",
    cosmeticCondition: "Light wear",
    functionality: "100%",
    whoItsFor: "Value + clean look",
    priceVsNew: "Bigger savings",
  },
  {
    grade: "Fair",
    cosmeticCondition: "Visible wear",
    functionality: "100%",
    whoItsFor: "Lowest price",
    priceVsNew: "Maximum savings",
  },
];

export const whatWeTest: string[] = [
  "Battery & charging",
  "Screen & touch",
  "Cameras & Face/Touch ID",
  "Speakers & microphones",
  "Buttons & ports",
  "Wi‑Fi, 4G/5G, Bluetooth, GPS",
  "Sensors (gyroscope, proximity)",
  "IMEI check + network unlock",
  "Appearance",
  "Digital compass",
  "Flashlight",
  "Headset plug",
  "Rear camera system",
  "SIM tray",
  "WiFi",
  "Backlight",
  "Bluetooth",
  "Haptics",
  "Microphones",
  "Technical condition",
  "USB & Charger plug",
  "Accelerometer",
  "Cleanliness",
  "Display",
  "Power button",
  "Touchscreen",
  "Volume buttons",
  "Speaker",
];

export const faqs: FAQ[] = [
  {
    question: "Are refurbished phones unlocked?",
    answer: "Yes, all Zextons devices are unlocked and SIM‑free.",
  },
  {
    question: "What's the difference between Excellent, Good and Fair?",
    answer: "Only cosmetic condition changes; all are fully functional.",
  },
  {
    question: "What battery health can I expect?",
    answer:
      "iPhones are 85%+ or refurbished to standard; Android meets manufacturer thresholds.",
  },
  {
    question: "What's included with my order?",
    answer: "A cable and a free protection bundle on eligible models.",
  },
  {
    question: "What's your return policy?",
    answer: "30‑day returns for refund or exchange.",
  },
  {
    question: "How long is the warranty?",
    answer:
      "All refurbished devices come with an 18-month warranty, while brand-new devices include a 12-month manufacturer warranty.",
  },
];

export const conditionSlides: ConditionSlide[] = [
  {
    id: "fair",
    title: "Body",
    backgroundGradient: "from-pink-400 to-purple-500",
    tags: ["Visible signs of use", "Verified parts", "Battery for daily use"],
    image: fairphone,
    conditions: [
      { id: "fair", title: "Fair", price: "£269.00", isSelected: true },
      { id: "good", title: "Good", price: "£306.00" },
      { id: "excellent", title: "Excellent", price: "£399.00" },
      // {
      //   id: "premium",
      //   title: "Premium",
      //   price: "£391.00",
      //   originalPrice: "£391.00",
      //   icon: <DiamondIcon className="text-purple-600" />,
      // },
    ],
  },
  {
    id: "excellent",
    title: "Body",
    backgroundGradient: "from-blue-400 to-indigo-500",
    tags: ["Almost no signs of use", "Verified parts", "Battery for daily use"],
    image: excellentphone,
    conditions: [
      { id: "fair", title: "Fair", price: "£269.00" },
      { id: "good", title: "Good", price: "£306.00" },
      {
        id: "excellent",
        title: "Excellent",
        price: "£399.00",
        isSelected: true,
      },
      // {
      //   id: "premium",
      //   title: "Premium",
      //   price: "£391.00",
      //   originalPrice: "£391.00",
      //   icon: <DiamondIcon className="text-purple-600" />,
      // },
    ],
  },
  {
    id: "good",
    title: "Body",
    backgroundGradient: "from-purple-400 to-pink-500",
    tags: ["Light signs of use", "Verified parts", "Battery for daily use"],
    image: goodphone,
    conditions: [
      { id: "fair", title: "Fair", price: "£269.00" },
      { id: "good", title: "Good", price: "£306.00", isSelected: true },
      { id: "excellent", title: "Excellent", price: "£399.00" },
      // {
      //   id: "premium",
      //   title: "Premium",
      //   price: "£391.00",
      //   originalPrice: "£391.00",
      //   icon: <DiamondIcon className="text-purple-600" />,
      // },
    ],
  },
  {
    id: "premium",
    title: "Body",
    backgroundGradient: "from-gray-800 to-gray-900",
    tags: [
      "No signs of use",
      "Best quality",
      "Apple parts",
      "Battery for heavy use",
    ],
    image: premiumphone,
    conditions: [
      { id: "fair", title: "Fair", price: "£269.00" },
      { id: "good", title: "Good", price: "£306.00" },
      { id: "excellent", title: "Excellent", price: "£399.00" },
      // {
      //   id: "premium",
      //   title: "Premium",
      //   price: "£391.00",
      //   originalPrice: "£391.00",
      //   isSelected: true,
      //   icon: <DiamondIcon className="text-purple-600" />,
      // },
    ],
  },
];

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Are refurbished phones unlocked?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All Zextons devices are unlocked and SIM‑free for any UK network.",
      },
    },
    {
      "@type": "Question",
      name: "What's the difference between Excellent, Good and Fair?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only cosmetic condition. Excellent looks like new; Good has light wear; Fair shows visible marks. All are fully tested and function perfectly.",
      },
    },
    {
      "@type": "Question",
      name: "What battery health can I expect?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "iPhone devices are 85%+ battery health or refurbished to meet performance standards. Android batteries meet manufacturer thresholds.",
      },
    },
    {
      "@type": "Question",
      name: "What's included with my order?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A charging cable (or charger as listed) and a free protection bundle (case + screen protector) on eligible models.",
      },
    },
    {
      "@type": "Question",
      name: "What's your return policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "30‑day returns for refunds or exchanges. See our returns page for details.",
      },
    },
    {
      "@type": "Question",
      name: "How long is the warranty?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All refurbished devices come with an 18-month warranty, while brand-new devices include a 12-month manufacturer warranty.",
      },
    },
  ],
};

export const tabs = [
  {
    id: "refurbished",
    label: "Shop Refurbished iPhones",
    href: "#refurbished",
  },
  { id: "all", label: "All Phones", href: "#all" },
  { id: "deals", label: "See Today's Deals", href: "#deals" },
];

export const conditionOptions = [
  {
    id: "excellent",
    title: "Excellent",
    description:
      "Like-new condition with minimal to no visible marks. Premium feel at a great price.",
    badge: "Premium",
  },
  {
    id: "good",
    title: "Good",
    description:
      "Light cosmetic wear with excellent functionality. A great balance of quality and affordability.",
    badge: "Popular",
  },
  {
    id: "fair",
    title: "Fair",
    description:
      "Visible signs of wear but fully functional. Perfect for those who prioritize value over appearance.",
    badge: "Best Value",
  },

  // {
  //   id: "premium",
  //   title: "Premium",
  //   price: "£391.00",
  //   originalPrice: "£391.00",
  //   icon: <DiamondIcon className="text-purple-600" />,
  //   description:
  //     "Best quality with Apple-certified parts. Perfect for those who want the highest standard.",
  //   badge: "Premium",
  // },
];

// Helper functions
export const getImagesForCondition = (conditionId: string) => {
  switch (conditionId) {
    case "excellent":
      return [
        {
          src: exelentfirst,
          alt: "Excellent condition - Back view with camera module",
        },
        {
          src: exelentsecond,
          alt: "Excellent condition - Top-left corner with dynamic island",
        },
        {
          src: exelentthird,
          alt: "Excellent condition - Bottom-left corner detail",
        },
      ];
    case "good":
      return [
        {
          src: goodfirst,
          alt: "Good condition - Back view with camera module",
        },
        {
          src: goodsecond,
          alt: "Good condition - Top-left corner with dynamic island",
        },
        { src: goodthird, alt: "Good condition - Bottom-left corner detail" },
      ];
    case "fair":
      return [
        {
          src: fairfirst,
          alt: "Fair condition - Back view with camera module",
        },
        {
          src: fairsecond,
          alt: "Fair condition - Top-left corner with dynamic island",
        },
        { src: fairthird, alt: "Fair condition - Bottom-left corner detail" },
      ];
    case "premium":
      return [
        {
          src: exelentfirst,
          alt: "Premium condition - Back view with camera module",
        },
        {
          src: exelentsecond,
          alt: "Premium condition - Top-left corner with dynamic island",
        },
        {
          src: exelentthird,
          alt: "Premium condition - Bottom-left corner detail",
        },
      ];
    default:
      return [
        {
          src: exelentfirst,
          alt: "Phone condition - Back view with camera module",
        },
        {
          src: exelentsecond,
          alt: "Phone condition - Top-left corner with dynamic island",
        },
        {
          src: exelentthird,
          alt: "Phone condition - Bottom-left corner detail",
        },
      ];
  }
};

export const getImageForCondition = (conditionId: string) => {
  switch (conditionId) {
    case "fair":
      return fairphone;
    case "good":
      return goodphone;
    case "excellent":
      return excellentphone;
    case "premium":
      return premiumphone;
    default:
      return fairphone;
  }
};

export const getGradientForCondition = (conditionId: string) => {
  switch (conditionId) {
    case "fair":
      return "from-pink-400 to-purple-500";
    case "good":
      return "from-purple-400 to-pink-500";
    case "excellent":
      return "from-blue-400 to-indigo-500";
    case "premium":
      return "from-gray-800 to-gray-900";
    default:
      return "from-pink-400 to-purple-500";
  }
};
