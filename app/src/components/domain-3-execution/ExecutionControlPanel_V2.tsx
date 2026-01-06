'use client';

import { ExecutionActionControls } from './ExecutionActionControls';
import { SimulationProgressTracker } from './SimulationProgressTracker';
import { ConfigurationSummaryCard } from './ConfigurationSummaryCard';

/**
 * Refactored ExecutionControlPanel using focused components.
 * This replaces the monolithic version with composable architecture.
 * 
 * Benefits:
 * - Single responsibility per component
 * - Easier to test in isolation
 * - Better maintainability
 * - Enables parallel development
 */
export function ExecutionControlPanel_V2(): JSX.Element {
  return (
    <div className="execution-control-panel-v2 space-y-6">
      <div className="panel-section">
        <ConfigurationSummaryCard />
      </div>

      <div className="panel-section">
        <ExecutionActionControls />
      </div>

      <div className="panel-section">
        <SimulationProgressTracker />
      </div>
    </div>
  );
}
