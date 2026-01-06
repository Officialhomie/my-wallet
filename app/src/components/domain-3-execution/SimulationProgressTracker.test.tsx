import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SimulationProgressTracker } from './SimulationProgressTracker';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('SimulationProgressTracker', () => {
  const mockProgress = {
    currentIteration: 5,
    totalIterations: 10,
    percentage: 50,
    eta: 30
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Conditional Rendering', () => {
    it('renders nothing when status is idle', () => {
      mockUseStore.mockReturnValue({ status: 'idle', progress: null, currentAction: null });

      const { container } = render(<SimulationProgressTracker />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when progress is null', () => {
      mockUseStore.mockReturnValue({ status: 'running', progress: null, currentAction: null });

      const { container } = render(<SimulationProgressTracker />);
      expect(container.firstChild).toBeNull();
    });

    it('renders when status is running and progress exists', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('Simulation Progress')).toBeInTheDocument();
    });

    it('renders when status is paused and progress exists', () => {
      mockUseStore.mockReturnValue({
        status: 'paused',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('Simulation Progress')).toBeInTheDocument();
    });

    it('renders when status is completed and progress exists', () => {
      mockUseStore.mockReturnValue({
        status: 'completed',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('Simulation Progress')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('displays progress statistics correctly', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('5 of 10')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText(/30s/)).toBeInTheDocument();
    });

    it('formats ETA correctly', () => {
      const progressWithEta = {
        ...mockProgress,
        eta: 90 // 1m 30s
      };

      mockUseStore.mockReturnValue({
        status: 'running',
        progress: progressWithEta,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText(/1m 30s/)).toBeInTheDocument();
    });

    it('does not show ETA when eta is 0', () => {
      const progressNoEta = {
        ...mockProgress,
        eta: 0
      };

      mockUseStore.mockReturnValue({
        status: 'running',
        progress: progressNoEta,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      // ETA stat should not be rendered
      const stats = screen.getByText('Simulation Progress').parentElement;
      expect(stats?.textContent).not.toContain('ETA');
    });
  });

  describe('Current Action Display', () => {
    it('shows current action when available and status is running', () => {
      const currentAction = {
        walletIndex: 3,
        archetype: 'whale' as const,
        method: 'transfer(address,uint256)'
      };

      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText(/Wallet 3/)).toBeInTheDocument();
      expect(screen.getByText(/whale/)).toBeInTheDocument();
      expect(screen.getByText(/transfer/)).toBeInTheDocument();
    });

    it('does not show current action when status is paused', () => {
      const currentAction = {
        walletIndex: 3,
        archetype: 'whale' as const,
        method: 'transfer'
      };

      mockUseStore.mockReturnValue({
        status: 'paused',
        progress: mockProgress,
        currentAction
      });

      render(<SimulationProgressTracker />);

      expect(screen.queryByText(/Wallet 3/)).not.toBeInTheDocument();
    });

    it('does not show current action when not available', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.queryByText(/Processing transaction/)).not.toBeInTheDocument();
    });
  });

  describe('Status Indicators', () => {
    it('shows paused notice when status is paused', () => {
      mockUseStore.mockReturnValue({
        status: 'paused',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('Simulation is paused')).toBeInTheDocument();
    });

    it('shows completed notice when status is completed', () => {
      mockUseStore.mockReturnValue({
        status: 'completed',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.getByText('Simulation completed successfully')).toBeInTheDocument();
    });

    it('does not show status notices when running', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      render(<SimulationProgressTracker />);

      expect(screen.queryByText('Simulation is paused')).not.toBeInTheDocument();
      expect(screen.queryByText('Simulation completed successfully')).not.toBeInTheDocument();
    });
  });

  describe('Single Responsibility', () => {
    it('only handles progress display, no button logic', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      const { container } = render(<SimulationProgressTracker />);

      // Should not contain any buttons
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('only handles progress display, no error display', () => {
      mockUseStore.mockReturnValue({
        status: 'running',
        progress: mockProgress,
        currentAction: null
      });

      const { container } = render(<SimulationProgressTracker />);

      // Should not contain error elements
      expect(container.querySelector('.error')).toBeNull();
      expect(container.querySelector('[class*="destructive"]')).toBeNull();
    });
  });
});
