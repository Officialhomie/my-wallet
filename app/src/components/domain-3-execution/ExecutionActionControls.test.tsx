import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionActionControls } from './ExecutionActionControls';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('ExecutionActionControls', () => {
  const mockStartSimulation = jest.fn();
  const mockPauseSimulation = jest.fn();
  const mockResumeSimulation = jest.fn();
  const mockStopSimulation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Idle State', () => {
    it('shows Start button when status is idle', () => {
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
          return { status: 'idle' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('disables Start button when canStart is false', () => {
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
          return { status: 'idle' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      expect(startButton).toBeDisabled();
    });

    it('calls startSimulation when Start button is clicked', () => {
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
          return { status: 'idle' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      const startButton = screen.getByRole('button', { name: /Start Simulation/i });
      fireEvent.click(startButton);

      expect(mockStartSimulation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Running State', () => {
    it('shows Pause and Stop buttons when status is running', () => {
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
          return { status: 'running' };
        }
        if (selector.toString().includes('pauseSimulation')) return mockPauseSimulation;
        if (selector.toString().includes('stopSimulation')) return mockStopSimulation;
        return undefined;
      });

      render(<ExecutionActionControls />);

      expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Start Simulation/i })).not.toBeInTheDocument();
    });

    it('calls pauseSimulation when Pause button is clicked', () => {
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
          return { status: 'running' };
        }
        if (selector.toString().includes('pauseSimulation')) return mockPauseSimulation;
        if (selector.toString().includes('stopSimulation')) return mockStopSimulation;
        return undefined;
      });

      render(<ExecutionActionControls />);

      const pauseButton = screen.getByRole('button', { name: /Pause/i });
      fireEvent.click(pauseButton);

      expect(mockPauseSimulation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Paused State', () => {
    it('shows Resume and Stop buttons when status is paused', () => {
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
          return { status: 'paused' };
        }
        if (selector.toString().includes('resumeSimulation')) return mockResumeSimulation;
        if (selector.toString().includes('stopSimulation')) return mockStopSimulation;
        return undefined;
      });

      render(<ExecutionActionControls />);

      expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Pause/i })).not.toBeInTheDocument();
    });

    it('calls resumeSimulation when Resume button is clicked', () => {
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
          return { status: 'paused' };
        }
        if (selector.toString().includes('resumeSimulation')) return mockResumeSimulation;
        if (selector.toString().includes('stopSimulation')) return mockStopSimulation;
        return undefined;
      });

      render(<ExecutionActionControls />);

      const resumeButton = screen.getByRole('button', { name: /Resume/i });
      fireEvent.click(resumeButton);

      expect(mockResumeSimulation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Completed/Failed/Stopped State', () => {
    it('shows Run Again button when status is completed', () => {
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
          return { status: 'completed' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      expect(screen.getByRole('button', { name: /Run Again/i })).toBeInTheDocument();
    });

    it('shows Run Again button when status is failed', () => {
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
          return { status: 'failed' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      expect(screen.getByRole('button', { name: /Run Again/i })).toBeInTheDocument();
    });

    it('disables Run Again button when canReplay is false', () => {
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
          return { status: 'completed' };
        }
        return mockStartSimulation;
      });

      render(<ExecutionActionControls />);

      const replayButton = screen.getByRole('button', { name: /Run Again/i });
      expect(replayButton).toBeDisabled();
    });
  });

  describe('Single Responsibility', () => {
    it('only handles button display and clicks, no other logic', () => {
      // This component should be focused - no error display, no progress tracking
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
          return { status: 'idle' };
        }
        return mockStartSimulation;
      });

      const { container } = render(<ExecutionActionControls />);

      // Should only contain button elements, no error messages, no progress
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Should not contain error or progress elements
      expect(container.querySelector('.error')).toBeNull();
      expect(container.querySelector('.progress')).toBeNull();
    });
  });
});
