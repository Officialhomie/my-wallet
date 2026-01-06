// Shared Card Component

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: 'default' | 'error' | 'warning' | 'success';
}

export function Card({ children, className = '', title, variant = 'default' }: CardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    error: 'bg-destructive/5 border-destructive/30',
    warning: 'bg-warning/5 border-warning/30',
    success: 'bg-success/5 border-success/30',
  };

  return (
    <div className={`rounded-lg shadow border w-full ${variantStyles[variant]} ${className}`}>
      {title && (
        <div className="px-4 sm:px-6 py-4 border-b border-border">
          <h3 className="text-lg sm:text-xl font-semibold text-card-foreground">{title}</h3>
        </div>
      )}
      <div className="p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
