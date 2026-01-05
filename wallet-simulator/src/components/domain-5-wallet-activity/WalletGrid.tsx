'use client';

import { useStore } from '@/store';
import { WalletCard } from './WalletCard';

interface WalletGridProps {
  className?: string;
}

export function WalletGrid({ className = '' }: WalletGridProps) {
  const { walletActivity } = useStore();
  const { wallets, totalWallets, activeWallets, errorWallets, globalStats } = walletActivity;

  const walletList = Object.values(wallets).sort((a, b) => a.index - b.index);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Wallet Activity</h3>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Total: {totalWallets}</span>
          <span className="text-green-600">Active: {activeWallets}</span>
          <span className="text-red-600">Errors: {errorWallets}</span>
        </div>
      </div>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{globalStats.totalTransactions}</div>
          <div className="text-sm text-muted-foreground">Total Transactions</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{globalStats.successfulTransactions}</div>
          <div className="text-sm text-muted-foreground">Successful</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{globalStats.failedTransactions}</div>
          <div className="text-sm text-muted-foreground">Failed</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 font-mono">{globalStats.totalGasUsed}</div>
          <div className="text-sm text-muted-foreground">Total Gas (ETH)</div>
        </div>
      </div>

      {/* Wallet Cards Grid */}
      {walletList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {walletList.map((wallet) => (
            <WalletCard key={wallet.index} wallet={wallet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-4">👛</div>
          <div className="text-lg font-medium mb-2">No Wallets Active</div>
          <div className="text-sm">Wallets will appear here once the simulation starts</div>
        </div>
      )}
    </div>
  );
}
