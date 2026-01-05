'use client';

import { useStore } from '@/store';

export function ExecutionControlPanel() {
  const {
    status,
    progress,
    canStart,
    canPause,
    canResume,
    canStop,
    canReplay,
    error
  } = useStore((state) => state.executionControl);

  const startSimulation = useStore((state) => state.startSimulation);
  const pauseSimulation = useStore((state) => state.pauseSimulation);
  const resumeSimulation = useStore((state) => state.resumeSimulation);
  const stopSimulation = useStore((state) => state.stopSimulation);

  return (
    <div className="space-y-6">
      {/* Status and Progress Summary */}
      <div className="text-center">
        <div className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          Simulation Control
        </div>
        <div className="text-base sm:text-lg text-muted-foreground">
          Is it running or not?
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-md p-3 sm:p-4 text-center">
          <div className="text-destructive font-semibold">Error</div>
          <div className="text-destructive/80 text-sm sm:text-base">{error}</div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex justify-center">
        {status === 'idle' && (
          <button
            onClick={startSimulation}
            disabled={!canStart}
            className="bg-success text-success-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            ▶️ Start Simulation
          </button>
        )}

        {status === 'running' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={pauseSimulation}
              disabled={!canPause}
              className="bg-warning text-warning-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={stopSimulation}
              disabled={!canStop}
              className="bg-destructive text-destructive-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ⏹️ Stop
            </button>
          </div>
        )}

        {status === 'paused' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={resumeSimulation}
              disabled={!canResume}
              className="bg-success text-success-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ▶️ Resume
            </button>
            <button
              onClick={stopSimulation}
              disabled={!canStop}
              className="bg-destructive text-destructive-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ⏹️ Stop
            </button>
          </div>
        )}

        {(status === 'completed' || status === 'failed' || status === 'stopped') && (
          <div className="flex w-full sm:w-auto">
            <button
              onClick={startSimulation}
              disabled={!canReplay}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              🔄 Run Again
            </button>
          </div>
        )}
      </div>

      {/* Progress Info */}
      {progress && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <div>Iteration {progress.currentIteration} of {progress.totalIterations}</div>
          <div>{progress.percentage}% Complete</div>
          {progress.eta > 0 && (
            <div>ETA: {Math.round(progress.eta)}s</div>
          )}
        </div>
      )}

      {/* Configuration Reminder */}
      {status === 'idle' && !canStart && (
        <div className="text-center text-sm text-muted-foreground">
          Configure your simulation in the previous step to enable execution
        </div>
      )}
    </div>
  );
}
