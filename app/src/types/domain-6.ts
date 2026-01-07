// Domain 6: Result Inspection Types

import { ArchetypeName } from './domain-2';

// Re-export for convenience
export type { ArchetypeName };

export type SimulationStatus = 'completed' | 'failed' | 'cancelled' | 'running';
export type TransactionStatus = 'success' | 'failure' | 'pending';

export interface SimulationContract {
  name: string;
  network: string;
  address: string;
}

export interface SimulationSummary {
  simulationId: string;
  status: SimulationStatus;
  startedAt: number;
  completedAt: number;
  duration: number; // milliseconds
  contract: SimulationContract;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalGasUsed: string; // ETH
  averageGasPerTransaction: string;
  averageTransactionTime: number; // milliseconds
}

export interface ArchetypeDistribution {
  archetype: ArchetypeName;
  count: number;
  percentage: number;
  totalTransactions: number;
  successfulTransactions: number;
  averageGasUsed: string;
}

export interface TransactionRecord {
  txHash: string;
  walletIndex: number;
  walletAddress?: string; // Wallet address for verification
  archetype: ArchetypeName;
  method: string;
  status: TransactionStatus;
  timestamp: number;
  gasUsed: string;
  gasPrice?: string;
  blockNumber?: number;
  blockTimestamp?: number; // Block timestamp for verification
  from?: string; // Transaction from address
  to?: string; // Transaction to address
  value?: string; // Transaction value in wei
  errorMessage?: string;
  parameters?: Record<string, any>;
}

export interface ResultInspectionState {
  simulationId: string | null;
  summary: SimulationSummary | null;
  archetypeDistribution: ArchetypeDistribution[];
  transactions: TransactionRecord[];
  isLoading: boolean;
  error: string | null;
  filters: {
    walletIndex: number | null;
    archetype: ArchetypeName | null;
    status: TransactionStatus | 'all';
  };
  sortBy: 'timestamp' | 'wallet' | 'gas' | 'status';
  sortOrder: 'asc' | 'desc';
  lastUpdate: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeTransactions: boolean;
  includeSummary: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
}