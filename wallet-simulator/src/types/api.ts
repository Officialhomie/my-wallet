// API Types for Wallet Farm Visual Simulator Frontend

export interface SimulationConfig {
  // Contract & ABI
  contractAddress: string;
  abi: any[]; // Parsed ABI JSON
  abiHash: string;

  // Network
  network: NetworkConfig;

  // Wallets
  walletCount: number;
  walletSource: 'existing' | 'generated';

  // Archetypes
  archetypeConfig: ArchetypeConfig;

  // Timing
  duration?: number; // milliseconds, optional for interaction-based sim
  interactionCount?: number; // optional for duration-based sim

  // Contract Functions
  targetFunctions: TargetFunction[];

  // Gas & Value
  gasLimit?: bigint;
  value?: bigint; // ETH value to send

  // Determinism
  seed: number;
}

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
}

export interface ArchetypeConfig {
  type: 'single' | 'mixed';
  singleArchetype?: string;
  mixedConfig?: ArchetypeDistribution[];
}

export interface ArchetypeDistribution {
  archetype: string;
  percentage: number; // 0-100
}

export interface TargetFunction {
  name: string;
  inputs: FunctionInput[];
  selected: boolean;
}

export interface FunctionInput {
  name: string;
  type: string;
  value?: any; // For static values or generation rules
}

// Simulation Run Types
export interface SimulationRun {
  id: string; // Hash of config
  status: SimulationStatus;
  config: SimulationConfig;
  startTime?: Date;
  endTime?: Date;
  metrics: SimulationMetrics;
  wallets: WalletState[];
}

export type SimulationStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'completed'
  | 'failed';

export interface SimulationMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  tps: number; // transactions per second
  avgGasUsed: bigint;
  totalGasCost: bigint;
  avgDelay: number; // milliseconds
  nonceGaps: number;
  rateLimitedEvents: number;
  circuitBreakerTrips: number;
  activeWallets: number;
  startTime: Date;
  lastUpdateTime: Date;
}

export interface WalletState {
  index: number;
  address: string;
  archetype: string;
  status: WalletStatus;
  nonce: number;
  balance: bigint;
  transactions: TransactionRecord[];
  lastActivity?: Date;
  errorCount: number;
}

export type WalletStatus =
  | 'idle'
  | 'waiting'
  | 'sending'
  | 'confirming'
  | 'confirmed'
  | 'reverted'
  | 'rate_limited'
  | 'error';

export interface TransactionRecord {
  hash: string;
  functionName: string;
  parameters: Record<string, any>;
  value?: bigint;
  gasUsed?: bigint;
  gasPrice?: bigint;
  status: 'pending' | 'confirmed' | 'reverted';
  timestamp: Date;
  blockNumber?: number;
  error?: string;
  retryCount: number;
  timingDelay?: number; // Applied delay before this tx
}

// WebSocket Events
export type WebSocketEvent =
  | { type: 'simulation_started'; runId: string }
  | { type: 'simulation_status'; runId: string; status: SimulationStatus }
  | { type: 'wallet_update'; runId: string; walletIndex: number; wallet: WalletState }
  | { type: 'metrics_update'; runId: string; metrics: SimulationMetrics }
  | { type: 'transaction_update'; runId: string; walletIndex: number; transaction: TransactionRecord }
  | { type: 'simulation_completed'; runId: string; finalMetrics: SimulationMetrics }
  | { type: 'simulation_error'; runId: string; error: string };

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AbiValidationResult extends ValidationResult {
  functions: ABIFunction[];
  events: ABIEvent[];
}

export interface ABIFunction {
  name: string;
  type: 'function';
  inputs: ABIParameter[];
  outputs: ABIParameter[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ABIEvent {
  name: string;
  type: 'event';
  inputs: ABIParameter[];
  indexed: boolean;
}

export interface ABIParameter {
  name: string;
  type: string;
  indexed?: boolean;
}

// Export Types
export interface ExportData {
  runId: string;
  config: SimulationConfig;
  metrics: SimulationMetrics;
  wallets: WalletState[];
  transactions: TransactionRecord[];
  exportedAt: Date;
}

// Archetype Types (based on backend)
export const ARCHETYPES = [
  'whale',
  'activeTrader',
  'casual',
  'researcher',
  'bot',
  'lurker'
] as const;

export type ArchetypeName = typeof ARCHETYPES[number];

// Timing Profiles (based on backend)
export const TIMING_PROFILES = [
  'instant',
  'quick',
  'normal',
  'thoughtful',
  'slow',
  'verySlow',
  'deliberate'
] as const;

export type TimingProfile = typeof TIMING_PROFILES[number];

