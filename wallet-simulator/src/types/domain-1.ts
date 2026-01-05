// Domain 1: System Setup Types

import { AbiItem } from './domain-2';

export interface Network {
  id: string;
  name: string;
  chainId: number;
  blockTime: number;
  rpcUrl: string;
}

export interface Contract {
  id: string;
  name: string;
  network: string;
  address: string;
  abi: AbiItem[];
  createdAt: string;
}

export interface FundingWallet {
  configured: boolean;
  address?: string;
  balance?: string;
  network?: string;
}

export interface DistributionResult {
  success: boolean;
  network: string;
  amount: string;
  strategy: string;
  distributionId?: string;
  totalWallets: number;
  successful: number;
  failed: number;
  totalDistributed: string;
  duration: number;
  results: Array<{
    walletIndex: number;
    address: string;
    success: boolean;
    amount?: string;
    txHash?: string;
    error?: string;
    timestamp: number;
  }>;
}

export interface SystemSetupState {
  selectedNetwork: string;
  availableNetworks: Network[];
  customRpcUrl?: string;
  walletCount: number;
  walletFarmInfo: {
    totalWallets: number;
    mnemonicPreview: string;
    addresses: string[];
  } | null;
  registeredContracts: Contract[];
  rpcConnectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isLoading: boolean;
  error: string | null;
  // Fund distribution state
  fundingWallet: FundingWallet | null;
  distributionHistory: DistributionResult[];
  isDistributing: boolean;
  distributionError: string | null;
}
