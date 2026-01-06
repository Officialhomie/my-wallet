'use client';

import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { getNetworksByChain, getNetworkById, type ChainGroup } from '@/lib/networks';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export function NetworkSelectorV2() {
  const {
    selectedNetwork,
    rpcConnectionStatus,
    customRpcUrl,
  } = useStore((state) => state.systemSetup);

  const selectNetwork = useStore((state) => state.selectNetwork);
  const setCustomRpcUrl = useStore((state) => state.setCustomRpcUrl);

  const [showTestnets, setShowTestnets] = useState(true);
  const [networkFilter, setNetworkFilter] = useState<'all' | 'mainnet' | 'testnet'>('all');

  const chainGroups = getNetworksByChain();
  const selectedNetworkData = getNetworkById(selectedNetwork);

  // Test connection when component mounts or network changes
  useEffect(() => {
    useStore.getState().testRpcConnection();
  }, [selectedNetwork, customRpcUrl]);

  const getStatusColor = () => {
    switch (rpcConnectionStatus) {
      case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'connecting': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = () => {
    switch (rpcConnectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const filteredChains = chainGroups.filter(chain => {
    if (networkFilter === 'all') return true;
    if (networkFilter === 'mainnet') return chain.mainnet;
    if (networkFilter === 'testnet') return chain.testnet;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Filter:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setNetworkFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                networkFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setNetworkFilter('mainnet')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                networkFilter === 'mainnet'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Mainnet Only
            </button>
            <button
              onClick={() => setNetworkFilter('testnet')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                networkFilter === 'testnet'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Testnet Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-testnets"
            checked={showTestnets}
            onChange={(e) => setShowTestnets(e.target.checked)}
            className="rounded border-input"
          />
          <label htmlFor="show-testnets" className="text-sm text-foreground cursor-pointer">
            Show testnets
          </label>
        </div>
      </div>

      {/* Network Selection by Chain */}
      <div className="space-y-4">
        {filteredChains.map((chainGroup) => (
          <ChainNetworkCard
            key={chainGroup.chain}
            chainGroup={chainGroup}
            selectedNetwork={selectedNetwork}
            onSelectNetwork={selectNetwork}
            showTestnets={showTestnets}
          />
        ))}
      </div>

      {/* Selected Network Info */}
      {selectedNetworkData && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground">Selected Network</h3>
            <Badge variant={selectedNetworkData.type === 'mainnet' ? 'default' : 'secondary'}>
              {selectedNetworkData.type === 'mainnet' ? '🌐 Mainnet' : '🧪 Testnet'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="font-medium text-foreground">Name:</span>
              <span className="ml-2 text-muted-foreground">{selectedNetworkData.name}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Chain ID:</span>
              <span className="ml-2 text-muted-foreground font-mono">{selectedNetworkData.chainId}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Block Time:</span>
              <span className="ml-2 text-muted-foreground">~{selectedNetworkData.blockTime}s</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Native:</span>
              <span className="ml-2 text-muted-foreground">{selectedNetworkData.nativeCurrency.symbol}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Status:</span>
              <span className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor()}`}>
                <span>{getStatusIcon()}</span>
                <span className="capitalize">{rpcConnectionStatus}</span>
              </span>
            </div>
            <a
              href={`${selectedNetworkData.explorer}/address/${selectedNetworkData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View on Explorer →
            </a>
          </div>
        </Card>
      )}

      {/* Custom RPC URL */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Custom RPC URL (Optional)
        </label>
        <input
          type="url"
          value={customRpcUrl || ''}
          onChange={(e) => setCustomRpcUrl(e.target.value)}
          placeholder="https://..."
          className="block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1 font-mono"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Override the default RPC endpoint. Leave empty to use default public RPCs.
        </p>
      </div>
    </div>
  );
}

interface ChainNetworkCardProps {
  chainGroup: ChainGroup;
  selectedNetwork: string;
  onSelectNetwork: (networkId: string) => void;
  showTestnets: boolean;
}

function ChainNetworkCard({ chainGroup, selectedNetwork, onSelectNetwork, showTestnets }: ChainNetworkCardProps) {
  const chainName = chainGroup.chain.charAt(0).toUpperCase() + chainGroup.chain.slice(1);
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">{chainName}</h4>
        <Badge variant="outline" className="text-xs">
          {chainGroup.testnet ? 'Mainnet + Testnet' : 'Mainnet Only'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mainnet Option */}
        <button
          onClick={() => onSelectNetwork(chainGroup.mainnet.id)}
          className={`p-3 rounded-lg border-2 transition-all text-left ${
            selectedNetwork === chainGroup.mainnet.id
              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
              : 'border-border hover:border-primary/40 hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{chainGroup.mainnet.name}</span>
            <Badge variant="default" className="text-xs">🌐 Mainnet</Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Chain ID: <span className="font-mono">{chainGroup.mainnet.chainId}</span></div>
            <div>Block Time: ~{chainGroup.mainnet.blockTime}s</div>
            <div>Native: {chainGroup.mainnet.nativeCurrency.symbol}</div>
          </div>
        </button>

        {/* Testnet Option */}
        {chainGroup.testnet && showTestnets && (
          <button
            onClick={() => onSelectNetwork(chainGroup.testnet!.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedNetwork === chainGroup.testnet!.id
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">{chainGroup.testnet!.name}</span>
              <Badge variant="secondary" className="text-xs">🧪 Testnet</Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Chain ID: <span className="font-mono">{chainGroup.testnet!.chainId}</span></div>
              <div>Block Time: ~{chainGroup.testnet!.blockTime}s</div>
              <div>Native: {chainGroup.testnet!.nativeCurrency.symbol}</div>
            </div>
          </button>
        )}
      </div>
    </Card>
  );
}

