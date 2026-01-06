import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { TransactionStatusCard } from './TransactionStatusCard';
import { useStore } from '@/store';
import type { TransactionLifecycle } from '@/types/transaction';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('TransactionStatusCard', () => {
  const createMockTransaction = (overrides: Partial<TransactionLifecycle> = {}): TransactionLifecycle => ({
    id: 'tx-1',
    simulationId: 'sim-1',
    walletIndex: 0,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    phase: 'preparing',
    startedAt: Date.now(),
    intent: {
      method: 'transfer(address,uint256)',
      params: ['0x...', '1000000']
    },
    preconditions: [],
    attempt: 1,
    maxAttempts: 3,
    retryStrategy: 'immediate',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseStore.mockReturnValue(jest.fn());
  });

  describe('Phase Display', () => {
    it('displays correct icon and message for preparing phase', () => {
      const tx = createMockTransaction({ phase: 'preparing' });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText(/Preparing transaction for wallet/)).toBeInTheDocument();
    });

    it('displays correct icon and message for signing phase', () => {
      const tx = createMockTransaction({ phase: 'signing', attempt: 2, maxAttempts: 3 });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText('✍️')).toBeInTheDocument();
      expect(screen.getByText(/Signing transaction 2\/3/)).toBeInTheDocument();
    });

    it('displays correct icon and message for confirmed phase', () => {
      const tx = createMockTransaction({
        phase: 'confirmed',
        blockNumber: 12345678,
        gasUsed: '21000',
        actualCost: '0.000315'
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText(/Confirmed in block 12345678/)).toBeInTheDocument();
      expect(screen.getByText(/21000 gas/)).toBeInTheDocument();
    });

    it('displays correct icon and message for failed phase', () => {
      const tx = createMockTransaction({
        phase: 'failed',
        error: {
          reason: 'insufficient-gas',
          message: 'Gas limit too low',
          technicalDetails: 'Gas limit 21000 < 25000 required',
          suggestedAction: 'Increase gas limit',
          canRetry: true
        }
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText(/Transaction failed/)).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('shows error details when transaction fails', () => {
      const tx = createMockTransaction({
        phase: 'failed',
        error: {
          reason: 'insufficient-balance',
          message: 'Insufficient balance',
          technicalDetails: 'Wallet balance below transaction cost',
          suggestedAction: 'Fund the wallet',
          canRetry: false
        }
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText(/Insufficient balance/)).toBeInTheDocument();
      expect(screen.getByText(/Fund the wallet/)).toBeInTheDocument();
    });

    it('shows technical details when available', () => {
      const tx = createMockTransaction({
        phase: 'failed',
        error: {
          reason: 'tx-reverted',
          message: 'Transaction reverted',
          technicalDetails: 'EVM execution reverted',
          suggestedAction: 'Check parameters',
          canRetry: true
        }
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText('Technical Details')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('shows retry button when transaction can be retried', () => {
      const retryFn = jest.fn();
      mockUseStore.mockReturnValue(retryFn);

      const tx = createMockTransaction({
        phase: 'failed',
        attempt: 1,
        maxAttempts: 3,
        error: {
          reason: 'network-error',
          message: 'Network error',
          technicalDetails: 'Connection failed',
          suggestedAction: 'Retry',
          canRetry: true
        }
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText(/Retry Transaction/)).toBeInTheDocument();
    });

    it('does not show retry button when max attempts reached', () => {
      const tx = createMockTransaction({
        phase: 'failed',
        attempt: 3,
        maxAttempts: 3,
        error: {
          reason: 'network-error',
          message: 'Network error',
          technicalDetails: 'Connection failed',
          suggestedAction: 'Retry',
          canRetry: true
        }
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.queryByText(/Retry Transaction/)).not.toBeInTheDocument();
    });
  });

  describe('Transaction Hash Display', () => {
    it('shows link to block explorer when txHash is available', () => {
      const tx = createMockTransaction({
        phase: 'confirmed',
        txHash: '0xabc123...'
      });
      render(<TransactionStatusCard transaction={tx} />);

      const link = screen.getByText(/View on Explorer/);
      expect(link).toHaveAttribute('href', expect.stringContaining('etherscan.io'));
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('Wallet Information', () => {
    it('displays wallet index and address', () => {
      const tx = createMockTransaction({
        walletIndex: 5,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      });
      render(<TransactionStatusCard transaction={tx} />);

      expect(screen.getByText(/Wallet 5/)).toBeInTheDocument();
      expect(screen.getByText(/0x742d/)).toBeInTheDocument();
    });
  });
});
