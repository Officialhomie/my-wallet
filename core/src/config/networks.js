/**
 * Network Configuration
 * 
 * Comprehensive network definitions for all supported chains
 * Supports both mainnet and testnet for each chain
 */

export const NETWORK_CONFIGS = {
  // Ethereum
  ethereum: {
    mainnet: {
      name: 'Ethereum Mainnet',
      id: 'ethereum',
      chainId: 1,
      blockTime: 12000, // ~12 seconds
      rpcUrls: [
        'https://ethereum-rpc.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
      ],
      explorer: 'https://etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    sepolia: {
      name: 'Ethereum Sepolia',
      id: 'sepolia',
      chainId: 11155111,
      blockTime: 12000,
      rpcUrls: [
        'https://ethereum-sepolia-rpc.publicnode.com',
        'https://rpc.sepolia.org',
        'https://sepolia.infura.io/v3/',
      ],
      explorer: 'https://sepolia.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
  },

  // Base
  base: {
    mainnet: {
      name: 'Base Mainnet',
      id: 'base',
      chainId: 8453,
      blockTime: 2000, // ~2 seconds
      rpcUrls: [
        'https://base-rpc.publicnode.com',
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
      ],
      explorer: 'https://basescan.org',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    sepolia: {
      name: 'Base Sepolia',
      id: 'base-sepolia',
      chainId: 84532,
      blockTime: 2000,
      rpcUrls: [
        'https://base-sepolia-rpc.publicnode.com',
        'https://sepolia.base.org',
      ],
      explorer: 'https://sepolia.basescan.org',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
  },

  // Arbitrum
  arbitrum: {
    mainnet: {
      name: 'Arbitrum One',
      id: 'arbitrum',
      chainId: 42161,
      blockTime: 250, // ~0.25 seconds
      rpcUrls: [
        'https://arbitrum-rpc.publicnode.com',
        'https://arb1.arbitrum.io/rpc',
        'https://arbitrum.llamarpc.com',
      ],
      explorer: 'https://arbiscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    sepolia: {
      name: 'Arbitrum Sepolia',
      id: 'arbitrum-sepolia',
      chainId: 421614,
      blockTime: 250,
      rpcUrls: [
        'https://arbitrum-sepolia-rpc.publicnode.com',
        'https://sepolia-rollup.arbitrum.io/rpc',
      ],
      explorer: 'https://sepolia.arbiscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
  },

  // Optimism
  optimism: {
    mainnet: {
      name: 'Optimism Mainnet',
      id: 'optimism',
      chainId: 10,
      blockTime: 2000, // ~2 seconds
      rpcUrls: [
        'https://optimism-rpc.publicnode.com',
        'https://mainnet.optimism.io',
        'https://optimism.llamarpc.com',
      ],
      explorer: 'https://optimistic.etherscan.io',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
    sepolia: {
      name: 'Optimism Sepolia',
      id: 'optimism-sepolia',
      chainId: 11155420,
      blockTime: 2000,
      rpcUrls: [
        'https://optimism-sepolia-rpc.publicnode.com',
        'https://sepolia.optimism.io',
      ],
      explorer: 'https://sepolia-optimistic.etherscan.io',
      nativeCurrency: {
        name: 'Sepolia Ether',
        symbol: 'ETH',
        decimals: 18,
      },
    },
  },

  // Polygon
  polygon: {
    mainnet: {
      name: 'Polygon Mainnet',
      id: 'polygon',
      chainId: 137,
      blockTime: 2000, // ~2 seconds
      rpcUrls: [
        'https://polygon-rpc.publicnode.com',
        'https://polygon.llamarpc.com',
        'https://rpc.ankr.com/polygon',
      ],
      explorer: 'https://polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18,
      },
    },
    mumbai: {
      name: 'Polygon Mumbai',
      id: 'polygon-mumbai',
      chainId: 80001,
      blockTime: 2000,
      rpcUrls: [
        'https://polygon-mumbai-rpc.publicnode.com',
        'https://rpc-mumbai.maticvigil.com',
      ],
      explorer: 'https://mumbai.polygonscan.com',
      nativeCurrency: {
        name: 'MATIC',
        symbol: 'MATIC',
        decimals: 18,
      },
    },
  },

  // Avalanche
  avalanche: {
    mainnet: {
      name: 'Avalanche C-Chain',
      id: 'avalanche',
      chainId: 43114,
      blockTime: 1000, // ~1 second
      rpcUrls: [
        'https://avalanche-rpc.publicnode.com',
        'https://api.avax.network/ext/bc/C/rpc',
        'https://avalanche.llamarpc.com',
      ],
      explorer: 'https://snowtrace.io',
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
      },
    },
    fuji: {
      name: 'Avalanche Fuji',
      id: 'avalanche-fuji',
      chainId: 43113,
      blockTime: 1000,
      rpcUrls: [
        'https://avalanche-fuji-rpc.publicnode.com',
        'https://api.avax-test.network/ext/bc/C/rpc',
      ],
      explorer: 'https://testnet.snowtrace.io',
      nativeCurrency: {
        name: 'Avalanche',
        symbol: 'AVAX',
        decimals: 18,
      },
    },
  },

  // BSC (Binance Smart Chain)
  bsc: {
    mainnet: {
      name: 'BNB Smart Chain',
      id: 'bsc',
      chainId: 56,
      blockTime: 3000, // ~3 seconds
      rpcUrls: [
        'https://bsc-rpc.publicnode.com',
        'https://bsc.llamarpc.com',
        'https://rpc.ankr.com/bsc',
      ],
      explorer: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
      },
    },
    testnet: {
      name: 'BNB Smart Chain Testnet',
      id: 'bsc-testnet',
      chainId: 97,
      blockTime: 3000,
      rpcUrls: [
        'https://bsc-testnet-rpc.publicnode.com',
        'https://data-seed-prebsc-1-s1.binance.org:8545',
      ],
      explorer: 'https://testnet.bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18,
      },
    },
  },
};

/**
 * Get all available networks as a flat list
 * @param {boolean} includeTestnets - Whether to include testnets
 * @returns {Array} Array of network configs
 */
export function getAllNetworks(includeTestnets = true) {
  const networks = [];
  
  Object.values(NETWORK_CONFIGS).forEach(chain => {
    networks.push(chain.mainnet);
    if (includeTestnets && chain.sepolia) {
      networks.push(chain.sepolia);
    }
    if (includeTestnets && chain.mumbai) {
      networks.push(chain.mumbai);
    }
    if (includeTestnets && chain.fuji) {
      networks.push(chain.fuji);
    }
    if (includeTestnets && chain.testnet) {
      networks.push(chain.testnet);
    }
  });
  
  return networks;
}

/**
 * Get network by ID
 * @param {string} networkId - Network ID (e.g., 'ethereum', 'base-sepolia')
 * @returns {Object|null} Network config or null
 */
export function getNetworkById(networkId) {
  for (const chain of Object.values(NETWORK_CONFIGS)) {
    if (chain.mainnet?.id === networkId) return chain.mainnet;
    if (chain.sepolia?.id === networkId) return chain.sepolia;
    if (chain.mumbai?.id === networkId) return chain.mumbai;
    if (chain.fuji?.id === networkId) return chain.fuji;
    if (chain.testnet?.id === networkId) return chain.testnet;
  }
  return null;
}

/**
 * Get primary RPC URL for a network (first in the list)
 * @param {string} networkId - Network ID
 * @returns {string|null} RPC URL or null
 */
export function getNetworkRpcUrl(networkId) {
  const network = getNetworkById(networkId);
  return network?.rpcUrls?.[0] || null;
}

/**
 * Get all chain names (e.g., ['ethereum', 'base', 'arbitrum'])
 * @returns {Array<string>} Array of chain names
 */
export function getChainNames() {
  return Object.keys(NETWORK_CONFIGS);
}

/**
 * Get networks for a specific chain (mainnet + testnet)
 * @param {string} chainName - Chain name (e.g., 'ethereum', 'base')
 * @returns {Object} Object with mainnet and testnet configs
 */
export function getChainNetworks(chainName) {
  return NETWORK_CONFIGS[chainName] || null;
}

