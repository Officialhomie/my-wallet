'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Download, FileText } from 'lucide-react';
import { useCurrentRun } from '@/lib/store';
import { TransactionRecord } from '@/types/api';
import { cn } from '@/utils/cn';

interface ResultInspectorProps {
  className?: string;
}

interface WalletInspectorProps {
  walletIndex: number;
  address: string;
  transactions: TransactionRecord[];
  archetype: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function WalletInspector({
  walletIndex,
  address,
  transactions,
  archetype,
  isExpanded,
  onToggle
}: WalletInspectorProps) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportWalletData = () => {
    const data = {
      walletIndex,
      address,
      archetype,
      transactionCount: transactions.length,
      transactions: transactions.map(tx => ({
        hash: tx.hash,
        functionName: tx.functionName,
        parameters: tx.parameters,
        status: tx.status,
        timestamp: tx.timestamp.toISOString(),
        gasUsed: tx.gasUsed?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        blockNumber: tx.blockNumber,
        error: tx.error,
        retryCount: tx.retryCount,
        timingDelay: tx.timingDelay,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-${walletIndex}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Wallet #{walletIndex}</span>
              <span className="text-sm text-muted-foreground capitalize">
                ({archetype})
              </span>
            </div>
            <code className="text-sm font-mono text-muted-foreground">
              {formatAddress(address)}
            </code>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            {transactions.length} transactions
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(address);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Copy address"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Wallet Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Txs:</span>
                <span className="ml-2 font-medium">{transactions.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Success:</span>
                <span className="ml-2 font-medium text-green-600">
                  {transactions.filter(tx => tx.status === 'confirmed').length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Failed:</span>
                <span className="ml-2 font-medium text-red-600">
                  {transactions.filter(tx => tx.status === 'reverted').length}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Pending:</span>
                <span className="ml-2 font-medium text-yellow-600">
                  {transactions.filter(tx => tx.status === 'pending').length}
                </span>
              </div>
            </div>
            <button
              onClick={exportWalletData}
              className="flex items-center space-x-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
          </div>

          {/* Transaction List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedTransactions.map((tx, index) => (
              <TransactionDetail key={tx.hash} transaction={tx} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionDetail({ transaction, index }: { transaction: TransactionRecord; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50';
      case 'reverted': return 'text-red-600 bg-red-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="border border-border rounded-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">#{index + 1}</span>
              <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                {transaction.functionName}
              </code>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', getStatusColor(transaction.status))}>
                {transaction.status}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <code className="font-mono">
                {transaction.hash.slice(0, 10)}...
              </code>
              <span>•</span>
              <span>{transaction.timestamp.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {transaction.gasUsed && (
            <span className="text-xs text-muted-foreground">
              {transaction.gasUsed.toString()} gas
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(transaction.hash);
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Copy transaction hash"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Transaction Info</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hash:</span>
                  <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                    {transaction.hash}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Function:</span>
                  <span className="font-medium">{transaction.functionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={cn('font-medium', getStatusColor(transaction.status))}>
                    {transaction.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{transaction.timestamp.toLocaleString()}</span>
                </div>
                {transaction.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block:</span>
                    <span className="font-mono">{transaction.blockNumber}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium">Gas & Timing</h5>
              <div className="space-y-1 text-sm">
                {transaction.gasUsed && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gas Used:</span>
                    <span className="font-mono">{transaction.gasUsed.toString()}</span>
                  </div>
                )}
                {transaction.gasPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gas Price:</span>
                    <span className="font-mono">{transaction.gasPrice.toString()} wei</span>
                  </div>
                )}
                {transaction.timingDelay && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delay:</span>
                    <span>{transaction.timingDelay}ms</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retries:</span>
                  <span>{transaction.retryCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parameters */}
          {Object.keys(transaction.parameters).length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Parameters</h5>
              <div className="bg-muted/30 p-3 rounded-md">
                <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(transaction.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {transaction.error && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-600">Error</h5>
              <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                <pre className="text-xs font-mono text-red-600 whitespace-pre-wrap overflow-x-auto">
                  {transaction.error}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultInspector({ className }: ResultInspectorProps) {
  const currentRun = useCurrentRun();
  const [expandedWallets, setExpandedWallets] = useState<Set<number>>(new Set());

  const toggleWallet = (walletIndex: number) => {
    const newExpanded = new Set(expandedWallets);
    if (newExpanded.has(walletIndex)) {
      newExpanded.delete(walletIndex);
    } else {
      newExpanded.add(walletIndex);
    }
    setExpandedWallets(newExpanded);
  };

  const exportAllResults = () => {
    if (!currentRun) return;

    const data = {
      runId: currentRun.id,
      config: currentRun.config,
      metrics: currentRun.metrics,
      wallets: currentRun.wallets,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulation-${currentRun.id}-results.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentRun || currentRun.wallets.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64 text-muted-foreground', className)}>
        <div className="text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto opacity-50" />
          <div className="text-sm">No results to inspect</div>
          <div className="text-xs">Run a simulation to see detailed results</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Result Inspector</h3>
        <button
          onClick={exportAllResults}
          className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export All</span>
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {currentRun.wallets.map((wallet) => (
          <WalletInspector
            key={wallet.index}
            walletIndex={wallet.index}
            address={wallet.address}
            transactions={wallet.transactions}
            archetype={wallet.archetype}
            isExpanded={expandedWallets.has(wallet.index)}
            onToggle={() => toggleWallet(wallet.index)}
          />
        ))}
      </div>
    </div>
  );
}
