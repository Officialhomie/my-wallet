'use client';

import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { Button } from '@/components/shared/Button';

export function WalletFarmInfo() {
  const {
    walletFarmInfo,
    walletCount,
    isLoading,
    error
  } = useStore((state) => state.systemSetup);

  const fetchWalletFarmInfo = useStore((state) => state.fetchWalletFarmInfo);
  const setWalletCount = useStore((state) => state.setWalletCount);

  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [inputWalletCount, setInputWalletCount] = useState(walletCount.toString());

  // Only fetch on mount - using useRef to prevent infinite loops
  const hasFetchedRef = React.useRef(false);
  
  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchWalletFarmInfo();
      hasFetchedRef.current = true;
    }
  }, []); // Empty dependency array - only run on mount

  // Refetch when walletCount changes (user changes the count)
  useEffect(() => {
    if (hasFetchedRef.current && walletCount) {
      fetchWalletFarmInfo();
    }
  }, [walletCount]); // Only depend on walletCount

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
              Wallet Farm
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

          {/* Mnemonic Preview */}
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
                All wallets are deterministically derived from a secure seed phrase.
              </p>
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <span>🔐</span>
                <span>Secure derivation</span>
              </div>
            </div>
          </div>

          {/* Wallet Addresses */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">
                Wallet Addresses
              </span>
              <span className="text-xs text-muted-foreground">
                {showAllAddresses ? 'All' : 'First 3'} of {walletFarmInfo.totalWallets}
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {(showAllAddresses ? walletFarmInfo.addresses : walletFarmInfo.addresses.slice(0, 3)).map((address, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-muted/30 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">#{index}</span>
                    </div>
                    <code className="text-sm font-mono text-foreground break-all">
                      {address}
                    </code>
                  </div>
                  <div className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                    Wallet {index}
                  </div>
                </div>
              ))}
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
