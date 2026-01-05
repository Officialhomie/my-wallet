// Performance optimization utilities
// Memoization, lazy loading, and performance monitoring

import React, { useMemo, useCallback, useRef, useEffect, useState, lazy, Suspense, ComponentType } from 'react';
import { useStore } from '@/store';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';

// Memoization helpers
export function useMemoizedSelector<T>(
  selector: (state: any) => T,
  deps: any[] = []
): T {
  const store = useStore();

  return useMemo(() => {
    return selector(store);
  }, [store, ...deps]);
}

export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[] = []
): T {
  return useCallback(callback, deps);
}

// Debounce hook for performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for performance
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

// Lazy loading component wrapper
export function withLazyLoading<T extends {}>(
  importFunc: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: T) {
    const fallbackElement = fallback || React.createElement(SkeletonCard);
    return React.createElement(
      Suspense,
      { fallback: fallbackElement },
      React.createElement(LazyComponent, props as any)
    );
  };
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    lastRenderTime.current = now;

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times, last render took ${renderTime}ms`);
    }
  });

  return {
    renderCount: renderCount.current,
  };
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (event: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(event.currentTarget.scrollTop);
    },
  };
}

// Component for virtual scrolling
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}) {
  const { visibleItems, totalHeight, offsetY, onScroll } = useVirtualScroll({
    items,
    itemHeight,
    containerHeight,
  });

  return React.createElement(
    'div',
    {
      className: `overflow-auto ${className}`,
      style: { height: containerHeight },
      onScroll: onScroll,
    },
    React.createElement(
      'div',
      { style: { height: totalHeight, position: 'relative' } },
      React.createElement(
        'div',
        {
          style: {
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          },
        },
        visibleItems.map((item, index) => renderItem(item, index))
      )
    )
  );
}

// Bundle splitting helper
// Note: Lazy components should be defined in .tsx files where JSX is supported
// Example usage:
// const LazyComponent = lazy(() => import('./Component'));
// <Suspense fallback={<SkeletonCard />}><LazyComponent /></Suspense>
