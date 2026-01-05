'use client';

import { useStore } from '@/store';
import { ARCHETYPES, TIMING_PROFILES } from '@/lib/archetypes';

export function ConfigSummary() {
  const { simulationConfig } = useStore();
  const {
    selectedContract,
    selectedMethod,
    archetypeMode,
    singleArchetype,
    mixedArchetypes,
    walletSelection,
    iterations,
    timingProfile,
    estimatedMetrics,
    isValid,
  } = simulationConfig;

  if (!isValid) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <p className="text-yellow-800 text-sm">
          Complete the configuration above to see estimates
        </p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-accent/10 border border-accent rounded-md p-3 sm:p-4">
      <h3 className="font-semibold text-foreground mb-3">Configuration Summary</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
        <div>
          <span className="font-medium text-foreground">Contract:</span>
          <div className="text-muted-foreground">{selectedContract?.name}</div>
        </div>

        <div>
          <span className="font-medium text-foreground">Method:</span>
          <div className="text-muted-foreground font-mono text-xs break-all">{selectedMethod?.signature}</div>
        </div>

        <div>
          <span className="font-medium text-foreground">Archetypes:</span>
          <div className="text-muted-foreground">
            {archetypeMode === 'single'
              ? ARCHETYPES[singleArchetype!]?.label
              : 'Mixed'
            }
          </div>
        </div>

        <div>
          <span className="font-medium text-foreground">Wallets:</span>
          <div className="text-muted-foreground">
            {walletSelection.mode === 'single'
              ? `Wallet #${walletSelection.singleWallet}`
              : `${walletSelection.multipleWallets?.length || 0} wallets`
            }
          </div>
        </div>

        <div>
          <span className="font-medium text-foreground">Iterations:</span>
          <div className="text-muted-foreground">{iterations} per wallet</div>
        </div>

        <div>
          <span className="font-medium text-foreground">Timing:</span>
          <div className="text-muted-foreground">{TIMING_PROFILES[timingProfile].label}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-base sm:text-lg font-bold text-foreground">
              {estimatedMetrics.totalTransactions}
            </div>
            <div className="text-xs text-muted-foreground">Transactions</div>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold text-foreground">
              ~{formatDuration(estimatedMetrics.estimatedDuration)}
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>

          <div>
            <div className="text-base sm:text-lg font-bold text-foreground">
              {estimatedMetrics.estimatedGasCost} ETH
            </div>
            <div className="text-xs text-muted-foreground">Est. Gas Cost</div>
          </div>
        </div>
      </div>
    </div>
  );
}
