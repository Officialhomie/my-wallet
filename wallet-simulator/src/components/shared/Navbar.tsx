'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useStore } from '@/store';
import { getNavigationItems, canNavigateTo, getNavigationGuidance } from '@/lib/navigationGuards';
import { Badge } from './Badge';

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const store = useStore();

  const navigationItems = getNavigationItems(store, pathname);

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <Link href="/" className="text-lg sm:text-xl font-semibold text-card-foreground hover:text-primary transition-colors">
            Wallet Farm Simulator
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {navigationItems.map((item) => {
              const guidance = getNavigationGuidance(item.path, store);
              const isDisabled = !item.enabled;
              const isActive = item.current;

              return (
                <div key={item.path} className="relative">
                  <Link
                    href={item.enabled ? item.path : '#'}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : isDisabled
                        ? 'text-muted-foreground/50 cursor-not-allowed bg-muted/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        // Could show a tooltip or toast with guidance
                        console.info('Navigation blocked:', guidance.error);
                      }
                    }}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                    {isDisabled && (
                      <Badge variant="default" className="ml-2 text-xs">
                        Locked
                      </Badge>
                    )}
                  </Link>

                  {/* Tooltip for disabled items */}
                  {isDisabled && guidance.error && (
                    <div className="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-popover border border-border rounded-md shadow-lg text-xs text-popover-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <p className="font-medium mb-1">Cannot access {item.label}</p>
                      <p>{guidance.error}</p>
                      {guidance.action && (
                        <p className="mt-1 text-primary">{guidance.action}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => {
                const guidance = getNavigationGuidance(item.path, store);
                const isDisabled = !item.enabled;
                const isActive = item.current;

                return (
                  <div key={item.path} className="relative">
                    <Link
                      href={item.enabled ? item.path : '#'}
                      onClick={() => {
                        if (!isDisabled) setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isDisabled
                          ? 'text-muted-foreground/50 cursor-not-allowed bg-muted/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-2">{item.icon}</span>
                        {item.label}
                      </div>
                      {isDisabled && (
                        <Badge variant="default" className="text-xs">
                          Locked
                        </Badge>
                      )}
                    </Link>

                    {/* Mobile tooltip */}
                    {isDisabled && guidance.error && (
                      <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-md mt-1">
                        <p>{guidance.error}</p>
                        {guidance.action && (
                          <p className="mt-1 text-primary">{guidance.action}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
