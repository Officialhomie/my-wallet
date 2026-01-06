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
  const [isTabletMenuOpen, setIsTabletMenuOpen] = useState(false);
  const store = useStore();

  const navigationItems = getNavigationItems(store, pathname);

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <Link href="/" className="text-lg sm:text-xl font-semibold text-card-foreground hover:text-primary transition-colors truncate max-w-[120px] sm:max-w-[200px]">
            Tvrch
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-1">
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
                      <svg
                        className="ml-2 h-4 w-4 text-muted-foreground/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                      </svg>
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

          {/* Tablet Menu Button */}
          <div className="hidden md:flex lg:hidden items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {navigationItems.find(item => item.current)?.label || 'Menu'}
            </span>
            <button
              onClick={() => setIsTabletMenuOpen(!isTabletMenuOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Toggle tablet menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
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
          <div className="lg:hidden border-t border-border overflow-hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 max-h-[80vh] overflow-y-auto">
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
                        <svg
                          className="h-4 w-4 text-muted-foreground/50 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                          />
                        </svg>
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
