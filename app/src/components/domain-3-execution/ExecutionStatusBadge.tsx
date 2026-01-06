'use client';

import { ExecutionControlState } from '@/types/domain-3';

interface ExecutionStatusBadgeProps {
  status: ExecutionControlState['status'];
  className?: string;
}

export function ExecutionStatusBadge({ status, className = '' }: ExecutionStatusBadgeProps) {
  const getStatusConfig = (status: ExecutionControlState['status']) => {
    switch (status) {
      case 'idle':
        return {
          label: 'Ready',
          color: 'bg-gray-100 text-gray-800',
          icon: '⏸️',
        };
      case 'running':
        return {
          label: 'Running',
          color: 'bg-green-100 text-green-800',
          icon: '▶️',
        };
      case 'paused':
        return {
          label: 'Paused',
          color: 'bg-yellow-100 text-yellow-800',
          icon: '⏸️',
        };
      case 'stopped':
        return {
          label: 'Stopped',
          color: 'bg-orange-100 text-orange-800',
          icon: '⏹️',
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-blue-100 text-blue-800',
          icon: '✅',
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-red-100 text-red-800',
          icon: '❌',
        };
      default:
        return {
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800',
          icon: '❓',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
