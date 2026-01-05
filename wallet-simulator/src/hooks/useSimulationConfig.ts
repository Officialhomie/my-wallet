// Domain 2: Simulation Configuration Hook
// TODO: Implement in Phase 3

import { useStore } from '@/store';

export function useSimulationConfig() {
  const simulationConfig = useStore((state) => state.simulationConfig);
  const selectContract = useStore((state) => state.selectContract);
  const selectMethod = useStore((state) => state.selectMethod);
  const validateConfig = useStore((state) => state.validateConfig);

  return {
    simulationConfig,
    selectContract,
    selectMethod,
    validateConfig,
  };
}
