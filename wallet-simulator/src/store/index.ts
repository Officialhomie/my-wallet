// Root Zustand Store

import { create } from 'zustand';
import { systemSetupSlice, SystemSetupSlice } from './slices/systemSetup';
import { simulationConfigSlice, SimulationConfigSlice } from './slices/simulationConfig';
import { executionControlSlice, ExecutionControlSlice } from './slices/executionControl';
import { liveSystemStatusSlice, LiveSystemStatusSlice } from './slices/liveSystemStatus';
import { walletActivitySlice, WalletActivitySlice } from './slices/walletActivity';
import { resultInspectionSlice, ResultInspectionSlice } from './slices/resultInspection';

// Combined store type
export type AppStore = SystemSetupSlice &
  SimulationConfigSlice &
  ExecutionControlSlice &
  LiveSystemStatusSlice &
  WalletActivitySlice &
  ResultInspectionSlice & {
    simulateSystemUpdates: () => void;
    simulateWalletUpdates: () => void;
  };

// Create the store
export const useStore = create<AppStore>((set, get) => {
  const store = {
    ...systemSetupSlice(set, get),
    ...simulationConfigSlice(set, get),
    ...executionControlSlice(set, get),
    ...liveSystemStatusSlice(set, get),
    ...walletActivitySlice(set, get),
    ...resultInspectionSlice(set, get),
  } as any;

  // Additional methods for monitoring
  store.simulateSystemUpdates = () => {
    liveSystemStatusSlice(set, get).simulateSystemUpdates();
  };

  store.simulateWalletUpdates = () => {
    walletActivitySlice(set, get).simulateWalletUpdates();
  };

  return store;
});
