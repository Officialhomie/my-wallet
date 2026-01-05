// Domain 5: Wallet Activity Types

import { ArchetypeName } from './domain-2';

export type WalletStatus = 'idle' | 'active' | 'error' | 'completed';

export interface TransactionCount {
  total: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface SuccessRate {
  percentage: number;
  successful: number;
  total: number;
}

export interface WalletActivity {
  index: number;
  address: string;
  archetype: ArchetypeName;
  status: WalletStatus;
  transactionCount: TransactionCount;
  successRate: SuccessRate;
  gasUsed: string; // ETH
  lastAction?: {
    method: string;
    timestamp: number;
    status: 'success' | 'failed' | 'pending';
  };
  isActive: boolean;
  errorCount: number;
}

export interface WalletActivityState {
  wallets: Record<number, WalletActivity>;
  totalWallets: number;
  activeWallets: number;
  errorWallets: number;
  completedWallets: number;
  globalStats: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasUsed: string;
  };
  lastUpdate: number;
}