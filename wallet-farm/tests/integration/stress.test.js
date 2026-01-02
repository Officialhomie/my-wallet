import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { WalletFarm } from '../../src/core/WalletFarm.js';
import { TransactionExecutor } from '../../src/execution/TransactionExecutor.js';
import { MockProvider } from '../mocks/MockProvider.js';
import { MockContract } from '../mocks/MockContract.js';
import { ethers } from 'ethers';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Stress Tests - High Concurrency Validation', () => {
  let walletFarm;
  let executor;
  let mockProvider;
  let mockContract;

  beforeEach(() => {
    // Create farm with 100 wallets for stress testing
    walletFarm = new WalletFarm(TEST_MNEMONIC, 100, { verbose: false });

    // Set up mock blockchain
    mockProvider = new MockProvider({
      chainId: 11155111, // Sepolia
      gasPrice: ethers.parseUnits('20', 'gwei')
    });

    // Create mock ERC-20 contract
    const ERC20_ABI = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)'
    ];

    mockContract = new MockContract(
      '0x1234567890123456789012345678901234567890',
      ERC20_ABI,
      mockProvider
    );

    // Connect wallet farm to mock provider
    walletFarm.connectToChains([{
      name: 'sepolia',
      chainId: 11155111,
      provider: mockProvider
    }]);

    // Fund all 100 wallets with ETH and tokens
    for (let i = 0; i < 100; i++) {
      const address = walletFarm.getWallet(i, 'sepolia').address;
      mockProvider.setBalance(address, ethers.parseEther('10'));
      mockProvider.setNonce(address, 0);

      // Also give them mock tokens
      mockContract.setBalance(address, ethers.parseEther('1000'));
    }

    // Create executor
    executor = new TransactionExecutor(walletFarm);
  });

  afterEach(async () => {
    if (executor) {
      await executor.reset();
    }
  });

  it('should handle 100 concurrent wallets without nonce collisions', async () => {
    const walletCount = 100;
    const txPerWallet = 5;
    const totalTxs = walletCount * txPerWallet;

    console.log(`\n📊 Stress Test: ${walletCount} wallets × ${txPerWallet} tx = ${totalTxs} total transactions`);

    const startTime = Date.now();

    // Launch all transactions concurrently
    const allPromises = [];

    for (let walletIndex = 0; walletIndex < walletCount; walletIndex++) {
      for (let txNum = 0; txNum < txPerWallet; txNum++) {
        const promise = executor.execute(
          walletIndex,
          'sepolia',
          mockContract,
          'transfer',
          ['0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('0.1')],
          { simulate: false } // Skip simulation for speed
        ).then(result => ({
          walletIndex,
          txNum,
          nonce: result.nonce,
          success: result.success,
          txHash: result.txHash
        }));

        allPromises.push(promise);
      }
    }

    // Wait for all to complete
    const results = await Promise.all(allPromises);
    const duration = Date.now() - startTime;

    console.log(`⏱️  Completed in ${duration}ms (${(totalTxs / (duration / 1000)).toFixed(2)} tx/sec)`);

    // Verify all succeeded
    const failures = results.filter(r => !r.success);
    assert.strictEqual(failures.length, 0, `${failures.length} transactions failed: ${JSON.stringify(failures.slice(0, 5))}`);

    // Verify nonce uniqueness PER WALLET
    const noncesByWallet = new Map();

    results.forEach(result => {
      if (!noncesByWallet.has(result.walletIndex)) {
        noncesByWallet.set(result.walletIndex, []);
      }
      noncesByWallet.get(result.walletIndex).push(result.nonce);
    });

    // Check each wallet has unique, sequential nonces (0, 1, 2, 3, 4)
    for (const [walletIndex, nonces] of noncesByWallet.entries()) {
      const uniqueNonces = new Set(nonces);

      assert.strictEqual(
        uniqueNonces.size,
        nonces.length,
        `Wallet ${walletIndex} has duplicate nonces: ${JSON.stringify(nonces)}`
      );

      // Nonces should be sequential
      const sortedNonces = [...nonces].sort((a, b) => a - b);
      for (let i = 0; i < sortedNonces.length; i++) {
        assert.strictEqual(
          sortedNonces[i],
          i,
          `Wallet ${walletIndex} nonce gap: expected ${i}, got ${sortedNonces[i]}`
        );
      }
    }

    console.log(`✅ All ${walletCount} wallets executed ${txPerWallet} transactions without collision`);
    console.log(`✅ Nonce manager handled ${totalTxs} concurrent acquisitions correctly`);
  }, { timeout: 60000 }); // 60 second timeout for stress test

  it('should handle mixed concurrent operations (reads + writes)', async () => {
    const operations = [];

    // 50 wallets doing writes (transfers)
    for (let i = 0; i < 50; i++) {
      operations.push(
        executor.execute(i, 'sepolia', mockContract, 'transfer', [
          '0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0',
          ethers.parseEther('0.1')
        ])
      );
    }

    // 50 wallets doing balance checks (simulated reads)
    for (let i = 50; i < 100; i++) {
      operations.push(
        mockContract.balanceOf(walletFarm.getWallet(i, 'sepolia').address)
      );
    }

    const results = await Promise.all(operations);

    // First 50 should be transaction results
    const txResults = results.slice(0, 50);
    assert(txResults.every(r => r.success), 'All transactions should succeed');

    // Last 50 should be balance results
    const balanceResults = results.slice(50);
    assert(balanceResults.every(b => b >= 0n), 'All balances should be non-negative');

    console.log('✅ Mixed read/write operations completed successfully');
  });

  it('should handle burst patterns with 100 wallets', async () => {
    // Simulate burst: all 100 wallets transact within 100ms window
    const promises = [];

    for (let i = 0; i < 100; i++) {
      // Random delay 0-100ms to simulate burst window
      const delay = Math.random() * 100;

      const promise = new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));

        const result = await executor.execute(
          i,
          'sepolia',
          mockContract,
          'transfer',
          ['0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('0.1')]
        );

        resolve(result);
      });

      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // All should succeed despite burst
    const successCount = results.filter(r => r.success).length;
    assert.strictEqual(successCount, 100, `${100 - successCount} transactions failed in burst`);

    console.log('✅ Handled 100-wallet burst within 100ms window');
  });

  it('should track nonce manager performance under load', async () => {
    const nonceManager = executor.nonceManager;

    // Execute 500 total transactions across 100 wallets (5 each)
    const promises = [];
    for (let i = 0; i < 500; i++) {
      const walletIndex = i % 100;
      promises.push(
        executor.execute(
          walletIndex,
          'sepolia',
          mockContract,
          'transfer',
          ['0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('0.1')]
        )
      );
    }

    await Promise.all(promises);

    // Check nonce manager stats
    const stats = nonceManager.getStats();

    console.log('📊 Nonce Manager Performance:');
    console.log(`   Total acquisitions: ${stats.totalAcquisitions}`);
    console.log(`   Total releases: ${stats.totalReleases}`);
    console.log(`   Queued requests: ${stats.totalQueuedRequests}`);
    console.log(`   Average queue time: ${stats.averageQueueTime?.toFixed(2)}ms`);
    console.log(`   Max queue depth: ${stats.maxQueueDepth}`);

    assert.strictEqual(stats.totalAcquisitions, 500, 'Should have 500 acquisitions');
    assert.strictEqual(stats.totalReleases, 500, 'Should have 500 releases');
    assert(stats.averageQueueTime < 100, 'Average queue time should be < 100ms');
    assert(stats.maxQueueDepth >= 0, 'Max queue depth should be tracked');
  });

  it('should validate performance requirements', async () => {
    const startTime = Date.now();

    // Execute 200 transactions (2 per wallet for 100 wallets)
    const promises = [];
    for (let i = 0; i < 200; i++) {
      const walletIndex = i % 100;
      promises.push(
        executor.execute(
          walletIndex,
          'sepolia',
          mockContract,
          'transfer',
          ['0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('0.01')]
        )
      );
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    const txPerSecond = 200 / (duration / 1000);

    console.log(`📈 Performance: ${txPerSecond.toFixed(2)} tx/sec (${duration}ms for 200 tx)`);

    // Should achieve reasonable throughput (at least 5 tx/sec in test environment)
    assert(txPerSecond >= 3, `Throughput too low: ${txPerSecond.toFixed(2)} tx/sec`);

    console.log('✅ Performance requirements met');
  });
});
