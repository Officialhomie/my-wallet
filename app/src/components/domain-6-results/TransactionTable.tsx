'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '@/store';
import { TransactionStatus, ArchetypeName } from '@/types/domain-6';
import { Badge } from '@/components/shared/Badge';
import { ARCHETYPES } from '@/lib/archetypes';
import { getNetworkById } from '@/lib/networks';
import { ethers } from 'ethers';

interface TransactionTableProps {
  className?: string;
}

export function TransactionTable({ className = '' }: TransactionTableProps) {
  const { resultInspection } = useStore();
  const { transactions, filters, sortBy, sortOrder, summary } = resultInspection;

  const setFilters = useStore((state) => state.setFilters);
  const setSortBy = useStore((state) => state.setSortBy);
  const setSortOrder = useStore((state) => state.setSortOrder);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply filters
    if (filters.walletIndex !== null) {
      filtered = filtered.filter(tx => tx.walletIndex === filters.walletIndex);
    }

    if (filters.archetype !== null) {
      filtered = filtered.filter(tx => tx.archetype === filters.archetype);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = b.timestamp - a.timestamp;
          break;
        case 'wallet':
          comparison = a.walletIndex - b.walletIndex;
          break;
        case 'gas':
          comparison = parseFloat(b.gasUsed) - parseFloat(a.gasUsed);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, filters, sortBy, sortOrder]);

  // Pagination
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = React.useState(1);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getStatusBadgeVariant = (status: TransactionStatus) => {
    switch (status) {
      case 'success': return 'success';
      case 'failure': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get explorer URL for the network
  const getExplorerUrl = (txHash: string) => {
    if (!summary?.contract?.network) return null;
    const network = getNetworkById(summary.contract.network);
    if (!network) return null;
    return `${network.explorer}/tx/${txHash}`;
  };

  // Format ETH value
  const formatValue = (value?: string) => {
    if (!value || value === '0') return '0 ETH';
    try {
      return `${ethers.formatEther(value)} ETH`;
    } catch {
      return `${value} wei`;
    }
  };

  // Format gas price
  const formatGasPrice = (gasPrice?: string) => {
    if (!gasPrice) return 'N/A';
    try {
      const price = BigInt(gasPrice);
      const gwei = Number(price) / 1e9;
      return `${gwei.toFixed(2)} gwei`;
    } catch {
      return gasPrice;
    }
  };

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header with filters and sorting */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-semibold text-foreground">
            Transactions ({filteredAndSortedTransactions.length.toLocaleString()})
          </h3>

          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => setFilters({ status: e.target.value as TransactionStatus | 'all' })}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>

            {/* Archetype Filter */}
            <select
              value={filters.archetype || ''}
              onChange={(e) => setFilters({
                archetype: e.target.value ? e.target.value as ArchetypeName : null
              })}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground"
            >
              <option value="">All Archetypes</option>
              {Object.entries(ARCHETYPES).map(([key, archetype]) => (
                <option key={key} value={key}>
                  {archetype.icon} {archetype.label}
                </option>
              ))}
            </select>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground"
            >
              <option value="timestamp">Sort by Time</option>
              <option value="wallet">Sort by Wallet</option>
              <option value="gas">Sort by Gas</option>
              <option value="status">Sort by Status</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground hover:bg-muted/50"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Wallet</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Archetype</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tx Hash</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gas Used</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Gas Price</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Block</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx) => (
              <tr key={tx.txHash} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">
                    {new Date(tx.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(tx.timestamp)}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="font-mono font-medium text-foreground">
                    #{tx.walletIndex}
                  </div>
                  {tx.walletAddress && (
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {tx.walletAddress.slice(0, 8)}...{tx.walletAddress.slice(-6)}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{ARCHETYPES[tx.archetype]?.icon || '🤖'}</span>
                    <span className="text-sm font-medium text-foreground">
                      {ARCHETYPES[tx.archetype]?.label || tx.archetype}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-foreground">
                    {tx.method}
                  </code>
                </td>

                <td className="px-4 py-3">
                  <Badge variant={getStatusBadgeVariant(tx.status)} className="text-xs">
                    {tx.status}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-foreground">
                    {tx.txHash.startsWith('pending_') || tx.txHash.startsWith('skipped_') ? (
                      <span className="text-muted-foreground">{tx.txHash}</span>
                    ) : (
                      <>
                        {getExplorerUrl(tx.txHash) ? (
                          <a
                            href={getExplorerUrl(tx.txHash)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                            <span className="ml-1 text-xs">🔗</span>
                          </a>
                        ) : (
                          <span>{tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}</span>
                        )}
                      </>
                    )}
                  </div>
                  {tx.from && (
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      From: {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="font-mono text-foreground">
                    {parseInt(tx.gasUsed || '0').toLocaleString()}
                  </div>
                  {tx.gasUsed !== '0' && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatGasPrice(tx.gasPrice)}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-foreground">
                    {formatGasPrice(tx.gasPrice)}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm text-foreground">
                    {formatValue(tx.value)}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="font-mono text-foreground">
                    {tx.blockNumber ? (
                      <>
                        {tx.blockNumber.toLocaleString()}
                        {getExplorerUrl(tx.txHash) && (
                          <a
                            href={`${getExplorerUrl(tx.txHash)!.replace('/tx/', '/block/')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline text-xs"
                          >
                            🔗
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </div>
                  {tx.blockTimestamp && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(tx.blockTimestamp).toLocaleTimeString()}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
            >
              Previous
            </button>

            <span className="px-3 py-1 text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-border rounded-md bg-background text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredAndSortedTransactions.length === 0 && (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-medium text-muted-foreground mb-2">
            No transactions found
          </div>
          <div className="text-sm text-muted-foreground">
            Try adjusting your filters to see more results
          </div>
        </div>
      )}
    </div>
  );
}