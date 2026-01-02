import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { WalletFarm } from '../../src/core/WalletFarm.js';
import { NonceManager } from '../../src/execution/NonceManager.js';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('NonceManager', () => {
  let farm;
  let nonceManager;

  beforeEach(() => {
    farm = new WalletFarm(TEST_MNEMONIC, 3, { verbose: false });
    nonceManager = new NonceManager(farm);
  });

  afterEach(async () => {
    // Reset any state
    await nonceManager.resetAll();
  });

  it('should throw on invalid wallet farm', () => {
    assert.throws(() => new NonceManager(null), /Valid WalletFarm instance is required/);
    assert.throws(() => new NonceManager({}), /Valid WalletFarm instance is required/);
  });

  it('should acquire sequential nonces', async () => {
    const walletIndex = 0;
    const chainName = 'sepolia';

    // Manually initialize for testing (normally done automatically)
    nonceManager.nonceStates.set(`${walletIndex}:${chainName}`, {
      current: 0,
      locked: false,
      lastSync: Date.now(),
      walletIndex,
      chainName
    });
    nonceManager.nonceQueues.set(`${walletIndex}:${chainName}`, []);

    const nonce1 = await nonceManager.acquireNonce(walletIndex, chainName);
    nonceManager.releaseNonce(walletIndex, chainName);

    const nonce2 = await nonceManager.acquireNonce(walletIndex, chainName);
    nonceManager.releaseNonce(walletIndex, chainName);

    assert.strictEqual(nonce1, 0);
    assert.strictEqual(nonce2, 1);
  });

  it('should queue concurrent nonce requests', async () => {
    const walletIndex = 0;
    const chainName = 'sepolia';

    nonceManager.nonceStates.set(`${walletIndex}:${chainName}`, {
      current: 0,
      locked: false,
      lastSync: Date.now(),
      walletIndex,
      chainName
    });
    nonceManager.nonceQueues.set(`${walletIndex}:${chainName}`, []);

    const nonces = [];

    // Start 3 concurrent requests
    const promises = [
      nonceManager.acquireNonce(walletIndex, chainName),
      nonceManager.acquireNonce(walletIndex, chainName),
      nonceManager.acquireNonce(walletIndex, chainName)
    ];

    // Acquire first nonce
    nonces.push(await promises[0]);

    // Release to allow next
    nonceManager.releaseNonce(walletIndex, chainName);
    nonces.push(await promises[1]);

    nonceManager.releaseNonce(walletIndex, chainName);
    nonces.push(await promises[2]);

    nonceManager.releaseNonce(walletIndex, chainName);

    // Verify sequential nonces despite concurrent requests
    assert.deepStrictEqual(nonces, [0, 1, 2]);
  });

  it('should track separate nonces per wallet per chain', async () => {
    const chains = ['sepolia', 'base-sepolia'];

    chains.forEach(chain => {
      nonceManager.nonceStates.set(`0:${chain}`, {
        current: 0,
        locked: false,
        lastSync: Date.now(),
        walletIndex: 0,
        chainName: chain
      });
      nonceManager.nonceQueues.set(`0:${chain}`, []);
    });

    const nonce1 = await nonceManager.acquireNonce(0, 'sepolia');
    const nonce2 = await nonceManager.acquireNonce(0, 'base-sepolia');

    // Both should be 0 (independent state)
    assert.strictEqual(nonce1, 0);
    assert.strictEqual(nonce2, 0);

    nonceManager.releaseNonce(0, 'sepolia');
    nonceManager.releaseNonce(0, 'base-sepolia');
  });

  it('should handle nonce release correctly', () => {
    const key = '0:sepolia';

    nonceManager.nonceStates.set(key, {
      current: 5,
      locked: true,
      lastSync: Date.now(),
      walletIndex: 0,
      chainName: 'sepolia'
    });
    nonceManager.nonceQueues.set(key, []);

    nonceManager.releaseNonce(0, 'sepolia');

    const state = nonceManager.nonceStates.get(key);
    assert.strictEqual(state.locked, false);
  });

  it('should throw on release of non-existent nonce', () => {
    assert.throws(() => nonceManager.releaseNonce(0, 'nonexistent'),
      /Nonce state not found/);
  });

  it('should handle nonce errors and sync', async () => {
    const walletIndex = 0;
    const chainName = 'sepolia';
    const key = `${walletIndex}:${chainName}`;

    // Set up initial state
    nonceManager.nonceStates.set(key, {
      current: 5,
      locked: false,
      lastSync: Date.now() - 10000, // Old sync
      walletIndex,
      chainName
    });
    nonceManager.nonceQueues.set(key, []);
    nonceManager.lastSyncTimes.set(key, Date.now() - 10000);

    // Mock the wallet provider to avoid real chain calls
    const originalGetWallet = farm.getWallet;
    farm.getWallet = () => ({
      provider: {
        getTransactionCount: async () => 10 // Mock on-chain nonce
      }
    });

    try {
      // Simulate nonce error
      const nonceError = new Error('nonce too low');

      const handled = await nonceManager.handleNonceError(walletIndex, chainName, nonceError);
      assert.strictEqual(handled, true);

      // Should have synced and updated nonce
      const state = nonceManager.nonceStates.get(key);
      assert.strictEqual(state.current, 10); // Should be updated to on-chain value
    } finally {
      // Restore original method
      farm.getWallet = originalGetWallet;
    }
  });

  it('should not handle non-nonce errors', async () => {
    const contractError = new Error('execution reverted');

    const handled = await nonceManager.handleNonceError(0, 'sepolia', contractError);
    assert.strictEqual(handled, false);
  });

  it('should get nonce state for debugging', () => {
    const key = '0:sepolia';

    nonceManager.nonceStates.set(key, {
      current: 5,
      locked: true,
      lastSync: Date.now(),
      walletIndex: 0,
      chainName: 'sepolia'
    });
    nonceManager.nonceQueues.set(key, [() => {}, () => {}]); // 2 queued

    const state = nonceManager.getNonceState(0, 'sepolia');

    assert.strictEqual(state.current, 5);
    assert.strictEqual(state.locked, true);
    assert.strictEqual(state.queueLength, 2);
  });

  it('should return null for non-existent nonce state', () => {
    const state = nonceManager.getNonceState(0, 'nonexistent');
    assert.strictEqual(state, null);
  });

  it('should provide statistics', () => {
    // Set up some test states
    nonceManager.nonceStates.set('0:sepolia', {
      current: 5,
      locked: true,
      lastSync: Date.now(),
      walletIndex: 0,
      chainName: 'sepolia'
    });
    nonceManager.nonceStates.set('1:sepolia', {
      current: 3,
      locked: false,
      lastSync: Date.now() - 120000, // 2 minutes ago
      walletIndex: 1,
      chainName: 'sepolia'
    });
    nonceManager.nonceStates.set('0:base-sepolia', {
      current: 2,
      locked: false,
      lastSync: Date.now(),
      walletIndex: 0,
      chainName: 'base-sepolia'
    });

    nonceManager.nonceQueues.set('0:sepolia', []);
    nonceManager.nonceQueues.set('1:sepolia', [() => {}]); // 1 queued
    nonceManager.nonceQueues.set('0:base-sepolia', []);

    const stats = nonceManager.getStats();

    assert.strictEqual(stats.totalStates, 3);
    assert.strictEqual(stats.lockedStates, 1);
    assert.strictEqual(stats.totalQueuedRequests, 1);
    assert.strictEqual(stats.statesByChain.sepolia, 2);
    assert.strictEqual(stats.statesByChain['base-sepolia'], 1);
  });

  it('should reset all states', async () => {
    // Set up some states
    nonceManager.nonceStates.set('0:sepolia', { current: 1, locked: false, lastSync: Date.now() });
    nonceManager.nonceQueues.set('0:sepolia', []);
    nonceManager.lastSyncTimes.set('0:sepolia', Date.now());

    await nonceManager.resetAll();

    assert.strictEqual(nonceManager.nonceStates.size, 0);
    assert.strictEqual(nonceManager.nonceQueues.size, 0);
    assert.strictEqual(nonceManager.lastSyncTimes.size, 0);
  });

  it('should respect sync cooldown', async () => {
    const walletIndex = 0;
    const chainName = 'sepolia';
    const key = `${walletIndex}:${chainName}`;

    // Set up state with recent sync
    nonceManager.nonceStates.set(key, {
      current: 5,
      locked: false,
      lastSync: Date.now(),
      walletIndex,
      chainName
    });
    nonceManager.lastSyncTimes.set(key, Date.now());

    // This sync should return cached value due to cooldown
    const result = await nonceManager.syncNonce(walletIndex, chainName, false);

    // Should return current nonce (can't test actual sync without chain mock)
    assert.strictEqual(typeof result, 'number');
  });

  it('should handle initialization failure gracefully', async () => {
    // Create invalid farm to test error handling
    const invalidFarm = {
      getWallet: () => {
        throw new Error('Invalid wallet');
      }
    };

    const invalidManager = new NonceManager(invalidFarm);

    await assert.rejects(
      async () => invalidManager.acquireNonce(0, 'sepolia'),
      /Failed to initialize nonce/
    );
  });

  it('should handle concurrent access patterns correctly', async () => {
    const walletIndex = 0;
    const chainName = 'sepolia';

    nonceManager.nonceStates.set(`${walletIndex}:${chainName}`, {
      current: 0,
      locked: false,
      lastSync: Date.now(),
      walletIndex,
      chainName
    });
    nonceManager.nonceQueues.set(`${walletIndex}:${chainName}`, []);

    // Simulate high concurrency
    const promises = [];
    const results = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        (async (index) => {
          const nonce = await nonceManager.acquireNonce(walletIndex, chainName);
          results.push({ index, nonce });

          // Small delay to ensure overlap
          await new Promise(resolve => setTimeout(resolve, 1));

          nonceManager.releaseNonce(walletIndex, chainName);
        })(i)
      );
    }

    await Promise.all(promises);

    // Should have assigned sequential nonces 0-9
    results.sort((a, b) => a.index - b.index);
    results.forEach((result, i) => {
      assert.strictEqual(result.nonce, i);
    });
  });
});
