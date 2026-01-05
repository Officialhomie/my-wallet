// Shared Input Component

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <input
        className={`block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1 ${className} ${
          error ? 'border-destructive' : ''
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
