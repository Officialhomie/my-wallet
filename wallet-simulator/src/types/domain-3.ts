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
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canStop: boolean;
  canReplay: boolean;
  error: string | null;
}
