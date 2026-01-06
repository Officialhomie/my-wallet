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
      <h3 className="font-semibold">Behavioral Archetypes <span className="text-destructive text-xs">*</span></h3>

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
            <label key={archetype.name} className={`flex items-start space-x-4 p-4 border rounded-md cursor-pointer transition-all ${
              singleArchetype === archetype.name
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:bg-muted/50 hover:border-primary/40'
            }`}>
              <input
                type="radio"
                name="archetype"
                value={archetype.name}
                checked={singleArchetype === archetype.name}
                onChange={(e) => setSingleArchetype(e.target.value as ArchetypeName)}
                className="text-primary focus:ring-ring mt-1"
              />
              <span className="text-2xl">{archetype.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-foreground">{archetype.label}</div>
                  {archetype.activeRate && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      parseInt(archetype.activeRate) >= 80
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : parseInt(archetype.activeRate) >= 50
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {archetype.activeRate} Active
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {archetype.description}
                </div>
                {archetype.detailedDescription && (
                  <div className="text-xs text-muted-foreground mt-2 bg-muted/30 rounded p-2">
                    {archetype.detailedDescription}
                  </div>
                )}
                {archetype.characteristics && archetype.characteristics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {archetype.characteristics.map((char, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        {char}
                      </span>
                    ))}
                  </div>
                )}
                {archetype.warning && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                    <span className="text-base">⚠️</span>
                    <span className="flex-1">{archetype.warning}</span>
                  </div>
                )}
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
