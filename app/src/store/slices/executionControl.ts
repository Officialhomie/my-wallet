// Domain 3: Execution Control Store Slice

import { ExecutionControlState } from '@/types/domain-3';
import { api } from '@/lib/api';
import { 
  initializeSocket, 
  setSimulationEventHandlers, 
  subscribeToSimulation,
  unsubscribeFromSimulation 
} from '@/lib/socket';

export interface ExecutionControlSlice {
  executionControl: ExecutionControlState;
  startSimulation: () => Promise<void>;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  setExecutionStatus: (status: ExecutionControlState['status']) => void;
  updateProgress: (progress: ExecutionControlState['progress']) => void;
  setCurrentAction: (action: ExecutionControlState['currentAction']) => void;
  // ❌ REMOVED: updateCanActions - no longer needed with derived selectors
}

const initialState: ExecutionControlState = {
  simulationId: null,
  status: 'idle',
  progress: null,
  currentAction: null,
  // ❌ REMOVED: canStart, canPause, canResume, canStop, canReplay
  // These are now derived via selectors in executionSelectors.ts
  error: null,
  lastUpdate: Date.now(),
};

export const executionControlSlice = (set: (partial: any) => void, get: () => ExecutionControlSlice): ExecutionControlSlice => ({
  executionControl: initialState,

  startSimulation: async () => {
    const state = get();

    // ✅ FIXED: Use proper dependency injection instead of globalThis
    // Access simulationConfig through the store's get() function
    const fullState = (get as any)() as any; // Zustand's get() returns full AppStore
    const simConfig = fullState.simulationConfig;
    
    if (!simConfig?.isValid) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          error: 'Invalid simulation configuration. Please complete the configuration step.',
        }
      }));
      return;
    }

    // Initialize WebSocket and set up event handlers BEFORE starting
    initializeSocket();
    setupSimulationEventHandlers(get, set);

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'running',
        error: null,
      }
    }));

    try {
      const response = await api.startSimulation(simConfig);
      const simulationId = response.simulationId;
      
      // Initialize progress tracking
      const totalTransactions = calculateTotalTransactions(simConfig);
      
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          simulationId,
          status: 'running',
          progress: {
            currentIteration: 0,
            totalIterations: simConfig.iterations || 10,
            percentage: 0,
            eta: 0,
          },
        }
      }));

      // Subscribe to WebSocket events for this simulation
      subscribeToSimulation(simulationId);

      // ✅ FIXED: Use proper dependency injection for transaction tracking
      const storeState = (get as any)() as any; // Access full store
      if (storeState?.startSimulationTracking) {
        storeState.startSimulationTracking(simulationId, totalTransactions);
      }
      
      // Re-validate before starting (prevent race conditions)
      const recheckState = (get as any)() as any;
      if (!recheckState.simulationConfig?.isValid) {
        set((state: ExecutionControlSlice) => ({
          executionControl: {
            ...state.executionControl,
            status: 'failed',
            error: 'Configuration changed during startup. Please reconfigure.',
          }
        }));
        unsubscribeFromSimulation(simulationId);
        return;
      }

      console.log(`🚀 Simulation ${simulationId} started - waiting for backend execution...`);
      // ✅ Backend will now execute real transactions and emit WebSocket events
      // The frontend will receive 'simulation:complete' or 'simulation:error' events

    } catch (error: any) {
      console.error('❌ Failed to start simulation:', error);
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          status: 'failed',
          error: error?.message || 'Failed to start simulation. Make sure the backend is running.',
        }
      }));
    }
  },

  pauseSimulation: async () => {
    const state = get();
    const simulationId = state.executionControl.simulationId;
    if (!simulationId) return;

    // Check if status is still running before pausing
    if (get().executionControl.status !== 'running') return;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'paused',
        error: null,
      }
    }));

    try {
      await api.pauseSimulation(simulationId);
    } catch (error) {
      // Revert status if API fails
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          status: 'running',
          error: 'Failed to pause simulation',
        }
      }));
    }
  },

  resumeSimulation: async () => {
    const state = get();
    const simulationId = state.executionControl.simulationId;
    if (!simulationId) return;

    // Check if status is still paused before resuming
    if (get().executionControl.status !== 'paused') return;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'running',
        error: null,
      }
    }));

    try {
      await api.resumeSimulation(simulationId);
      // Re-subscribe to WebSocket events
      subscribeToSimulation(simulationId);
    } catch (error) {
      // Revert status if API fails
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          status: 'paused',
          error: 'Failed to resume simulation',
        }
      }));
    }
  },

  stopSimulation: async () => {
    const state = get();
    const simulationId = state.executionControl.simulationId;
    if (!simulationId) return;

    // Unsubscribe from WebSocket events
    unsubscribeFromSimulation(simulationId);

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'stopped',
        error: null,
        currentAction: null,
      }
    }));

    try {
      await api.stopSimulation(simulationId);
    } catch (error) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          error: 'Failed to stop simulation',
        }
      }));
    }
  },

  setExecutionStatus: (status) => {
    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status,
      }
    }));
  },

  updateProgress: (progress) => {
    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        progress,
      }
    }));
  },

  setCurrentAction: (action) => {
    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        currentAction: action,
      }
    }));
  },

  // ❌ REMOVED: updateCanActions method
  // Action availability is now derived via selectors in executionSelectors.ts
});

