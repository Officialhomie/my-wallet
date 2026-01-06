import type { TransactionLifecycle, SimulationExecution, FailureReason } from '@/types/transaction';

export interface TransactionTrackingSlice {
  transactionTracking: {
    simulations: Record<string, SimulationExecution>; // simulationId -> execution
  };

  // Transaction lifecycle management
  addTransaction: (simulationId: string, transaction: Omit<TransactionLifecycle, 'id'>) => string;
  updateTransaction: (transactionId: string, updates: Partial<TransactionLifecycle>) => void;
  failTransaction: (transactionId: string, error: TransactionLifecycle['error']) => void;
  retryTransaction: (transactionId: string) => void;

  // Simulation management
  startSimulationTracking: (simulationId: string, totalTransactions: number) => void;
  updateSimulationProgress: (simulationId: string, progress: Partial<SimulationExecution['progress']>) => void;
  completeSimulationTracking: (simulationId: string, summary: SimulationExecution['summary']) => void;

  // Selectors
  selectTransactionsForSimulation: (simulationId: string) => TransactionLifecycle[];
  selectActiveTransactions: (simulationId: string) => TransactionLifecycle[];
  selectFailedTransactions: (simulationId: string) => TransactionLifecycle[];
  selectTransactionById: (id: string) => TransactionLifecycle | undefined;
}

const initialState: TransactionTrackingSlice['transactionTracking'] = {
  simulations: {},
};

export const transactionTrackingSlice = (
  set: (partial: any) => void,
  get: () => TransactionTrackingSlice
): TransactionTrackingSlice => ({
  transactionTracking: initialState,

  addTransaction: (simulationId, transaction) => {
    const id = `${simulationId}-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    set((state: any) => {
      const simulation = state.transactionTracking.simulations[simulationId];
      if (!simulation) return state; // Simulation not started yet

      return {
        transactionTracking: {
          ...state.transactionTracking,
          simulations: {
            ...state.transactionTracking.simulations,
            [simulationId]: {
              ...simulation,
              transactions: [...simulation.transactions, { ...transaction, id }],
            },
          },
        },
      };
    });

    return id;
  },

  updateTransaction: (transactionId, updates) => {
    set((state: any) => {
      // Find the simulation containing this transaction
      for (const [simulationId, simulation] of Object.entries(state.transactionTracking.simulations)) {
        const txIndex = (simulation as SimulationExecution).transactions.findIndex(
          (tx: TransactionLifecycle) => tx.id === transactionId
        );
        if (txIndex !== -1) {
          const updatedTransactions = [...(simulation as SimulationExecution).transactions];
          updatedTransactions[txIndex] = { ...updatedTransactions[txIndex], ...updates };

          return {
            transactionTracking: {
              ...state.transactionTracking,
              simulations: {
                ...state.transactionTracking.simulations,
                [simulationId]: {
                  ...(simulation as any),
                  transactions: updatedTransactions,
                },
              },
            },
          };
        }
      }
      return state; // Transaction not found
    });
  },

  failTransaction: (transactionId, error) => {
    get().updateTransaction(transactionId, {
      phase: 'failed',
      completedAt: Date.now(),
      error,
    });
  },

  retryTransaction: (transactionId) => {
    const transaction = get().selectTransactionById(transactionId);
    if (!transaction || !transaction.error?.canRetry) return;

    get().updateTransaction(transactionId, {
      phase: 'preparing',
      attempt: transaction.attempt + 1,
      error: undefined,
      completedAt: undefined,
    });
  },

  startSimulationTracking: (simulationId, totalTransactions) => {
    set((state: any) => ({
      transactionTracking: {
        ...state.transactionTracking,
        simulations: {
          ...state.transactionTracking.simulations,
          [simulationId]: {
            simulationId,
            status: 'running',
            progress: {
              phase: 'preparing',
              totalTransactions,
              completedTransactions: 0,
              failedTransactions: 0,
              percentage: 0,
              eta: 0,
            },
            transactions: [],
          },
        },
      },
    }));
  },

  updateSimulationProgress: (simulationId, progress) => {
    set((state: any) => {
      const simulation = state.transactionTracking.simulations[simulationId];
      if (!simulation) return state;

      return {
        transactionTracking: {
          ...state.transactionTracking,
          simulations: {
            ...state.transactionTracking.simulations,
            [simulationId]: {
              ...simulation,
              progress: { ...simulation.progress, ...progress },
            },
          },
        },
      };
    });
  },

  completeSimulationTracking: (simulationId, summary) => {
    set((state: any) => {
      const simulation = state.transactionTracking.simulations[simulationId];
      if (!simulation) return state;

      return {
        transactionTracking: {
          ...state.transactionTracking,
          simulations: {
            ...state.transactionTracking.simulations,
            [simulationId]: {
              ...simulation,
              status: 'completed',
              progress: { ...simulation.progress, phase: 'completing' },
              summary,
            },
          },
        },
      };
    });
  },

  // Selectors
  selectTransactionsForSimulation: (simulationId) => {
    const state = get().transactionTracking;
    return state.simulations[simulationId]?.transactions || [];
  },

  selectActiveTransactions: (simulationId) => {
    const transactions = get().selectTransactionsForSimulation(simulationId);
    return transactions.filter(tx => !['confirmed', 'failed'].includes(tx.phase));
  },

  selectFailedTransactions: (simulationId) => {
    const transactions = get().selectTransactionsForSimulation(simulationId);
    return transactions.filter(tx => tx.phase === 'failed');
  },

  selectTransactionById: (id) => {
    const state = get().transactionTracking;
    for (const simulation of Object.values(state.simulations)) {
      const transaction = simulation.transactions.find(tx => tx.id === id);
      if (transaction) return transaction;
    }
    return undefined;
  },
});
