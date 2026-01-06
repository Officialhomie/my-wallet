'use client';

import { useStore } from '@/store';
import { selectExecutionActions } from '@/store/selectors/executionSelectors';
import { Button } from '@/components/shared/Button';

/**
 * Provides Start/Pause/Resume/Stop buttons based on execution state.
 * Single responsibility: Button state management and click handling.
 */
export function ExecutionActionControls(): JSX.Element {
  const status = useStore((state) => state.executionControl.status);
  const actions = useStore(selectExecutionActions);

  const startSimulation = useStore((state) => state.startSimulation);
  const pauseSimulation = useStore((state) => state.pauseSimulation);
  const resumeSimulation = useStore((state) => state.resumeSimulation);
  const stopSimulation = useStore((state) => state.stopSimulation);

  return (
    <div className="execution-action-controls flex justify-center">
      {status === 'idle' && (
        <Button
          variant="success"
          size="lg"
          disabled={!actions.canStart}
          onClick={startSimulation}
          className="start-button w-full sm:w-auto"
        >
          ▶️ Start Simulation
        </Button>
      )}

      {status === 'running' && (
        <div className="running-controls flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="warning"
            disabled={!actions.canPause}
            onClick={pauseSimulation}
            className="pause-button w-full sm:w-auto"
          >
            ⏸️ Pause
          </Button>
          <Button
            variant="danger"
            disabled={!actions.canStop}
            onClick={stopSimulation}
            className="stop-button w-full sm:w-auto"
          >
            ⏹️ Stop
          </Button>
        </div>
      )}

      {status === 'paused' && (
        <div className="paused-controls flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="success"
            disabled={!actions.canResume}
            onClick={resumeSimulation}
            className="resume-button w-full sm:w-auto"
          >
            ▶️ Resume
          </Button>
          <Button
            variant="danger"
            disabled={!actions.canStop}
            onClick={stopSimulation}
            className="stop-button w-full sm:w-auto"
          >
            ⏹️ Stop
          </Button>
        </div>
      )}

      {['completed', 'failed', 'stopped'].includes(status) && (
        <Button
          variant="primary"
          disabled={!actions.canReplay}
          onClick={startSimulation}
          className="replay-button w-full sm:w-auto"
        >
          🔄 Run Again
        </Button>
      )}
    </div>
  );
}
