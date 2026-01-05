// Domain 6: Result Inspection Store Slice

import { ResultInspectionState, SimulationSummary, ArchetypeDistribution, TransactionRecord, TransactionStatus, ArchetypeName } from '@/types/domain-6';

export interface ResultInspectionSlice {
  resultInspection: ResultInspectionState;

  // Actions
  loadSimulationResults: (simulationId: string) => Promise<void>;
  setFilters: (filters: Partial<ResultInspectionState['filters']>) => void;
  setSortBy: (sortBy: ResultInspectionState['sortBy']) => void;
  setSortOrder: (sortOrder: ResultInspectionState['sortOrder']) => void;
  exportResults: (options: { format: 'json' | 'csv'; includeTransactions: boolean; includeSummary: boolean }) => void;
  clearResults: () => void;
}

const initialState: ResultInspectionState = {
  simulationId: null,
  summary: null,
  archetypeDistribution: [],
  transactions: [],
  isLoading: false,
  error: null,
  filters: {
    walletIndex: null,
    archetype: null,
    status: 'all',
  },
  sortBy: 'timestamp',
  sortOrder: 'desc',
};

// Mock data generation for demo purposes
function generateMockResults(simulationId: string): {
  summary: SimulationSummary;
  archetypeDistribution: ArchetypeDistribution[];
  transactions: TransactionRecord[];
} {
  const archetypes: ArchetypeName[] = ['whale', 'trader', 'casual', 'lurker', 'researcher'];
  const totalTransactions = Math.floor(Math.random() * 500) + 100;
  const successfulTransactions = Math.floor(totalTransactions * (0.85 + Math.random() * 0.1)); // 85-95% success rate
  const failedTransactions = totalTransactions - successfulTransactions;

  // Generate archetype distribution
  const archetypeDistribution: ArchetypeDistribution[] = archetypes.map(archetype => {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 wallets per archetype
    const percentage = Math.floor(Math.random() * 30) + 10; // 10-40%
    const archetypeTransactions = Math.floor((percentage / 100) * totalTransactions);
    const successfulArchetypeTransactions = Math.floor(archetypeTransactions * 0.9);

    return {
      archetype,
      count,
      percentage,
      totalTransactions: archetypeTransactions,
      successfulTransactions: successfulArchetypeTransactions,
      averageGasUsed: (Math.random() * 0.01).toFixed(6),
    };
  });

  // Generate transaction records
  const transactions: TransactionRecord[] = [];
  const startTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
  const endTime = Date.now();

  for (let i = 0; i < totalTransactions; i++) {
    const timestamp = startTime + (Math.random() * (endTime - startTime));
    const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
    const walletIndex = Math.floor(Math.random() * 10);
    const isSuccess = Math.random() > 0.1; // 90% success rate

    transactions.push({
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      walletIndex,
      archetype,
      method: 'transfer(address,uint256)',
      status: isSuccess ? 'success' : 'failure',
      timestamp,
      gasUsed: (21000 + Math.floor(Math.random() * 100000)).toString(),
      gasPrice: `${Math.floor(Math.random() * 50) + 10} gwei`,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      ...(isSuccess ? {} : { errorMessage: 'Transaction reverted: insufficient funds' }),
    });
  }

  // Sort transactions by timestamp
  transactions.sort((a, b) => b.timestamp - a.timestamp);

  const summary: SimulationSummary = {
    simulationId,
    status: 'completed',
    startedAt: startTime,
    completedAt: endTime,
    duration: endTime - startTime,
    contract: {
      name: 'MockDeFi',
      network: 'sepolia',
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
    },
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    totalGasUsed: (totalTransactions * 0.001 * Math.random()).toFixed(4),
    averageGasPerTransaction: '0.000021',
    averageTransactionTime: 15000 + Math.floor(Math.random() * 10000), // 15-25 seconds
  };

  return { summary, archetypeDistribution, transactions };
}

export const resultInspectionSlice = (set: (partial: any) => void, get: () => ResultInspectionSlice): ResultInspectionSlice => ({
  resultInspection: initialState,

  loadSimulationResults: async (simulationId) => {
    set((state: ResultInspectionSlice) => ({
      resultInspection: {
        ...state.resultInspection,
        isLoading: true,
        error: null,
      }
    }));

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Generate mock results
      const results = generateMockResults(simulationId);

      set((state: ResultInspectionSlice) => ({
        resultInspection: {
          ...state.resultInspection,
          simulationId,
          summary: results.summary,
          archetypeDistribution: results.archetypeDistribution,
          transactions: results.transactions,
          isLoading: false,
        }
      }));
    } catch (error) {
      set((state: ResultInspectionSlice) => ({
        resultInspection: {
          ...state.resultInspection,
          error: 'Failed to load simulation results',
          isLoading: false,
        }
      }));
    }
  },

  setFilters: (filters) => {
    set((state: ResultInspectionSlice) => ({
      resultInspection: {
        ...state.resultInspection,
        filters: {
          ...state.resultInspection.filters,
          ...filters,
        }
      }
    }));
  },

  setSortBy: (sortBy) => {
    set((state: ResultInspectionSlice) => ({
      resultInspection: {
        ...state.resultInspection,
        sortBy,
      }
    }));
  },

  setSortOrder: (sortOrder) => {
    set((state: ResultInspectionSlice) => ({
      resultInspection: {
        ...state.resultInspection,
        sortOrder,
      }
    }));
  },

  exportResults: ({ format, includeTransactions, includeSummary }) => {
    const state = get().resultInspection;
    if (!state.summary) return;

    const exportData: any = {};

    if (includeSummary) {
      exportData.summary = state.summary;
      exportData.archetypeDistribution = state.archetypeDistribution;
    }

    if (includeTransactions) {
      exportData.transactions = state.transactions;
    }

    exportData.exportedAt = new Date().toISOString();
    exportData.simulationId = state.simulationId;

    if (format === 'json') {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation-${state.simulationId}-results.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Convert to CSV format
      let csv = '';

      if (includeSummary) {
        csv += 'Summary\n';
        csv += `Simulation ID,${state.summary.simulationId}\n`;
        csv += `Status,${state.summary.status}\n`;
        csv += `Started At,${new Date(state.summary.startedAt).toISOString()}\n`;
        csv += `Completed At,${new Date(state.summary.completedAt).toISOString()}\n`;
        csv += `Duration (ms),${state.summary.duration}\n`;
        csv += `Contract,${state.summary.contract.name}\n`;
        csv += `Network,${state.summary.contract.network}\n`;
        csv += `Total Transactions,${state.summary.totalTransactions}\n`;
        csv += `Successful Transactions,${state.summary.successfulTransactions}\n`;
        csv += `Failed Transactions,${state.summary.failedTransactions}\n`;
        csv += `Total Gas Used,${state.summary.totalGasUsed}\n\n`;
      }

      if (includeTransactions) {
        csv += 'Transactions\n';
        csv += 'Timestamp,Wallet Index,Archetype,Method,Status,Tx Hash,Gas Used,Gas Price,Block Number\n';

        state.transactions.forEach(tx => {
          csv += `${new Date(tx.timestamp).toISOString()},`;
          csv += `${tx.walletIndex},`;
          csv += `${tx.archetype},`;
          csv += `"${tx.method}",`;
          csv += `${tx.status},`;
          csv += `${tx.txHash},`;
          csv += `${tx.gasUsed},`;
          csv += `${tx.gasPrice || ''},`;
          csv += `${tx.blockNumber || ''}\n`;
        });
      }

      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `simulation-${state.simulationId}-results.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  },

  clearResults: () => {
    set({ resultInspection: initialState });
  },
});