// Calculate total number of transactions for tracking
function calculateTotalTransactions(simConfig: any): number {
  const walletCount = simConfig.walletSelection.mode === 'single' 
    ? 1 
    : simConfig.walletSelection.multipleWallets?.length || 0;
  return simConfig.iterations * walletCount;
}

// Set up WebSocket event handlers for real-time simulation updates
function setupSimulationEventHandlers(get: () => ExecutionControlSlice, set: (partial: any) => void) {
  const getFullStore = get as any;
  
  setSimulationEventHandlers({
    onComplete: (data) => {
      console.log('✅ Simulation completed via WebSocket:', data.simulationId);
      const state = get();
      const currentSimId = state.executionControl.simulationId;
      
      // Only update if this is our current simulation
      if (currentSimId === data.simulationId) {
        set((state: ExecutionControlSlice) => ({
          executionControl: {
            ...state.executionControl,
            status: 'completed',
            progress: {
              ...state.executionControl.progress,
              percentage: 100,
              eta: 0,
            },
            currentAction: null,
          }
        }));
        
        // Unsubscribe from completed simulation
        unsubscribeFromSimulation(data.simulationId);
        
        // Update monitoring data
        updateMonitoringData(getFullStore);
        
        // ✅ Auto-load results when simulation completes
        const store = getFullStore();
        if (store?.loadSimulationResults) {
          console.log('📊 Auto-loading simulation results...');
          store.loadSimulationResults(data.simulationId);
        }
      }
    },
    
    onError: (data) => {
      console.error('❌ Simulation error via WebSocket:', data.simulationId, data.error);
      const state = get();
      const currentSimId = state.executionControl.simulationId;
      
      if (currentSimId === data.simulationId) {
        set((state: ExecutionControlSlice) => ({
          executionControl: {
            ...state.executionControl,
            status: 'failed',
            error: data.error || 'Simulation failed',
          }
        }));
        
        unsubscribeFromSimulation(data.simulationId);
      }
    },
    
    onProgress: (data) => {
      console.log('📊 Simulation progress via WebSocket:', data.simulationId, data.progress);
      const state = get();
      const currentSimId = state.executionControl.simulationId;
      
      if (currentSimId === data.simulationId && data.progress) {
        set((state: ExecutionControlSlice) => ({
          executionControl: {
            ...state.executionControl,
            progress: {
              currentIteration: data.progress.currentIteration || state.executionControl.progress?.currentIteration || 0,
              totalIterations: data.progress.totalIterations || state.executionControl.progress?.totalIterations || 10,
              percentage: data.progress.percentage || 0,
              eta: data.progress.eta || 0,
            },
          }
        }));
        
        updateMonitoringData(getFullStore);
      }
    },
    
    onTransactionUpdate: (data) => {
      console.log('💰 Transaction update via WebSocket:', data.simulationId, data.transaction);
      const state = get();
      const currentSimId = state.executionControl.simulationId;
      
      if (currentSimId === data.simulationId && data.transaction) {
        // Update current action display
        set((state: ExecutionControlSlice) => ({
          executionControl: {
            ...state.executionControl,
            currentAction: {
              walletIndex: data.transaction.walletIndex || 0,
              archetype: data.transaction.archetype || 'casual',
              method: data.transaction.method || 'unknown',
            },
          }
        }));
        
        // Update transaction tracking if available
        const store = getFullStore();
        if (store?.addTransaction) {
          store.addTransaction(data.simulationId, data.transaction);
        }
      }
    },
  });
}

// Update monitoring data from store
function updateMonitoringData(getFullStore: () => any) {
  try {
    const store = getFullStore();
    
    // Update system status
    if (store?.simulateSystemUpdates) {
      store.simulateSystemUpdates();
    }

    // Update wallet activity
    if (store?.simulateWalletUpdates) {
      store.simulateWalletUpdates();
    }
  } catch (error) {
    // Ignore errors
  }
}
