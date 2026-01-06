'use client';

import { useStore } from '@/store';
import { Card } from '@/components/shared/Card';
import { ProgressBar } from './ProgressBar';

/**
 * Displays simulation progress and current activity.
 * Single responsibility: Progress visualization.
 */
export function SimulationProgressTracker(): JSX.Element | null {
  const status = useStore((state) => state.executionControl.status);
  const progress = useStore((state) => state.executionControl.progress);
  const currentAction = useStore((state) => state.executionControl.currentAction);

  // Only show when simulation is active
  if (!['running', 'paused', 'completed'].includes(status) || !progress) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <Card className="simulation-progress-tracker">
      <h3 className="text-lg font-semibold mb-4">Simulation Progress</h3>

      <div className="progress-section mb-4">
        <ProgressBar progress={progress} className="simulation-progress-bar" />

        <div className="progress-stats flex justify-between items-center mt-4 text-sm">
          <div className="stat flex flex-col items-center">
            <span className="label text-muted-foreground mb-1">Iteration</span>
            <span className="value font-semibold">
              {progress.currentIteration} of {progress.totalIterations}
            </span>
          </div>
          <div className="stat flex flex-col items-center">
            <span className="label text-muted-foreground mb-1">Complete</span>
            <span className="value font-semibold">{progress.percentage}%</span>
          </div>
          {progress.eta > 0 && (
            <div className="stat flex flex-col items-center">
              <span className="label text-muted-foreground mb-1">ETA</span>
              <span className="value font-semibold">{formatDuration(progress.eta)}</span>
            </div>
          )}
        </div>
      </div>

      {currentAction && status === 'running' && (
        <div className="current-action flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div className="action-icon text-xl">⚡</div>
          <div className="action-details flex-1">
            <div className="action-description font-medium text-sm">
              Wallet {currentAction.walletIndex} ({currentAction.archetype})
              executing {currentAction.method}
            </div>
            <div className="action-status text-xs text-muted-foreground">
              Processing transaction...
            </div>
          </div>
        </div>
      )}

      {status === 'paused' && (
        <div className="paused-notice flex items-center justify-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <span className="pause-icon text-xl">⏸️</span>
          <span className="pause-text text-yellow-800 font-medium">Simulation is paused</span>
        </div>
      )}

      {status === 'completed' && (
        <div className="completed-notice flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="complete-icon text-xl">✅</span>
          <span className="complete-text text-green-800 font-medium">Simulation completed successfully</span>
        </div>
      )}
    </Card>
  );
}
