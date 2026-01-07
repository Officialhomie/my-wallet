'use client';

import { useStore } from '@/store';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/shared/Button';
import { api } from '@/lib/api';

interface WalletBalance {
  index: number;
  address: string;
  eth: string;
  usdc: string;
  network: string;
  error?: string;
}

export function WalletFarmInfo() {
  const {
    walletFarmInfo,
    walletCount,
    isLoading,
    error,
    selectedNetwork
  } = useStore((state) => state.systemSetup);

  const fetchWalletFarmInfo = useStore((state) => state.fetchWalletFarmInfo);
  const setWalletCount = useStore((state) => state.setWalletCount);

  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [inputWalletCount, setInputWalletCount] = useState(walletCount.toString());
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Only fetch on mount - using useRef to prevent infinite loops
  const hasFetchedRef = useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchWalletFarmInfo();
      hasFetchedRef.current = true;
    }
  }, []); // Empty dependency array - only run on mount

  // Refetch when walletCount changes (user changes the count)
  // Using a separate ref to track previous walletCount to avoid unnecessary refetches
  const prevWalletCountRef = useRef(walletCount);
  
  useEffect(() => {
    // Only refetch if walletCount actually changed (not on initial mount)
    if (hasFetchedRef.current && walletCount !== prevWalletCountRef.current) {
      fetchWalletFarmInfo();
      prevWalletCountRef.current = walletCount;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletCount]); // Only depend on walletCount - fetchWalletFarmInfo is stable from Zustand

  // Fetch balances when wallet farm info is available and network is selected
  const hasFetchedBalancesRef = useRef(false);
  const prevNetworkRef = useRef(selectedNetwork);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!walletFarmInfo || !selectedNetwork || !walletFarmInfo.addresses?.length) {
        return;
      }

      // Only fetch if network changed or balances haven't been fetched yet
      if (hasFetchedBalancesRef.current && selectedNetwork === prevNetworkRef.current) {
        return;
      }

      setLoadingBalances(true);
      setBalanceError(null);
      hasFetchedBalancesRef.current = true;
      prevNetworkRef.current = selectedNetwork;

      try {
        const result = await api.getWalletBalances(selectedNetwork);
        if (result.balances) {
          setBalances(result.balances);
        }
      } catch (err: any) {
        console.error('Error fetching balances:', err);
        setBalanceError(err.message || 'Failed to load balances');
        setBalances([]);
      } finally {
        setLoadingBalances(false);
      }
    };

    fetchBalances();
  }, [walletFarmInfo, selectedNetwork]);

  const handleWalletCountChange = (value: string) => {
    setInputWalletCount(value);
    const count = parseInt(value);
    if (count >= 1 && count <= 50) { // Reasonable limits
      setWalletCount(count);
    }
  };

  const handleRegenerate = () => {
    fetchWalletFarmInfo();
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-destructive">⚠️</span>
            <span className="text-sm font-medium text-destructive">Error loading wallet information</span>
          </div>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          <Button
            onClick={handleRegenerate}
            variant="secondary"
            size="sm"
            className="mt-3"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Number of Wallets to Generate
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              min="1"
              max="50"
              value={inputWalletCount}
              onChange={(e) => handleWalletCountChange(e.target.value)}
              className="w-24 px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md focus:border-ring focus:ring-ring focus:ring-1"
              placeholder="10"
            />
            <span className="text-sm text-muted-foreground">
              wallets (1-50)
            </span>
            <Button
              onClick={handleRegenerate}
              variant="secondary"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Regenerate'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            These wallets will be derived from your mnemonic phrase for testing purposes.
          </p>
        </div>
      </div>

      {/* Wallet Farm Information */}
      {walletFarmInfo && (
        <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Tvrch Wallet Farm
            </h3>
            <div className="text-sm text-muted-foreground">
              {walletFarmInfo.totalWallets} wallets generated
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {walletFarmInfo.totalWallets}
              </div>
              <div className="text-sm text-muted-foreground">Total Wallets</div>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                HD
              </div>
              <div className="text-sm text-muted-foreground">Hierarchical Deterministic</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                ✓
              </div>
              <div className="text-sm text-muted-foreground">Ready for Testing</div>
            </div>
          </div>

          {/* Seed Phrase Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Seed Phrase</span>
              <span className="text-xs text-muted-foreground">Secure derivation</span>
            </div>
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <code className="text-sm font-mono text-foreground">
                {walletFarmInfo.mnemonicPreview}
              </code>
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Seed phrase is securely stored server-side and never exposed to the client.
              </p>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <span>🔐</span>
                <span>Secure</span>
              </div>
            </div>
          </div>

          {/* Wallet Addresses */}
          <div className="bg-card border border-border rounded-[5px] pt-[25px] pb-[10px] pl-[25px] pr-[20px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">
                Wallet Addresses
              </span>
              <div className="flex items-center gap-2">
                {selectedNetwork && (
                  <span className="text-xs text-muted-foreground">
                    Network: {selectedNetwork}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {showAllAddresses ? 'All' : 'First 3'} of {walletFarmInfo.totalWallets}
                </span>
                {selectedNetwork && (
                  <Button
                    onClick={async () => {
                      setLoadingBalances(true);
                      setBalanceError(null);
                      try {
                        const result = await api.getWalletBalances(selectedNetwork);
                        if (result.balances) {
                          setBalances(result.balances);
                        }
                      } catch (err: any) {
                        setBalanceError(err.message || 'Failed to load balances');
                      } finally {
                        setLoadingBalances(false);
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    disabled={loadingBalances}
                    className="h-6 px-2 text-xs"
                  >
                    {loadingBalances ? 'Loading...' : '🔄 Refresh'}
                  </Button>
                )}
              </div>
            </div>

            {balanceError && (
              <div className="mb-3 bg-destructive/10 border border-destructive rounded-md p-2 text-xs text-destructive">
                {balanceError}
              </div>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {(showAllAddresses ? walletFarmInfo.addresses : walletFarmInfo.addresses.slice(0, 3)).map((address, index) => {
                const balance = balances.find(b => b.index === index || b.address.toLowerCase() === address.toLowerCase());
                const ethBalance = balance ? parseFloat(balance.eth).toFixed(6) : loadingBalances ? '...' : '0.000000';
                const usdcBalance = balance ? parseFloat(balance.usdc).toFixed(2) : loadingBalances ? '...' : '0.00';

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted/30 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">#{index}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-mono text-foreground break-all block">
                          {address}
                        </code>
                        <div className="flex items-center gap-4 mt-1 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">ETH:</span>
                            <span className={`font-medium ${parseFloat(ethBalance) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {ethBalance}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">USDC:</span>
                            <span className={`font-medium ${parseFloat(usdcBalance) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {usdcBalance}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                      Wallet {index}
                    </div>
                  </div>
                );
              })}
            </div>

            {walletFarmInfo.totalWallets > 3 && (
              <Button
                onClick={() => setShowAllAddresses(!showAllAddresses)}
                variant="ghost"
                size="sm"
                className="w-full mt-3"
              >
                {showAllAddresses
                  ? `Show Less (First 3)`
                  : `Show All ${walletFarmInfo.totalWallets} Wallets`
                }
              </Button>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• All wallets are derived from the same mnemonic for consistency</p>
              <p>• Addresses are generated deterministically (same input = same output)</p>
              <p>• These wallets can be funded and used for contract testing</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
