// Domain 2: Simulation Configuration Store Slice

import { SimulationConfigState, ArchetypeName, TimingProfile } from '@/types/domain-2';
import { ARCHETYPES, TIMING_PROFILES } from '@/lib/archetypes';

export interface SimulationConfigSlice {
  simulationConfig: SimulationConfigState;

  // Contract and Method Selection
  selectContract: (contract: any) => void;
  selectMethod: (method: any) => void;

  // Archetype Configuration
  setArchetypeMode: (mode: 'single' | 'mixed') => void;
  setSingleArchetype: (archetype: ArchetypeName) => void;
  updateMixedArchetype: (archetype: ArchetypeName, percentage: number) => void;

  // Wallet Selection
  setWalletSelectionMode: (mode: 'single' | 'multiple') => void;
  setSingleWallet: (index: number) => void;
  toggleWallet: (index: number) => void;

  // Execution Parameters
  setIterations: (iterations: number) => void;
  setTimingProfile: (profile: TimingProfile) => void;

  // Method Parameters
  updateMethodParam: (paramName: string, value: any) => void;
  setValue: (value: string) => void;

  // Gas Constraints
  setGasConstraintsEnabled: (enabled: boolean) => void;
  setMaxGasPerTx: (maxGas: string) => void;
  setMaxTotalGas: (maxGas: string) => void;

  // Advanced Options
  setDeterministicSeed: (enabled: boolean) => void;
  setSeed: (seed: number) => void;

  // Validation
  validateConfig: () => boolean;

  // Estimates
  calculateEstimates: () => void;

  // Reset
  resetConfig: () => void;
}

const initialState: SimulationConfigState = {
  selectedContract: null,
  selectedMethod: null,
  archetypeMode: 'single',
  singleArchetype: 'whale',
  mixedArchetypes: undefined,
  walletSelection: { mode: 'single', singleWallet: 0 },
  iterations: 10,
  timingProfile: 'normal',
  methodParams: {},
  gasConstraints: { enabled: false },
  advanced: {
    useDeterministicSeed: false,
    enableCircuitBreaker: true,
    failureThreshold: 5,
    autoRetry: true,
    maxRetries: 3,
  },
  isValid: false,
  validationErrors: [],
  estimatedMetrics: {
    totalTransactions: 0,
    estimatedDuration: 0,
    estimatedGasCost: '0',
  },
};

