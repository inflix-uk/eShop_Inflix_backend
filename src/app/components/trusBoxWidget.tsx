"use client";
import React, { useEffect, useState } from 'react';
import { getTrustpilotSettings, type TrustpilotSettings } from '@/app/services/trustpilotService';
import DynamicTrustpilotWidget from './DynamicTrustpilotWidget';

interface TrustBoxWidgetProps {
  className?: string;
}

const TrustBoxWidget: React.FC<TrustBoxWidgetProps> = ({ className = "mt-10 mb-10" }) => {
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

  // Don't render anything if no script is available
  if (!trustpilotSettings?.productPageScript) {
    return null;
  }

  return (
    <DynamicTrustpilotWidget
      scriptHtml={trustpilotSettings.productPageScript}
      className={className}
    />
  );
};

export default TrustBoxWidget;
