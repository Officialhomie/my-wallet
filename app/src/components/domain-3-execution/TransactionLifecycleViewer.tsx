'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import type { TransactionLifecycle } from '@/types/transaction';
import { TransactionStatusCard } from './TransactionStatusCard';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';

interface TransactionLifecycleViewerProps {
  simulationId: string;
}

type FilterType = 'all' | 'active' | 'failed' | 'completed';

export function TransactionLifecycleViewer({ simulationId }: TransactionLifecycleViewerProps) {
  const transactions = useStore((state) =>
    state.transactionTracking.simulations[simulationId]?.transactions || []
  );

  const [filter, setFilter] = useState<FilterType>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transaction when new ones are added
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [transactions, autoScroll]);

  const filteredTransactions = transactions.filter(tx => {
    switch (filter) {
      case 'all': return true;
      case 'active': return !['confirmed', 'failed'].includes(tx.phase);
      case 'failed': return tx.phase === 'failed';
      case 'completed': return tx.phase === 'confirmed';
      default: return true;
    }
  });

  const stats = {
    total: transactions.length,
    active: transactions.filter(tx => !['confirmed', 'failed'].includes(tx.phase)).length,
    failed: transactions.filter(tx => tx.phase === 'failed').length,
    completed: transactions.filter(tx => tx.phase === 'confirmed').length,
  };

  const retryAllFailed = useStore((state) => {
    const failedTxs = transactions.filter(tx => tx.phase === 'failed' && tx.error?.canRetry);
    return () => {
      failedTxs.forEach(tx => {
        state.retryTransaction(tx.id);
      });
    };
  });

  return (
    <Card className="transaction-lifecycle-viewer">
      <div className="viewer-header mb-4">
        <div className="header-main flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">Transaction Activity</h3>
          <div className="stats flex flex-wrap gap-2 text-sm">
            <span className="stat px-2 py-1 bg-muted rounded">Total: {stats.total}</span>
            <span className="stat px-2 py-1 bg-blue-100 text-blue-800 rounded">Active: {stats.active}</span>
            <span className="stat px-2 py-1 bg-green-100 text-green-800 rounded">Completed: {stats.completed}</span>
            <span className="stat px-2 py-1 bg-red-100 text-red-800 rounded">Failed: {stats.failed}</span>
          </div>
        </div>

        <div className="viewer-controls flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="filter-buttons flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={filter === 'active' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active ({stats.active})
            </Button>
            <Button
              variant={filter === 'failed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('failed')}
            >
              Failed ({stats.failed})
            </Button>
            <Button
              variant={filter === 'completed' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed ({stats.completed})
            </Button>
          </div>

          <label className="auto-scroll-toggle flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="cursor-pointer"
            />
            Auto-scroll to latest
          </label>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="transaction-list max-h-96 overflow-y-auto space-y-2"
        data-auto-scroll={autoScroll}
      >
        {filteredTransactions.length === 0 ? (
          <div className="empty-state text-center py-8 text-muted-foreground">
            <p>No {filter !== 'all' ? filter : ''} transactions</p>
            {filter === 'failed' && (
              <p className="empty-subtitle mt-2">All transactions completed successfully! 🎉</p>
            )}
          </div>
        ) : (
          filteredTransactions.map(tx => (
            <TransactionStatusCard key={tx.id} transaction={tx} />
          ))
        )}
      </div>

      {stats.failed > 0 && (
        <div className="bulk-actions mt-4 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={retryAllFailed}
          >
            🔄 Retry All Failed ({stats.failed})
          </Button>
        </div>
      )}
    </Card>
  );
}
