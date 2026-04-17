"use client";
import React, { useEffect, useState } from 'react';
import { getTrustpilotSettings, type TrustpilotSettings } from '@/app/services/trustpilotService';
import DynamicTrustpilotWidget from '@/app/components/DynamicTrustpilotWidget';

interface TrustpilotWidgetProps {
  position?: 'top' | 'bottom';
  className?: string;
}

export default function TrustpilotWidget({ position = 'bottom', className = '' }: TrustpilotWidgetProps) {
  const [trustpilotSettings, setTrustpilotSettings] = useState<TrustpilotSettings | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getTrustpilotSettings();
        if (data) {
          setTrustpilotSettings(data);
        }
      } catch (err) {
        console.error("Error fetching Trustpilot settings:", err);
        setTrustpilotSettings(null);
      }
    })();
  }, []);

  // Get the appropriate script based on position
  const scriptHtml = position === 'top'
    ? trustpilotSettings?.productPageTopScript
    : trustpilotSettings?.productPageScript;

  // Don't render anything if no script is available
  if (!scriptHtml) {
    return null;
  }

  return (
    <DynamicTrustpilotWidget
      scriptHtml={scriptHtml}
      className={className}
    />
  );
}
