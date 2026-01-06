import type { AppStore } from '../index';

/**
 * Determines if simulation can be started.
 * INVARIANT: canStart ≡ (status === 'idle' ∧ isValid === true)
 */
export const selectCanStart = (state: AppStore): boolean => {
  return (
    state.executionControl.status === 'idle' &&
    state.simulationConfig.isValid === true
  );
};

/**
 * Determines if simulation can be paused.
 * INVARIANT: canPause ≡ (status === 'running')
 */
export const selectCanPause = (state: AppStore): boolean => {
  return state.executionControl.status === 'running';
};

/**
 * Determines if simulation can be resumed.
 * INVARIANT: canResume ≡ (status === 'paused')
 */
export const selectCanResume = (state: AppStore): boolean => {
  return state.executionControl.status === 'paused';
};

/**
 * Determines if simulation can be stopped.
 * INVARIANT: canStop ≡ (status === 'running' ∨ status === 'paused')
 */
export const selectCanStop = (state: AppStore): boolean => {
  const status = state.executionControl.status;
  return status === 'running' || status === 'paused';
};

/**
 * Determines if simulation can be replayed.
 * INVARIANT: canReplay ≡ (status ∈ {'completed', 'failed', 'stopped'})
 */
export const selectCanReplay = (state: AppStore): boolean => {
  const status = state.executionControl.status;
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'stopped'
  );
};

/**
 * Convenience selector that returns all execution action states.
 */
export const selectExecutionActions = (state: AppStore) => ({
  canStart: selectCanStart(state),
  canPause: selectCanPause(state),
  canResume: selectCanResume(state),
  canStop: selectCanStop(state),
  canReplay: selectCanReplay(state),
});


