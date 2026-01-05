// Domain 3: Execution Control Store Slice

import { ExecutionControlState } from '@/types/domain-3';
import { api } from '@/lib/api';

export interface ExecutionControlSlice {
  executionControl: ExecutionControlState;
  startSimulation: () => Promise<void>;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  setExecutionStatus: (status: ExecutionControlState['status']) => void;
  updateProgress: (progress: ExecutionControlState['progress']) => void;
  setCurrentAction: (action: ExecutionControlState['currentAction']) => void;
  updateCanActions: () => void;
}

const initialState: ExecutionControlState = {
  simulationId: null,
  status: 'idle',
  progress: null,
  currentAction: null,
  canStart: true, // Start with true, will be updated based on config
  canPause: false,
  canResume: false,
  canStop: false,
  canReplay: false,
  error: null,
};

export const executionControlSlice = (set: (partial: any) => void, get: () => ExecutionControlSlice): ExecutionControlSlice => ({
  executionControl: initialState,

  startSimulation: async () => {
    const state = get();

    // Check if we have a valid configuration from Domain 2
    const simConfig = (globalThis as any).useStore?.getState?.().simulationConfig;
    if (!simConfig?.isValid) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          error: 'Invalid simulation configuration. Please complete the configuration step.',
        }
      }));
      return;
    }

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'running',
        error: null,
      }
    }));

    try {
      const response = await api.startSimulation(simConfig);
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          simulationId: response.simulationId,
          status: 'running',
        }
      }));

      // Update available actions
      get().updateCanActions();

      // Start progress simulation
      simulateProgress(get, set);

    } catch (error) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          status: 'failed',
          error: 'Failed to start simulation',
        }
      }));
      get().updateCanActions();
    }
  },

  pauseSimulation: async () => {
    const state = get();
    if (!state.executionControl.simulationId) return;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'paused',
        error: null,
      }
    }));

    try {
      await api.pauseSimulation(state.executionControl.simulationId);
      get().updateCanActions();
    } catch (error) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          error: 'Failed to pause simulation',
        }
      }));
    }
  },

  resumeSimulation: async () => {
    const state = get();
    if (!state.executionControl.simulationId) return;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'running',
        error: null,
      }
    }));

    try {
      await api.resumeSimulation(state.executionControl.simulationId);
      get().updateCanActions();
      // Resume progress simulation
      simulateProgress(get, set);
    } catch (error) {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          error: 'Failed to resume simulation',
        }
      }));
    }
  },

  stopSimulation: async () => {
    const state = get();
    if (!state.executionControl.simulationId) return;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'stopped',
        error: null,
      }
    }));

    try {
      await api.stopSimulation(state.executionControl.simulationId);
      get().updateCanActions();
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

  updateCanActions: () => {
    const state = get();
    const { status, simulationId } = state.executionControl;

    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        canStart: status === 'idle',
        canPause: status === 'running',
        canResume: status === 'paused',
        canStop: status === 'running' || status === 'paused',
        canReplay: status === 'completed' || status === 'failed' || status === 'stopped',
      }
    }));
  },
});

// Progress simulation for demo purposes with WebSocket-like updates
function simulateProgress(get: () => ExecutionControlSlice, set: (partial: any) => void) {
  const state = get();
  if (state.executionControl.status !== 'running' || !state.executionControl.progress) return;

  const { progress } = state.executionControl;
  if (progress.percentage >= 100) {
    // Simulation complete
    set((state: ExecutionControlSlice) => ({
      executionControl: {
        ...state.executionControl,
        status: 'completed',
        progress: {
          ...progress,
          percentage: 100,
          eta: 0,
        },
        currentAction: null,
      }
    }));
    get().updateCanActions();

    // Trigger final system and wallet updates
    updateMonitoringData();
    return;
  }

  // Simulate progress increment
  const newPercentage = Math.min(progress.percentage + Math.random() * 5, 100);
  const newIteration = Math.min(
    progress.currentIteration + Math.floor(Math.random() * 2),
    progress.totalIterations
  );

  const currentAction = {
    walletIndex: Math.floor(Math.random() * 5),
    archetype: ['whale', 'trader', 'casual', 'lurker', 'researcher'][Math.floor(Math.random() * 5)] as any,
    method: 'transfer(address,uint256)',
  };

  set((state: ExecutionControlSlice) => ({
    executionControl: {
      ...state.executionControl,
      progress: {
        ...progress,
        currentIteration: newIteration,
        percentage: Math.round(newPercentage),
        eta: Math.max(0, (100 - newPercentage) * 0.5), // Mock ETA
      },
      currentAction,
    }
  }));

  // Trigger real-time monitoring updates (simulate WebSocket events)
  updateMonitoringData();

  // Continue simulation if still running
  if (newPercentage < 100) {
    setTimeout(() => simulateProgress(get, set), 1000 + Math.random() * 2000);
  } else {
    // Complete simulation
    setTimeout(() => {
      set((state: ExecutionControlSlice) => ({
        executionControl: {
          ...state.executionControl,
          status: 'completed',
          progress: {
            ...state.executionControl.progress!,
            percentage: 100,
            eta: 0,
          },
          currentAction: null,
        }
      }));
      get().updateCanActions();
      updateMonitoringData();
    }, 1000);
  }
}

// Simulate WebSocket monitoring updates
function updateMonitoringData() {
  try {
    // Update system status
    const systemStore = (globalThis as any).useStore?.getState?.().liveSystemStatus;
    if (systemStore?.simulateSystemUpdates) {
      systemStore.simulateSystemUpdates();
    }

    // Update wallet activity
    const walletStore = (globalThis as any).useStore?.getState?.().walletActivity;
    if (walletStore?.simulateWalletUpdates) {
      walletStore.simulateWalletUpdates();
    }
  } catch (error) {
    // Ignore errors in demo mode
  }
}
