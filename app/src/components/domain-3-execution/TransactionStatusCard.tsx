'use client';

import { useStore } from '@/store';
import type { TransactionLifecycle } from '@/types/transaction';
import { getPhaseIcon, getPhaseColor, formatDuration, getPhaseMessage, estimateEta } from '@/lib/transactionMessages';
import { Button } from '@/components/shared/Button';

interface TransactionStatusCardProps {
  transaction: TransactionLifecycle;
}

export function TransactionStatusCard({ transaction }: TransactionStatusCardProps) {
  const retryTransaction = useStore((state) => state.retryTransaction);

  const phaseIcon = getPhaseIcon(transaction.phase);
  const phaseColor = getPhaseColor(transaction.phase);
  const duration = formatDuration(Date.now() - transaction.startedAt);
  const phaseMessage = getPhaseMessage(transaction);

  const canRetry = transaction.error?.canRetry &&
    transaction.attempt < transaction.maxAttempts;

  return (
    <div className={`transaction-card status-${phaseColor} border rounded-lg p-4 mb-3`}>
      <div className="transaction-header flex items-start justify-between mb-3">
        <div className="header-left flex items-start gap-3">
          <span className="phase-icon text-2xl">{phaseIcon}</span>
          <div className="transaction-info">
            <div className="wallet-info text-sm font-medium">
              Wallet {transaction.walletIndex}
              <span className="wallet-address text-muted-foreground ml-2">
                {transaction.walletAddress.slice(0, 6)}...{transaction.walletAddress.slice(-4)}
              </span>
            </div>
            <div className="method-info text-xs text-muted-foreground">
              {transaction.intent.method}
            </div>
          </div>
        </div>

        <div className="header-right text-right text-xs text-muted-foreground">
          {transaction.attempt > 1 && (
            <div className="attempt-indicator mb-1">
              Attempt {transaction.attempt}/{transaction.maxAttempts}
            </div>
          )}
          <div className="duration">{duration} elapsed</div>
        </div>
      </div>

      <div className="transaction-body">
        <div className="phase-message text-sm mb-3">
          {phaseMessage}
        </div>

        {transaction.phase === 'failed' && transaction.error && (
          <div className="error-details bg-destructive/10 border border-destructive/30 rounded-md p-3 mb-3">
            <div className="error-summary mb-2">
              <strong className="text-destructive">❌ {transaction.error.message}</strong>
            </div>
            <div className="error-action text-sm text-muted-foreground mb-2">
              💡 {transaction.error.suggestedAction}
            </div>
            {transaction.error.technicalDetails && (
              <details className="technical-details text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-background rounded text-xs overflow-auto">
                  {transaction.error.technicalDetails}
                </pre>
              </details>
            )}
          </div>
        )}

        {transaction.txHash && (
          <div className="transaction-hash mb-3">
            <a
              href={`https://etherscan.io/tx/${transaction.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              View on Explorer →
            </a>
          </div>
        )}

        {transaction.phase === 'pending' && (
          <div className="pending-indicator flex items-center gap-2 text-sm text-muted-foreground">
            <div className="spinner w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Waiting for confirmation... (ETA: {estimateEta(transaction)}s)
          </div>
        )}
      </div>

      <div className="transaction-footer flex items-center justify-between mt-3 pt-3 border-t">
        {canRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => retryTransaction(transaction.id)}
          >
            🔄 Retry Transaction
          </Button>
        )}

        {transaction.phase === 'confirmed' && (
          <div className="success-details text-xs text-muted-foreground">
            ✅ Block #{transaction.blockNumber} • {transaction.gasUsed} gas • {transaction.actualCost} ETH
          </div>
        )}
      </div>
    </div>
  );
}
