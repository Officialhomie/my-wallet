// Domain 3: Execution Control Types

import { ArchetypeName } from './domain-2';

export interface ExecutionControlState {
  simulationId: string | null;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  progress: {
    currentIteration: number;
    totalIterations: number;
    percentage: number;
    eta: number; // seconds
  } | null;
  currentAction: {
    walletIndex: number;
    archetype: ArchetypeName;
    method: string;
  } | null;

  // ❌ REMOVED: canStart, canPause, canResume, canStop, canReplay
  // These are now derived via selectors in executionSelectors.ts
  // Use selectCanStart(), selectCanPause(), etc. instead

  error: string | null;
  lastUpdate: number;
}
