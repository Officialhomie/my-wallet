// Domain 5: Wallet Activity Store Slice

import { WalletActivityState, WalletActivity } from '@/types/domain-5';
import { ArchetypeName } from '@/types/domain-2';

export interface WalletActivitySlice {
  walletActivity: WalletActivityState;

  // Actions
  initializeWallets: (count: number) => void;
  updateWalletActivity: (walletIndex: number, activity: Partial<WalletActivity>) => void;
  updateWalletStatus: (walletIndex: number, status: WalletActivity['status']) => void;
  updateWalletTransaction: (walletIndex: number, success: boolean) => void;
  simulateWalletUpdates: () => void;
  resetWalletActivity: () => void;
  // ❌ REMOVED: updateGlobalStats - now derived via selectors
}

const createWallet = (index: number, archetype: ArchetypeName): WalletActivity => ({
  index,
  address: `0x${Math.random().toString(16).substr(2, 40)}`,
  archetype,
  status: 'idle',
  transactionCount: {
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0,
  },
  successRate: {
    percentage: 100,
    successful: 0,
    total: 0,
  },
  gasUsed: '0',
  isActive: false,
  errorCount: 0,
});

const initialState: WalletActivityState = {
  wallets: {},
  totalWallets: 0,
  // ❌ REMOVED: activeWallets, errorWallets, completedWallets, globalStats
  lastUpdate: Date.now(),
};

export const walletActivitySlice = (set: (partial: any) => void, get: () => WalletActivitySlice): WalletActivitySlice => ({
  walletActivity: initialState,

  initializeWallets: (count) => {
    const archetypes: ArchetypeName[] = ['whale', 'trader', 'casual', 'lurker', 'researcher'];
    const wallets: Record<number, WalletActivity> = {};

    for (let i = 0; i < count; i++) {
      const archetype = archetypes[Math.floor(Math.random() * archetypes.length)];
      wallets[i] = createWallet(i, archetype);
    }

    set((state: WalletActivitySlice) => ({
      walletActivity: {
        ...state.walletActivity,
        wallets,
        totalWallets: count,
        lastUpdate: Date.now(),
      }
    }));
  },

  updateWalletActivity: (walletIndex, activity) => {
    set((state: WalletActivitySlice) => ({
      walletActivity: {
        ...state.walletActivity,
        wallets: {
          ...state.walletActivity.wallets,
          [walletIndex]: {
            ...state.walletActivity.wallets[walletIndex],
            ...activity,
          },
        },
        lastUpdate: Date.now(),
      }
    }));
  },

  updateWalletStatus: (walletIndex, status) => {
    set((state: WalletActivitySlice) => ({
      walletActivity: {
        ...state.walletActivity,
        wallets: {
          ...state.walletActivity.wallets,
          [walletIndex]: {
            ...state.walletActivity.wallets[walletIndex],
            status,
            isActive: status === 'active',
          },
        },
        lastUpdate: Date.now(),
      }
    }));

    // ✅ REMOVED: get().updateGlobalStats() call
  },

  updateWalletTransaction: (walletIndex, success) => {
    set((state: WalletActivitySlice) => {
      const wallet = state.walletActivity.wallets[walletIndex];
      if (!wallet) return state;

      const newTransactionCount = {
        ...wallet.transactionCount,
        total: wallet.transactionCount.total + 1,
        completed: success ? wallet.transactionCount.completed + 1 : wallet.transactionCount.completed,
        failed: success ? wallet.transactionCount.failed : wallet.transactionCount.failed + 1,
      };

      const newSuccessRate = {
        successful: success ? wallet.successRate.successful + 1 : wallet.successRate.successful,
        total: wallet.successRate.total + 1,
        percentage: Math.round(((success ? wallet.successRate.successful + 1 : wallet.successRate.successful) / (wallet.successRate.total + 1)) * 100),
      };

      return {
        walletActivity: {
          ...state.walletActivity,
          wallets: {
            ...state.walletActivity.wallets,
            [walletIndex]: {
              ...wallet,
              transactionCount: newTransactionCount,
              successRate: newSuccessRate,
              lastAction: {
                method: 'transfer(address,uint256)',
                timestamp: Date.now(),
                status: success ? 'success' : 'failed',
              },
            },
          },
          lastUpdate: Date.now(),
        }
      };
    });

    // ✅ REMOVED: get().updateGlobalStats() call
  },

  simulateWalletUpdates: () => {
    const state = get();
    const { wallets, totalWallets } = state.walletActivity;

    if (totalWallets === 0) return;

    // Randomly update some wallets
    const walletsToUpdate = Math.min(3, Math.floor(Math.random() * totalWallets) + 1);

    for (let i = 0; i < walletsToUpdate; i++) {
      const walletIndex = Math.floor(Math.random() * totalWallets);
      const wallet = wallets[walletIndex];

      if (!wallet) continue;

      // Randomly decide if this wallet should be active
      const shouldBeActive = Math.random() < 0.7; // 70% chance of activity

      if (shouldBeActive) {
        get().updateWalletStatus(walletIndex, 'active');

        // Simulate a transaction
        const success = Math.random() > 0.1; // 90% success rate
        get().updateWalletTransaction(walletIndex, success);
      } else {
        get().updateWalletStatus(walletIndex, 'idle');
      }
    }
  },

  resetWalletActivity: () => {
    set({ walletActivity: initialState });
  },

  // ❌ REMOVED: updateGlobalStats method implementation
});