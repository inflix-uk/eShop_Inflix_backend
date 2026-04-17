'use client';
import { createContext, useContext, useEffect, useState } from 'react';

interface TrustpilotContextType {
  isLoaded: boolean;
  loadWidget: (element: HTMLElement) => void;
}

const TrustpilotContext = createContext<TrustpilotContextType | null>(null);

export function TrustpilotProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="tp.widget.bootstrap.min.js"]');
    if (existingScript) {
      setIsLoaded(true);
      return;
    }

    // Load script only once
    const script = document.createElement('script');
    script.src = '//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js';
    script.async = true;
    script.onload = () => {
      setIsLoaded(true);
      // Initialize any existing widgets
      if (window.Trustpilot) {
        const widgets = document.querySelectorAll('.trustpilot-widget:not([data-loaded])');
        widgets.forEach((widget) => {
          if (widget instanceof HTMLElement) {
            try {
              window.Trustpilot.loadFromElement(widget);
              widget.setAttribute('data-loaded', 'true');
            } catch (e) {
              console.warn('Failed to initialize Trustpilot widget:', e);
            }
          }
        });
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Don't remove the script on unmount as other components might need it
    };
  }, []);

  const loadWidget = (element: HTMLElement) => {
    if (isLoaded && window.Trustpilot && !element.hasAttribute('data-loaded')) {
      try {
        window.Trustpilot.loadFromElement(element);
        element.setAttribute('data-loaded', 'true');
      } catch (e) {
        console.warn('Failed to load Trustpilot widget:', e);
      }
    }
  };

  return (
    <TrustpilotContext.Provider value={{ isLoaded, loadWidget }}>
      {children}
    </TrustpilotContext.Provider>
  );
}

export const useTrustpilot = () => {
  const context = useContext(TrustpilotContext);
  if (!context) {
    throw new Error('useTrustpilot must be used within TrustpilotProvider');
  }
  return context;
};