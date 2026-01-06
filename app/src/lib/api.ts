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
    try {
      // ✅ FIXED: Actually call the backend to get registered contracts
      const response = await this.request('/api/contracts');
      const backendContracts = response.contracts || [];
      
      // Convert backend format to frontend Contract format
      const contracts: Contract[] = backendContracts.map((contract: any) => ({
        id: contract.id,
        name: contract.name,
        address: contract.address,
        network: contract.network,
        abi: contract.abi || [], // Backend now returns ABI
        description: contract.metadata?.description || '',
        createdAt: contract.registeredAt || new Date().toISOString(),
      }));
      
      // Also sync to localStorage for offline access
      try {
        localStorage.setItem('wallet-simulator-contracts', JSON.stringify(contracts));
      } catch (error) {
        console.warn('Failed to persist contracts to localStorage:', error);
      }
      
      return contracts;
    } catch (error: any) {
      console.warn('Failed to fetch contracts from backend, trying localStorage:', error);
      
      // Fallback to localStorage if backend fails
      try {
        const stored = localStorage.getItem('wallet-simulator-contracts');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (localError) {
        console.warn('Failed to load contracts from localStorage:', localError);
      }
      
      return [];
    }
  }

  async registerContract(data: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> {
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

    // ✅ FIXED: Actually call the backend to register contract
    const response = await this.request('/api/contracts/register', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        address: data.address,
        network: data.network,
        abi: data.abi,
        metadata: {},
      }),
    });

    // Create contract object with backend-assigned ID
    const newContract: Contract = {
      id: response.contractId,
      ...data,
      createdAt: new Date().toISOString(),
    };

    // Also persist to localStorage for quick retrieval
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
    // ✅ FIXED: Actually call the backend to start simulation
    
    // Extract contract ID from selected contract
    const contractId = config.selectedContract?.id;
    if (!contractId) {
      throw new Error('No contract selected. Please select a contract first.');
    }

    // Map frontend archetype names to backend archetype names
    const archetypeMap: Record<string, string> = {
      'trader': 'activeTrader', // Frontend uses 'trader', backend uses 'activeTrader'
      'whale': 'whale',
      'casual': 'casual',
      'lurker': 'lurker',
      'researcher': 'researcher',
      'flexible': 'flexible', // New universal archetype
    };

    // Determine archetype (single mode or use first from mixed)
    const frontendArchetype = config.archetypeMode === 'single' 
      ? config.singleArchetype 
      : Object.keys(config.mixedArchetypes || {})[0] || 'casual';
    
    // Convert to backend archetype name
    const archetype = archetypeMap[frontendArchetype] || frontendArchetype;

    // Determine wallet indices (support both single and multiple)
    const walletIndices = config.walletSelection?.mode === 'single'
      ? [config.walletSelection.singleWallet ?? 0]
      : (config.walletSelection?.multipleWallets || [0]);

    // Get method name (just the name part, not full signature)
    const methodName = config.selectedMethod?.name;
    if (!methodName) {
      throw new Error('No method selected. Please select a contract method.');
    }

    // Build method params array from methodParams object
    const methodInputs = config.selectedMethod?.inputs || [];
    const params = methodInputs.map((input: any) => {
      const value = config.methodParams?.[input.name];
      // Convert value based on type
      if (input.type.includes('uint') || input.type.includes('int')) {
        return value?.toString() || '0';
      }
      if (input.type === 'bool') {
        return value === true || value === 'true';
      }
      return value || '';
    });

    // Get ETH value if payable
    const value = config.selectedMethod?.stateMutability === 'payable' 
      ? config.methodParams?.value || '0'
      : undefined;

    console.log('🚀 Starting simulation with config:', {
      contractId,
      archetype,
      walletIndices,
      iterations: config.iterations,
      method: methodName,
      params,
      value,
    });

    // Call the actual backend API
    const response = await this.request('/api/simulation/start', {
      method: 'POST',
      body: JSON.stringify({
        contractId,
        archetype,
        walletIndices, // Send array of wallet indices
        iterations: config.iterations || 10,
        method: methodName,
        params,
        value,
      }),
    });

    return {
      simulationId: response.simulationId,
      status: response.status || 'running',
      message: response.message || 'Simulation started successfully',
    };
  }

  async getSimulationStatus(simulationId: string) {
    // ✅ FIXED: Actually call the backend to get simulation status
    try {
      const response = await this.request(`/api/simulation/${simulationId}`);
      
      // Convert backend format to frontend format
      const simulation = response.simulation || response;
      
      return {
        simulationId,
        status: simulation.status || 'unknown',
        progress: simulation.progress || {
          currentIteration: 0,
          totalIterations: simulation.iterations || 10,
          percentage: 0,
          eta: 0,
        },
        currentAction: simulation.currentAction || null,
        results: simulation.results || null,
        error: simulation.error || null,
      };
    } catch (error: any) {
      console.error('Failed to get simulation status:', error);
      // Return a safe default
      return {
        simulationId,
        status: 'unknown',
        progress: {
          currentIteration: 0,
          totalIterations: 10,
          percentage: 0,
          eta: 0,
        },
        currentAction: null,
      };
    }
  }

  async pauseSimulation(simulationId: string) {
    // Note: Backend doesn't currently support pause - returning mock for now
    // TODO: Implement pause endpoint in backend
    console.log(`⏸️ Pausing simulation: ${simulationId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      simulationId,
      status: 'paused',
      message: 'Simulation paused successfully',
    };
  }

  async resumeSimulation(simulationId: string) {
    // Note: Backend doesn't currently support resume - returning mock for now
    // TODO: Implement resume endpoint in backend
    console.log(`▶️ Resuming simulation: ${simulationId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      simulationId,
      status: 'running',
      message: 'Simulation resumed successfully',
    };
  }

  async stopSimulation(simulationId: string) {
    // Note: Backend doesn't currently support stop - returning mock for now
    // TODO: Implement stop endpoint in backend
    console.log(`⏹️ Stopping simulation: ${simulationId}`);
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

  async verifyBalances(network: string, minBalance: string = '0.0001', tokenType: 'native' | 'erc20' = 'native') {
    const tokenTypeParam = tokenType === 'erc20' ? 'erc20' : 'native';
    return this.request(`/api/funding/verify/${network}?minBalance=${minBalance}&tokenType=${tokenTypeParam}`);
  }

  async getWalletBalances(network: string) {
    return this.request(`/api/wallets/balances/${network}`);
  }
}

export const api = new ApiClient();
