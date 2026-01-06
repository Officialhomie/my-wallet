// Domain 4 & 5: Live Monitor Page
// Is the system healthy? What is each wallet doing?

'use client';

import { useStore } from '@/store';
import { useEffect } from 'react';
import { SystemHealthBadge } from '@/components/domain-4-system-status/SystemHealthBadge';
import { ThroughputMetrics } from '@/components/domain-4-system-status/ThroughputMetrics';
import { RateLimiterStatus } from '@/components/domain-4-system-status/RateLimiterStatus';
import { CircuitBreakerStatus } from '@/components/domain-4-system-status/CircuitBreakerStatus';
import { WalletGrid } from '@/components/domain-5-wallet-activity/WalletGrid';
import { Badge } from '@/components/shared/Badge';

export default function MonitorPage() {
  const { liveSystemStatus, walletActivity, executionControl } = useStore();
  const {
    systemHealth,
    throughput,
    rateLimiter,
    circuitBreaker,
    isConnected,
    lastUpdate
  } = liveSystemStatus;

  const { totalWallets } = walletActivity;
  const { status } = executionControl;

  // Initialize wallet monitoring when component mounts
  useEffect(() => {
    if (totalWallets === 0 && status === 'running') {
      // Initialize with 5 wallets for demo
      useStore.getState().initializeWallets(5);
    }
  }, [totalWallets, status]);

  // Set up periodic updates when simulation is running
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      // Simulate real-time updates
      useStore.getState().simulateSystemUpdates();
      useStore.getState().simulateWalletUpdates();
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [status]);

  const formatLastUpdate = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Live Monitor
        </h1>
        <p className="text-lg text-muted-foreground">
          Is the system healthy? What is each wallet doing?
        </p>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <Badge variant={isConnected ? "success" : "error"}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </Badge>
          <Badge variant="default">
            Last Update: {formatLastUpdate(lastUpdate)}
          </Badge>
        </div>
      </div>

      {/* System Status Section (Domain 4) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground flex items-center">
          <span className="mr-3">🔍</span>
          System Health
        </h2>

        {/* Health Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SystemHealthBadge status={systemHealth.status} className="w-full" />
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <RateLimiterStatus rateLimiter={rateLimiter} />
            <CircuitBreakerStatus circuitBreaker={circuitBreaker} />
          </div>
        </div>

        {/* Throughput Metrics */}
        <ThroughputMetrics throughput={throughput} />
      </div>

      {/* Wallet Activity Section (Domain 5) */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground flex items-center">
          <span className="mr-3">👛</span>
          Wallet Activity
        </h2>

        <WalletGrid />
      </div>

      {/* Status Messages */}
      {status !== 'running' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⏸️</div>
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            Simulation Not Running
          </h3>
          <p className="text-muted-foreground">
            Start a simulation from the Execute page to see live monitoring data
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t border-border pt-8">
        <p>Real-time monitoring updates every 2 seconds during active simulations</p>
        <p className="mt-1">Data refreshes automatically when simulation is running</p>
      </div>
    </div>
  );
}
