'use client';

interface SkeletonLoaderProps {
  lines?: number;
  className?: string;
  height?: string;
  width?: string;
}

export function SkeletonLoader({
  lines = 3,
  className = '',
  height = 'h-4',
  width = 'w-full'
}: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} ${width} bg-muted rounded mb-2 last:mb-0`}
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: '1.5s',
          }}
        />
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className = '', lines = 4 }: SkeletonCardProps) {
  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${className}`}>
      <SkeletonLoader lines={1} className="mb-4" width="w-1/3" />
      <SkeletonLoader lines={lines} className="space-y-3" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: SkeletonTableProps) {
  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-muted/50 p-4 border-b border-border">
        <SkeletonLoader lines={1} width="w-1/4" />
      </div>

      {/* Table rows */}
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="flex-1">
                <SkeletonLoader lines={1} width={`${80 + Math.random() * 20}%`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Page-level skeleton loader
export function PageSkeleton({ title = true, content = true, sidebar = false }: {
  title?: boolean;
  content?: boolean;
  sidebar?: boolean;
} = {}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Title */}
      {title && (
        <div className="mb-8">
          <SkeletonLoader lines={1} width="w-1/3" height="h-8" className="mb-2" />
          <SkeletonLoader lines={1} width="w-1/2" height="h-4" />
        </div>
      )}

      <div className={`grid gap-8 ${sidebar ? 'lg:grid-cols-3' : ''}`}>
        {/* Main content */}
        <div className={sidebar ? 'lg:col-span-2' : ''}>
          {content && (
            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard lines={6} />
              <SkeletonTable />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {sidebar && (
          <div className="space-y-6">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
          </div>
        )}
      </div>
    </div>
  );
}
