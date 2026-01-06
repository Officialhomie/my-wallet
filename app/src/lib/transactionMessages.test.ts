import { describe, it, expect } from '@jest/globals';
import {
  getPhaseIcon,
  getPhaseColor,
  formatDuration,
  getPhaseMessage,
  estimateEta
} from './transactionMessages';
import type { TransactionLifecycle } from '@/types/transaction';

describe('Transaction Messages', () => {
  describe('getPhaseIcon', () => {
    it('returns correct icon for each phase', () => {
      expect(getPhaseIcon('preparing')).toBe('⚙️');
      expect(getPhaseIcon('validating')).toBe('🔍');
      expect(getPhaseIcon('estimating-gas')).toBe('💰');
      expect(getPhaseIcon('signing')).toBe('✍️');
      expect(getPhaseIcon('broadcasting')).toBe('📡');
      expect(getPhaseIcon('pending')).toBe('⏳');
      expect(getPhaseIcon('confirming')).toBe('⏳');
      expect(getPhaseIcon('confirmed')).toBe('✅');
      expect(getPhaseIcon('failed')).toBe('❌');
    });
  });

  describe('getPhaseColor', () => {
    it('returns correct color for each phase', () => {
      expect(getPhaseColor('preparing')).toBe('blue');
      expect(getPhaseColor('validating')).toBe('blue');
      expect(getPhaseColor('estimating-gas')).toBe('blue');
      expect(getPhaseColor('signing')).toBe('blue');
      expect(getPhaseColor('broadcasting')).toBe('yellow');
      expect(getPhaseColor('pending')).toBe('yellow');
      expect(getPhaseColor('confirming')).toBe('yellow');
      expect(getPhaseColor('confirmed')).toBe('green');
      expect(getPhaseColor('failed')).toBe('red');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatDuration(5000)).toBe('5s');
      expect(formatDuration(30000)).toBe('30s');
    });

    it('formats minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(125000)).toBe('2m 5s');
    });

    it('formats hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3665000)).toBe('1h 1m');
    });
  });

  describe('getPhaseMessage', () => {
    const createMockTransaction = (overrides: Partial<TransactionLifecycle> = {}): TransactionLifecycle => ({
      id: 'test-tx-1',
      simulationId: 'sim-1',
      walletIndex: 0,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      phase: 'preparing',
      startedAt: Date.now(),
      intent: {
        method: 'transfer(address,uint256)',
        params: ['0x...', '1000000']
      },
      preconditions: [],
      attempt: 1,
      maxAttempts: 3,
      retryStrategy: 'immediate',
      ...overrides
    });

    it('returns correct message for preparing phase', () => {
      const tx = createMockTransaction({ phase: 'preparing', walletIndex: 3 });
      expect(getPhaseMessage(tx)).toBe('Preparing transaction for wallet 3...');
    });

    it('returns correct message for validating phase', () => {
      const tx = createMockTransaction({ phase: 'validating' });
      expect(getPhaseMessage(tx)).toContain('Validating wallet');
    });

    it('returns correct message for signing phase', () => {
      const tx = createMockTransaction({ phase: 'signing', attempt: 2, maxAttempts: 3, walletIndex: 5 });
      expect(getPhaseMessage(tx)).toBe('Signing transaction 2/3 (wallet 5)...');
    });

    it('returns correct message for confirmed phase', () => {
      const tx = createMockTransaction({ phase: 'confirmed', blockNumber: 12345678 });
      expect(getPhaseMessage(tx)).toBe('✅ Confirmed in block 12345678');
    });

    it('returns correct message for failed phase', () => {
      const tx = createMockTransaction({ phase: 'failed' });
      expect(getPhaseMessage(tx)).toBe('❌ Transaction failed');
    });
  });

  describe('estimateEta', () => {
    const createMockTransaction = (overrides: Partial<TransactionLifecycle> = {}): TransactionLifecycle => ({
      id: 'test-tx-1',
      simulationId: 'sim-1',
      walletIndex: 0,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      phase: 'pending',
      startedAt: Date.now(),
      intent: {
        method: 'transfer',
        params: []
      },
      preconditions: [],
      attempt: 1,
      maxAttempts: 3,
      retryStrategy: 'immediate',
      ...overrides
    });

    it('returns base time for first attempt', () => {
      const tx = createMockTransaction({ attempt: 1 });
      const eta = estimateEta(tx);
      expect(eta).toBeGreaterThanOrEqual(10);
      expect(eta).toBeLessThanOrEqual(15);
    });

    it('returns increased time for retry attempts', () => {
      const tx1 = createMockTransaction({ attempt: 1 });
      const tx2 = createMockTransaction({ attempt: 2 });
      
      const eta1 = estimateEta(tx1);
      const eta2 = estimateEta(tx2);
      
      expect(eta2).toBeGreaterThan(eta1);
    });
  });
});
