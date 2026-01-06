import { describe, it, expect } from '@jest/globals';
import type { AppStore } from '../index';
import {
  selectCanStart,
  selectCanPause,
  selectCanResume,
  selectCanStop,
  selectCanReplay,
  selectExecutionActions
} from './executionSelectors';

// Mock AppStore for testing
const createMockStore = (overrides: Partial<AppStore> = {}): AppStore => ({
  executionControl: {
    simulationId: null,
    status: 'idle',
    progress: null,
    currentAction: null,
    error: null,
    ...overrides.executionControl
  },
  simulationConfig: {
    selectedContract: null,
    selectedMethod: null,
    archetypeMode: 'single',
    singleArchetype: 'whale',
    mixedArchetypes: undefined,
    walletSelection: { mode: 'single', singleWallet: 0 },
    iterations: 10,
    timingProfile: 'normal',
    methodParams: {},
    gasConstraints: { enabled: false },
    advanced: {
      useDeterministicSeed: false,
      enableCircuitBreaker: true,
      failureThreshold: 5,
      autoRetry: true,
      maxRetries: 3
    },
    isValid: false,
    validationErrors: [],
    estimatedMetrics: {
      totalTransactions: 0,
      estimatedDuration: 0,
      estimatedGasCost: '0'
    },
    ...overrides.simulationConfig
  },
  // Add other required store slices with minimal mocks
  systemSetup: {} as any,
  liveSystemStatus: {} as any,
  walletActivity: {} as any,
  resultInspection: {} as any,
  simulateSystemUpdates: () => {},
  simulateWalletUpdates: () => {},
  ...overrides
} as AppStore);

