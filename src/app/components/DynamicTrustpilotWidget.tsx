"use client";
import React, { useEffect, useRef, useState } from 'react';

interface DynamicTrustpilotWidgetProps {
  scriptHtml: string;
  className?: string;
  /** Reserved height before Trustpilot injects (default 140). Use 0 for content-sized layout e.g. blog embeds */
  loadingMinHeightPx?: number;
}

/**
 * Sanitize HTML to fix common issues like extra closing tags
 */
const sanitizeHtml = (html: string): string => {
  // Convert JSX className to HTML class attribute
  let sanitized = html.replace(/className=/g, 'class=');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Use DOMParser to validate and fix HTML structure
  if (typeof window !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    // Get the content from body (DOMParser wraps content in html/body)
    const bodyContent = doc.body.innerHTML;

    // Check if we have valid trustpilot widget
    if (bodyContent && doc.body.querySelector('.trustpilot-widget')) {
      return bodyContent;
    }
  }

  return sanitized;
};

const DynamicTrustpilotWidget: React.FC<DynamicTrustpilotWidgetProps> = ({
  scriptHtml,
  className = "",
  loadingMinHeightPx = 140,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!scriptHtml || !containerRef.current) return;

    // Sanitize and fix the HTML content
    const htmlContent = sanitizeHtml(scriptHtml);

    // Set the HTML content
    containerRef.current.innerHTML = htmlContent;
    setIsReady(true);

    // Initialize Trustpilot with retry logic
    const initializeTrustpilot = (retries = 0) => {
      const trustpilot = window.Trustpilot;
      if (trustpilot && containerRef.current) {
        const widgets = containerRef.current.querySelectorAll('.trustpilot-widget');
        widgets.forEach((widget) => {
          trustpilot.loadFromElement(widget as HTMLElement);
        });
      } else if (retries < 10) {
        // Retry up to 10 times with increasing delay
        setTimeout(() => initializeTrustpilot(retries + 1), 200 * (retries + 1));
      }
    };

    // Load Trustpilot bootstrap script if not already loaded
    const existingScript = document.querySelector('script[src*="widget.trustpilot.com"]');

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
      script.async = true;
      script.onload = () => {
        setTimeout(() => initializeTrustpilot(0), 100);
      };
      document.head.appendChild(script);
    } else {
      // Script already loaded or loading, initialize with retry
      setTimeout(() => initializeTrustpilot(0), 100);
    }

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptHtml]);

  if (!scriptHtml) {
    return null;
  }

  const minH =
    isReady || loadingMinHeightPx <= 0
      ? undefined
      : `${loadingMinHeightPx}px`;

  return (
    <div
      ref={containerRef}
      className={className}
      style={minH ? { minHeight: minH } : undefined}
    />
  );
};

export default DynamicTrustpilotWidget;
