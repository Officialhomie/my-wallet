'use client';

import { WalletActivity } from '@/types/domain-5';
import { ARCHETYPES } from '@/lib/archetypes';
import { Badge } from '@/components/shared/Badge';

interface WalletCardProps {
  wallet: WalletActivity;
  className?: string;
}

export function WalletCard({ wallet, className = '' }: WalletCardProps) {
  const archetypeInfo = ARCHETYPES[wallet.archetype];
  const progressPercentage = wallet.transactionCount.total > 0
    ? (wallet.transactionCount.completed / wallet.transactionCount.total) * 100
    : 0;

  const getStatusColor = (status: WalletActivity['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Wallet #{wallet.index}</h3>
        <Badge className={getStatusColor(wallet.status)}>
          {wallet.status.toUpperCase()}
        </Badge>
      </div>

      {/* Address */}
      <div className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
      </div>

      {/* Archetype */}
      <div className="flex items-center space-x-2">
        <span className="text-lg">{archetypeInfo?.icon || '🤖'}</span>
        <span className="text-sm font-medium text-foreground">{archetypeInfo?.label || wallet.archetype}</span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono text-foreground">
            {wallet.transactionCount.completed}/{wallet.transactionCount.total}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-green-50 border border-green-200 rounded p-2">
          <div className="text-lg font-bold text-green-700">{wallet.transactionCount.completed}</div>
          <div className="text-xs text-green-600">Success</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <div className="text-lg font-bold text-red-700">{wallet.transactionCount.failed}</div>
          <div className="text-xs text-red-600">Failed</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <div className="text-lg font-bold text-blue-700">{wallet.transactionCount.pending}</div>
          <div className="text-xs text-blue-600">Pending</div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Success Rate:</span>
        <span className={`font-mono font-medium ${
          wallet.successRate.percentage >= 90 ? 'text-green-600' :
          wallet.successRate.percentage >= 70 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {wallet.successRate.percentage}%
        </span>
      </div>

      {/* Gas Used */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Gas Used:</span>
        <span className="font-mono text-foreground">{wallet.gasUsed} ETH</span>
      </div>

      {/* Last Action */}
      <div className="border-t border-border pt-3">
        <div className="text-sm">
          <div className="text-muted-foreground mb-1">Last Action:</div>
          {wallet.lastAction ? (
            <div className="space-y-1">
              <div className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">
                {wallet.lastAction.method}
              </div>
              <div className="flex items-center justify-between text-xs">
                <Badge variant={wallet.lastAction.status === 'success' ? 'success' : 'error'} className="text-xs">
                  {wallet.lastAction.status}
                </Badge>
                <span className="text-muted-foreground">
                  {formatTimeAgo(wallet.lastAction.timestamp)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs italic">No activity yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
