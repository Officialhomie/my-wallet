/**
 * Network Configuration for Frontend
 * 
 * Comprehensive network definitions supporting both mainnet and testnet
 */

export interface NetworkConfig {
  name: string;
  id: string;
  chainId: number;
  blockTime: number;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  type: 'mainnet' | 'testnet';
  chain: string; // Base chain name (e.g., 'ethereum', 'base')
}

export interface ChainGroup {
  chain: string;
  mainnet: NetworkConfig;
  testnet: NetworkConfig | null;
}

// Network configurations
const NETWORK_CONFIGS: Record<string, { mainnet: NetworkConfig; testnet?: NetworkConfig }> = {
  ethereum: {
    mainnet: {
      name: 'Ethereum Mainnet',
      id: 'ethereum',
      chainId: 1,
      blockTime: 12,
      rpcUrl: 'https://ethereum-rpc.publicnode.com',
      explorer: 'https://etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      type: 'mainnet',
      chain: 'ethereum',
    },
    testnet: {
      name: 'Ethereum Sepolia',
      id: 'sepolia',
      chainId: 11155111,
      blockTime: 12,
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      type: 'testnet',
      chain: 'ethereum',
    },
  },
  base: {
    mainnet: {
      name: 'Base Mainnet',
      id: 'base',
      chainId: 8453,
      blockTime: 2,
      rpcUrl: 'https://base-rpc.publicnode.com',
      explorer: 'https://basescan.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      type: 'mainnet',
      chain: 'base',
    },
    testnet: {
      name: 'Base Sepolia',
      id: 'base-sepolia',
      chainId: 84532,
      blockTime: 2,
      rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
      explorer: 'https://sepolia.basescan.org',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      type: 'testnet',
      chain: 'base',
    },
  },
  arbitrum: {
    mainnet: {
      name: 'Arbitrum One',
      id: 'arbitrum',
      chainId: 42161,
      blockTime: 0.25,
      rpcUrl: 'https://arbitrum-rpc.publicnode.com',
      explorer: 'https://arbiscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      type: 'mainnet',
      chain: 'arbitrum',
    },
    testnet: {
      name: 'Arbitrum Sepolia',
      id: 'arbitrum-sepolia',
      chainId: 421614,
      blockTime: 0.25,
      rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
      explorer: 'https://sepolia.arbiscan.io',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      type: 'testnet',
      chain: 'arbitrum',
    },
  },
  optimism: {
    mainnet: {
      name: 'Optimism Mainnet',
      id: 'optimism',
      chainId: 10,
      blockTime: 2,
      rpcUrl: 'https://optimism-rpc.publicnode.com',
      explorer: 'https://optimistic.etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      type: 'mainnet',
      chain: 'optimism',
    },
    testnet: {
      name: 'Optimism Sepolia',
      id: 'optimism-sepolia',
      chainId: 11155420,
      blockTime: 2,
      rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
      explorer: 'https://sepolia-optimistic.etherscan.io',
      nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
      type: 'testnet',
      chain: 'optimism',
    },
  },
  polygon: {
    mainnet: {
      name: 'Polygon Mainnet',
      id: 'polygon',
      chainId: 137,
      blockTime: 2,
      rpcUrl: 'https://polygon-rpc.publicnode.com',
      explorer: 'https://polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      type: 'mainnet',
      chain: 'polygon',
    },
    testnet: {
      name: 'Polygon Mumbai',
      id: 'polygon-mumbai',
      chainId: 80001,
      blockTime: 2,
      rpcUrl: 'https://polygon-mumbai-rpc.publicnode.com',
      explorer: 'https://mumbai.polygonscan.com',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      type: 'testnet',
      chain: 'polygon',
    },
  },
  avalanche: {
    mainnet: {
      name: 'Avalanche C-Chain',
      id: 'avalanche',
      chainId: 43114,
      blockTime: 1,
      rpcUrl: 'https://avalanche-rpc.publicnode.com',
      explorer: 'https://snowtrace.io',
      nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      type: 'mainnet',
      chain: 'avalanche',
    },
    testnet: {
      name: 'Avalanche Fuji',
      id: 'avalanche-fuji',
      chainId: 43113,
      blockTime: 1,
      rpcUrl: 'https://avalanche-fuji-rpc.publicnode.com',
      explorer: 'https://testnet.snowtrace.io',
      nativeCurrency: { name: 'Avalanche', symbol: 'AVAX', decimals: 18 },
      type: 'testnet',
      chain: 'avalanche',
    },
  },
  bsc: {
    mainnet: {
      name: 'BNB Smart Chain',
      id: 'bsc',
      chainId: 56,
      blockTime: 3,
      rpcUrl: 'https://bsc-rpc.publicnode.com',
      explorer: 'https://bscscan.com',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      type: 'mainnet',
      chain: 'bsc',
    },
    testnet: {
      name: 'BNB Smart Chain Testnet',
      id: 'bsc-testnet',
      chainId: 97,
      blockTime: 3,
      rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
      explorer: 'https://testnet.bscscan.com',
      nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
      type: 'testnet',
      chain: 'bsc',
    },
  },
};

/**
 * Get all networks as a flat array
 */
export function getAllNetworks(includeTestnets = true): NetworkConfig[] {
  const networks: NetworkConfig[] = [];
  
  Object.values(NETWORK_CONFIGS).forEach(chain => {
    networks.push(chain.mainnet);
    if (includeTestnets && chain.testnet) {
      networks.push(chain.testnet);
    }
  });
  
  return networks;
}

/**
 * Get networks grouped by chain
 */
export function getNetworksByChain(): ChainGroup[] {
  return Object.entries(NETWORK_CONFIGS).map(([chain, configs]) => ({
    chain,
    mainnet: configs.mainnet,
    testnet: configs.testnet || null,
  }));
}

/**
 * Get network by ID
 */
export function getNetworkById(networkId: string): NetworkConfig | null {
  for (const chain of Object.values(NETWORK_CONFIGS)) {
    if (chain.mainnet.id === networkId) return chain.mainnet;
    if (chain.testnet?.id === networkId) return chain.testnet;
  }
  return null;
}

/**
 * Get chain name from network ID
 */
export function getChainFromNetworkId(networkId: string): string | null {
  for (const [chain, configs] of Object.entries(NETWORK_CONFIGS)) {
    if (configs.mainnet.id === networkId || configs.testnet?.id === networkId) {
      return chain;
    }
  }
  return null;
}

