'use client';

import { ExecutionControlState } from '@/types/domain-3';

interface ProgressBarProps {
  progress: ExecutionControlState['progress'];
  className?: string;
}

export function ProgressBar({ progress, className = '' }: ProgressBarProps) {
  if (!progress) {
    return null;
  }

  const { currentIteration, totalIterations, percentage, eta } = progress;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProgressColor = () => {
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    if (percentage < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Progress Stats */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          <span className="font-medium">{currentIteration}</span>
          <span className="text-gray-400"> / </span>
          <span>{totalIterations}</span>
          <span className="text-gray-400 ml-2">iterations</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="font-medium">{percentage}%</span>
          {eta > 0 && (
            <span className="text-gray-500">
              ETA: {formatTime(eta)}
            </span>
          )}
        </div>
      </div>

      {/* Completion Message */}
      {percentage >= 100 && (
        <div className="text-center text-green-600 font-medium text-sm">
          ✅ Simulation Complete!
        </div>
      )}
    </div>
  );
}
