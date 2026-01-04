'use client';

import React from 'react';
import { Copy, ExternalLink, Clock } from 'lucide-react';
import { useWalletStates } from '@/lib/store';
import { WalletState } from '@/types/api';
import { cn } from '@/utils/cn';

interface WalletGridProps {
  className?: string;
}

const STATUS_CONFIG = {
  idle: { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Idle' },
  waiting: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Waiting' },
  sending: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Sending' },
  confirming: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Confirming' },
  confirmed: { color: 'text-green-600', bg: 'bg-green-50', label: 'Confirmed' },
  reverted: { color: 'text-red-600', bg: 'bg-red-50', label: 'Reverted' },
  rate_limited: { color: 'text-purple-600', bg: 'bg-purple-50', label: 'Rate Limited' },
  error: { color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
} as const;

function WalletCard({ wallet }: { wallet: WalletState }) {
  const status = STATUS_CONFIG[wallet.status];
  const lastTx = wallet.transactions[wallet.transactions.length - 1];

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour12: false });
  };

  return (
    <div className={cn('p-4 border rounded-lg transition-colors', status.bg, 'border-border')}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn('w-2 h-2 rounded-full', status.color.replace('text-', 'bg-'))} />
            <span className={cn('text-xs font-medium', status.color)}>
              {status.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            #{wallet.index}
          </span>
        </div>

        {/* Address */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1">
              {formatAddress(wallet.address)}
            </code>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Copy address"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>Archetype:</span>
            <span className="capitalize font-medium">{wallet.archetype}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Nonce:</span>
            <span className="ml-1 font-mono">{wallet.nonce}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Errors:</span>
            <span className="ml-1 font-mono">{wallet.errorCount}</span>
          </div>
        </div>

        {/* Last Transaction */}
        {lastTx && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Last Transaction</div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-xs">
                  {lastTx.hash.slice(0, 10)}...
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(lastTx.hash)}
                  className="p-0.5 hover:bg-muted rounded transition-colors"
                  title="Copy transaction hash"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{lastTx.functionName}</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(lastTx.timestamp)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn(
                  'font-medium',
                  lastTx.status === 'confirmed' ? 'text-green-600' :
                  lastTx.status === 'reverted' ? 'text-red-600' :
                  'text-yellow-600'
                )}>
                  {lastTx.status}
                </span>
                {lastTx.gasUsed && (
                  <span className="text-muted-foreground">
                    {lastTx.gasUsed.toString()} gas
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Timestamp */}
        {wallet.lastActivity && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Last activity: {formatTime(wallet.lastActivity)}
          </div>
        )}
      </div>
    </div>
  );
}

export function WalletGrid({ className }: WalletGridProps) {
  const wallets = useWalletStates();

  if (wallets.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground', className)}>
        <div className="text-center space-y-2">
          <div className="text-lg">No wallets active</div>
          <div className="text-sm">Start a simulation to see wallet activity</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Wallet Activity</h3>
        <span className="text-sm text-muted-foreground">
          {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        {wallets.map((wallet) => (
          <WalletCard key={wallet.index} wallet={wallet} />
        ))}
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="flex items-center space-x-1">
            <div className={cn('w-2 h-2 rounded-full', config.color.replace('text-', 'bg-'))} />
            <span className="capitalize">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

