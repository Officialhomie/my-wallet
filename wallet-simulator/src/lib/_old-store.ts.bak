import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  SimulationConfig,
  SimulationRun,
  SimulationStatus,
  WalletState,
  SimulationMetrics,
  WebSocketEvent,
  ArchetypeName,
  NetworkConfig,
} from '@/types/api';

interface SimulationStore {
  // Configuration
  config: Partial<SimulationConfig>;
  setConfig: (config: Partial<SimulationConfig>) => void;
  resetConfig: () => void;

  // Current Simulation Run
  currentRun: SimulationRun | null;
  setCurrentRun: (run: SimulationRun | null) => void;

  // UI State
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // WebSocket Events
  handleWebSocketEvent: (event: WebSocketEvent) => void;

  // Utility functions
  generateRunId: (config: SimulationConfig) => string;
  validateConfig: (config: Partial<SimulationConfig>) => { valid: boolean; errors: string[] };
}

const initialConfig: Partial<SimulationConfig> = {
  network: {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
  },
  walletCount: 10,
  walletSource: 'generated',
  archetypeConfig: {
    type: 'single',
    singleArchetype: 'casual',
  },
  seed: Math.floor(Math.random() * 1000000),
};

export const useSimulationStore = create<SimulationStore>()(
  subscribeWithSelector((set, get) => ({
    config: initialConfig,
    currentRun: null,
    isConnected: false,

    setConfig: (newConfig) =>
      set((state) => ({
        config: { ...state.config, ...newConfig },
      })),

    resetConfig: () =>
      set(() => ({
        config: initialConfig,
      })),

    setCurrentRun: (run) =>
      set(() => ({
        currentRun: run,
      })),

    setIsConnected: (connected) =>
      set(() => ({
        isConnected: connected,
      })),

    handleWebSocketEvent: (event) => {
      const { currentRun } = get();

      switch (event.type) {
        case 'simulation_started':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    status: 'running',
                    startTime: new Date(),
                  }
                : null,
            }));
          }
          break;
        case 'simulation_status':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    status: event.status,
                  }
                : null,
            }));
          }
          break;

        case 'wallet_update':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    wallets: state.currentRun.wallets.map((wallet, index) =>
                      index === event.walletIndex ? event.wallet : wallet
                    ),
                  }
                : null,
            }));
          }
          break;

        case 'metrics_update':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    metrics: event.metrics,
                  }
                : null,
            }));
          }
          break;

        case 'transaction_update':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    wallets: state.currentRun.wallets.map((wallet, index) =>
                      index === event.walletIndex
                        ? {
                            ...wallet,
                            transactions: [...wallet.transactions, event.transaction],
                            lastActivity: event.transaction.timestamp,
                          }
                        : wallet
                    ),
                  }
                : null,
            }));
          }
          break;

        case 'simulation_completed':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    status: 'completed',
                    endTime: new Date(),
                    metrics: event.finalMetrics,
                  }
                : null,
            }));
          }
          break;

        case 'simulation_error':
          if (currentRun && currentRun.id === event.runId) {
            set((state) => ({
              currentRun: state.currentRun
                ? {
                    ...state.currentRun,
                    status: 'failed',
                  }
                : null,
            }));
          }
          break;
      }
    },

    generateRunId: (config) => {
      // Create a deterministic hash from config
      const configString = JSON.stringify({
        contractAddress: config.contractAddress,
        abiHash: config.abiHash,
        network: config.network,
        walletCount: config.walletCount,
        archetypeConfig: config.archetypeConfig,
        targetFunctions: config.targetFunctions,
        seed: config.seed,
      });

      // Simple hash function for demo (would use crypto in production)
      let hash = 0;
      for (let i = 0; i < configString.length; i++) {
        const char = configString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash).toString(16).padStart(8, '0');
    },

    validateConfig: (config) => {
      const errors: string[] = [];

      if (!config.contractAddress) {
        errors.push('Contract address is required');
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(config.contractAddress)) {
        errors.push('Invalid contract address format');
      }

      if (!config.abi || !Array.isArray(config.abi) || config.abi.length === 0) {
        errors.push('Valid ABI is required');
      }

      if (!config.network) {
        errors.push('Network configuration is required');
      }

      if (!config.walletCount || config.walletCount < 1 || config.walletCount > 100) {
        errors.push('Wallet count must be between 1 and 100');
      }

      if (!config.archetypeConfig) {
        errors.push('Archetype configuration is required');
      }

      if (!config.targetFunctions || config.targetFunctions.length === 0) {
        errors.push('At least one target function must be selected');
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
  }))
);

// Selectors for common state slices
export const useConfig = () => useSimulationStore((state) => state.config);
export const useCurrentRun = () => useSimulationStore((state) => state.currentRun);
export const useIsConnected = () => useSimulationStore((state) => state.isConnected);
export const useSimulationStatus = () =>
  useSimulationStore((state) => state.currentRun?.status || 'idle');
export const useSimulationMetrics = () =>
  useSimulationStore((state) => state.currentRun?.metrics);
export const useWalletStates = () =>
  useSimulationStore((state) => state.currentRun?.wallets || []);
