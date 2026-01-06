'use client';

import { useStore } from '@/store';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

/**
 * Displays current simulation configuration summary.
 * Single responsibility: Configuration visualization.
 */
export function ConfigurationSummaryCard(): JSX.Element {
  const config = useStore((state) => state.simulationConfig);
  const { isValid, validationErrors, estimatedMetrics } = config;

  const getContractDisplay = () => {
    if (!config.selectedContract) return 'No contract selected';
    return `${config.selectedContract.name} (${config.selectedContract.address.slice(0, 6)}...)`;
  };

  const getMethodDisplay = () => {
    if (!config.selectedMethod) return 'No method selected';
    return config.selectedMethod.name;
  };

  const getWalletDisplay = () => {
    if (config.walletSelection.mode === 'single') {
      return `Single wallet (Index ${config.walletSelection.singleWallet})`;
    } else {
      return `${config.walletSelection.multipleWallets?.length || 0} wallets selected`;
    }
  };

  const getArchetypeDisplay = () => {
    if (config.archetypeMode === 'single') {
      return `Single: ${config.singleArchetype}`;
    } else {
      const total = Object.values(config.mixedArchetypes || {}).reduce((sum, pct) => sum + pct, 0);
      return `Mixed: ${total}% allocated`;
    }
  };

  return (
    <Card className="configuration-summary-card">
      <div className="card-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Configuration Summary</h3>
        <Badge variant={isValid ? 'success' : 'error'}>
          {isValid ? '✅ Valid' : '❌ Invalid'}
        </Badge>
      </div>

      <div className="config-sections grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="config-section">
          <h4 className="text-sm font-semibold mb-2 pb-2 border-b">Contract & Method</h4>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Contract:</span>
            <span className="value font-semibold text-right">{getContractDisplay()}</span>
          </div>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Method:</span>
            <span className="value font-semibold text-right">{getMethodDisplay()}</span>
          </div>
        </div>

        <div className="config-section">
          <h4 className="text-sm font-semibold mb-2 pb-2 border-b">Wallets & Archetypes</h4>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Wallets:</span>
            <span className="value font-semibold text-right">{getWalletDisplay()}</span>
          </div>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Archetype:</span>
            <span className="value font-semibold text-right">{getArchetypeDisplay()}</span>
          </div>
        </div>

        <div className="config-section">
          <h4 className="text-sm font-semibold mb-2 pb-2 border-b">Execution Parameters</h4>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Iterations:</span>
            <span className="value font-semibold text-right">{config.iterations}</span>
          </div>
          <div className="config-item flex justify-between items-center py-2 border-b border-border-light">
            <span className="label font-medium text-muted-foreground">Timing:</span>
            <span className="value font-semibold text-right">{config.timingProfile}</span>
          </div>
        </div>
      </div>

      {estimatedMetrics && estimatedMetrics.totalTransactions > 0 && (
        <div className="estimated-metrics mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-3">Estimated Metrics</h4>
          <div className="metrics-grid grid grid-cols-3 gap-4">
            <div className="metric flex flex-col">
              <span className="label text-xs text-muted-foreground mb-1">Duration</span>
              <span className="value font-semibold text-sm">
                {Math.round(estimatedMetrics.estimatedDuration / 60)}m
              </span>
            </div>
            <div className="metric flex flex-col">
              <span className="label text-xs text-muted-foreground mb-1">Transactions</span>
              <span className="value font-semibold text-sm">{estimatedMetrics.totalTransactions}</span>
            </div>
            <div className="metric flex flex-col">
              <span className="label text-xs text-muted-foreground mb-1">Gas Cost</span>
              <span className="value font-semibold text-sm">{estimatedMetrics.estimatedGasCost} ETH</span>
            </div>
          </div>
        </div>
      )}

      {!isValid && validationErrors.length > 0 && (
        <div className="validation-errors mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2 text-destructive">Validation Issues</h4>
          <ul className="error-list space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="error-item text-xs text-destructive flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
