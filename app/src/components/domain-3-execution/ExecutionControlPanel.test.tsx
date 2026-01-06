import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionControlPanel } from './ExecutionControlPanel';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('ExecutionControlPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Button State Integration', () => {
    it('renders disabled Start button when config is invalid (idle + !isValid)', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: ['Contract must be selected'],
          isValid: false
        };
      });

      render(<ExecutionControlPanel />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).toBeDisabled();
    });

    it('renders enabled Start button when config is valid (idle + isValid)', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: true,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).not.toBeDisabled();
    });

    it('renders Pause and Stop buttons when status is running', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: true,
            canResume: false,
            canStop: true,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'running', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Start Simulation/i })).not.toBeInTheDocument();
    });

    it('renders Resume and Stop buttons when status is paused', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: false,
            canResume: true,
            canStop: true,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'paused', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pause/i })).not.toBeInTheDocument();
    });

    it('renders Run Again button when status is completed', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: true
          };
        }
        if (typeof selector === 'function') {
          return { status: 'completed', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByRole('button', { name: /Run Again/i })).toBeInTheDocument();
    });

    it('renders Run Again button when status is failed', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: true
          };
        }
        if (typeof selector === 'function') {
          return { status: 'failed', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByRole('button', { name: /Run Again/i })).toBeInTheDocument();
    });
  });

  describe('Configuration Error Display', () => {
    it('shows error message when idle and config invalid', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: ['Contract must be selected'],
          isValid: false,
          selectedContract: null,
          selectedMethod: null,
          walletSelection: { mode: 'single' }
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
      expect(screen.getByText('Contract Selection')).toBeInTheDocument();
    });

    it('does not show error message when config is valid', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: true,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });

    it('does not show error message when simulation is running', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: true,
            canResume: false,
            canStop: true,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'running', progress: null, error: null };
        }
        return {
          validationErrors: ['Contract must be selected'],
          isValid: false
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('shows progress information when available', () => {
      const mockProgress = {
        currentIteration: 5,
        totalIterations: 10,
        percentage: 50,
        eta: 30
      };

      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: true,
            canResume: false,
            canStop: true,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'running', progress: mockProgress, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByText('Iteration 5 of 10')).toBeInTheDocument();
      expect(screen.getByText('50% Complete')).toBeInTheDocument();
      expect(screen.getByText('ETA: 30s')).toBeInTheDocument();
    });

    it('does not show progress when not available', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: true,
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.queryByText(/Iteration/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Complete/)).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('shows runtime errors when present', () => {
      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false,
            canPause: true,
            canResume: false,
            canStop: true,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'running', progress: null, error: 'Simulation failed' };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Simulation failed')).toBeInTheDocument();
    });
  });

  describe('Critical Bug Fix Verification', () => {
    it('fixes the original state synchronization bug', () => {
      // Scenario: User lands on page with invalid config
      // Before fix: Button was enabled (canStart = true from initial state)
      // After fix: Button is disabled (canStart = false from selector)

      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: false, // Correctly false due to invalid config
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: ['Contract must be selected'],
          isValid: false
        };
      });

      render(<ExecutionControlPanel />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).toBeDisabled(); // ✅ Bug fixed: button correctly disabled

      // Verify error message is shown
      expect(screen.getByText('Configuration Incomplete')).toBeInTheDocument();
    });

    it('enables button when config becomes valid', () => {
      // Scenario: User completes configuration
      // Result: Button becomes enabled

      mockUseStore.mockImplementation((selector) => {
        if (typeof selector === 'function' && selector.name === 'selectExecutionActions') {
          return {
            canStart: true, // Correctly true due to valid config
            canPause: false,
            canResume: false,
            canStop: false,
            canReplay: false
          };
        }
        if (typeof selector === 'function') {
          return { status: 'idle', progress: null, error: null };
        }
        return {
          validationErrors: [],
          isValid: true
        };
      });

      render(<ExecutionControlPanel />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).not.toBeDisabled(); // ✅ Button correctly enabled

      // Verify no error message
      expect(screen.queryByText('Configuration Incomplete')).not.toBeInTheDocument();
    });
  });
});
