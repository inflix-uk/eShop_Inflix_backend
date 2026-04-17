"use client";

import { useEffect, useState } from "react";

interface DateDisplayProps {
  dateString: string;
  dateTime: string;
  className?: string;
  fallbackText: string;
}

export default function DateDisplay({ 
  dateString, 
  dateTime, 
  className = "text-white",
  fallbackText
}: DateDisplayProps) {
  const [formattedDate, setFormattedDate] = useState<string>(fallbackText);

  useEffect(() => {
    // Format date only on client side to ensure consistency
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const formatted = date.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        setFormattedDate(formatted);
      }
    } catch (e) {
      console.error("Date parsing error:", e);
      // Keep using the fallback if there's an error
    }
  }, [dateString, fallbackText]);

  return (
    <time dateTime={dateTime} className={className}>
      {formattedDate}
    </time>
  );
}