'use client';

import { useStore } from '@/store';
import { TIMING_PROFILES } from '@/lib/archetypes';
import { TimingProfile } from '@/types/domain-2';

export function ExecutionParameters() {
  const { iterations, timingProfile } = useStore((state) => state.simulationConfig);
  const setIterations = useStore((state) => state.setIterations);
  const setTimingProfile = useStore((state) => state.setTimingProfile);

  const selectedProfile = TIMING_PROFILES[timingProfile];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Execution Parameters</h3>

      {/* Iterations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Iterations per Wallet: {iterations}
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={iterations}
          onChange={(e) => setIterations(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>100</span>
        </div>
      </div>

      {/* Timing Profile */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timing Profile
        </label>
        <select
          value={timingProfile}
          onChange={(e) => setTimingProfile(e.target.value as TimingProfile)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {Object.entries(TIMING_PROFILES).map(([key, profile]) => (
            <option key={key} value={key}>
              {profile.label}
            </option>
          ))}
        </select>

        {/* Profile Details */}
        <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm">
          <div className="font-medium mb-1">{selectedProfile.label}</div>
          <div className="text-gray-600">
            Delay between transactions: {selectedProfile.delays[0]} - {selectedProfile.delays[1]} seconds
          </div>
        </div>
      </div>
    </div>
  );
}
