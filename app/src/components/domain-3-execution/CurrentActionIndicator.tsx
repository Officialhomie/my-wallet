'use client';

import { ExecutionControlState } from '@/types/domain-3';
import { ARCHETYPES } from '@/lib/archetypes';

interface CurrentActionIndicatorProps {
  currentAction: ExecutionControlState['currentAction'];
  className?: string;
}

export function CurrentActionIndicator({ currentAction, className = '' }: CurrentActionIndicatorProps) {
  if (!currentAction) {
    return null;
  }

  const { walletIndex, archetype, method } = currentAction;
  const archetypeInfo = ARCHETYPES[archetype];

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-md p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-lg">{archetypeInfo?.icon || '🤖'}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-900">
            Currently Executing
          </div>

          <div className="flex items-center space-x-4 mt-1">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-blue-700 font-medium">Wallet:</span>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                #{walletIndex}
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-xs text-blue-700 font-medium">Archetype:</span>
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded flex items-center space-x-1">
                <span>{archetypeInfo?.icon}</span>
                <span>{archetypeInfo?.label}</span>
              </span>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-xs text-blue-700 font-medium">Method:</span>
              <code className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-mono">
                {method}
              </code>
            </div>
          </div>
        </div>

        {/* Animated indicator */}
        <div className="flex-shrink-0">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
