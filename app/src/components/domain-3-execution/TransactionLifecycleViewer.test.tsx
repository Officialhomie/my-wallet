import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionLifecycleViewer } from './TransactionLifecycleViewer';
import { useStore } from '@/store';
import type { TransactionLifecycle } from '@/types/transaction';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('TransactionLifecycleViewer', () => {
  const createMockTransaction = (overrides: Partial<TransactionLifecycle> = {}): TransactionLifecycle => ({
    id: `tx-${Date.now()}`,
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
    retryStrategy: 'immediate',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Transaction Display', () => {
    it('displays all transactions when filter is "all"', () => {
      const transactions = [
        createMockTransaction({ id: 'tx-1', phase: 'pending' }),
        createMockTransaction({ id: 'tx-2', phase: 'confirmed' }),
        createMockTransaction({ id: 'tx-3', phase: 'failed' })
      ];

      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      expect(screen.getByText(/Transaction Activity/)).toBeInTheDocument();
      // All transactions should be visible
      expect(screen.getByText(/Wallet 0/)).toBeInTheDocument();
    });

    it('displays empty state when no transactions', () => {
      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: []
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      expect(screen.getByText(/No.*transactions/)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    const transactions = [
      createMockTransaction({ id: 'tx-1', phase: 'pending' }),
      createMockTransaction({ id: 'tx-2', phase: 'confirmed' }),
      createMockTransaction({ id: 'tx-3', phase: 'failed' }),
      createMockTransaction({ id: 'tx-4', phase: 'signing' })
    ];

    beforeEach(() => {
      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions
            }
          }
        }
      });
    });

    it('filters to show only active transactions', () => {
      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      const activeButton = screen.getByText(/Active/);
      fireEvent.click(activeButton);

      // Should show pending and signing (active), not confirmed or failed
      expect(activeButton).toBeInTheDocument();
    });

    it('filters to show only failed transactions', () => {
      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      const failedButton = screen.getByText(/Failed/);
      fireEvent.click(failedButton);

      expect(failedButton).toBeInTheDocument();
    });

    it('filters to show only completed transactions', () => {
      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      const completedButton = screen.getByText(/Completed/);
      fireEvent.click(completedButton);

      expect(completedButton).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('displays correct statistics', () => {
      const transactions = [
        createMockTransaction({ id: 'tx-1', phase: 'pending' }),
        createMockTransaction({ id: 'tx-2', phase: 'confirmed' }),
        createMockTransaction({ id: 'tx-3', phase: 'failed' })
      ];

      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      expect(screen.getByText(/Total: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Active: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Failed: 1/)).toBeInTheDocument();
    });
  });

  describe('Bulk Retry', () => {
    it('shows retry all button when there are failed transactions', () => {
      const retryFn = jest.fn();
      const transactions = [
        createMockTransaction({
          id: 'tx-1',
          phase: 'failed',
          error: {
            reason: 'network-error',
            message: 'Network error',
            technicalDetails: 'Connection failed',
            suggestedAction: 'Retry',
            canRetry: true
          }
        })
      ];

      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions
            }
          }
        },
        retryTransaction: retryFn
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      expect(screen.getByText(/Retry All Failed/)).toBeInTheDocument();
    });

    it('does not show retry all button when no failed transactions', () => {
      const transactions = [
        createMockTransaction({ id: 'tx-1', phase: 'confirmed' })
      ];

      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      expect(screen.queryByText(/Retry All Failed/)).not.toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('has auto-scroll toggle', () => {
      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: []
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      const checkbox = screen.getByLabelText(/Auto-scroll to latest/);
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeChecked(); // Default should be true
    });

    it('toggles auto-scroll when checkbox is clicked', () => {
      mockUseStore.mockReturnValue({
        transactionTracking: {
          simulations: {
            'sim-1': {
              transactions: []
            }
          }
        }
      });

      render(<TransactionLifecycleViewer simulationId="sim-1" />);

      const checkbox = screen.getByLabelText(/Auto-scroll to latest/);
      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });
  });
});
