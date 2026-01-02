'use client';

import React, { useState } from 'react';
import { Play, Pause, Square, RotateCcw, RefreshCw, Hash } from 'lucide-react';
import { useSimulationStore, useSimulationStatus } from '@/lib/store';
import { cn } from '@/utils/cn';

interface ExecutionControlsProps {
  className?: string;
}

const STATUS_COLORS = {
  idle: 'text-muted-foreground',
  starting: 'text-yellow-600',
  running: 'text-green-600',
  paused: 'text-yellow-600',
  stopping: 'text-muted-foreground',
  completed: 'text-green-600',
  failed: 'text-red-600',
} as const;

const STATUS_LABELS = {
  idle: 'Ready',
  starting: 'Starting...',
  running: 'Running',
  paused: 'Paused',
  stopping: 'Stopping...',
  completed: 'Completed',
  failed: 'Failed',
} as const;

export function ExecutionControls({ className }: ExecutionControlsProps) {
  const { config, currentRun, setCurrentRun, generateRunId, validateConfig } = useSimulationStore();
  const status = useSimulationStatus();
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    const validation = validateConfig(config);
    if (!validation.valid) {
      alert(`Configuration errors:\n${validation.errors.join('\n')}`);
      return;
    }

    setIsLoading(true);
    try {
      // Create a simulation run
      const simulationConfig = {
        ...config,
        seed: config.seed || Math.floor(Math.random() * 1000000),
      } as any; // Type assertion needed due to partial config

      const runId = generateRunId(simulationConfig);
      const newRun = {
        id: runId,
        status: 'starting' as const,
        config: simulationConfig,
        metrics: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          pendingTransactions: 0,
          tps: 0,
          avgGasUsed: BigInt(0),
          totalGasCost: BigInt(0),
          avgDelay: 0,
          nonceGaps: 0,
          rateLimitedEvents: 0,
          circuitBreakerTrips: 0,
          activeWallets: 0,
          startTime: new Date(),
          lastUpdateTime: new Date(),
        },
        wallets: [],
      };
      setCurrentRun(newRun);

      // In a real implementation, this would make an API call to start the simulation
      // For now, we'll simulate it locally
      setTimeout(() => {
        if (newRun.status === 'starting') {
          setCurrentRun({
            ...newRun,
            status: 'running',
            startTime: new Date(),
          });
        }
      }, 1000);

    } catch (error) {
      alert(`Error starting simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!currentRun) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would make an API call
      setCurrentRun({
        ...currentRun,
        status: 'paused',
      });
    } catch (error) {
      alert(`Error pausing simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    if (!currentRun) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would make an API call
      setCurrentRun({
        ...currentRun,
        status: 'running',
      });
    } catch (error) {
      alert(`Error resuming simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentRun) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would make an API call
      setCurrentRun({
        ...currentRun,
        status: 'completed',
        endTime: new Date(),
      });
    } catch (error) {
      alert(`Error stopping simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (status === 'running' || status === 'paused') {
      if (!confirm('Reset will stop the current simulation. Continue?')) return;
    }
    setCurrentRun(null);
  };

  const handleReplay = async () => {
    if (!currentRun) return;

    setIsLoading(true);
    try {
      // In a real implementation, this would make an API call
      // For now, just restart the current simulation
      const newRun = {
        ...currentRun,
        id: generateRunId(currentRun.config),
        status: 'starting' as const,
        startTime: new Date(),
        endTime: undefined,
        metrics: {
          ...currentRun.metrics,
          startTime: new Date(),
          lastUpdateTime: new Date(),
        },
      };
      setCurrentRun(newRun);

      setTimeout(() => {
        if (newRun.status === 'starting') {
          setCurrentRun({
            ...newRun,
            status: 'running',
          });
        }
      }, 1000);
    } catch (error) {
      alert(`Error replaying simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const canStart = status === 'idle' || status === 'completed' || status === 'failed';
  const canPause = status === 'running';
  const canResume = status === 'paused';
  const canStop = status === 'running' || status === 'paused';
  const canReset = status !== 'idle';
  const canReplay = status === 'completed' || status === 'failed';

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution Controls</h3>

        <div className="flex items-center space-x-2">
          <div className={cn('w-2 h-2 rounded-full', STATUS_COLORS[status].replace('text-', 'bg-'))} />
          <span className={cn('text-sm font-medium', STATUS_COLORS[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>

      {/* Run ID Display */}
      {currentRun && (
        <div className="p-3 bg-card border border-border rounded-md">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Simulation Run ID:</span>
          </div>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1 block">
            {currentRun.id}
          </code>
          <p className="text-xs text-muted-foreground mt-1">
            Use this ID to replay or reference this exact simulation run.
          </p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleStart}
          disabled={!canStart || isLoading}
          className={cn(
            'flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors',
            canStart && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <Play className="w-4 h-4" />
          <span>Start</span>
        </button>

        <button
          onClick={canPause ? handlePause : handleResume}
          disabled={(!canPause && !canResume) || isLoading}
          className={cn(
            'flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors',
            (canPause || canResume) && !isLoading
              ? 'bg-yellow-600 text-white hover:bg-yellow-700'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {canPause ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{canPause ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          onClick={handleStop}
          disabled={!canStop || isLoading}
          className={cn(
            'flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors',
            canStop && !isLoading
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <Square className="w-4 h-4" />
          <span>Stop</span>
        </button>

        <button
          onClick={handleReset}
          disabled={!canReset || isLoading}
          className={cn(
            'flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors',
            canReset && !isLoading
              ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset</span>
        </button>
      </div>

      {/* Replay Button */}
      {canReplay && (
        <button
          onClick={handleReplay}
          disabled={isLoading}
          className={cn(
            'w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors',
            !isLoading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Replay with Same Configuration</span>
        </button>
      )}

      {/* Status Messages */}
      {isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          Processing request...
        </div>
      )}

      {status === 'running' && (
        <div className="text-center text-sm text-green-600">
          Simulation is running. Monitor the dashboard for real-time updates.
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center text-sm text-green-600">
          Simulation completed successfully. Check results below.
        </div>
      )}

      {status === 'failed' && (
        <div className="text-center text-sm text-red-600">
          Simulation failed. Check logs for details.
        </div>
      )}
    </div>
  );
}
