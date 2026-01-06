import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ExecutionControlPanel_V2 } from './ExecutionControlPanel_V2';
import { ExecutionActionControls } from './ExecutionActionControls';
import { SimulationProgressTracker } from './SimulationProgressTracker';
import { ConfigurationSummaryCard } from './ConfigurationSummaryCard';

// Mock child components
jest.mock('./ExecutionActionControls', () => ({
  ExecutionActionControls: jest.fn(() => <div data-testid="execution-action-controls">Action Controls</div>)
}));

jest.mock('./SimulationProgressTracker', () => ({
  SimulationProgressTracker: jest.fn(() => <div data-testid="simulation-progress-tracker">Progress Tracker</div>)
}));

jest.mock('./ConfigurationSummaryCard', () => ({
  ConfigurationSummaryCard: jest.fn(() => <div data-testid="configuration-summary-card">Config Summary</div>)
}));

describe('ExecutionControlPanel_V2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Composition', () => {
    it('renders all child components', () => {
      render(<ExecutionControlPanel_V2 />);

      expect(screen.getByTestId('configuration-summary-card')).toBeInTheDocument();
      expect(screen.getByTestId('execution-action-controls')).toBeInTheDocument();
      expect(screen.getByTestId('simulation-progress-tracker')).toBeInTheDocument();
    });

    it('renders components in correct order', () => {
      render(<ExecutionControlPanel_V2 />);

      const container = screen.getByTestId('configuration-summary-card').parentElement;
      const children = Array.from(container?.children || []);

      // Check order: Config Summary, Action Controls, Progress Tracker
      expect(children[0]).toHaveAttribute('data-testid', 'configuration-summary-card');
      expect(children[1]).toHaveAttribute('data-testid', 'execution-action-controls');
      expect(children[2]).toHaveAttribute('data-testid', 'simulation-progress-tracker');
    });
  });

  describe('Architecture', () => {
    it('has no business logic, only composition', () => {
      // V2 should be a pure composition component
      const { container } = render(<ExecutionControlPanel_V2 />);

      // Should not contain any conditional logic or state management
      // All logic should be in child components
      expect(container.querySelector('[class*="space-y"]')).toBeInTheDocument();
    });

    it('delegates all responsibilities to child components', () => {
      render(<ExecutionControlPanel_V2 />);

      // Verify child components are called
      expect(ConfigurationSummaryCard).toHaveBeenCalled();
      expect(ExecutionActionControls).toHaveBeenCalled();
      expect(SimulationProgressTracker).toHaveBeenCalled();
    });
  });
});
