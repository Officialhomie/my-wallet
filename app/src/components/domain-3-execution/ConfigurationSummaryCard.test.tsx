import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ConfigurationSummaryCard } from './ConfigurationSummaryCard';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('ConfigurationSummaryCard', () => {
  const createMockConfig = (overrides: any = {}) => ({
    selectedContract: {
      name: 'TestContract',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    },
    selectedMethod: {
      name: 'transfer',
      inputs: []
    },
    archetypeMode: 'single' as const,
    singleArchetype: 'whale' as const,
    mixedArchetypes: undefined,
    walletSelection: {
      mode: 'single' as const,
      singleWallet: 0
    },
    iterations: 10,
    timingProfile: 'normal' as const,
    methodParams: {},
    gasConstraints: { enabled: false },
    advanced: {
      useDeterministicSeed: false,
      enableCircuitBreaker: true,
      failureThreshold: 5,
      autoRetry: true,
      maxRetries: 3
    },
    isValid: true,
    validationErrors: [],
    estimatedMetrics: {
      totalTransactions: 10,
      estimatedDuration: 300,
      estimatedGasCost: '0.01'
    },
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Display', () => {
    it('displays contract and method information', () => {
      mockUseStore.mockReturnValue(createMockConfig());

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('Configuration Summary')).toBeInTheDocument();
      expect(screen.getByText(/TestContract/)).toBeInTheDocument();
      expect(screen.getByText(/transfer/)).toBeInTheDocument();
    });

    it('displays wallet selection information for single wallet', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        walletSelection: {
          mode: 'single',
          singleWallet: 5
        }
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText(/Single wallet \(Index 5\)/)).toBeInTheDocument();
    });

    it('displays wallet selection information for multiple wallets', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        walletSelection: {
          mode: 'multiple',
          multipleWallets: [0, 1, 2, 3]
        }
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText(/4 wallets selected/)).toBeInTheDocument();
    });

    it('displays archetype information for single mode', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        archetypeMode: 'single',
        singleArchetype: 'trader'
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText(/Single: trader/)).toBeInTheDocument();
    });

    it('displays archetype information for mixed mode', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        archetypeMode: 'mixed',
        mixedArchetypes: {
          whale: 20,
          trader: 30,
          casual: 50
        }
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText(/Mixed: 100% allocated/)).toBeInTheDocument();
    });

    it('displays execution parameters', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        iterations: 25,
        timingProfile: 'fast'
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText(/25/)).toBeInTheDocument();
      expect(screen.getByText(/fast/)).toBeInTheDocument();
    });
  });

  describe('Validation Status', () => {
    it('shows valid badge when configuration is valid', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        isValid: true
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('✅ Valid')).toBeInTheDocument();
    });

    it('shows invalid badge when configuration is invalid', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        isValid: false
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('❌ Invalid')).toBeInTheDocument();
    });

    it('displays validation errors when configuration is invalid', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        isValid: false,
        validationErrors: [
          'Contract must be selected',
          'Method must be selected'
        ]
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('Validation Issues')).toBeInTheDocument();
      expect(screen.getByText('Contract must be selected')).toBeInTheDocument();
      expect(screen.getByText('Method must be selected')).toBeInTheDocument();
    });

    it('does not display validation errors when configuration is valid', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        isValid: true,
        validationErrors: []
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.queryByText('Validation Issues')).not.toBeInTheDocument();
    });
  });

  describe('Estimated Metrics', () => {
    it('displays estimated metrics when available', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        estimatedMetrics: {
          totalTransactions: 50,
          estimatedDuration: 600,
          estimatedGasCost: '0.05'
        }
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('Estimated Metrics')).toBeInTheDocument();
      expect(screen.getByText(/50/)).toBeInTheDocument();
      expect(screen.getByText(/0.05 ETH/)).toBeInTheDocument();
    });

    it('does not display estimated metrics when totalTransactions is 0', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        estimatedMetrics: {
          totalTransactions: 0,
          estimatedDuration: 0,
          estimatedGasCost: '0'
        }
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.queryByText('Estimated Metrics')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing contract gracefully', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        selectedContract: null
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('No contract selected')).toBeInTheDocument();
    });

    it('handles missing method gracefully', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        selectedMethod: null
      }));

      render(<ConfigurationSummaryCard />);

      expect(screen.getByText('No method selected')).toBeInTheDocument();
    });

    it('handles empty validation errors array', () => {
      mockUseStore.mockReturnValue(createMockConfig({
        isValid: false,
        validationErrors: []
      }));

      render(<ConfigurationSummaryCard />);

      // Should still show invalid badge but no error list
      expect(screen.getByText('❌ Invalid')).toBeInTheDocument();
      expect(screen.queryByText('Validation Issues')).not.toBeInTheDocument();
    });
  });

  describe('Single Responsibility', () => {
    it('only displays configuration data, no execution logic', () => {
      mockUseStore.mockReturnValue(createMockConfig());

      const { container } = render(<ConfigurationSummaryCard />);

      // Should not contain any buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);

      // Should not contain progress elements
      expect(container.querySelector('.progress')).toBeNull();
    });
  });
});
