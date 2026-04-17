'use client';
import { useTrustPWidget } from "@/app/hooks/useTrustPWidget";

const TopBar: React.FC = () => {
  useTrustPWidget();

  return (
    <div className="trustpilot-widget py-3 bg-gray-100" data-locale="en-GB" data-template-id="5419b6ffb0d04a076446a9af" data-businessunit-id="62e8fdd30dc0c3a7268e8064" data-style-height="20px" data-style-width="100%" data-theme="light">
      <a href="https://uk.trustpilot.com/review/zextons.co.uk" target="_blank" rel="noopener noreferrer">
        Trustpilot
      </a>
    </div>
  );
};

export default TopBar;
