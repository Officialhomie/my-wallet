'use client';

import { useStore } from '@/store';
import { useEffect } from 'react';

export function NetworkSelector() {
  const {
    selectedNetwork,
    availableNetworks,
    rpcConnectionStatus,
    customRpcUrl,
  } = useStore((state) => state.systemSetup);

  const selectNetwork = useStore((state) => state.selectNetwork);
  const setCustomRpcUrl = useStore((state) => state.setCustomRpcUrl);

  const selectedNetworkData = availableNetworks.find(n => n.id === selectedNetwork);

  // Test connection when component mounts or network changes
  useEffect(() => {
    // Trigger connection test
    useStore.getState().testRpcConnection();
  }, [selectedNetwork, customRpcUrl]);

  const getStatusColor = () => {
    switch (rpcConnectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-muted-foreground';
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

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Network
        </label>
        <select
          value={selectedNetwork}
          onChange={(e) => selectNetwork(e.target.value)}
          className="block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
        >
          {availableNetworks.map((network) => (
            <option key={network.id} value={network.id}>
              {network.name}
            </option>
          ))}
        </select>
      </div>

      {selectedNetworkData && (
        <div className="bg-muted/50 rounded-lg p-4 text-sm border border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-foreground">Chain ID:</span>
              <span className="ml-2 text-muted-foreground font-mono">{selectedNetworkData.chainId}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Block Time:</span>
              <span className="ml-2 text-muted-foreground">~{selectedNetworkData.blockTime}s</span>
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-3">
            <span className="font-medium text-foreground">Status:</span>
            <span className={`flex items-center space-x-2 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor()}`}>
              <span>{getStatusIcon()}</span>
              <span className="capitalize">{rpcConnectionStatus}</span>
            </span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Custom RPC URL (Optional)
        </label>
        <input
          type="url"
          value={customRpcUrl || ''}
          onChange={(e) => setCustomRpcUrl(e.target.value)}
          placeholder="https://..."
          className="block w-full px-3 py-2 text-sm rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Leave empty to use default public RPCs
        </p>
      </div>
    </div>
  );
}
