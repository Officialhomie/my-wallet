// Domain 3: Execution Control Hook
// TODO: Implement in Phase 4

import { useStore } from '@/store';

export function useExecutionControl() {
  const executionControl = useStore((state) => state.executionControl);
  const startSimulation = useStore((state) => state.startSimulation);
  const pauseSimulation = useStore((state) => state.pauseSimulation);
  const stopSimulation = useStore((state) => state.stopSimulation);

  return {
    executionControl,
    startSimulation,
    pauseSimulation,
    stopSimulation,
  };
}
