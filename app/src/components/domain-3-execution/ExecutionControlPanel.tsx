'use client';

import { useStore } from '@/store';
import { selectExecutionActions } from '@/store/selectors/executionSelectors';
import Link from 'next/link';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { ExecutionControlPanel_V2 } from './ExecutionControlPanel_V2';

// Helper function to identify missing configuration steps
function getMissingSteps(validationErrors: string[], config: any) {
  const missingSteps: Array<{ step: string; description: string; action: string }> = [];

  // Check for contract selection
  if (validationErrors.some(e => e.includes('Contract must be selected'))) {
    missingSteps.push({
      step: 'Contract Selection',
      description: 'No contract has been selected',
      action: 'Go to Configure → Select a contract'
    });
  }

  // Check for method selection
  if (validationErrors.some(e => e.includes('Method must be selected'))) {
    missingSteps.push({
      step: 'Method Selection',
      description: 'No method has been selected',
      action: 'Go to Configure → Select a method from the contract'
    });
  }

  // Check for method parameters
  const missingParams = validationErrors.filter(e => e.includes('Parameter') && e.includes('required'));
  if (missingParams.length > 0) {
    missingSteps.push({
      step: 'Method Parameters',
      description: `${missingParams.length} parameter${missingParams.length > 1 ? 's' : ''} need${missingParams.length === 1 ? 's' : ''} to be filled`,
      action: 'Go to Configure → Fill in all method parameters'
    });
  }

  // Check for wallet selection
  if (validationErrors.some(e => e.includes('wallet must be selected') || e.includes('At least one wallet'))) {
    missingSteps.push({
      step: 'Wallet Selection',
      description: 'No wallets have been selected for the simulation',
      action: 'Go to Configure → Select at least one wallet'
    });
  }

  // Check for archetype configuration
  if (validationErrors.some(e => e.includes('archetype percentages must sum to 100%'))) {
    missingSteps.push({
      step: 'Archetype Configuration',
      description: 'Mixed archetype percentages must sum to 100%',
      action: 'Go to Configure → Adjust archetype percentages'
    });
  }

  // Check for gas constraints
  if (validationErrors.some(e => e.includes('gas') && e.includes('required'))) {
    missingSteps.push({
      step: 'Gas Constraints',
      description: 'Gas constraint values are missing',
      action: 'Go to Configure → Set gas constraints or disable them'
    });
  }

  return missingSteps;
}

// Original monolithic component preserved for rollback
export function ExecutionControlPanel_Original() {
  const { status, progress, error } = useStore((state) => state.executionControl);
  const actions = useStore(selectExecutionActions);

  const simulationConfig = useStore((state) => state.simulationConfig);
  const { validationErrors, isValid } = simulationConfig;

  const startSimulation = useStore((state) => state.startSimulation);
  const pauseSimulation = useStore((state) => state.pauseSimulation);
  const resumeSimulation = useStore((state) => state.resumeSimulation);
  const stopSimulation = useStore((state) => state.stopSimulation);

  const missingSteps = !isValid && validationErrors.length > 0 
    ? getMissingSteps(validationErrors, simulationConfig)
    : [];

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

      {/* Configuration Error Display */}
      {status === 'idle' && !actions.canStart && !isValid && missingSteps.length > 0 && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-destructive text-lg">⚠️</span>
            <h3 className="text-destructive font-semibold text-base sm:text-lg">
              Configuration Incomplete
            </h3>
          </div>
          <p className="text-destructive/80 text-sm sm:text-base mb-4">
            Please complete the following steps before starting the simulation:
          </p>
          <div className="space-y-3">
            {missingSteps.map((step, index) => (
              <div
                key={index}
                className="bg-background/50 border border-destructive/30 rounded-lg p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="error" className="text-xs">
                      Step {index + 1}
                    </Badge>
                    <span className="font-semibold text-foreground text-sm sm:text-base">
                      {step.step}
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm mb-2">
                  {step.description}
                </p>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-primary">
                  <span>→</span>
                  <span>{step.action}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-destructive/30">
            <Link href="/configure">
              <Button variant="primary" size="sm" className="w-full sm:w-auto">
                Go to Configuration →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Runtime Error Display */}
      {error && status !== 'idle' && (
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
            disabled={!actions.canStart}
            className="bg-success text-success-foreground px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            ▶️ Start Simulation
          </button>
        )}

        {status === 'running' && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={pauseSimulation}
              disabled={!actions.canPause}
              className="bg-warning text-warning-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ⏸️ Pause
            </button>
            <button
              onClick={stopSimulation}
              disabled={!actions.canStop}
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
              disabled={!actions.canResume}
              className="bg-success text-success-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
            >
              ▶️ Resume
            </button>
            <button
              onClick={stopSimulation}
              disabled={!actions.canStop}
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
              disabled={!actions.canReplay}
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

      {/* Simple Configuration Reminder (when no specific errors) */}
      {status === 'idle' && !actions.canStart && isValid && (
        <div className="text-center text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <p>Please complete the configuration step to enable execution</p>
        </div>
      )}
    </div>
  );
}

// Feature flag controlled component
// Set NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS=false to use old monolithic architecture
export function ExecutionControlPanel(): JSX.Element {
  // Feature flag for gradual rollout - DEFAULT TO TRUE FOR HARDENING
  const USE_COMPOSABLE_COMPONENTS = 
    typeof window !== 'undefined' 
      ? localStorage.getItem('USE_COMPOSABLE_COMPONENTS') !== 'false' &&
        process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS !== 'false'
      : process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS !== 'false';

  if (USE_COMPOSABLE_COMPONENTS) {
    return <ExecutionControlPanel_V2 />;
  } else {
    return <ExecutionControlPanel_Original />;
  }
}