export const simulationConfigSlice = (set: (partial: any) => void, get: () => SimulationConfigSlice): SimulationConfigSlice => ({
  simulationConfig: initialState,

  selectContract: (contract) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        selectedContract: contract,
        selectedMethod: null, // Reset method when contract changes
        methodParams: {}, // Reset params
      }
    }));
    get().validateConfig();
  },

  selectMethod: (method) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        selectedMethod: method,
        methodParams: {}, // Reset params when method changes
      }
    }));
    get().validateConfig();
  },

  setArchetypeMode: (mode) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        archetypeMode: mode,
        mixedArchetypes: mode === 'mixed' ? {
          whale: 20, trader: 20, casual: 30, lurker: 20, researcher: 10
        } : undefined,
      }
    }));
    get().validateConfig();
  },

  setSingleArchetype: (archetype) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        singleArchetype: archetype,
      }
    }));
    get().calculateEstimates();
  },

  updateMixedArchetype: (archetype, percentage) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        mixedArchetypes: {
          ...state.simulationConfig.mixedArchetypes,
          [archetype]: percentage,
        }
      }
    }));
    get().validateConfig();
  },

  setWalletSelectionMode: (mode) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        walletSelection: {
          mode,
          singleWallet: mode === 'single' ? 0 : undefined,
          multipleWallets: mode === 'multiple' ? [] : undefined,
        }
      }
    }));
    get().validateConfig();
  },

  setSingleWallet: (index) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        walletSelection: {
          ...state.simulationConfig.walletSelection,
          singleWallet: index,
        }
      }
    }));
    get().validateConfig();
  },

  toggleWallet: (index) => {
    set((state: SimulationConfigSlice) => {
      const current = state.simulationConfig.walletSelection.multipleWallets || [];
      const updated = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];

      return {
        simulationConfig: {
          ...state.simulationConfig,
          walletSelection: {
            ...state.simulationConfig.walletSelection,
            multipleWallets: updated,
          }
        }
      };
    });
    get().validateConfig();
  },

  setIterations: (iterations) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        iterations,
      }
    }));
    get().calculateEstimates();
  },

  setTimingProfile: (profile) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        timingProfile: profile,
      }
    }));
    get().calculateEstimates();
  },

  updateMethodParam: (paramName, value) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        methodParams: {
          ...state.simulationConfig.methodParams,
          [paramName]: value,
        }
      }
    }));
    get().validateConfig();
  },

  setValue: (value) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        value,
      }
    }));
    get().validateConfig();
  },

  setGasConstraintsEnabled: (enabled) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        gasConstraints: {
          ...state.simulationConfig.gasConstraints,
          enabled,
        }
      }
    }));
    get().validateConfig();
  },

  setMaxGasPerTx: (maxGas) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        gasConstraints: {
          ...state.simulationConfig.gasConstraints,
          maxGasPerTx: maxGas,
        }
      }
    }));
    get().validateConfig();
  },

  setMaxTotalGas: (maxGas) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        gasConstraints: {
          ...state.simulationConfig.gasConstraints,
          maxTotalGas: maxGas,
        }
      }
    }));
    get().validateConfig();
  },

  setDeterministicSeed: (enabled) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        advanced: {
          ...state.simulationConfig.advanced,
          useDeterministicSeed: enabled,
        }
      }
    }));
  },

  setSeed: (seed) => {
    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        advanced: {
          ...state.simulationConfig.advanced,
          seed,
        }
      }
    }));
  },

  validateConfig: () => {
    const { simulationConfig } = get();
    const errors: string[] = [];

    // Required selections
    if (!simulationConfig.selectedContract) {
      errors.push('Contract must be selected');
    }
    if (!simulationConfig.selectedMethod) {
      errors.push('Method must be selected');
    }

    // Method parameters validation
    if (simulationConfig.selectedMethod) {
      simulationConfig.selectedMethod.inputs.forEach((input) => {
        const value = simulationConfig.methodParams[input.name];
        if (value === undefined || value === '') {
          errors.push(`Parameter "${input.name}" is required`);
        }
        // Type-specific validation would go here
      });
    }

    // Wallet selection
    const { walletSelection } = simulationConfig;
    if (walletSelection.mode === 'single' && walletSelection.singleWallet === undefined) {
      errors.push('Single wallet must be selected');
    }
    if (walletSelection.mode === 'multiple' &&
        (!walletSelection.multipleWallets || walletSelection.multipleWallets.length === 0)) {
      errors.push('At least one wallet must be selected');
    }

    // Mixed archetypes validation
    if (simulationConfig.archetypeMode === 'mixed') {
      const sum = Object.values(simulationConfig.mixedArchetypes || {}).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) {
        errors.push('Mixed archetype percentages must sum to 100%');
      }
    }

    // Gas constraints validation
    if (simulationConfig.gasConstraints.enabled) {
      if (!simulationConfig.gasConstraints.maxGasPerTx) {
        errors.push('Max gas per transaction is required when gas constraints are enabled');
      }
      if (!simulationConfig.gasConstraints.maxTotalGas) {
        errors.push('Max total gas is required when gas constraints are enabled');
      }
    }

    const isValid = errors.length === 0;

    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        isValid,
        validationErrors: errors,
      }
    }));

    if (isValid) {
      get().calculateEstimates();
    }

    return isValid;
  },

  calculateEstimates: () => {
    const { simulationConfig } = get();

    if (!simulationConfig.isValid) return;

    // Calculate based on archetypes, wallets, iterations
    const walletCount = simulationConfig.walletSelection.mode === 'single' ? 1 :
                       simulationConfig.walletSelection.multipleWallets?.length || 0;

    const totalTransactions = simulationConfig.iterations * walletCount;

    // Estimate duration based on timing profile and archetype behavior
    const profile = TIMING_PROFILES[simulationConfig.timingProfile];
    const avgDelay = (profile.delays[0] + profile.delays[1]) / 2;
    const estimatedDuration = totalTransactions * avgDelay;

    // Rough gas estimate (would be more sophisticated in real implementation)
    const estimatedGasCost = (totalTransactions * 0.001).toFixed(4); // 0.001 ETH per tx

    set((state: SimulationConfigSlice) => ({
      simulationConfig: {
        ...state.simulationConfig,
        estimatedMetrics: {
          totalTransactions,
          estimatedDuration,
          estimatedGasCost,
        }
      }
    }));
  },

  resetConfig: () => {
    set({ simulationConfig: initialState });
  },
});
