import type { Config } from "tailwindcss";

/** Maps Tailwind `green-*` / `emerald-*` to site brand colors (CSS variables). */
const brandGreenScale = {
  50: "color-mix(in srgb, rgb(var(--primary-rgb)) 5%, white)",
  100: "color-mix(in srgb, rgb(var(--primary-rgb)) 10%, white)",
  200: "color-mix(in srgb, rgb(var(--primary-rgb)) 18%, white)",
  300: "color-mix(in srgb, rgb(var(--primary-rgb)) 30%, white)",
  400: "color-mix(in srgb, rgb(var(--primary-rgb)) 45%, white)",
  500: "rgb(var(--primary-rgb) / <alpha-value>)",
  600: "rgb(var(--primary-rgb) / <alpha-value>)",
  700: "rgb(var(--secondary-rgb) / <alpha-value>)",
  800: "color-mix(in srgb, rgb(var(--secondary-rgb)) 78%, black)",
  900: "color-mix(in srgb, rgb(var(--secondary-rgb)) 62%, black)",
  950: "color-mix(in srgb, rgb(var(--secondary-rgb)) 45%, black)",
};

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/(routes)/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
        heading: ["Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        primary: "rgb(var(--primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--secondary-rgb) / <alpha-value>)",
        green: brandGreenScale,
        emerald: brandGreenScale,
      },
      screens: {
        xs: "320px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      boxShadow: {
        "top-shadow":
          "0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -4px rgba(0, 0, 0, 0.1)",
        // Custom box-shadow you mentioned
        "card-shadow": "0 10px 20px rgba(0, 0, 0, 0.2)",
      },
      scale: {
        "130": "1.3",
        "150": "1.5",
        "165": "1.65",
      },
      transitionDuration: {
        "1500": "1500ms", // Adds custom transition duration of 1.5s
      },
       animation: {
        slideUp: 'slideUp 1s ease-out forwards',
        slideRight: 'slideRight 1s ease-out forwards',
        fadeIn: 'fadeIn 0.8s ease-out forwards',
        slideDown: 'slideDown 0.3s ease-out forwards',
      },
      keyframes: {
        slideUp: {
          '0%': {
            transform: 'translateY(100%) rotate(0deg)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0) rotate(-5deg)',
            opacity: '1',
          },
        },
        slideRight: {
          '0%': {
            transform: 'translateX(0) translateY(0) rotate(-30deg)',
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(100%) translateY(-100%)',
            opacity: '0',
          },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(90px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            'li > h1, li > h2, li > h3, li > h4, li > h5, li > h6': {
              display: 'inline',
              margin: '0',
              marginTop: '0',
              marginBottom: '0',
              padding: '0',
            },
            'li h1:first-child, li h2:first-child, li h3:first-child, li h4:first-child, li h5:first-child, li h6:first-child': {
              marginTop: '0',
            },
          },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography")({
      className: 'prose',
    }),
    function ({
      addUtilities,
    }: {
      addUtilities: (
        utilities: Record<string, any>,
        variants: string[]
      ) => void;
    }) {
      const newUtilities = {
        ".scrollbar-thin": {
          scrollbarWidth: "thin",
          scrollbarColor: "lightGrey white",
        },
        ".scrollbar-webkit": {
          "&::-webkit-scrollbar": {
            width: "1px",
          },
          "&::-webkit-scrollbar-track": {
            background: "white",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgb(31 41 55)",
            borderRadius: "20px",
            border: "1px solid white",
          },
        },
        // Add styles for other browsers if needed
      };

      addUtilities(newUtilities, ["responsive", "hover"]);
    },
  ],
} satisfies Config;
