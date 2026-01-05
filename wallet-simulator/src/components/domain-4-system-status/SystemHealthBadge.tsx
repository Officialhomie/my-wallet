'use client';

import { SystemHealthStatus } from '@/types/domain-4';

interface SystemHealthBadgeProps {
  status: SystemHealthStatus;
  className?: string;
}

export function SystemHealthBadge({ status, className = '' }: SystemHealthBadgeProps) {
  const getStatusConfig = (status: SystemHealthStatus) => {
    switch (status) {
      case 'healthy':
        return {
          label: 'HEALTHY',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          description: 'System operating normally',
        };
      case 'degraded':
        return {
          label: 'DEGRADED',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⚠️',
          description: 'System experiencing issues',
        };
      case 'critical':
        return {
          label: 'CRITICAL',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
          description: 'System requires immediate attention',
        };
      default:
        return {
          label: 'UNKNOWN',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          description: 'System status unknown',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center px-4 py-2 rounded-lg border text-sm font-semibold ${config.color} ${className}`}>
      <span className="mr-2 text-base">{config.icon}</span>
      <div className="flex flex-col">
        <span>{config.label}</span>
        <span className="text-xs opacity-75 font-normal">{config.description}</span>
      </div>
    </div>
  );
}