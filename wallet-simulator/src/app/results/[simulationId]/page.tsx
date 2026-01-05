// Domain 6: Result Inspection Page
// Did this behave as expected?

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { SimulationSummaryCard } from '@/components/domain-6-results/SimulationSummaryCard';
import { TransactionTable } from '@/components/domain-6-results/TransactionTable';
import { ExportControls } from '@/components/domain-6-results/ExportControls';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const simulationId = params.simulationId as string;

  const { resultInspection } = useStore();
  const { summary, isLoading, error } = resultInspection;

  const loadSimulationResults = useStore((state) => state.loadSimulationResults);

  useEffect(() => {
    if (simulationId && !summary) {
      loadSimulationResults(simulationId);
    }
  }, [simulationId, summary, loadSimulationResults]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-lg font-medium text-foreground mb-2">
              Loading Simulation Results
            </div>
            <div className="text-sm text-muted-foreground">
              Analyzing transaction data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Failed to Load Results
          </h2>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => loadSimulationResults(simulationId)}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Simulation Not Found
          </h2>
          <p className="text-muted-foreground mb-6">
            The requested simulation results could not be found.
          </p>
          <Button onClick={() => router.push('/')}>
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Simulation Results
        </h1>
        <p className="text-lg text-muted-foreground">
          Did this behave as expected?
        </p>
        <div className="flex items-center justify-center space-x-4 mt-4">
          <Badge variant="info" className="text-sm">
            Simulation ID: {simulationId}
          </Badge>
          <Badge variant={summary.status === 'completed' ? 'success' : 'error'} className="text-sm">
            {summary.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Export Controls */}
      <div className="flex justify-end">
        <ExportControls />
      </div>

      {/* Simulation Summary */}
      <SimulationSummaryCard summary={summary} />

      {/* Archetype Distribution Chart Placeholder */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Archetype Distribution
        </h2>
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-medium text-muted-foreground mb-2">
            Archetype Distribution Chart
          </div>
          <div className="text-sm text-muted-foreground">
            Interactive chart showing transaction distribution across behavioral archetypes would be displayed here
          </div>
        </div>
      </div>

      {/* Transaction Analysis */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Transaction Analysis
        </h2>
        <TransactionTable />
      </div>

      {/* Performance Analysis Placeholder */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Performance Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-sm font-medium text-muted-foreground">
              Transaction Timing Distribution
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">⛽</div>
            <div className="text-sm font-medium text-muted-foreground">
              Gas Usage Analysis
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-border">
        <div className="text-sm text-muted-foreground mb-4 sm:mb-0">
          Simulation completed {new Date(summary.completedAt).toLocaleString()}
        </div>

        <div className="flex space-x-4">
          <Button
            variant="secondary"
            onClick={() => router.push('/monitor')}
          >
            ← Back to Monitor
          </Button>

          <Button
            variant="secondary"
            onClick={() => router.push('/configure')}
          >
            Run Another Simulation
          </Button>

          <Button
            onClick={() => router.push('/')}
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}