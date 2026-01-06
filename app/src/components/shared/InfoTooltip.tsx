'use client';

import { useState } from 'react';

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Show full address"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isVisible && (
        <div
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-[calc(100vw-2rem)] sm:w-64 max-w-sm p-2 sm:p-3 bg-popover border border-border rounded-lg shadow-lg text-xs text-popover-foreground"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          <div className="font-mono break-all text-[10px] sm:text-xs">{content}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full hidden sm:block">
            <div className="border-4 border-transparent border-t-popover"></div>
          </div>
        </div>
      )}
    </div>
  );
}

