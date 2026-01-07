// Domain 1: System Setup Store Slice

import { SystemSetupState, Network, FundingWallet, DistributionResult } from '@/types/domain-1';
import { api } from '@/lib/api';
import { getAllNetworks, getNetworkById } from '@/lib/networks';

export interface SystemSetupSlice {
  systemSetup: SystemSetupState;
  selectNetwork: (networkId: string) => void;
  setCustomRpcUrl: (url: string) => void;
  setWalletCount: (count: number) => void;
  fetchWalletFarmInfo: () => Promise<void>;
  fetchContracts: () => Promise<void>;
  registerContract: (contractData: any) => Promise<void>;
  testRpcConnection: () => Promise<void>;
  // Fund distribution actions
  configureFundingWallet: (privateKey: string, network: string) => Promise<void>;
  fetchFundingWallet: () => Promise<void>;
  distributeNativeTokens: (network: string, amount: string, strategy: string) => Promise<DistributionResult>;
  distributeERC20Tokens: (network: string, amount: string, strategy: string) => Promise<DistributionResult>;
  verifyBalances: (network: string, minBalance: string, tokenType?: 'native' | 'erc20') => Promise<any>;
}

// Convert NetworkConfig to Network type for compatibility
function convertToNetworkType(networkConfig: ReturnType<typeof getNetworkById>): Network | null {
  if (!networkConfig) return null;
  return {
    id: networkConfig.id,
    name: networkConfig.name,
    chainId: networkConfig.chainId,
    blockTime: networkConfig.blockTime,
    rpcUrl: networkConfig.rpcUrl,
  };
}

const allNetworks = getAllNetworks(true); // Include testnets
const initialNetworks = allNetworks.map(convertToNetworkType).filter((n): n is Network => n !== null);

const initialState: SystemSetupState = {
  selectedNetwork: 'sepolia', // Default to testnet for safety
  availableNetworks: initialNetworks,
  walletCount: 10, // Default to 10 wallets as requested
  walletFarmInfo: null,
  registeredContracts: [],
  rpcConnectionStatus: 'disconnected',
  isLoading: false,
  error: null,
  // Fund distribution initial state
  fundingWallet: null,
  distributionHistory: [],
  isDistributing: false,
  distributionError: null,
  lastUpdate: Date.now(),
};

export const systemSetupSlice = (set: (partial: any) => void, get: () => SystemSetupSlice): SystemSetupSlice => ({
  systemSetup: initialState,

  selectNetwork: (networkId) => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        selectedNetwork: networkId,
        lastUpdate: Date.now(),
      }
    }));
    // Auto-test connection when network changes
    get().testRpcConnection();
  },

  setCustomRpcUrl: (url) => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        customRpcUrl: url,
      }
    }));
  },

  setWalletCount: (count) => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        walletCount: count,
      }
    }));
  },

  fetchWalletFarmInfo: async () => {
    const state = get();
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        isLoading: true,
        error: null,
      }
    }));

    try {
      const data = await api.getWalletStats(state.systemSetup.walletCount);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          walletFarmInfo: {
            totalWallets: data.wallets.length,
            mnemonicPreview: '*** *** *** *** ...', // Mnemonic is not exposed for security
            addresses: data.wallets.map((w: { address: string }) => w.address), // Store all addresses
          },
          isLoading: false,
        }
      }));
    } catch (error) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          error: 'Failed to fetch wallet info',
          isLoading: false,
        }
      }));
    }
  },

  fetchContracts: async () => {
    try {
      const contracts = await api.getContracts();
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          registeredContracts: contracts,
        }
      }));
    } catch (error) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          error: 'Failed to fetch contracts',
        }
      }));
    }
  },

  registerContract: async (contractData) => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        isLoading: true,
        error: null,
      }
    }));

    try {
      const newContract = await api.registerContract(contractData);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          registeredContracts: [
            ...state.systemSetup.registeredContracts,
            newContract,
          ],
          isLoading: false,
        }
      }));
    } catch (error) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          error: 'Failed to register contract',
          isLoading: false,
        }
      }));
    }
  },

  testRpcConnection: async () => {
    const { selectedNetwork, customRpcUrl, availableNetworks } = get().systemSetup;

    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        rpcConnectionStatus: 'connecting',
      }
    }));

    try {
      const network = availableNetworks.find(n => n.id === selectedNetwork);
      const rpcUrl = customRpcUrl || network?.rpcUrl;

      if (!rpcUrl) throw new Error('No RPC URL');

      // Simple connection test - try to get latest block
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          set((state: SystemSetupSlice) => ({
            systemSetup: {
              ...state.systemSetup,
              rpcConnectionStatus: 'connected',
            }
          }));
        } else {
          throw new Error('Invalid RPC response');
        }
      } else {
        throw new Error(`RPC returned ${response.status}`);
      }
    } catch (error) {
      console.warn('RPC connection test failed:', error);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          rpcConnectionStatus: 'error',
        }
      }));
    }
  },

  // Fund distribution actions
  configureFundingWallet: async (privateKey: string, network: string) => {
    // Don't set isLoading here - it's shared and affects WalletFarmInfo
    // The FundDistributor component can manage its own loading state
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        error: null,
        distributionError: null,
      }
    }));

    try {
      const result = await api.configureFundingWallet(privateKey, network);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          fundingWallet: {
            configured: true,
            address: result.address,
            balance: result.balance,
            network: result.network,
          },
          error: null,
        }
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to configure funding wallet';
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          error: errorMessage,
        }
      }));
      throw error;
    }
  },

  fetchFundingWallet: async () => {
    try {
      const result = await api.getFundingWallet();
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          fundingWallet: result.configured ? {
            configured: true,
            address: result.address,
            balance: result.balance,
            network: result.network,
          } : { configured: false },
        }
      }));
    } catch (error: any) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          fundingWallet: { configured: false },
        }
      }));
    }
  },

  distributeNativeTokens: async (network: string, amount: string, strategy: string = 'equal') => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        isDistributing: true,
        distributionError: null,
      }
    }));

    try {
      const result = await api.distributeNativeTokens(network, amount, strategy);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          distributionHistory: [result, ...state.systemSetup.distributionHistory],
          isDistributing: false,
        }
      }));
      return result;
    } catch (error: any) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          distributionError: error.message || 'Failed to distribute tokens',
          isDistributing: false,
        }
      }));
      throw error;
    }
  },

  distributeERC20Tokens: async (network: string, amount: string, strategy: string = 'equal') => {
    set((state: SystemSetupSlice) => ({
      systemSetup: {
        ...state.systemSetup,
        isDistributing: true,
        distributionError: null,
      }
    }));

    try {
      const result = await api.distributeERC20Tokens(network, amount, strategy);
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          distributionHistory: [result, ...state.systemSetup.distributionHistory],
          isDistributing: false,
        }
      }));
      return result;
    } catch (error: any) {
      set((state: SystemSetupSlice) => ({
        systemSetup: {
          ...state.systemSetup,
          distributionError: error.message || 'Failed to distribute ERC-20 tokens',
          isDistributing: false,
        }
      }));
      throw error;
    }
  },

  verifyBalances: async (network: string, minBalance: string = '0.0001', tokenType: 'native' | 'erc20' = 'native') => {
    try {
      const result = await api.verifyBalances(network, minBalance, tokenType);
      return result;
    } catch (error: any) {
      throw error;
    }
  },
});
