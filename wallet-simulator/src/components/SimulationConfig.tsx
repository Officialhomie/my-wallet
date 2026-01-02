'use client';

import React, { useState } from 'react';
import { Network, Users, Target, Clock, Hash } from 'lucide-react';
import { useSimulationStore } from '@/lib/store';
import { NetworkConfig, ArchetypeName, ARCHETYPES } from '@/types/api';
import { cn } from '@/utils/cn';

interface SimulationConfigProps {
  className?: string;
}

const NETWORKS: NetworkConfig[] = [
  {
    name: 'sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
  },
  {
    name: 'base-sepolia',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
  },
  {
    name: 'polygon-mumbai',
    chainId: 80001,
    rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY',
  },
];

export function SimulationConfig({ className }: SimulationConfigProps) {
  const { config, setConfig } = useSimulationStore();
  const [customRpcUrl, setCustomRpcUrl] = useState('');

  const handleNetworkChange = (networkName: string) => {
    const network = NETWORKS.find(n => n.name === networkName);
    if (network) {
      setConfig({ network });
      setCustomRpcUrl(network.rpcUrl);
    }
  };

  const handleCustomRpcChange = (rpcUrl: string) => {
    setCustomRpcUrl(rpcUrl);
    if (config.network) {
      setConfig({
        network: {
          ...config.network,
          rpcUrl,
        },
      });
    }
  };

  const handleArchetypeTypeChange = (type: 'single' | 'mixed') => {
    setConfig({
      archetypeConfig: {
        type,
        singleArchetype: type === 'single' ? config.archetypeConfig?.singleArchetype || 'casual' : undefined,
        mixedConfig: type === 'mixed' ? [] : undefined,
      },
    });
  };

  const handleSingleArchetypeChange = (archetype: ArchetypeName) => {
    setConfig({
      archetypeConfig: {
        type: 'single',
        singleArchetype: archetype,
      },
    });
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Simulation Configuration</h3>

        {/* Network Selection */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4" />
            <label className="text-sm font-medium">Network</label>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {NETWORKS.map((network) => (
              <button
                key={network.name}
                onClick={() => handleNetworkChange(network.name)}
                className={cn(
                  'p-3 border rounded-md text-left transition-colors',
                  config.network?.name === network.name
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{network.name}</p>
                    <p className="text-xs text-muted-foreground">Chain ID: {network.chainId}</p>
                  </div>
                  {config.network?.name === network.name && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">RPC URL</label>
            <input
              type="url"
              value={customRpcUrl}
              onChange={(e) => handleCustomRpcChange(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Wallet Configuration */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <label className="text-sm font-medium">Wallets</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm">Count</label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.walletCount || 10}
                onChange={(e) => setConfig({ walletCount: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Source</label>
              <select
                value={config.walletSource || 'generated'}
                onChange={(e) => setConfig({ walletSource: e.target.value as 'existing' | 'generated' })}
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="generated">Generated</option>
                <option value="existing">Existing Farm</option>
              </select>
            </div>
          </div>
        </div>

        {/* Archetype Configuration */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4" />
            <label className="text-sm font-medium">User Archetypes</label>
          </div>

          <div className="space-y-3">
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="archetypeType"
                  value="single"
                  checked={config.archetypeConfig?.type === 'single'}
                  onChange={(e) => handleArchetypeTypeChange(e.target.value as 'single')}
                  className="text-primary"
                />
                <span className="text-sm">Single Archetype</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="archetypeType"
                  value="mixed"
                  checked={config.archetypeConfig?.type === 'mixed'}
                  onChange={(e) => handleArchetypeTypeChange(e.target.value as 'mixed')}
                  className="text-primary"
                />
                <span className="text-sm">Mixed Archetypes</span>
              </label>
            </div>

            {config.archetypeConfig?.type === 'single' && (
              <div className="grid grid-cols-2 gap-2">
                {ARCHETYPES.map((archetype) => (
                  <button
                    key={archetype}
                    onClick={() => handleSingleArchetypeChange(archetype)}
                    className={cn(
                      'p-3 border rounded-md text-left transition-colors capitalize',
                      config.archetypeConfig?.singleArchetype === archetype
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <p className="text-sm font-medium">{archetype.replace(/([A-Z])/g, ' $1').trim()}</p>
                  </button>
                ))}
              </div>
            )}

            {config.archetypeConfig?.type === 'mixed' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Mixed archetype configuration will be implemented in the advanced settings.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Timing Configuration */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <label className="text-sm font-medium">Timing</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm">Duration (seconds)</label>
              <input
                type="number"
                min="10"
                max="3600"
                value={config.duration ? config.duration / 1000 : ''}
                onChange={(e) => setConfig({
                  duration: e.target.value ? parseInt(e.target.value) * 1000 : undefined
                })}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm">Interaction Count</label>
              <input
                type="number"
                min="1"
                max="10000"
                value={config.interactionCount || ''}
                onChange={(e) => setConfig({
                  interactionCount: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="Optional"
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave both empty for continuous simulation until manually stopped.
          </p>
        </div>

        {/* Determinism Seed */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4" />
            <label className="text-sm font-medium">Determinism Seed</label>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              value={config.seed || ''}
              onChange={(e) => setConfig({ seed: parseInt(e.target.value) || Math.floor(Math.random() * 1000000) })}
              placeholder="Random seed"
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Same seed produces identical simulation results for reproducibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
