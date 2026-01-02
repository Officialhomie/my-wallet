'use client';

import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WalletBalance {
  index: number;
  address: string;
  network: string;
  eth: {
    balance: string;
    raw: string;
    status: 'success' | 'error' | 'not_configured' | 'mock' | 'loading' | 'not_available';
    error?: string;
  };
  usdc: {
    balance: string;
    raw: string;
    status: 'success' | 'error' | 'not_configured' | 'mock' | 'loading' | 'not_available';
    error?: string;
  };
}

interface WalletBalancesProps {
  className?: string;
  selectedNetwork?: string;
  onNetworkChange?: (network: string) => void;
}

export function WalletBalances({ className, selectedNetwork = 'sepolia', onNetworkChange }: WalletBalancesProps) {
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNetwork, setCurrentNetwork] = useState(selectedNetwork);

  const networks = [
    { id: 'sepolia', name: 'Sepolia', chainId: 11155111 },
    { id: 'base-sepolia', name: 'Base Sepolia', chainId: 84532 },
    { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', chainId: 421614 },
    { id: 'polygon-mumbai', name: 'Polygon Mumbai', chainId: 80001 },
    { id: 'optimism-sepolia', name: 'Optimism Sepolia', chainId: 11155420 },
    { id: 'ethereum', name: 'Ethereum Mainnet', chainId: 1 },
  ];

  const fetchBalances = async (network: string = currentNetwork) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:3001/api/wallets/balances/${network}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWallets(data.wallets);
      setCurrentNetwork(network);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkChange = (network: string) => {
    fetchBalances(network);
    onNetworkChange?.(network);
  };

  useEffect(() => {
    fetchBalances(selectedNetwork);
  }, [selectedNetwork]);

  useEffect(() => {
    // Refetch when selectedNetwork prop changes
    if (selectedNetwork !== currentNetwork) {
      fetchBalances(selectedNetwork);
    }
  }, [selectedNetwork]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'mock':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Live';
      case 'error':
        return 'Error';
      case 'mock':
        return 'Demo';
      default:
        return 'Not configured';
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading wallet balances...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-500 mb-2">Failed to load balances</p>
          <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => fetchBalances(currentNetwork)}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentNetworkInfo = networks.find(n => n.id === currentNetwork);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Wallet Balances</h3>
          <p className="text-sm text-muted-foreground">
            {currentNetworkInfo?.name} (Chain ID: {currentNetworkInfo?.chainId})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={currentNetwork}
            onChange={(e) => handleNetworkChange(e.target.value)}
            className="px-3 py-2 bg-card border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {networks.map(network => (
              <option key={network.id} value={network.id}>
                {network.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchBalances(currentNetwork)}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {wallets.map((wallet) => (
          <div
            key={wallet.index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="font-medium">Wallet #{wallet.index}</span>
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {formatAddress(wallet.address)}
                </code>
                <button
                  onClick={() => copyToClipboard(wallet.address)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={() => window.open(`https://sepolia.etherscan.io/address/${wallet.address}`, '_blank')}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ETH Balance */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">ETH Balance</span>
                  {getStatusIcon(wallet.eth.status)}
                  <span className="text-xs text-muted-foreground">
                    {getStatusText(wallet.eth.status)}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {wallet.eth.balance} ETH
                </div>
                {wallet.eth.error && (
                  <p className="text-xs text-red-500">{wallet.eth.error}</p>
                )}
              </div>

              {/* USDC Balance */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">USDC Balance</span>
                  {getStatusIcon(wallet.usdc.status)}
                  <span className="text-xs text-muted-foreground">
                    {getStatusText(wallet.usdc.status)}
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {wallet.usdc.balance} USDC
                </div>
                {wallet.usdc.error && (
                  <p className="text-xs text-red-500">{wallet.usdc.error}</p>
                )}
              </div>
            </div>

            {/* Raw balance data for debugging */}
            <div className="mt-3 pt-3 border-t border-border">
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">Raw data</summary>
                <div className="mt-2 space-y-1">
                  <div>ETH: {wallet.eth.raw} wei</div>
                  <div>USDC: {wallet.usdc.raw} (6 decimals)</div>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Status Legend:</strong></p>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Live: Real blockchain data</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-yellow-500" />
            <span>Demo: Mock data for testing</span>
          </span>
          <span className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 text-gray-500" />
            <span>Not configured: RPC not set up</span>
          </span>
        </div>
      </div>
    </div>
  );
}
