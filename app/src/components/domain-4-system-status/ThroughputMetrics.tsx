'use client';

import { LiveSystemStatusState } from '@/types/domain-4';
import { Badge } from '@/components/shared/Badge';

interface ThroughputMetricsProps {
  throughput: LiveSystemStatusState['throughput'];
  className?: string;
}

export function ThroughputMetrics({ throughput, className = '' }: ThroughputMetricsProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-foreground">System Throughput</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Transactions Per Second */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">TPS</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {throughput.transactionsPerSecond}
          </div>
          <div className="text-xs text-muted-foreground">
            transactions/sec
          </div>
        </div>

        {/* Gas Used Per Second */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Gas/sec</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {throughput.gasUsedPerSecond}
          </div>
          <div className="text-xs text-muted-foreground">
            ETH per second
          </div>
        </div>

        {/* Network Requests */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Requests</span>
            <Badge variant="success">Live</Badge>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {throughput.networkRequestsPerSecond}
          </div>
          <div className="text-xs text-muted-foreground">
            requests/sec
          </div>
        </div>

        {/* Current Block */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Block</span>
            <Badge variant="info">Latest</Badge>
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            #{throughput.blockNumber.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(throughput.timestamp)}
          </div>
        </div>
      </div>

      {/* Sparkline would go here in a real implementation */}
      <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center justify-center h-16">
          <span className="text-sm text-muted-foreground">
            📊 Real-time throughput chart would be displayed here
          </span>
        </div>
      </div>
    </div>
  );
}