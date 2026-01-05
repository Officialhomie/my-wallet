// Domain 2: Simulation Configuration Types

export type ArchetypeName = 'whale' | 'trader' | 'casual' | 'lurker' | 'researcher';

export type TimingProfile = 'instant' | 'fast' | 'normal' | 'slow' | 'variable';

export interface ArchetypeInfo {
  name: ArchetypeName;
  label: string;
  description: string;
  icon: string;
}

export interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface AbiItem {
  type: 'function' | 'constructor' | 'event' | 'fallback';
  name?: string;
  inputs?: AbiInput[];
  outputs?: AbiInput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

export interface Contract {
  id: string;
  name: string;
  address: string;
  abi: AbiItem[];
}

export interface MethodInfo {
  name: string;
  signature: string;
  inputs: any[];
  stateMutability: 'view' | 'pure' | 'nonpayable' | 'payable';
}

export interface SimulationConfigState {
  selectedContract: Contract | null;
  selectedMethod: MethodInfo | null;

  archetypeMode: 'single' | 'mixed';
  singleArchetype?: ArchetypeName;
  mixedArchetypes?: Record<ArchetypeName, number>; // percentage

  walletSelection: {
    mode: 'single' | 'multiple';
    singleWallet?: number;
    multipleWallets?: number[];
  };

  iterations: number;
  timingProfile: TimingProfile;

  methodParams: Record<string, any>;
  value?: string; // ETH amount for payable methods

  gasConstraints: {
    enabled: boolean;
    maxGasPerTx?: string;
    maxTotalGas?: string;
  };

  advanced: {
    useDeterministicSeed: boolean;
    seed?: number;
    enableCircuitBreaker: boolean;
    failureThreshold?: number;
    autoRetry: boolean;
    maxRetries?: number;
  };

  isValid: boolean;
  validationErrors: string[];
  estimatedMetrics: {
    totalTransactions: number;
    estimatedDuration: number; // seconds
    estimatedGasCost: string; // ETH
  };
}
