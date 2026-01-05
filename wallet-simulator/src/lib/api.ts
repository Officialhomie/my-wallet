// API Client

import { ethers } from 'ethers';
import { Contract } from '@/types/domain-1';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private async request(endpoint: string, options?: RequestInit) {
    const url = `${API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Could not connect to server. Make sure the backend is running.');
      }
      throw error;
    }
  }

  // Generate wallets from actual mnemonic (matching backend)
  private getMockWalletStats(count: number = 10) {
    // Use the same mnemonic as the backend
    const mnemonic = 'fold aspect sponsor image lemon opera story excess inject heavy glide route';

    const wallets = [];
    for (let i = 0; i < count; i++) {
      // Derive HD wallet using BIP44 path for Ethereum: m/44'/60'/0'/0/i
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`);
      wallets.push({ address: wallet.address });
    }

    return {
      wallets,
      mnemonic: 'fold aspect sponsor image lemon opera story excess inject heavy glide route',
    };
  }

  // Domain 1: System Setup
  async getWalletStats(count: number = 10) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    return this.getMockWalletStats(count);
  }

  async getContracts(): Promise<Contract[]> {
    // In production, this would fetch from the backend API
    // For now, return empty array - contracts should be registered by users
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check localStorage for persisted contracts (for development/testing)
    try {
      const stored = localStorage.getItem('wallet-simulator-contracts');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load contracts from localStorage:', error);
    }
    
    return [];
  }

  async registerContract(data: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validate contract data
    if (!data.name || !data.address || !data.network || !data.abi) {
      throw new Error('All contract fields are required');
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/i.test(data.address)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Validate ABI is an array
    if (!Array.isArray(data.abi)) {
      throw new Error('ABI must be a valid JSON array');
    }

    // Create new contract
    const newContract: Contract = {
      id: `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString(),
    };

    // Persist to localStorage (for development/testing)
    try {
      const existing = await this.getContracts();
      const updated = [...existing, newContract];
      localStorage.setItem('wallet-simulator-contracts', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to persist contract to localStorage:', error);
    }

    return newContract;
  }

  // Domain 3: Execution Control
  async startSimulation(config: any) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock successful start response
    return {
      simulationId: `sim_${Date.now()}`,
      status: 'running',
      message: 'Simulation started successfully',
    };
  }

  async getSimulationStatus(simulationId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mock status response
    return {
      simulationId,
      status: 'running',
      progress: {
        currentIteration: 5,
        totalIterations: 20,
        percentage: 25,
        eta: 45,
      },
      currentAction: {
        walletIndex: 0,
        archetype: 'whale',
        method: 'transfer(address,uint256)',
      },
    };
  }

  async pauseSimulation(simulationId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      simulationId,
      status: 'paused',
      message: 'Simulation paused successfully',
    };
  }

  async resumeSimulation(simulationId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      simulationId,
      status: 'running',
      message: 'Simulation resumed successfully',
    };
  }

  async stopSimulation(simulationId: string) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      simulationId,
      status: 'stopped',
      message: 'Simulation stopped successfully',
    };
  }

  // Domain 6: Result Inspection
  async getSimulationResults(simulationId: string) {
    return this.request(`/api/simulation/${simulationId}`);
  }

  async listSimulations() {
    return this.request('/api/simulations');
  }

  // Fund Distribution API
  async configureFundingWallet(privateKey: string, network: string) {
    return this.request('/api/funding/wallet', {
      method: 'POST',
      body: JSON.stringify({ privateKey, network }),
    });
  }

  async getFundingWallet() {
    return this.request('/api/funding/wallet');
  }

  async distributeNativeTokens(network: string, amount: string, strategy: string = 'equal') {
    return this.request('/api/funding/distribute/native', {
      method: 'POST',
      body: JSON.stringify({ network, amount, strategy }),
    });
  }

  async distributeERC20Tokens(network: string, amount: string, strategy: string = 'equal') {
    return this.request('/api/funding/distribute/erc20', {
      method: 'POST',
      body: JSON.stringify({ network, amount, strategy }),
    });
  }

  async verifyBalances(network: string, minBalance: string = '0.0001') {
    return this.request(`/api/funding/verify/${network}?minBalance=${minBalance}`);
  }
}

export const api = new ApiClient();