describe('Execution Selectors', () => {
  describe('selectCanStart', () => {
    it('returns true when status is idle AND config is valid', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: true }
      });

      expect(selectCanStart(state)).toBe(true);
    });

    it('returns false when status is idle but config is invalid', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: false }
      });

      expect(selectCanStart(state)).toBe(false);
    });

    it('returns false when status is running regardless of config validity', () => {
      const state = createMockStore({
        executionControl: { status: 'running' },
        simulationConfig: { isValid: true }
      });

      expect(selectCanStart(state)).toBe(false);
    });

    it('returns false when status is completed regardless of config validity', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' },
        simulationConfig: { isValid: true }
      });

      expect(selectCanStart(state)).toBe(false);
    });

    it('returns false when status is paused regardless of config validity', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' },
        simulationConfig: { isValid: true }
      });

      expect(selectCanStart(state)).toBe(false);
    });
  });

  describe('selectCanPause', () => {
    it('returns true when status is running', () => {
      const state = createMockStore({
        executionControl: { status: 'running' }
      });

      expect(selectCanPause(state)).toBe(true);
    });

    it('returns false when status is idle', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' }
      });

      expect(selectCanPause(state)).toBe(false);
    });

    it('returns false when status is paused', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' }
      });

      expect(selectCanPause(state)).toBe(false);
    });

    it('returns false when status is completed', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' }
      });

      expect(selectCanPause(state)).toBe(false);
    });
  });

  describe('selectCanResume', () => {
    it('returns true when status is paused', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' }
      });

      expect(selectCanResume(state)).toBe(true);
    });

    it('returns false when status is idle', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' }
      });

      expect(selectCanResume(state)).toBe(false);
    });

    it('returns false when status is running', () => {
      const state = createMockStore({
        executionControl: { status: 'running' }
      });

      expect(selectCanResume(state)).toBe(false);
    });

    it('returns false when status is completed', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' }
      });

      expect(selectCanResume(state)).toBe(false);
    });
  });

  describe('selectCanStop', () => {
    it('returns true when status is running', () => {
      const state = createMockStore({
        executionControl: { status: 'running' }
      });

      expect(selectCanStop(state)).toBe(true);
    });

    it('returns true when status is paused', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' }
      });

      expect(selectCanStop(state)).toBe(true);
    });

    it('returns false when status is idle', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' }
      });

      expect(selectCanStop(state)).toBe(false);
    });

    it('returns false when status is completed', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' }
      });

      expect(selectCanStop(state)).toBe(false);
    });
  });

  describe('selectCanReplay', () => {
    it('returns true when status is completed', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' }
      });

      expect(selectCanReplay(state)).toBe(true);
    });

    it('returns true when status is failed', () => {
      const state = createMockStore({
        executionControl: { status: 'failed' }
      });

      expect(selectCanReplay(state)).toBe(true);
    });

    it('returns true when status is stopped', () => {
      const state = createMockStore({
        executionControl: { status: 'stopped' }
      });

      expect(selectCanReplay(state)).toBe(true);
    });

    it('returns false when status is idle', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' }
      });

      expect(selectCanReplay(state)).toBe(false);
    });

    it('returns false when status is running', () => {
      const state = createMockStore({
        executionControl: { status: 'running' }
      });

      expect(selectCanReplay(state)).toBe(false);
    });

    it('returns false when status is paused', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' }
      });

      expect(selectCanReplay(state)).toBe(false);
    });
  });

  describe('selectExecutionActions', () => {
    it('returns all action states correctly for idle + valid config', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: true }
      });

      const actions = selectExecutionActions(state);

      expect(actions).toEqual({
        canStart: true,
        canPause: false,
        canResume: false,
        canStop: false,
        canReplay: false
      });
    });

    it('returns all action states correctly for idle + invalid config', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: false }
      });

      const actions = selectExecutionActions(state);

      expect(actions).toEqual({
        canStart: false,
        canPause: false,
        canResume: false,
        canStop: false,
        canReplay: false
      });
    });

    it('returns all action states correctly for running status', () => {
      const state = createMockStore({
        executionControl: { status: 'running' },
        simulationConfig: { isValid: true }
      });

      const actions = selectExecutionActions(state);

      expect(actions).toEqual({
        canStart: false,
        canPause: true,
        canResume: false,
        canStop: true,
        canReplay: false
      });
    });

    it('returns all action states correctly for paused status', () => {
      const state = createMockStore({
        executionControl: { status: 'paused' },
        simulationConfig: { isValid: true }
      });

      const actions = selectExecutionActions(state);

      expect(actions).toEqual({
        canStart: false,
        canPause: false,
        canResume: true,
        canStop: true,
        canReplay: false
      });
    });

    it('returns all action states correctly for completed status', () => {
      const state = createMockStore({
        executionControl: { status: 'completed' },
        simulationConfig: { isValid: true }
      });

      const actions = selectExecutionActions(state);

      expect(actions).toEqual({
        canStart: false,
        canPause: false,
        canResume: false,
        canStop: false,
        canReplay: true
      });
    });
  });

  describe('Integration: State Synchronization Bug Fix', () => {
    it('fixes the original bug: button disabled when config invalid', () => {
      // Original bug: button enabled when config invalid
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: false }
      });

      // With the fix: canStart should be false
      expect(selectCanStart(state)).toBe(false);
      expect(selectExecutionActions(state).canStart).toBe(false);
    });

    it('enables button when config becomes valid', () => {
      const state = createMockStore({
        executionControl: { status: 'idle' },
        simulationConfig: { isValid: true }
      });

      expect(selectCanStart(state)).toBe(true);
      expect(selectExecutionActions(state).canStart).toBe(true);
    });

    it('maintains correct state across all transitions', () => {
      // Test all possible state combinations
      const testCases = [
        { status: 'idle', isValid: false, expected: { canStart: false, canPause: false, canResume: false, canStop: false, canReplay: false } },
        { status: 'idle', isValid: true, expected: { canStart: true, canPause: false, canResume: false, canStop: false, canReplay: false } },
        { status: 'running', isValid: true, expected: { canStart: false, canPause: true, canResume: false, canStop: true, canReplay: false } },
        { status: 'running', isValid: false, expected: { canStart: false, canPause: true, canResume: false, canStop: true, canReplay: false } },
        { status: 'paused', isValid: true, expected: { canStart: false, canPause: false, canResume: true, canStop: true, canReplay: false } },
        { status: 'completed', isValid: true, expected: { canStart: false, canPause: false, canResume: false, canStop: false, canReplay: true } },
        { status: 'failed', isValid: false, expected: { canStart: false, canPause: false, canResume: false, canStop: false, canReplay: true } },
        { status: 'stopped', isValid: false, expected: { canStart: false, canPause: false, canResume: false, canStop: false, canReplay: true } },
      ];

      testCases.forEach(({ status, isValid, expected }) => {
        const state = createMockStore({
          executionControl: { status: status as any },
          simulationConfig: { isValid }
        });

        const actions = selectExecutionActions(state);
        expect(actions).toEqual(expected);
      });
    });
  });
});
