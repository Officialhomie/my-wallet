'use client';

import React from 'react';
import { Activity, Zap, AlertTriangle, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { useSimulationMetrics } from '@/lib/store';
import { cn } from '@/utils/cn';

interface MetricsPanelProps {
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

function MetricCard({ title, value, icon, color = 'text-foreground', subtitle }: MetricCardProps) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={cn('p-2 rounded-md bg-muted', color)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-2xl font-bold truncate">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MetricsPanel({ className }: MetricsPanelProps) {
  const metrics = useSimulationMetrics();

  if (!metrics) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground', className)}>
        <div className="text-center space-y-2">
          <div className="text-lg">No metrics available</div>
          <div className="text-sm">Start a simulation to see real-time metrics</div>
        </div>
      </div>
    );
  }

  const successRate = metrics.totalTransactions > 0
    ? ((metrics.successfulTransactions / metrics.totalTransactions) * 100).toFixed(1)
    : '0.0';

  const revertRate = metrics.totalTransactions > 0
    ? ((metrics.failedTransactions / metrics.totalTransactions) * 100).toFixed(1)
    : '0.0';

  const formatGas = (gas: bigint) => {
    if (gas > BigInt(1000000)) {
      return `${(Number(gas) / 1000000).toFixed(2)}M`;
    } else if (gas > BigInt(1000)) {
      return `${(Number(gas) / 1000).toFixed(1)}K`;
    }
    return gas.toString();
  };

  const formatDuration = () => {
    const duration = Date.now() - metrics.startTime.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Real-time Metrics</h3>
        <span className="text-sm text-muted-foreground">
          Running for {formatDuration()}
        </span>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Transactions/sec"
          value={metrics.tps.toFixed(2)}
          icon={<Activity className="w-4 h-4" />}
          color="text-green-600"
        />

        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="text-green-600"
          subtitle={`${metrics.successfulTransactions}/${metrics.totalTransactions}`}
        />

        <MetricCard
          title="Active Wallets"
          value={metrics.activeWallets}
          icon={<Zap className="w-4 h-4" />}
          color="text-blue-600"
        />

        <MetricCard
          title="Avg Gas Used"
          value={formatGas(metrics.avgGasUsed)}
          icon={<DollarSign className="w-4 h-4" />}
          color="text-yellow-600"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Transactions"
          value={metrics.totalTransactions}
          icon={<Activity className="w-4 h-4" />}
        />

        <MetricCard
          title="Pending"
          value={metrics.pendingTransactions}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-600"
        />

        <MetricCard
          title="Failed"
          value={metrics.failedTransactions}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="text-red-600"
        />
      </div>

      {/* System Health */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          System Health
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Rate Limited"
            value={metrics.rateLimitedEvents}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={metrics.rateLimitedEvents > 0 ? 'text-purple-600' : 'text-muted-foreground'}
          />

          <MetricCard
            title="Nonce Gaps"
            value={metrics.nonceGaps}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={metrics.nonceGaps > 0 ? 'text-red-600' : 'text-muted-foreground'}
          />

          <MetricCard
            title="Circuit Breaker"
            value={metrics.circuitBreakerTrips}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={metrics.circuitBreakerTrips > 0 ? 'text-red-600' : 'text-muted-foreground'}
          />

          <MetricCard
            title="Avg Delay"
            value={`${metrics.avgDelay.toFixed(0)}ms`}
            icon={<Clock className="w-4 h-4" />}
            color="text-blue-600"
          />
        </div>
      </div>

      {/* Performance Indicators */}
      {metrics.totalTransactions > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Performance
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Revert Rate</span>
                  <span className={cn(
                    'text-sm font-bold',
                    parseFloat(revertRate) > 10 ? 'text-red-600' :
                    parseFloat(revertRate) > 5 ? 'text-yellow-600' :
                    'text-green-600'
                  )}>
                    {revertRate}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      parseFloat(revertRate) > 10 ? 'bg-red-500' :
                      parseFloat(revertRate) > 5 ? 'bg-yellow-500' :
                      'bg-green-500'
                    )}
                    style={{ width: `${Math.min(parseFloat(revertRate) * 2, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Throughput</span>
                  <span className="text-sm font-bold text-blue-600">
                    {metrics.tps.toFixed(1)} TPS
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(metrics.tps * 10, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
