'use client';

import { LiveSystemStatusState } from '@/types/domain-4';
import { Badge } from '@/components/shared/Badge';

interface RateLimiterStatusProps {
  rateLimiter: LiveSystemStatusState['rateLimiter'];
  className?: string;
}

export function RateLimiterStatus({ rateLimiter, className = '' }: RateLimiterStatusProps) {
  const usagePercentage = ((rateLimiter.limit - rateLimiter.remaining) / rateLimiter.limit) * 100;
  const isNearLimit = usagePercentage > 80;
  const timeUntilReset = Math.max(0, Math.ceil((rateLimiter.resetTime - Date.now()) / 1000));

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">Rate Limiter</h4>
        <Badge variant={isNearLimit ? "error" : "success"}>
          {isNearLimit ? "HIGH USAGE" : "NORMAL"}
        </Badge>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Requests:</span>
          <span className="font-mono">{rateLimiter.requestsPerSecond}/sec</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Limit:</span>
          <span className="font-mono">{rateLimiter.limit}/min</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Remaining:</span>
          <span className={`font-mono ${rateLimiter.remaining < 10 ? 'text-destructive' : 'text-foreground'}`}>
            {rateLimiter.remaining}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Reset:</span>
          <span className="font-mono">{timeUntilReset}s</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              usagePercentage > 90 ? 'bg-destructive' :
              usagePercentage > 70 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
