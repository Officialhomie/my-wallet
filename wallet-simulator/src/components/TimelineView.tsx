'use client';

import React, { useMemo } from 'react';
import { Clock, Zap } from 'lucide-react';
import { useWalletStates } from '@/lib/store';
import { TransactionRecord } from '@/types/api';
import { cn } from '@/utils/cn';

interface TimelineViewProps {
  className?: string;
  maxHeight?: string;
}

interface TimelineEvent {
  timestamp: Date;
  walletIndex: number;
  transaction: TransactionRecord;
  type: 'transaction';
}

export function TimelineView({ className, maxHeight = 'h-64' }: TimelineViewProps) {
  const wallets = useWalletStates();

  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    wallets.forEach(wallet => {
      wallet.transactions.forEach(tx => {
        events.push({
          timestamp: tx.timestamp,
          walletIndex: wallet.index,
          transaction: tx,
          type: 'transaction',
        });
      });
    });

    // Sort by timestamp, most recent first
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [wallets]);

  const getEventColor = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'reverted':
        return 'text-red-600 border-red-200 bg-red-50';
      case 'pending':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      default:
        return 'text-muted-foreground border-border bg-muted/10';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Group events into bursts (transactions within 1 second of each other)
  const eventGroups = useMemo(() => {
    const groups: TimelineEvent[][] = [];
    let currentGroup: TimelineEvent[] = [];

    timelineEvents.forEach(event => {
      if (currentGroup.length === 0) {
        currentGroup = [event];
      } else {
        const timeDiff = Math.abs(
          currentGroup[0].timestamp.getTime() - event.timestamp.getTime()
        );

        if (timeDiff <= 1000) { // Within 1 second
          currentGroup.push(event);
        } else {
          if (currentGroup.length > 0) {
            groups.push([...currentGroup]);
          }
          currentGroup = [event];
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups.slice(0, 10); // Show last 10 groups
  }, [timelineEvents]);

  if (timelineEvents.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground', maxHeight, className)}>
        <div className="text-center space-y-2">
          <Clock className="w-8 h-8 mx-auto opacity-50" />
          <div className="text-sm">No transactions yet</div>
          <div className="text-xs">Timeline will show transaction bursts and timing patterns</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Transaction Timeline</h3>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>Bursts detected: {eventGroups.filter(g => g.length > 1).length}</span>
        </div>
      </div>

      <div className={cn('space-y-3 overflow-y-auto', maxHeight)}>
        {eventGroups.map((group, groupIndex) => {
          const isBurst = group.length > 1;
          const groupTime = group[0].timestamp;

          return (
            <div key={groupIndex} className="space-y-2">
              {/* Burst Header */}
              {isBurst && (
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Burst: {group.length} transactions
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatTime(groupTime)}
                  </span>
                </div>
              )}

              {/* Individual Events */}
              <div className="space-y-1">
                {group.map((event, eventIndex) => (
                  <div
                    key={`${event.walletIndex}-${event.transaction.hash}`}
                    className={cn(
                      'flex items-center space-x-3 p-3 border rounded-md transition-colors',
                      getEventColor(event.transaction.status),
                      !isBurst && 'hover:bg-muted/50'
                    )}
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-current rounded-full" />
                      {eventIndex < group.length - 1 && (
                        <div className="w-px h-4 bg-border" />
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            Wallet #{event.walletIndex}
                          </span>
                          <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                            {event.transaction.functionName}
                          </code>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', getEventColor(event.transaction.status))}>
                            {event.transaction.status}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isBurst ? `+${(event.timestamp.getTime() - groupTime.getTime())}ms` : formatRelativeTime(event.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <code className="font-mono bg-muted/50 px-1 py-0.5 rounded text-xs truncate flex-1 mr-2">
                          {event.transaction.hash.slice(0, 10)}...
                        </code>
                        <span className={cn(
                          'font-medium',
                          event.transaction.status === 'confirmed' ? 'text-green-600' :
                          event.transaction.status === 'reverted' ? 'text-red-600' :
                          'text-yellow-600'
                        )}>
                          {event.transaction.status}
                        </span>
                      </div>

                      {event.transaction.gasUsed && (
                        <div className="text-xs text-muted-foreground">
                          Gas: {event.transaction.gasUsed.toString()}
                          {event.transaction.timingDelay && ` • Delay: ${event.transaction.timingDelay}ms`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {timelineEvents.length > 50 && (
        <div className="text-center text-xs text-muted-foreground">
          Showing last {Math.min(50, timelineEvents.length)} transactions
        </div>
      )}
    </div>
  );
}
