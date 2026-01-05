'use client';

import { useStore } from '@/store';
import { ARCHETYPES } from '@/lib/archetypes';
import { ArchetypeName } from '@/types/domain-2';

export function ArchetypeConfigurator() {
  const { archetypeMode, singleArchetype, mixedArchetypes } = useStore((state) => state.simulationConfig);
  const setArchetypeMode = useStore((state) => state.setArchetypeMode);
  const setSingleArchetype = useStore((state) => state.setSingleArchetype);
  const updateMixedArchetype = useStore((state) => state.updateMixedArchetype);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Behavioral Archetypes</h3>

      {/* Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
        <button
          onClick={() => setArchetypeMode('single')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
            archetypeMode === 'single'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          Single Archetype
        </button>
        <button
          onClick={() => setArchetypeMode('mixed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
            archetypeMode === 'mixed'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          Mixed Archetypes
        </button>
      </div>

      {/* Single Archetype Selection */}
      {archetypeMode === 'single' && (
        <div className="space-y-3">
          {Object.values(ARCHETYPES).map((archetype) => (
            <label key={archetype.name} className="flex items-center space-x-4 p-4 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="radio"
                name="archetype"
                value={archetype.name}
                checked={singleArchetype === archetype.name}
                onChange={(e) => setSingleArchetype(e.target.value as ArchetypeName)}
                className="text-primary focus:ring-ring"
              />
              <span className="text-lg">{archetype.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-foreground">{archetype.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{archetype.description}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Mixed Archetype Sliders */}
      {archetypeMode === 'mixed' && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Distribute behavior across multiple archetypes (must sum to 100%)
          </p>

          {Object.values(ARCHETYPES).map((archetype) => {
            const percentage = mixedArchetypes?.[archetype.name] ?? 0;

            return (
              <div key={archetype.name} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{archetype.icon}</span>
                    <span className="font-medium text-foreground">{archetype.label}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">{percentage}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => updateMixedArchetype(archetype.name, parseInt(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />

                <div className="text-xs text-muted-foreground">{archetype.description}</div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-foreground">Total:</span>
              <span className={`font-mono font-medium ${
                mixedArchetypes && Object.values(mixedArchetypes).reduce((a, b) => a + b, 0) === 100
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {mixedArchetypes ? Object.values(mixedArchetypes).reduce((a, b) => a + b, 0) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
