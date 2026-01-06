import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ExecutionEligibilityGate } from './ExecutionEligibilityGate';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('ExecutionEligibilityGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    it('renders nothing when status is not idle', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        return 'running'; // status
      });

      const { container } = render(<ExecutionEligibilityGate />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when status is idle but configuration is valid', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return true;
        }
        if (typeof selector === 'function') {
          return 'idle'; // status
        }
        return { isValid: true, validationErrors: [] };
      });

      const { container } = render(<ExecutionEligibilityGate />);
      expect(container.firstChild).toBeNull();
    });

    it('renders error message when idle and config invalid', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('⚠️ Cannot Start Simulation')).toBeInTheDocument();
      expect(screen.getByText('Please complete the following steps to enable simulation:')).toBeInTheDocument();
    });
  });

  describe('Error Message Parsing', () => {
    it('displays specific missing steps for contract selection', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Contract Selection')).toBeInTheDocument();
      expect(screen.getByText('No contract has been selected')).toBeInTheDocument();
      expect(screen.getByText('Go to Configure → Select a contract')).toBeInTheDocument();
    });

    it('displays specific missing steps for method selection', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Method must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Method Selection')).toBeInTheDocument();
      expect(screen.getByText('No method has been selected')).toBeInTheDocument();
    });

    it('displays specific missing steps for method parameters', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Parameter "to" is required', 'Parameter "amount" is required']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Method Parameters')).toBeInTheDocument();
      expect(screen.getByText('2 parameters need to be filled')).toBeInTheDocument();
    });

    it('displays specific missing steps for wallet selection', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['At least one wallet must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Wallet Selection')).toBeInTheDocument();
      expect(screen.getByText('No wallets have been selected for the simulation')).toBeInTheDocument();
    });

    it('displays multiple missing steps when applicable', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: [
            'Contract must be selected',
            'Method must be selected',
            'At least one wallet must be selected'
          ]
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Contract Selection')).toBeInTheDocument();
      expect(screen.getByText('Method Selection')).toBeInTheDocument();
      expect(screen.getByText('Wallet Selection')).toBeInTheDocument();

      // Check step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('handles archetype configuration errors', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Mixed archetype percentages must sum to 100%']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Archetype Configuration')).toBeInTheDocument();
      expect(screen.getByText('Mixed archetype percentages must sum to 100%')).toBeInTheDocument();
    });

    it('handles gas constraint errors', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Max gas per transaction is required when gas constraints are enabled']
        };
      });

      render(<ExecutionEligibilityGate />);

      expect(screen.getByText('Gas Constraints')).toBeInTheDocument();
      expect(screen.getByText('Gas constraint values are missing')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('includes navigation link to configuration page', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      const link = screen.getByRole('link', { name: /Go to Configuration/i });
      expect(link).toHaveAttribute('href', '/configure');
    });
  });

  describe('Accessibility', () => {
    it('provides semantic HTML structure', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      // Check for semantic elements
      expect(screen.getByRole('heading', { name: /Cannot Start Simulation/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Go to Configuration/i })).toBeInTheDocument();
    });

    it('includes descriptive text for each step', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      // Check that each step has both description and action
      expect(screen.getByText('No contract has been selected')).toBeInTheDocument();
      expect(screen.getByText('Go to Configure → Select a contract')).toBeInTheDocument();
    });
  });

  describe('Integration with Selectors', () => {
    it('uses selectCanStart selector for consistency', () => {
      // Verify that the component uses the selector
      // This test ensures the component integrates properly with Phase 1
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false; // Selector correctly returns false
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Contract must be selected']
        };
      });

      render(<ExecutionEligibilityGate />);

      // Component should render because selector returned false
      // indicating invalid config, which matches our mock
      expect(screen.getByText('⚠️ Cannot Start Simulation')).toBeInTheDocument();
    });

    it('respects selector logic over direct state access', () => {
      // This test ensures the component doesn't bypass the selector
      // by directly checking state properties
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false; // Selector says no
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: true, // But direct state says valid - selector should win
          validationErrors: []
        };
      });

      const { container } = render(<ExecutionEligibilityGate />);

      // Component should not render because selector returned false
      // even though direct state access might suggest otherwise
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty validation errors gracefully', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: [] // Empty but invalid - shouldn't happen but test anyway
        };
      });

      render(<ExecutionEligibilityGate />);

      // Should still render but with empty step list
      expect(screen.getByText('⚠️ Cannot Start Simulation')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument(); // No steps
    });

    it('handles unknown validation error types', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectCanStart') {
          return false;
        }
        if (typeof selector === 'function') {
          return 'idle';
        }
        return {
          isValid: false,
          validationErrors: ['Some unknown validation error']
        };
      });

      render(<ExecutionEligibilityGate />);

      // Should render but no specific steps matched
      expect(screen.getByText('⚠️ Cannot Start Simulation')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
