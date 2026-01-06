// Shared Button Component

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-ring',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 focus:ring-ring',
    danger: 'bg-destructive text-destructive-foreground hover:opacity-90 focus:ring-ring',
    ghost: 'bg-transparent text-foreground hover:bg-muted focus:ring-ring',
    success: 'bg-success text-success-foreground hover:opacity-90 focus:ring-ring',
    warning: 'bg-warning text-warning-foreground hover:opacity-90 focus:ring-ring',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
