import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ExecutionControlPanel, ExecutionControlPanel_Original } from './ExecutionControlPanel';
import { ExecutionControlPanel_V2 } from './ExecutionControlPanel_V2';
import { useStore } from '@/store';

// Mock the store
jest.mock('@/store', () => ({
  useStore: jest.fn()
}));

// Mock V2 component
jest.mock('./ExecutionControlPanel_V2', () => ({
  ExecutionControlPanel_V2: jest.fn(() => <div data-testid="panel-v2">V2 Component</div>)
}));

const mockUseStore = useStore as jest.MockedFunction<typeof useStore>;

describe('ExecutionControlPanel Feature Flag', () => {
  const originalEnv = process.env;
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorageMock as any;

    // Setup default store mocks
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
  });

  afterEach(() => {
    process.env = originalEnv;
    global.localStorage = originalLocalStorage;
  });

  describe('Feature Flag: Environment Variable', () => {
    it('uses V2 when NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS is true', () => {
      process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS = 'true';

      render(<ExecutionControlPanel />);

      expect(screen.getByTestId('panel-v2')).toBeInTheDocument();
      expect(ExecutionControlPanel_V2).toHaveBeenCalled();
    });

    it('uses Original when NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS is false', () => {
      process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS = 'false';

      render(<ExecutionControlPanel />);

      expect(screen.queryByTestId('panel-v2')).not.toBeInTheDocument();
      // Original component should render (we can't easily test this without more setup)
    });

    it('uses Original when NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS is undefined', () => {
      delete process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS;

      render(<ExecutionControlPanel />);

      expect(screen.queryByTestId('panel-v2')).not.toBeInTheDocument();
    });
  });

  describe('Feature Flag: LocalStorage', () => {
    it('uses V2 when localStorage flag is set to true', () => {
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');
      delete process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS;

      // Mock window object
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => 'true'),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });

      render(<ExecutionControlPanel />);

      expect(screen.getByTestId('panel-v2')).toBeInTheDocument();
    });

    it('prioritizes environment variable over localStorage', () => {
      process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS = 'false';
      (global.localStorage.getItem as jest.Mock).mockReturnValue('true');

      render(<ExecutionControlPanel />);

      // Should use env var (false) not localStorage (true)
      expect(screen.queryByTestId('panel-v2')).not.toBeInTheDocument();
    });
  });

  describe('Original Component', () => {
    it('renders original component when accessed directly', () => {
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

      render(<ExecutionControlPanel_Original />);

      // Original component should render its content
      expect(screen.getByText(/Simulation Control/i)).toBeInTheDocument();
    });
  });

  describe('Rollback Safety', () => {
    it('allows easy rollback by changing feature flag', () => {
      // Start with V2 enabled
      process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS = 'true';
      
      const { rerender } = render(<ExecutionControlPanel />);
      expect(screen.getByTestId('panel-v2')).toBeInTheDocument();

      // Rollback to original
      process.env.NEXT_PUBLIC_USE_COMPOSABLE_COMPONENTS = 'false';
      rerender(<ExecutionControlPanel />);

      // Should now use original (V2 should not be in document)
      expect(screen.queryByTestId('panel-v2')).not.toBeInTheDocument();
    });
  });
});
