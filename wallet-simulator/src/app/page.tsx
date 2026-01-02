'use client';

import React from 'react';
import { ContractABI } from '@/components/ContractABI';
import { SimulationConfig } from '@/components/SimulationConfig';
import { ExecutionControls } from '@/components/ExecutionControls';
import { WalletGrid } from '@/components/WalletGrid';
import { WalletBalances } from '@/components/WalletBalances';
import { FundWallets } from '@/components/FundWallets';
import { MetricsPanel } from '@/components/MetricsPanel';
import { TimelineView } from '@/components/TimelineView';
import { ResultInspector } from '@/components/ResultInspector';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Home() {
  const { connect, isConnected } = useWebSocket();
  const [currentNetwork, setCurrentNetwork] = React.useState('sepolia');

  // Auto-connect WebSocket when component mounts
  React.useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Wallet Farm Visual Simulator</h1>
              <p className="text-sm text-muted-foreground">
                Developer console for testing smart contracts with realistic behavioral simulations
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
                <span className="text-sm">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-3 space-y-6">
            <ContractABI />
            <SimulationConfig />
            <FundWallets selectedNetwork={currentNetwork} onNetworkChange={setCurrentNetwork} />
            <ExecutionControls />
          </div>

          {/* Center Panel - Live Simulation */}
          <div className="lg:col-span-6 space-y-6">
            <WalletGrid />
            <WalletBalances selectedNetwork={currentNetwork} />
            <TimelineView />
          </div>

          {/* Right Panel - Metrics & Logs */}
          <div className="lg:col-span-3 space-y-6">
            <MetricsPanel />
            <ResultInspector />
          </div>
        </div>
      </main>
    </div>
  );
}
