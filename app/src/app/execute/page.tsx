// Domain 3: Execution Control Page
// Is it running or not?

'use client';

import { ExecutionEligibilityGate } from '@/components/domain-3-execution/ExecutionEligibilityGate';
import { ExecutionControlPanel } from '@/components/domain-3-execution/ExecutionControlPanel';
import { TransactionLifecycleViewer } from '@/components/domain-3-execution/TransactionLifecycleViewer';
import { ExecutionStatusBadge } from '@/components/domain-3-execution/ExecutionStatusBadge';
import { ProgressBar } from '@/components/domain-3-execution/ProgressBar';
import { CurrentActionIndicator } from '@/components/domain-3-execution/CurrentActionIndicator';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { useStore } from '@/store';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function ExecutePage() {
  const { executionControl, simulationConfig } = useStore();

  const { status, progress, currentAction } = executionControl;
  const { isValid } = simulationConfig;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Execution Control
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Is it running or not?
        </p>
      </div>

      {/* Configuration Summary */}
      <Card title="Configuration Summary">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <span className="text-sm font-medium text-foreground">Configuration Status:</span>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isValid
                  ? 'bg-success text-success-foreground'
                  : 'bg-error text-error-foreground'
              }`}>
                {isValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
          </div>

          {!isValid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-yellow-800 text-sm">
                ⚠️ Configuration is invalid. Please return to the configure step to fix issues.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Status and Control */}
      <ErrorBoundary>
        <Card title="Simulation Status">
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-center">
              <ExecutionStatusBadge status={status} className="text-lg px-4 py-2" />
            </div>

            {/* Configuration Eligibility Check */}
            <ExecutionEligibilityGate />

            {/* Control Panel */}
            <ExecutionControlPanel />

            {/* Progress Bar */}
            {progress && (
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 text-center">Progress</h3>
                <ProgressBar progress={progress} />
              </div>
            )}

            {/* Current Action */}
            {currentAction && status === 'running' && (
              <CurrentActionIndicator currentAction={currentAction} />
            )}
          </div>
        </Card>
      </ErrorBoundary>

      {/* Transaction Lifecycle Viewer */}
      <ErrorBoundary>
        {executionControl.simulationId && ['running', 'paused', 'completed', 'failed'].includes(status) && (
          <TransactionLifecycleViewer simulationId={executionControl.simulationId} />
        )}
      </ErrorBoundary>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Link href="/configure" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full sm:w-auto">
            ← Back to Configure
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row gap-4">
          {(status === 'completed' || status === 'failed') && (
            <Link href={`/results/${executionControl.simulationId}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                View Results →
              </Button>
            </Link>
          )}

          {status !== 'idle' && status !== 'running' && (
            <Link href="/monitor" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Monitor Details →
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
