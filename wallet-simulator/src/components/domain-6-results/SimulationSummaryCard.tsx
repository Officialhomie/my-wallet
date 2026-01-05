'use client';

import { SimulationSummary } from '@/types/domain-6';
import { Badge } from '@/components/shared/Badge';

interface SimulationSummaryCardProps {
  summary: SimulationSummary;
  className?: string;
}

export function SimulationSummaryCard({ summary, className = '' }: SimulationSummaryCardProps) {
  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: SimulationSummary['status']) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  const successRate = summary.totalTransactions > 0
    ? ((summary.successfulTransactions / summary.totalTransactions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={`bg-card border border-border rounded-lg p-4 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6">
        <div className="mb-4 sm:mb-0">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-1">
            Simulation Results
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            ID: {summary.simulationId}
          </p>
        </div>
        <Badge variant={getStatusColor(summary.status)} className="self-start">
          {summary.status.toUpperCase()}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <div className="text-lg sm:text-xl font-bold text-foreground">
            {summary.totalTransactions.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Total Transactions</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-lg sm:text-xl font-bold text-green-700">
            {summary.successfulTransactions.toLocaleString()}
          </div>
          <div className="text-xs text-green-600">Successful</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-lg sm:text-xl font-bold text-red-700">
            {summary.failedTransactions.toLocaleString()}
          </div>
          <div className="text-xs text-red-600">Failed</div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-lg sm:text-xl font-bold text-blue-700 font-mono">
            {summary.totalGasUsed}
          </div>
          <div className="text-xs text-blue-600">Total Gas (ETH)</div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">Started</div>
          <div className="font-medium text-foreground">
            {new Date(summary.startedAt).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1">Duration</div>
          <div className="font-medium text-foreground">
            {formatDuration(summary.duration)}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1">Contract</div>
          <div className="font-medium text-foreground">
            {summary.contract.name}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            {summary.contract.address.slice(0, 6)}...{summary.contract.address.slice(-4)}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1">Network</div>
          <div className="font-medium text-foreground capitalize">
            {summary.contract.network}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Success Rate: {successRate}%
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Avg Gas/Tx</div>
            <div className="font-mono font-medium text-foreground">
              {summary.averageGasPerTransaction}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Avg Tx Time</div>
            <div className="font-medium text-foreground">
              {Math.round(summary.averageTransactionTime / 1000)}s
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Gas Efficiency</div>
            <div className="font-medium text-foreground">
              {(parseFloat(summary.totalGasUsed) / summary.totalTransactions * 1000000).toFixed(2)} μETH/tx
            </div>
          </div>

          <div>
            <div className="text-muted-foreground mb-1">Completion Rate</div>
            <div className="font-medium text-foreground">
              {((summary.successfulTransactions / summary.totalTransactions) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}