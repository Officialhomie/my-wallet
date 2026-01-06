import { selectActiveWalletsCount, selectErrorWalletsCount, selectCompletedWalletsCount, selectWalletGlobalStats } from './walletSelectors';
import { AppStore } from '../index';

describe('Wallet Selectors', () => {
  const mockState = {
    walletActivity: {
      wallets: {
        0: {
          status: 'active',
          transactionCount: { total: 10, completed: 8, failed: 2, pending: 0 },
          gasUsed: '0.01'
        },
        1: {
          status: 'error',
          transactionCount: { total: 5, completed: 2, failed: 3, pending: 0 },
          gasUsed: '0.005'
        },
        2: {
          status: 'completed',
          transactionCount: { total: 20, completed: 20, failed: 0, pending: 0 },
          gasUsed: '0.02'
        },
        3: {
          status: 'idle',
          transactionCount: { total: 0, completed: 0, failed: 0, pending: 0 },
          gasUsed: '0'
        }
      }
    }
  } as unknown as AppStore;

  it('selectActiveWalletsCount returns correct count', () => {
    expect(selectActiveWalletsCount(mockState)).toBe(1);
  });

  it('selectErrorWalletsCount returns correct count', () => {
    expect(selectErrorWalletsCount(mockState)).toBe(1);
  });

  it('selectCompletedWalletsCount returns correct count', () => {
    expect(selectCompletedWalletsCount(mockState)).toBe(1);
  });

  it('selectWalletGlobalStats returns correctly aggregated stats', () => {
    const stats = selectWalletGlobalStats(mockState);
    expect(stats.totalTransactions).toBe(35);
    expect(stats.successfulTransactions).toBe(30);
    expect(stats.failedTransactions).toBe(5);
    expect(stats.totalGasUsed).toBe('0.035000');
  });
});

