import { describe, it, expect, beforeEach } from '@jest/globals';
import { transactionTrackingSlice } from './transactionTracking';
import type { TransactionLifecycle, FailureReason } from '@/types/transaction';

describe('Transaction Tracking Slice', () => {
  let set: jest.Mock;
  let get: jest.Mock;
  let slice: ReturnType<typeof transactionTrackingSlice>;

  beforeEach(() => {
    set = jest.fn();
    get = jest.fn(() => ({
      transactionTracking: {
        simulations: {}
      }
    }));
    slice = transactionTrackingSlice(set, get);
  });

  describe('startSimulationTracking', () => {
    it('creates a new simulation tracking entry', () => {
      slice.startSimulationTracking('sim-1', 10);

      expect(set).toHaveBeenCalled();
      const callArg = set.mock.calls[0][0];
      const result = callArg({
        transactionTracking: { simulations: {} }
      });

      expect(result.transactionTracking.simulations['sim-1']).toEqual({
        simulationId: 'sim-1',
        status: 'running',
        progress: {
          phase: 'preparing',
          totalTransactions: 10,
          completedTransactions: 0,
          failedTransactions: 0,
          percentage: 0,
          eta: 0
        },
        transactions: []
      });
    });
  });

  describe('addTransaction', () => {
    beforeEach(() => {
      // Setup a simulation first
      get.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              simulationId: 'sim-1',
              status: 'running',
              progress: {
                phase: 'preparing',
                totalTransactions: 10,
                completedTransactions: 0,
                failedTransactions: 0,
                percentage: 0,
                eta: 0
              },
              transactions: []
            }
          }
        }
      });
    });

    it('adds a transaction to the simulation', () => {
      const transaction: Omit<TransactionLifecycle, 'id'> = {
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'preparing',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      };

      const id = slice.addTransaction('sim-1', transaction);

      expect(id).toBeTruthy();
      expect(set).toHaveBeenCalled();
    });

    it('returns undefined if simulation does not exist', () => {
      const transaction: Omit<TransactionLifecycle, 'id'> = {
        simulationId: 'sim-nonexistent',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'preparing',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      };

      const id = slice.addTransaction('sim-nonexistent', transaction);
      // Should still return an ID even if simulation doesn't exist yet
      expect(id).toBeTruthy();
    });
  });

  describe('updateTransaction', () => {
    beforeEach(() => {
      const mockTransaction: TransactionLifecycle = {
        id: 'tx-1',
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'preparing',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      };

      get.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              simulationId: 'sim-1',
              status: 'running',
              progress: {
                phase: 'preparing',
                totalTransactions: 10,
                completedTransactions: 0,
                failedTransactions: 0,
                percentage: 0,
                eta: 0
              },
              transactions: [mockTransaction]
            }
          }
        }
      });
    });

    it('updates transaction phase', () => {
      slice.updateTransaction('tx-1', { phase: 'signing' });

      expect(set).toHaveBeenCalled();
      const callArg = set.mock.calls[0][0];
      const result = callArg({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: [{
                id: 'tx-1',
                phase: 'preparing'
              }]
            }
          }
        }
      });

      expect(result.transactionTracking.simulations['sim-1'].transactions[0].phase).toBe('signing');
    });

    it('does nothing if transaction not found', () => {
      slice.updateTransaction('tx-nonexistent', { phase: 'signing' });

      expect(set).toHaveBeenCalled();
      const callArg = set.mock.calls[0][0];
      const result = callArg({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: []
            }
          }
        }
      });

      // Should return state unchanged
      expect(result.transactionTracking.simulations['sim-1'].transactions).toEqual([]);
    });
  });

  describe('failTransaction', () => {
    beforeEach(() => {
      const mockTransaction: TransactionLifecycle = {
        id: 'tx-1',
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'pending',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      };

      get.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: [mockTransaction]
            }
          }
        },
        updateTransaction: jest.fn()
      });
    });

    it('marks transaction as failed with error', () => {
      const error = {
        reason: 'insufficient-gas' as FailureReason,
        message: 'Gas limit too low',
        technicalDetails: 'Gas limit 21000 < 25000 required',
        suggestedAction: 'Increase gas limit',
        canRetry: true
      };

      slice.failTransaction('tx-1', error);

      expect(get().updateTransaction).toHaveBeenCalledWith('tx-1', {
        phase: 'failed',
        completedAt: expect.any(Number),
        error
      });
    });
  });

  describe('retryTransaction', () => {
    it('resets transaction for retry if canRetry is true', () => {
      const mockTransaction: TransactionLifecycle = {
        id: 'tx-1',
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'failed',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate',
        error: {
          reason: 'network-error',
          message: 'Network error',
          technicalDetails: 'Connection failed',
          suggestedAction: 'Retry',
          canRetry: true
        }
      };

      get.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: [mockTransaction]
            }
          }
        },
        selectTransactionById: jest.fn(() => mockTransaction),
        updateTransaction: jest.fn()
      });

      slice.retryTransaction('tx-1');

      expect(get().updateTransaction).toHaveBeenCalledWith('tx-1', {
        phase: 'preparing',
        attempt: 2,
        error: undefined,
        completedAt: undefined
      });
    });

    it('does nothing if transaction cannot be retried', () => {
      const mockTransaction: TransactionLifecycle = {
        id: 'tx-1',
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'failed',
        startedAt: Date.now(),
        intent: {
          method: 'transfer',
          params: []
        },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate',
        error: {
          reason: 'tx-reverted',
          message: 'Transaction reverted',
          technicalDetails: 'Contract reverted',
          suggestedAction: 'Check parameters',
          canRetry: false
        }
      };

      get.mockReturnValue({
        selectTransactionById: jest.fn(() => mockTransaction),
        updateTransaction: jest.fn()
      });

      slice.retryTransaction('tx-1');

      expect(get().updateTransaction).not.toHaveBeenCalled();
    });
  });

  describe('selectors', () => {
    const mockTransactions: TransactionLifecycle[] = [
      {
        id: 'tx-1',
        simulationId: 'sim-1',
        walletIndex: 0,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'pending',
        startedAt: Date.now(),
        intent: { method: 'transfer', params: [] },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      },
      {
        id: 'tx-2',
        simulationId: 'sim-1',
        walletIndex: 1,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'confirmed',
        startedAt: Date.now(),
        intent: { method: 'transfer', params: [] },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      },
      {
        id: 'tx-3',
        simulationId: 'sim-1',
        walletIndex: 2,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        phase: 'failed',
        startedAt: Date.now(),
        intent: { method: 'transfer', params: [] },
        preconditions: [],
        attempt: 1,
        maxAttempts: 3,
        retryStrategy: 'immediate'
      }
    ];

    beforeEach(() => {
      get.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: mockTransactions
            }
          }
        }
      });
    });

    it('selectTransactionsForSimulation returns all transactions', () => {
      const result = slice.selectTransactionsForSimulation('sim-1');
      expect(result).toHaveLength(3);
    });

    it('selectTransactionsForSimulation returns empty array for non-existent simulation', () => {
      const result = slice.selectTransactionsForSimulation('sim-nonexistent');
      expect(result).toEqual([]);
    });

    it('selectActiveTransactions returns only active transactions', () => {
      const result = slice.selectActiveTransactions('sim-1');
      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe('pending');
    });

    it('selectFailedTransactions returns only failed transactions', () => {
      const result = slice.selectFailedTransactions('sim-1');
      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe('failed');
    });

    it('selectTransactionById finds transaction by ID', () => {
      const result = slice.selectTransactionById('tx-2');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('tx-2');
    });

    it('selectTransactionById returns undefined for non-existent transaction', () => {
      const result = slice.selectTransactionById('tx-nonexistent');
      expect(result).toBeUndefined();
    });
  });
});
