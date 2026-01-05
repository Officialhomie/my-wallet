'use client';

import { LiveSystemStatusState } from '@/types/domain-4';
import { Badge } from '@/components/shared/Badge';

interface CircuitBreakerStatusProps {
  circuitBreaker: LiveSystemStatusState['circuitBreaker'];
  className?: string;
}

export function CircuitBreakerStatus({ circuitBreaker, className = '' }: CircuitBreakerStatusProps) {
  const getStateConfig = (state: typeof circuitBreaker.state) => {
    switch (state) {
      case 'closed':
        return {
          label: 'CLOSED',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '🔒',
          description: 'Normal operation',
        };
      case 'open':
        return {
          label: 'OPEN',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '🔓',
          description: 'Blocking requests',
        };
      case 'half-open':
        return {
          label: 'HALF-OPEN',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '🔄',
          description: 'Testing recovery',
        };
      default:
        return {
          label: 'UNKNOWN',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          description: 'Unknown state',
        };
    }
  };

  const config = getStateConfig(circuitBreaker.state);
  const timeUntilRetry = circuitBreaker.nextRetryTime
    ? Math.max(0, Math.ceil((circuitBreaker.nextRetryTime - Date.now()) / 1000))
    : 0;

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">Circuit Breaker</h4>
        <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${config.color}`}>
          <span className="mr-1">{config.icon}</span>
          {config.label}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-muted-foreground mb-2">
          {config.description}
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Failures:</span>
          <span className="font-mono text-destructive">{circuitBreaker.failureCount}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Successes:</span>
          <span className="font-mono text-green-600">{circuitBreaker.successCount}</span>
        </div>

        {circuitBreaker.lastFailureTime && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Failure:</span>
            <span className="font-mono text-xs">
              {new Date(circuitBreaker.lastFailureTime).toLocaleTimeString()}
            </span>
          </div>
        )}

        {circuitBreaker.state === 'open' && timeUntilRetry > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Retry in:</span>
            <span className="font-mono text-yellow-600">{timeUntilRetry}s</span>
          </div>
        )}

        {/* Success rate indicator */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Success Rate</span>
            <span>
              {circuitBreaker.successCount + circuitBreaker.failureCount > 0
                ? Math.round((circuitBreaker.successCount / (circuitBreaker.successCount + circuitBreaker.failureCount)) * 100)
                : 100
              }%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="h-1.5 bg-green-500 rounded-full transition-all duration-300"
              style={{
                width: `${circuitBreaker.successCount + circuitBreaker.failureCount > 0
                  ? (circuitBreaker.successCount / (circuitBreaker.successCount + circuitBreaker.failureCount)) * 100
                  : 100
                }%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
