'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { getNavigationItems, canNavigateTo } from '@/lib/navigationGuards';
import { useStore } from '@/store';
import { Badge } from './Badge';

interface BreadcrumbProps {
  className?: string;
}

export function Breadcrumb({ className = '' }: BreadcrumbProps) {
  const pathname = usePathname();
  const store = useStore();
  const navigationItems = getNavigationItems(store, pathname);

  // Build breadcrumb trail
  const breadcrumbs = navigationItems
    .filter(item => {
      // Include current item and all previous enabled items
      if (item.current) return true;
      if (!item.enabled) return false;

      // Include items before current in the flow
      const itemIndex = navigationItems.findIndex(nav => nav.path === item.path);
      const currentIndex = navigationItems.findIndex(nav => nav.current);

      return itemIndex < currentIndex;
    })
    .map(item => ({
      ...item,
      isLast: item.path === pathname,
    }));

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs if only one item
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => (
        <div key={item.path} className="flex items-center">
          {index > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground mx-2" />
          )}

          {item.isLast ? (
            <span className="flex items-center space-x-2">
              <span className="text-foreground font-medium">{item.label}</span>
              <Badge variant="default" className="text-xs">
                Current
              </Badge>
            </span>
          ) : (
            <Link
              href={canNavigateTo(item.path, store, pathname) ? item.path : '#'}
              className={`flex items-center space-x-2 hover:text-foreground transition-colors ${
                canNavigateTo(item.path, store, pathname)
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/50 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (!canNavigateTo(item.path, store, pathname)) {
                  e.preventDefault();
                }
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

interface NavigationProgressProps {
  className?: string;
}

export function NavigationProgress({ className = '' }: NavigationProgressProps) {
  const pathname = usePathname();
  const store = useStore();
  const navigationItems = getNavigationItems(store, pathname);

  // Find current item based on pathname
  const currentIndex = navigationItems.findIndex(item => item.path === pathname);
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / navigationItems.length) * 100 : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Setup Progress</span>
        <span>{Math.round(progress)}% Complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between">
        {navigationItems.map((item, index) => (
          <div
            key={item.path}
            className={`flex-1 text-center text-xs ${
              item.current
                ? 'text-primary font-medium'
                : item.enabled
                ? 'text-muted-foreground'
                : 'text-muted-foreground/50'
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
