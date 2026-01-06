'use client';

import { useStore } from '@/store';
import { selectWalletSelectorData } from '@/store/selectors/configSelectors';

export function WalletSelector() {
  const { 
    walletFarmInfo, 
    walletSelection,
    setWalletSelectionMode,
    setSingleWallet,
    toggleWallet
  } = useStore(selectWalletSelectorData);

  if (!walletFarmInfo) {
    return (
      <div className="text-center py-8 text-gray-500">
        Wallet information not available
      </div>
    );
  }

  const walletCount = walletFarmInfo.totalWallets;
  const walletAddresses = walletFarmInfo.addresses;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Wallet Selection <span className="text-destructive text-xs">*</span></h3>

      {/* Mode Selection */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setWalletSelectionMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
              walletSelection.mode === 'single'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
            }`}
          >
            Single Wallet
          </button>
          <button
            onClick={() => setWalletSelectionMode('multiple')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 sm:flex-none ${
              walletSelection.mode === 'multiple'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
            }`}
          >
            Multiple Wallets
          </button>
        </div>

        {/* Single Wallet Selection */}
        {walletSelection.mode === 'single' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Wallet
            </label>
            <select
              value={walletSelection.singleWallet || 0}
              onChange={(e) => setSingleWallet(parseInt(e.target.value))}
              className="block w-full px-3 py-2 rounded-md border-input bg-background text-foreground shadow-sm focus:border-ring focus:ring-ring focus:ring-1"
            >
              {Array.from({ length: walletCount }, (_, i) => (
                <option key={i} value={i}>
                  Wallet #{i} - {walletAddresses[i] || `Address ${i}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multiple Wallet Selection */}
        {walletSelection.mode === 'multiple' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Select Wallets ({(walletSelection.multipleWallets || []).length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              {Array.from({ length: walletCount }, (_, i) => {
                const isSelected = (walletSelection.multipleWallets || []).includes(i);
                const address = walletAddresses[i];

                return (
                  <label key={i} className="flex items-center space-x-3 p-2 border border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleWallet(i)}
                      className="text-primary focus:ring-ring"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">Wallet #{i}</div>
                      {address && (
                        <div className="text-sm text-muted-foreground font-mono truncate">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
