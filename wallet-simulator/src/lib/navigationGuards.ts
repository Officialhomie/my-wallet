// Navigation guards for the Wallet Simulator
// Prevents invalid transitions between screens based on application state

import { AppStore } from '@/store';

export interface NavigationGuard {
  canNavigate: (from: string, to: string, store: AppStore) => boolean;
  getErrorMessage: (to: string, store: AppStore) => string | null;
  getRecommendedAction: (to: string, store: AppStore) => string | null;
}

class NavigationGuardImpl implements NavigationGuard {
  canNavigate(from: string, to: string, store: AppStore): boolean {
    const state = store;

    switch (to) {
      case '/':
        // Can always go home
        return true;

      case '/setup':
        // Can always access setup
        return true;

      case '/configure':
        // Can always access configure (but show guidance)
        return true;

      case '/execute':
        // Need valid configuration to execute
        return state.simulationConfig.isValid;

      case '/monitor':
        // Need an active simulation to monitor
        return state.executionControl.status !== 'idle' &&
               state.executionControl.status !== 'completed' &&
               state.executionControl.status !== 'failed';

      case '/results':
        // Need at least one simulation result
        return state.resultInspection.summary !== null;

      default:
        return true;
    }
  }

  getErrorMessage(to: string, store: AppStore): string | null {
    const state = store;

    switch (to) {
      case '/execute':
        if (!state.simulationConfig.isValid) {
          return 'Please complete a valid simulation configuration before proceeding to execution.';
        }
        break;

      case '/monitor':
        const status = state.executionControl.status;
        if (status === 'idle') {
          return 'Start a simulation first to access the monitoring dashboard.';
        }
        if (status === 'completed' || status === 'failed') {
          return 'The simulation has ended. Check results or start a new simulation.';
        }
        break;

      case '/results':
        if (!state.resultInspection.summary) {
          return 'No simulation results available. Run a simulation first.';
        }
        break;
    }

    return null;
  }

  getRecommendedAction(to: string, store: AppStore): string | null {
    const state = store;

    switch (to) {
      case '/execute':
        if (!state.simulationConfig.isValid) {
          return 'Go to Configure to set up your simulation parameters.';
        }
        break;

      case '/monitor':
        const status = state.executionControl.status;
        if (status === 'idle') {
          return 'Go to Execute to start a simulation.';
        }
        if (status === 'completed' || status === 'failed') {
          return 'Go to Results to view the completed simulation.';
        }
        break;

      case '/results':
        if (!state.resultInspection.summary) {
          return 'Go to Execute to run a simulation.';
        }
        break;
    }

    return null;
  }
}

// Navigation guard instance
export const navigationGuard = new NavigationGuardImpl();

// Helper functions
export function canNavigateTo(path: string, store: AppStore, currentPath?: string): boolean {
  // Only use window.location.pathname if currentPath is not provided and we're on the client
  const fromPath = currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  return navigationGuard.canNavigate(fromPath, path, store);
}

export function getNavigationError(path: string, store: AppStore): string | null {
  return navigationGuard.getErrorMessage(path, store);
}

export function getNavigationGuidance(path: string, store: AppStore): {
  error: string | null;
  action: string | null;
} {
  return {
    error: navigationGuard.getErrorMessage(path, store),
    action: navigationGuard.getRecommendedAction(path, store),
  };
}

// Navigation items configuration
export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
  current?: boolean;
}

export function getNavigationItems(store: AppStore, pathname: string = '/'): NavigationItem[] {
  const state = store;

  return [
    {
      path: '/setup',
      label: 'Setup',
      icon: '⚙️',
      description: 'Configure network and wallets',
      enabled: true,
      current: pathname === '/setup',
    },
    {
      path: '/configure',
      label: 'Configure',
      icon: '🔧',
      description: 'Set simulation parameters',
      enabled: true,
      current: pathname === '/configure',
    },
    {
      path: '/execute',
      label: 'Execute',
      icon: '▶️',
      description: 'Run the simulation',
      enabled: state.simulationConfig.isValid,
      current: pathname === '/execute',
    },
    {
      path: '/monitor',
      label: 'Monitor',
      icon: '📊',
      description: 'Watch live execution',
      enabled: state.executionControl.status !== 'idle' &&
              state.executionControl.status !== 'completed' &&
              state.executionControl.status !== 'failed',
      current: pathname === '/monitor',
    },
    {
      path: '/results',
      label: 'Results',
      icon: '📋',
      description: 'View simulation results',
      enabled: state.resultInspection.summary !== null,
      current: pathname.startsWith('/results'),
    },
  ];
}
