import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { WalletFarm } from '../../src/core/WalletFarm.js';
import { FundDistributor } from '../../src/core/FundDistributor.js';
import { ArchetypeManager } from '../../src/simulation/ArchetypeManager.js';
import { TimingEngine } from '../../src/simulation/TimingEngine.js';
import { TransactionExecutor } from '../../src/execution/TransactionExecutor.js';
import { SimulationMetrics } from '../../src/simulation/SimulationMetrics.js';
import { BudgetEnforcer } from '../../src/safety/BudgetEnforcer.js';
import { CircuitBreaker } from '../../src/safety/CircuitBreaker.js';
import { SeededRandom } from '../../src/timing/SeededRandom.js';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Mock contract ABI for testing
const MOCK_CONTRACT_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

describe('WalletFarm Integration Tests', () => {
  let walletFarm;
  let fundDistributor;
  let archetypeManager;
  let timingEngine;
  let transactionExecutor;
  let simulationMetrics;
  let budgetEnforcer;
  let circuitBreaker;
  let seededRng;

  beforeEach(async () => {
    // Initialize all components with deterministic seed for testing
    seededRng = new SeededRandom(12345);

    walletFarm = new WalletFarm(TEST_MNEMONIC, 5, { verbose: false });
    fundDistributor = new FundDistributor(walletFarm);
    archetypeManager = new ArchetypeManager(seededRng);
    timingEngine = new TimingEngine(seededRng);
    transactionExecutor = new TransactionExecutor(walletFarm);
    simulationMetrics = new SimulationMetrics();
    budgetEnforcer = new BudgetEnforcer();
    circuitBreaker = new CircuitBreaker();

    // Start metrics tracking
    simulationMetrics.startSimulation();
  });

  afterEach(async () => {
    // Clean up any state
    await transactionExecutor.reset();
    circuitBreaker.reset();
    simulationMetrics.reset();
  });

  describe('Complete Wallet Farm Workflow', () => {
    it('should execute complete wallet creation and management workflow', async () => {
      // Test wallet generation
      assert.strictEqual(walletFarm.getWalletCount(), 5);

      // Test wallet data export
      const walletData = walletFarm.exportWalletData();
      assert.strictEqual(walletData.length, 5);

      walletData.forEach((wallet, index) => {
        assert(wallet.address);
        assert(wallet.publicKey);
        assert(wallet.index === index);
      });

      console.log('✅ Wallet generation and export working correctly');
    });

    it('should integrate all components in simulation workflow', async () => {
      // Create a complete simulation scenario
      const simulationConfig = {
        duration: 10000, // 10 seconds
        archetypes: {
          whale: { count: 1, active: true },
          activeTrader: { count: 2, active: true },
          casual: { count: 1, active: true }
        }
      };

      // Simulate basic workflow
      const results = {
        walletsGenerated: walletFarm.getWalletCount(),
        archetypesLoaded: archetypeManager.getArchetypeNames().length,
        timingProfiles: timingEngine.getProfiles(),
        budgetStatus: budgetEnforcer.getStatus(),
        circuitState: circuitBreaker.getState()
      };

      assert.strictEqual(results.walletsGenerated, 5);
      assert(results.archetypesLoaded >= 5); // At least default archetypes
      assert(results.timingProfiles.quick);
      assert(results.timingProfiles.normal);
      assert(results.budgetStatus);
      assert(results.circuitState);

      console.log('✅ Component integration working correctly');
    });

    it('should handle archetype-based transaction simulation', async () => {
      // Test archetype manager integration
      const whaleConfig = archetypeManager.getArchetype('whale');
      const traderConfig = archetypeManager.getArchetype('activeTrader');

      assert(whaleConfig.frequency);
      assert(traderConfig.frequency);
      assert(whaleConfig.transactionSize);
      assert(traderConfig.transactionSize);

      // Test transaction size generation
      const whaleSize1 = archetypeManager.generateTransactionSize('whale');
      const whaleSize2 = archetypeManager.generateTransactionSize('whale');
      const traderSize = archetypeManager.generateTransactionSize('activeTrader');

      // Whale transactions should be larger than trader transactions typically
      assert(whaleSize1 >= 10 && whaleSize1 <= 1000);
      assert(whaleSize2 >= 10 && whaleSize2 <= 1000);
      assert(traderSize >= 0.1 && traderSize <= 10);

      console.log('✅ Archetype-based simulation working correctly');
    });

    it('should integrate timing engine with deterministic behavior', async () => {
      // Test deterministic timing with seeded random
      const delays1 = [];
      const delays2 = [];

      // Generate delays with same seed
      const engine1 = new TimingEngine(new SeededRandom(12345));
      const engine2 = new TimingEngine(new SeededRandom(12345));

      for (let i = 0; i < 10; i++) {
        delays1.push(await engine1.humanDelay('quick'));
        delays2.push(await engine2.humanDelay('quick'));
      }

      // Should produce identical sequences
      assert.deepStrictEqual(delays1, delays2);

      console.log('✅ Deterministic timing working correctly');
    });

    it('should handle budget enforcement in simulation context', async () => {
      // Test budget tracking
      const testGasUsed = 21000n;
      const testGasPrice = 20000000000n; // 20 gwei

      const initialStatus = budgetEnforcer.getStatus();

      // Record some transactions
      budgetEnforcer.recordTransaction(testGasUsed, testGasPrice);
      budgetEnforcer.recordTransaction(testGasUsed * 2n, testGasPrice);

      const updatedStatus = budgetEnforcer.getStatus();

      assert(updatedStatus.totalGasSpent > initialStatus.totalGasSpent);
      assert.strictEqual(updatedStatus.transactionCount, 2);
      assert(updatedStatus.averageTxCostEth > 0);

      // Test budget checking
      const canSpend = budgetEnforcer.hasBudget();
      assert(typeof canSpend === 'boolean');

      console.log('✅ Budget enforcement working correctly');
    });

    it('should demonstrate circuit breaker failure recovery', async () => {
      // Test circuit breaker state transitions
      assert.strictEqual(circuitBreaker.getState().state, 'closed');

      // Simulate failures
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }

      assert.strictEqual(circuitBreaker.getState().state, 'open');
      assert(!circuitBreaker.shouldAllow());

      // Simulate successful recovery
      circuitBreaker.recordSuccess();

      // Should still be open (needs timeout or manual close)
      assert.strictEqual(circuitBreaker.getState().state, 'open');

      // Manual close for testing
      circuitBreaker.close();
      assert.strictEqual(circuitBreaker.getState().state, 'closed');
      assert(circuitBreaker.shouldAllow());

      console.log('✅ Circuit breaker recovery working correctly');
    });

    it('should track comprehensive simulation metrics', async () => {
      // Simulate various events
      simulationMetrics.recordAttempt('whale');
      simulationMetrics.recordSuccess('whale', 21000n, 20000000000n, 15000);

      simulationMetrics.recordAttempt('activeTrader');
      simulationMetrics.recordFailure('activeTrader', new Error('insufficient funds'));

      simulationMetrics.recordSkip('casual');
      simulationMetrics.recordDelay(2000);

      simulationMetrics.endSimulation();

      // Generate comprehensive report
      const report = simulationMetrics.generateReport();

      // Check summary metrics
      assert.strictEqual(report.summary.totalAttempts, 2);
      assert.strictEqual(report.summary.successful, 1);
      assert.strictEqual(report.summary.failed, 1);
      assert.strictEqual(report.summary.skipped, 1);

      // Check gas metrics
      assert(report.gas.totalGasUsed);
      assert(report.gas.averageGasPerTx > 0);

      // Check archetype breakdown
      assert(report.archetypes.breakdown.whale);
      assert(report.archetypes.breakdown.activeTrader);
      assert(report.archetypes.breakdown.casual);

      // Check performance metrics
      assert(typeof report.performance.transactionsPerSecond === 'string');
      assert(report.performance.errorRate);

      console.log('✅ Comprehensive metrics tracking working correctly');
    });

    it('should validate system integration with mock contract interactions', async () => {
      // Create a mock contract for testing
      const mockContract = {
        transfer: async (to, amount) => {
          // Simulate successful transfer
          return { hash: '0x' + Math.random().toString(16).substr(2, 64) };
        },
        staticCall: {
          transfer: async () => true // Simulate successful simulation
        }
      };

      // Test transaction executor with mock contract
      const wallet = walletFarm.getWallet(0, 'sepolia'); // This will fail in real testnet

      // For integration testing, we test the setup and validation
      assert(wallet);
      assert(typeof wallet.address === 'string');
      assert(wallet.address.startsWith('0x'));

      // Test simulation capability
      const simulationResult = await transactionExecutor.simulate(
        wallet,
        mockContract,
        'transfer',
        ['0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', '1000000000000000000']
      );

      assert(simulationResult.willSucceed);

      console.log('✅ Mock contract integration working correctly');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle component failures gracefully', async () => {
      // Test that system can handle various failure scenarios
      let errorCount = 0;

      try {
        // Try to get non-existent archetype
        archetypeManager.getArchetype('nonexistent');
      } catch (error) {
        errorCount++;
        assert(error.message.includes('Unknown archetype'));
      }

      try {
        // Try invalid timing profile
        await timingEngine.humanDelay('invalid');
      } catch (error) {
        errorCount++;
        assert(error.message.includes('Unknown delay profile'));
      }

      try {
        // Try to check budget with invalid input
        budgetEnforcer.checkTransaction('invalid', 'invalid');
      } catch (error) {
        errorCount++;
        assert(error.message.includes('BigInt'));
      }

      assert.strictEqual(errorCount, 3);

      console.log('✅ Error handling working correctly');
    });

    it('should maintain system stability under stress', async () => {
      // Test system stability with rapid operations
      const operations = [];

      // Generate many concurrent operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          Promise.resolve().then(async () => {
            const delay = timingEngine.getDelaySync('quick');
            simulationMetrics.recordDelay(delay);
            return delay;
          })
        );
      }

      // Execute all operations
      const results = await Promise.all(operations);

      // Verify results
      assert.strictEqual(results.length, 100);
      results.forEach(delay => {
        assert(typeof delay === 'number');
        assert(delay >= 500 && delay <= 2000);
      });

      // Check metrics
      const status = simulationMetrics.getStatus();
      assert.strictEqual(status.currentStats.attempts, 0); // No attempts recorded
      assert(status.currentStats.successes >= 0);

      console.log('✅ System stability under stress confirmed');
    });
  });

  describe('Configuration and Customization', () => {
    it('should allow system-wide configuration', () => {
      // Test timing engine configuration
      timingEngine.addProfile('custom', {
        min: 100,
        max: 500,
        variance: 0.1
      });

      const profiles = timingEngine.getProfiles();
      assert(profiles.custom);
      assert.strictEqual(profiles.custom.min, 100);

      // Test budget enforcer configuration
      budgetEnforcer.configure({
        gasMargin: 1.3,
        defaultConfirmations: 3
      });

      const stats = transactionExecutor.getStats();
      assert.strictEqual(stats.gasMargin, 1.3);

      console.log('✅ System configuration working correctly');
    });

    it('should support different RNG seeds for varied scenarios', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const engine1 = new TimingEngine(rng1);
      const engine2 = new TimingEngine(rng2);

      // Generate delays with different seeds
      const delay1 = engine1.getDelaySync('normal');
      const delay2 = engine2.getDelaySync('normal');

      // Should be different (very high probability)
      assert(delay1 !== delay2);

      console.log('✅ Multiple RNG seed support working correctly');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale wallet generation', () => {
      // Test with larger wallet farm
      const largeFarm = new WalletFarm(TEST_MNEMONIC, 50, { verbose: false });

      assert.strictEqual(largeFarm.getWalletCount(), 50);

      const walletData = largeFarm.exportWalletData();
      assert.strictEqual(walletData.length, 50);

      // Verify all wallets are unique
      const addresses = walletData.map(w => w.address);
      const uniqueAddresses = new Set(addresses);
      assert.strictEqual(uniqueAddresses.size, 50);

      console.log('✅ Large-scale wallet generation working correctly');
    });

    it('should maintain performance with concurrent operations', async () => {
      const startTime = Date.now();

      // Simulate concurrent archetype operations
      const promises = [];

      for (let i = 0; i < 20; i++) {
        promises.push(
          Promise.resolve().then(() => {
            archetypeManager.shouldSkipInteraction('whale');
            archetypeManager.generateTransactionSize('activeTrader');
            return timingEngine.getDelaySync('quick');
          })
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 1 second)
      assert(endTime - startTime < 1000);

      console.log('✅ Concurrent operations performance acceptable');
    });
  });

  describe('Data Export and Analysis', () => {
    it('should export comprehensive system data', () => {
      // Add some data to export
      simulationMetrics.recordAttempt('whale');
      simulationMetrics.recordSuccess('whale', 21000n, 20000000000n, 12000);
      simulationMetrics.recordDelay(1500);

      // Export data from all components
      const exports = {
        simulationMetrics: simulationMetrics.exportRawData(),
        archetypeStats: archetypeManager.getArchetypeStats(),
        timingProfiles: timingEngine.getProfiles(),
        budgetStatus: budgetEnforcer.exportData(),
        circuitStats: circuitBreaker.getStats()
      };

      // Verify exports contain expected data
      assert(exports.simulationMetrics.summary);
      assert(exports.archetypeStats.archetypeNames.length >= 5);
      assert(exports.timingProfiles.quick);
      assert(exports.budgetStatus.config);
      assert(typeof exports.circuitStats.successRate === 'string');

      console.log('✅ Data export functionality working correctly');
    });

    it('should provide meaningful status summaries', () => {
      // Test various component status methods
      const statuses = {
        simulation: simulationMetrics.getStatus(),
        budget: budgetEnforcer.getUtilizationSummary(),
        circuit: circuitBreaker.getFailureStatus()
      };

      assert(statuses.simulation.isActive !== undefined);
      assert(typeof statuses.budget.status === 'string');
      assert(statuses.circuit.status);
      assert(statuses.circuit.consecutiveFailures >= 0);

      console.log('✅ Status summaries working correctly');
    });
  });
});
