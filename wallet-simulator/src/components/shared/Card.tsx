// Shared Card Component

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Card({ children, className = '', title }: CardProps) {
  return (
    <div className={`bg-card rounded-lg shadow border border-border ${className}`}>
      {title && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold text-card-foreground">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
