import { AppStore } from '../index';

/**
 * Selects the number of active wallets.
 */
export const selectActiveWalletsCount = (state: AppStore): number => {
  return Object.values(state.walletActivity.wallets).filter(w => w.status === 'active').length;
};

/**
 * Selects the number of error wallets.
 */
export const selectErrorWalletsCount = (state: AppStore): number => {
  return Object.values(state.walletActivity.wallets).filter(w => w.status === 'error').length;
};

/**
 * Selects the number of completed wallets.
 */
export const selectCompletedWalletsCount = (state: AppStore): number => {
  return Object.values(state.walletActivity.wallets).filter(w => w.status === 'completed').length;
};

/**
 * Selects global statistics for all wallets.
 */
export const selectWalletGlobalStats = (state: AppStore) => {
  const wallets = Object.values(state.walletActivity.wallets);
  
  let totalTransactions = 0;
  let successfulTransactions = 0;
  let failedTransactions = 0;
  let totalGasUsed = 0;

  wallets.forEach(wallet => {
    totalTransactions += wallet.transactionCount.total;
    successfulTransactions += wallet.transactionCount.completed;
    failedTransactions += wallet.transactionCount.failed;
    totalGasUsed += parseFloat(wallet.gasUsed);
  });

  return {
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    totalGasUsed: totalGasUsed.toFixed(6),
  };
};

/**
 * Selects a combined object of wallet activity metrics.
 */
export const selectWalletActivityMetrics = (state: AppStore) => ({
  activeWallets: selectActiveWalletsCount(state),
  errorWallets: selectErrorWalletsCount(state),
  completedWallets: selectCompletedWalletsCount(state),
  globalStats: selectWalletGlobalStats(state),
});

