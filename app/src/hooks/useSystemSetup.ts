// Domain 1: System Setup Hook
// TODO: Implement in Phase 2

import { useStore } from '@/store';

export function useSystemSetup() {
  const systemSetup = useStore((state) => state.systemSetup);
  const selectNetwork = useStore((state) => state.selectNetwork);
  const fetchWalletFarmInfo = useStore((state) => state.fetchWalletFarmInfo);
  const fetchContracts = useStore((state) => state.fetchContracts);
  const registerContract = useStore((state) => state.registerContract);

  return {
    systemSetup,
    selectNetwork,
    fetchWalletFarmInfo,
    fetchContracts,
    registerContract,
  };
}
