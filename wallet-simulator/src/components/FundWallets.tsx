'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Send, RefreshCw, AlertCircle, CheckCircle, Key, DollarSign, Coins } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FundWalletsProps {
  className?: string;
  selectedNetwork?: string;
  onNetworkChange?: (network: string) => void;
}

interface FundingWallet {
  configured: boolean;
  address?: string;
  balance?: string;
  network?: string;
}

interface BalanceVerification {
  network: string;
  minBalance: string;
  allFunded: boolean;
  funded: number;
  unfunded: number;
  details: Array<{
    index: number;
    address: string;
    currentBalance: string;
    required: string;
    sufficient: boolean;
  }>;
}

export function FundWallets({ className, selectedNetwork = 'sepolia', onNetworkChange }: FundWalletsProps) {
  const [fundingWallet, setFundingWallet] = useState<FundingWallet>({ configured: false });
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Distribution state
  const [nativeAmount, setNativeAmount] = useState('0.01');
  const [erc20Address, setErc20Address] = useState('');
  const [erc20Amount, setErc20Amount] = useState('');
  const [strategy, setStrategy] = useState<'equal' | 'weighted' | 'random'>('equal');
  const [balanceVerification, setBalanceVerification] = useState<BalanceVerification | null>(null);

  // Network selection for funding
  const [fundingNetwork, setFundingNetwork] = useState(selectedNetwork);

  // Auto-reconfigure funding wallet when network changes (if private key exists)
  useEffect(() => {
    if (privateKey.trim() && fundingWallet.configured && fundingWallet.network !== fundingNetwork) {
      // Automatically reconfigure for the new network
      configureFundingWallet(true);
    }
  }, [fundingNetwork]);

  const networks = [
    { id: 'sepolia', name: 'Sepolia', chainId: 11155111 },
    { id: 'base-sepolia', name: 'Base Sepolia', chainId: 84532 },
    { id: 'arbitrum-sepolia', name: 'Arbitrum Sepolia', chainId: 421614 },
    { id: 'polygon-mumbai', name: 'Polygon Mumbai', chainId: 80001 },
    { id: 'optimism-sepolia', name: 'Optimism Sepolia', chainId: 11155420 },
    { id: 'ethereum', name: 'Ethereum Mainnet', chainId: 1 },
  ];

  // Load funding wallet on mount
  useEffect(() => {
    loadFundingWallet();
  }, []);

  const loadFundingWallet = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/funding/wallet');
      const data = await response.json();
      setFundingWallet(data);
    } catch (error) {
      console.error('Failed to load funding wallet:', error);
    }
  };

  const configureFundingWallet = async (isAutoReconfig = false) => {
    if (!privateKey.trim()) {
      setError('Private key is required');
      return;
    }

    if (!isAutoReconfig) {
      setLoading(true);
      setError(null);
      setSuccess(null);
    }

    try {
      const response = await fetch('http://localhost:3001/api/funding/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          privateKey: privateKey.trim(),
          network: fundingNetwork,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to configure funding wallet');
      }

      const data = await response.json();
      setFundingWallet({
        configured: true,
        address: data.address,
        balance: data.balance,
        network: data.network,
      });

      if (!isAutoReconfig) {
        setSuccess('Funding wallet configured successfully!');
        setPrivateKey('');
        setShowPrivateKey(false);
      }
    } catch (error) {
      if (!isAutoReconfig) {
        setError(error instanceof Error ? error.message : 'Failed to configure funding wallet');
      }
    } finally {
      if (!isAutoReconfig) {
        setLoading(false);
      }
    }
  };

  const distributeNativeTokens = async () => {
    if (!fundingWallet.configured) {
      setError('Please configure a funding wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3001/api/funding/distribute/native', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: fundingNetwork,
          amount: nativeAmount,
          strategy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to distribute native tokens');
      }

      const data = await response.json();
      setSuccess(`Successfully distributed ${nativeAmount} ETH to ${data.transactions} wallets!`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to distribute native tokens');
    } finally {
      setLoading(false);
    }
  };

  const distributeERC20Tokens = async () => {
    if (!fundingWallet.configured) {
      setError('Please configure a funding wallet first');
      return;
    }

    if (!erc20Address.trim() || !erc20Amount.trim()) {
      setError('ERC-20 address and amount are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:3001/api/funding/distribute/erc20', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: fundingNetwork,
          tokenAddress: erc20Address.trim(),
          amount: erc20Amount,
          strategy,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to distribute ERC-20 tokens');
      }

      const data = await response.json();
      setSuccess(`Successfully distributed ${erc20Amount} tokens to ${data.transactions} wallets!`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to distribute ERC-20 tokens');
    } finally {
      setLoading(false);
    }
  };

  const verifyBalances = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/api/funding/verify/${fundingNetwork}?minBalance=${nativeAmount}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify balances');
      }

      const data = await response.json();
      setBalanceVerification(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify balances');
    } finally {
      setLoading(false);
    }
  };

  const selectedNetworkInfo = networks.find(n => n.id === fundingNetwork);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fund Wallets</h3>
          <p className="text-sm text-muted-foreground">
            Funding on {selectedNetworkInfo?.name} (Chain ID: {selectedNetworkInfo?.chainId})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={cn('w-2 h-2 rounded-full', fundingWallet.configured ? 'bg-green-500' : 'bg-red-500')} />
          <span className="text-sm">
            {fundingWallet.configured
              ? `Wallet Configured (${fundingWallet.network})`
              : 'Wallet Not Configured'
            }
          </span>
        </div>
      </div>

      {/* Network Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Select Funding Network</label>
        <select
          value={fundingNetwork}
          onChange={(e) => setFundingNetwork(e.target.value)}
          className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {networks.map(network => (
            <option key={network.id} value={network.id}>
              {network.name} (Chain ID: {network.chainId})
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Choose the network where you want to distribute funds. Your funding wallet must have balance on this network.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Configure Funding Wallet */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Key className="w-4 h-4" />
          <h4 className="text-md font-medium">Configure Funding Wallet</h4>
        </div>

        {!fundingWallet.configured ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Private Key</label>
              <div className="flex space-x-2">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm"
                >
                  {showPrivateKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ This wallet must have sufficient funds on {fundingNetwork}
              </p>
            </div>

            <button
              onClick={() => configureFundingWallet(false)}
              disabled={loading || !privateKey.trim()}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors',
                privateKey.trim() && !loading
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Wallet className="w-4 h-4" />
              <span>{loading ? 'Configuring...' : 'Configure Funding Wallet'}</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">Funding Wallet Configured</p>
                <p className="text-xs text-green-600 font-mono break-all">{fundingWallet.address}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {fundingWallet.balance && (
                    <p className="text-xs text-green-600">Balance: {fundingWallet.balance} ETH</p>
                  )}
                  <button
                    onClick={loadFundingWallet}
                    disabled={loading}
                    className="text-xs px-2 py-1 bg-green-200 hover:bg-green-300 text-green-800 rounded transition-colors disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
        )}
      </div>

      {fundingWallet.configured && (
        <>
          {/* Balance Verification */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <h4 className="text-md font-medium">Check Wallet Balances</h4>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={nativeAmount}
                onChange={(e) => setNativeAmount(e.target.value)}
                placeholder="0.01"
                className="w-24 px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="flex items-center text-sm text-muted-foreground">ETH minimum</span>
              <button
                onClick={verifyBalances}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{loading ? 'Checking...' : 'Verify Balances'}</span>
              </button>
            </div>

            {balanceVerification && (
              <div className="p-3 bg-card border border-border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Balance Check Results</span>
                  <div className={cn('px-2 py-1 rounded text-xs font-medium',
                    balanceVerification.allFunded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {balanceVerification.allFunded ? 'All Funded' :
                     `${balanceVerification.unfunded || 0} Need Funds`}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {balanceVerification.funded || 0} funded, {balanceVerification.unfunded || 0} unfunded
                  {balanceVerification.minBalance && (
                    <span> (min: {balanceVerification.minBalance} ETH)</span>
                  )}
                </div>
                {balanceVerification.details && balanceVerification.details.length > 0 && (
                  <div className="mt-2 text-xs">
                    <details>
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View details ({balanceVerification.details.length} wallets)
                      </summary>
                      <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {balanceVerification.details.slice(0, 10).map((wallet: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="font-mono">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
                            <span className={wallet.sufficient ? 'text-green-600' : 'text-red-600'}>
                              {wallet.currentBalance} ETH {wallet.sufficient ? '✓' : '✗'}
                            </span>
                          </div>
                        ))}
                        {balanceVerification.details.length > 10 && (
                          <div className="text-xs text-muted-foreground">
                            ... and {balanceVerification.details.length - 10} more
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Distribute Native Tokens */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4" />
              <h4 className="text-md font-medium">Distribute Native Tokens (ETH)</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Amount per wallet</label>
                <input
                  type="text"
                  value={nativeAmount}
                  onChange={(e) => setNativeAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Distribution Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as 'equal' | 'weighted' | 'random')}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="equal">Equal</option>
                  <option value="weighted">Weighted</option>
                  <option value="random">Random</option>
                </select>
              </div>
            </div>

            <button
              onClick={distributeNativeTokens}
              disabled={loading}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors',
                !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Distributing...' : `Distribute ${nativeAmount} ETH to All Wallets`}</span>
            </button>
          </div>

          {/* Distribute ERC-20 Tokens */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <h4 className="text-md font-medium">Distribute ERC-20 Tokens</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Token Contract Address</label>
                <input
                  type="text"
                  value={erc20Address}
                  onChange={(e) => setErc20Address(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Amount per wallet</label>
                <input
                  type="text"
                  value={erc20Amount}
                  onChange={(e) => setErc20Amount(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              onClick={distributeERC20Tokens}
              disabled={loading || !erc20Address.trim() || !erc20Amount.trim()}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors',
                !loading && erc20Address.trim() && erc20Amount.trim()
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Distributing...' : `Distribute ${erc20Amount} Tokens to All Wallets`}</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <h5 className="text-sm font-medium text-yellow-800 mb-2">Funding Instructions:</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Your funding wallet must have sufficient balance on {fundingNetwork}</li>
              <li>• For testnets, get free ETH from faucets (e.g., sepoliafaucet.com)</li>
              <li>• ERC-20 distributions require the token contract to have enough balance</li>
              <li>• Use "Verify Balances" to check which wallets need funding</li>
              <li>• Distribution includes gas fees, so fund more than the target amount</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
