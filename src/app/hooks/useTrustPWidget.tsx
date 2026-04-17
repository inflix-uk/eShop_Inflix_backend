'use client';
import { useEffect } from "react";

declare global {
  interface Window {
    Trustpilot: {
      loadFromElement: (element: HTMLElement) => void;
    };
  }
}

export const useTrustPWidget = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Trustpilot) {
      // Ensure this code runs only on the client-side where `window` is defined.
      const widgets = document.querySelectorAll(".trustpilot-widget");
      widgets.forEach((widget) => {
        if (widget instanceof HTMLElement) {
          window.Trustpilot.loadFromElement(widget);
        }
      });
    }
  }, []);
  useEffect(() => {
    // Create a script element
    const script = document.createElement("script");
    script.src =
      "//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
    script.async = true;

    // Append the script to the body
    document.body.appendChild(script);

    // Clean up the script when the component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);

};
