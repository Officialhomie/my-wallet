'use client';

import { useStore } from '@/store';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Card } from '@/components/shared/Card';
import { Input } from '@/components/shared/Input';

export function FundDistributor() {
  const {
    selectedNetwork,
    fundingWallet,
    isDistributing,
    distributionError,
    distributionHistory,
  } = useStore((state) => state.systemSetup);

  const configureFundingWallet = useStore((state) => state.configureFundingWallet);
  const fetchFundingWallet = useStore((state) => state.fetchFundingWallet);
  const distributeNativeTokens = useStore((state) => state.distributeNativeTokens);
  const distributeERC20Tokens = useStore((state) => state.distributeERC20Tokens);
  const verifyBalances = useStore((state) => state.verifyBalances);

  const [showFundingWalletForm, setShowFundingWalletForm] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [fundingNetwork, setFundingNetwork] = useState(selectedNetwork);
  const [distributionAmount, setDistributionAmount] = useState('0.001');
  const [distributionStrategy, setDistributionStrategy] = useState<'equal' | 'weighted' | 'random' | 'exponential' | 'linear'>('equal');
  const [tokenType, setTokenType] = useState<'native' | 'erc20'>('native');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isConfiguringWallet, setIsConfiguringWallet] = useState(false);

  // Only fetch funding wallet on mount - using useRef to prevent infinite loops
  const hasFetchedFundingWalletRef = useRef(false);
  
  useEffect(() => {
    if (!hasFetchedFundingWalletRef.current) {
      fetchFundingWallet();
      hasFetchedFundingWalletRef.current = true;
    }
  }, []); // Empty dependency array - only run on mount

  // Update funding network when selected network changes (only if wallet not configured)
  useEffect(() => {
    if (!fundingWallet?.configured) {
      setFundingNetwork(selectedNetwork);
    }
  }, [selectedNetwork, fundingWallet?.configured]);

  const handleConfigureFundingWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfiguringWallet(true);
    try {
      await configureFundingWallet(privateKey, fundingNetwork);
      setShowFundingWalletForm(false);
      setPrivateKey('');
    } catch (error) {
      // Error handled in store
    } finally {
      setIsConfiguringWallet(false);
    }
  };

  const handleDistribute = async () => {
    // Validate amount
    const amount = parseFloat(distributionAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    // Check if funding wallet is configured for the selected network
    if (fundingWallet?.configured && fundingWallet.network !== selectedNetwork) {
      // This will be caught by the backend, but we can show a warning
      console.warn(`Funding wallet is configured for ${fundingWallet.network}, but distributing to ${selectedNetwork}`);
    }

    try {
      if (tokenType === 'native') {
        await distributeNativeTokens(selectedNetwork, distributionAmount, distributionStrategy);
      } else {
        await distributeERC20Tokens(selectedNetwork, distributionAmount, distributionStrategy);
      }
      // Refresh funding wallet balance after distribution
      await fetchFundingWallet();
      // Clear any previous verification results
      setVerificationResult(null);
    } catch (error) {
      // Error handled in store - distributionError will be set
      console.error('Distribution error:', error);
    }
  };

  const handleVerifyBalances = async () => {
    try {
      const result = await verifyBalances(selectedNetwork, '0.0001');
      setVerificationResult(result);
    } catch (error) {
      setVerificationResult({ error: 'Failed to verify balances' });
    }
  };

  const latestDistribution = distributionHistory[0];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Fund Distribution</h3>
        <Badge variant={fundingWallet?.configured ? 'success' : 'error'}>
          {fundingWallet?.configured ? 'Wallet Configured' : 'No Wallet'}
        </Badge>
      </div>

      {/* Funding Wallet Configuration Section */}
      {!fundingWallet?.configured ? (
        <section className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">Configure Funding Wallet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Set up a wallet with testnet tokens to fund all test wallets. This wallet will distribute tokens to your wallet farm.
            </p>
          </div>

          {!showFundingWalletForm ? (
            <Button onClick={() => setShowFundingWalletForm(true)} variant="primary">
              Configure Funding Wallet
            </Button>
          ) : (
            <form onSubmit={handleConfigureFundingWallet} className="space-y-4 bg-card rounded-md border border-border p-4 sm:p-6">
              <Input
                label="Private Key"
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x..."
                required
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Network
                </label>
                <select
                  value={fundingNetwork}
                  onChange={(e) => setFundingNetwork(e.target.value)}
                  className="block w-full px-3 py-2 rounded-md border-input bg-background text-foreground focus:border-ring focus:ring-ring focus:ring-1"
                >
                  <option value="sepolia">Sepolia</option>
                  <option value="base-sepolia">Base Sepolia</option>
                  <option value="arbitrum-sepolia">Arbitrum Sepolia</option>
                  <option value="optimism-sepolia">Optimism Sepolia</option>
                </select>
              </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={isConfiguringWallet}>
                    {isConfiguringWallet ? 'Configuring...' : 'Configure'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => {
                      setShowFundingWalletForm(false);
                      setPrivateKey('');
                    }}
                    disabled={isConfiguringWallet}
                  >
                    Cancel
                  </Button>
                </div>
            </form>
          )}
        </section>
      ) : (
        <section className="bg-card rounded-md border border-border p-4 sm:p-6">
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Funding Wallet</h4>
            <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono text-xs">{fundingWallet.address?.slice(0, 10)}...{fundingWallet.address?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-semibold">{fundingWallet.balance} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span>{fundingWallet.network}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Distribution Form Section */}
      {fundingWallet?.configured && (
        <section className="bg-card rounded-md border border-border p-4 sm:p-6 space-y-4">
          <h4 className="font-medium text-foreground">Distribute Tokens</h4>

          {distributionError && (
            <div className="bg-destructive/10 border border-destructive rounded-md p-3 text-sm text-destructive">
              <div className="font-medium mb-1">Distribution Failed</div>
              <div>{distributionError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Token Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTokenType('native')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tokenType === 'native'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Native (ETH)
                </button>
                <button
                  type="button"
                  onClick={() => setTokenType('erc20')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tokenType === 'erc20'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  ERC-20 (USDC)
                </button>
              </div>
            </div>

              <Input
                label="Amount per Wallet"
                type="number"
                step="0.000001"
                min="0"
                value={distributionAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
                    setDistributionAmount(value);
                  }
                }}
                placeholder="0.001"
                required
                error={distributionAmount && parseFloat(distributionAmount) <= 0 ? 'Amount must be greater than 0' : undefined}
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Distribution Strategy
            </label>
            <select
              value={distributionStrategy}
              onChange={(e) => setDistributionStrategy(e.target.value as any)}
              className="block w-full px-3 py-2 rounded-md border-input bg-background text-foreground focus:border-ring focus:ring-ring focus:ring-1"
            >
              <option value="equal">Equal - Same amount to all wallets</option>
              <option value="weighted">Weighted - More to earlier wallets</option>
              <option value="random">Random - 50-150% of base amount</option>
              <option value="exponential">Exponential - First wallet gets most</option>
              <option value="linear">Linear - Gradual decrease</option>
            </select>
          </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleDistribute}
                disabled={isDistributing || !distributionAmount || parseFloat(distributionAmount) <= 0}
                variant="primary"
                className="flex-1"
              >
                {isDistributing ? 'Distributing...' : `Distribute ${tokenType === 'native' ? 'ETH' : 'USDC'}`}
              </Button>
              <Button
                onClick={handleVerifyBalances}
                variant="secondary"
                className="flex-1"
                disabled={isDistributing}
              >
                Verify Balances
              </Button>
            </div>

            {fundingWallet?.configured && fundingWallet.network !== selectedNetwork && (
              <div className="bg-warning/10 border border-warning rounded-md p-3 text-sm text-warning-foreground">
                ⚠️ Funding wallet is configured for <strong>{fundingWallet.network}</strong>, but you're distributing to <strong>{selectedNetwork}</strong>. 
                Make sure the networks match or reconfigure the funding wallet.
              </div>
            )}
        </section>
      )}

      {/* Verification Results Section */}
      {verificationResult && (
        <section className="bg-card rounded-md border border-border p-3 sm:p-6 space-y-2 rounded-[5px]">
          <h4 className="font-medium text-foreground">Balance Verification</h4>
          {verificationResult.error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive font-medium">Verification Failed</p>
              <p className="text-sm text-destructive">{verificationResult.error}</p>
              {verificationResult.details && (
                <p className="text-xs text-muted-foreground">{verificationResult.details}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={verificationResult.allSufficient ? 'success' : 'warning'}>
                  {verificationResult.allSufficient ? 'All Sufficient' : 'Some Insufficient'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Checked {verificationResult.checkedWallets || verificationResult.totalWallets || 0} wallets
                </span>
              </div>
              {verificationResult.insufficientWallets && verificationResult.insufficientWallets.length > 0 && (
                <div className="bg-warning/10 border border-warning rounded-md p-3">
                  <p className="text-sm font-medium mb-2">
                    {verificationResult.insufficientWallets.length} wallets need funding:
                  </p>
                  <div className="space-y-1 text-xs">
                    {verificationResult.insufficientWallets.slice(0, 5).map((w: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-mono">Wallet #{w.index}</span>
                        <span>{w.currentBalance?.toFixed(6) || w.currentBalance} / {w.required} {verificationResult.tokenType === 'ERC20' ? 'tokens' : 'ETH'}</span>
                      </div>
                    ))}
                    {verificationResult.insufficientWallets.length > 5 && (
                      <p className="text-muted-foreground">...and {verificationResult.insufficientWallets.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
              {verificationResult.allSufficient && (
                <div className="bg-success/10 border border-success rounded-md p-3">
                  <p className="text-sm font-medium text-success">
                    ✅ All wallets have sufficient balance ({verificationResult.minimumRequired} {verificationResult.tokenType === 'ERC20' ? 'tokens' : 'ETH'} minimum)
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Latest Distribution Result Section */}
      {latestDistribution && (
        <section className="bg-card rounded-md border border-border p-4 sm:p-6 space-y-3">
          <h4 className="font-medium text-foreground">Latest Distribution</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Total Wallets</div>
              <div className="font-semibold">{latestDistribution.totalWallets}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Successful</div>
              <div className="font-semibold text-success">{latestDistribution.successful}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Failed</div>
              <div className="font-semibold text-error">{latestDistribution.failed}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Distributed</div>
              <div className="font-semibold">{latestDistribution.totalDistributed} {tokenType === 'native' ? 'ETH' : 'USDC'}</div>
            </div>
          </div>
          {latestDistribution.duration && (
            <div className="text-xs text-muted-foreground">
              Completed in {(latestDistribution.duration / 1000).toFixed(1)}s
            </div>
          )}
        </section>
      )}
    </div>
  );
}

