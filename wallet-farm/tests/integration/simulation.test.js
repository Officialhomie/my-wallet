import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { ethers } from 'ethers';

// Import all components
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

describe('Integration Tests - End-to-End Simulation', () => {
  let walletFarm;
  let fundDistributor;
  let archetypeManager;
  let timingEngine;
  let transactionExecutor;
  let simulationMetrics;
  let budgetEnforcer;
  let circuitBreaker;
  let seededRng;

  // Mock contract for testing
  let mockContract;
  let mockProvider;

  beforeEach(() => {
    seededRng = new SeededRandom(12345);

    // Initialize all components
    walletFarm = new WalletFarm(TEST_MNEMONIC, 5, { verbose: false });
    fundDistributor = new FundDistributor(walletFarm);
    archetypeManager = new ArchetypeManager(seededRng);
    timingEngine = new TimingEngine(seededRng);
    transactionExecutor = new TransactionExecutor(walletFarm);
    simulationMetrics = new SimulationMetrics();
    budgetEnforcer = new BudgetEnforcer();
    circuitBreaker = new CircuitBreaker();

    // Set up mock blockchain environment
    setupMockBlockchain();
  });

  afterEach(async () => {
    await transactionExecutor.reset();
    simulationMetrics.reset();
    circuitBreaker.reset();
  });

  function setupMockBlockchain() {
    // Mock provider for testing
    mockProvider = {
      getTransactionCount: async () => 0,
      getNetwork: async () => ({ chainId: 11155111 }), // Sepolia
      getFeeData: async () => ({
        gasPrice: ethers.parseUnits('20', 'gwei'),
        maxFeePerGas: ethers.parseUnits('40', 'gwei'),
        maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
      })
    };

    // Mock contract for simulation
    mockContract = {
      // Mock ERC-20 like interface
      balanceOf: async (address) => ethers.parseEther('100'),
      transfer: async (to, amount, options) => ({
        hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        wait: async () => ({
          status: 1,
          blockNumber: 12345,
          gasUsed: 21000n,
          effectiveGasPrice: ethers.parseUnits('20', 'gwei'),
          cumulativeGasUsed: 21000n
        })
      }),
      connect: () => mockContract
    };

    // Connect wallets to mock provider
    walletFarm.connectToChains([{
      name: 'sepolia',
      chainId: 11155111,
      rpcUrl: 'https://mock-rpc.com',
      provider: mockProvider
    }]);
  }

  describe('End-to-End Simulation Workflow', () => {
    it('should complete full simulation cycle: fund → distribute → simulate → report', async () => {
      // Phase 1: Setup and Funding
      simulationMetrics.startSimulation();

      // Mock funding wallet
      const fundingWallet = ethers.Wallet.createRandom().connect(mockProvider);
      fundDistributor.setFundingWallet(fundingWallet);

      // Phase 2: Fund Distribution
      const distributionResults = await fundDistributor.distributeNativeTokens(
        0.01, // 0.01 ETH per wallet
        'sepolia',
        'equal'
      );

      assert.strictEqual(distributionResults.length, 5); // 5 wallets

      // Phase 3: Behavioral Simulation
      const simulationResults = [];

      for (let walletIndex = 0; walletIndex < 5; walletIndex++) {
        const archetype = ['whale', 'activeTrader', 'casual', 'lurker', 'researcher'][walletIndex];

        simulationMetrics.recordAttempt(archetype);

        // Check if interaction should be skipped
        if (archetypeManager.shouldSkipInteraction(archetype)) {
          simulationMetrics.recordSkip(archetype);
          continue;
        }

        // Generate transaction parameters
        const params = archetypeManager.generateParameters(archetype, 'transfer');
        const timing = archetypeManager.getTimingBounds(archetype);

        // Add realistic delay
        const delay = timingEngine.getDelaySync(archetypeManager.getDelayProfile(archetype));
        await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10))); // Cap for tests
        simulationMetrics.recordDelay(delay);

        // Execute transaction (mocked)
        try {
          // Simulate transaction execution with circuit breaker
          const result = await circuitBreaker.execute(async () => {
            // Check budget first
            const gasEstimate = 21000n;
            const gasPrice = ethers.parseUnits('20', 'gwei');
            budgetEnforcer.checkTransaction(gasEstimate, gasPrice);

            // Mock successful transaction
            budgetEnforcer.recordTransaction(gasEstimate, gasPrice, {
              archetype,
              walletIndex,
              method: 'transfer'
            });

            return {
              success: true,
              gasUsed: gasEstimate,
              gasPrice: gasPrice
            };
          });

          simulationMetrics.recordSuccess(archetype, result.gasUsed, result.gasPrice);
          simulationResults.push({ walletIndex, archetype, success: true });

        } catch (error) {
          simulationMetrics.recordFailure(archetype, error);
          simulationResults.push({ walletIndex, archetype, success: false, error });
        }
      }

      // Phase 4: Generate Report
      simulationMetrics.endSimulation();
      const report = simulationMetrics.generateReport();

      // Verify complete workflow
      assert(report.summary.totalAttempts > 0);
      assert(typeof report.summary.successRate === 'string');
      assert(report.archetypes.breakdown);
      assert(report.gas.averageGasPerTx >= 0);
      assert(report.timing.averageDelay >= 0);
      assert(report.performance.errorRate);

      // Verify budget enforcement worked
      const budgetStatus = budgetEnforcer.getStatus();
      assert(budgetStatus.transactionCount > 0);
      assert(budgetStatus.totalGasSpent > 0n);

      // Verify circuit breaker remained operational
      assert.strictEqual(circuitBreaker.getState().state, 'closed');

      console.log('✅ Integration test passed - full simulation workflow completed');
    }, { timeout: 30000 });

    it('should handle concurrent wallet operations without nonce collisions', async () => {
      const concurrentOperations = 10;
      const walletPromises = [];

      // Set up nonce manager for concurrent operations
      const nonceManager = transactionExecutor.nonceManager;

      // Simulate concurrent operations on same wallet
      for (let i = 0; i < concurrentOperations; i++) {
        walletPromises.push(
          (async (operationId) => {
            const nonce = await nonceManager.acquireNonce(0, 'sepolia');

            try {
              // Simulate transaction processing
              await new Promise(resolve => setTimeout(resolve, Math.random() * 5));

              return { operationId, nonce, success: true };
            } finally {
              nonceManager.releaseNonce(0, 'sepolia');
            }
          })(i)
        );
      }

      const results = await Promise.all(walletPromises);

      // Verify all operations succeeded
      assert.strictEqual(results.length, concurrentOperations);
      results.forEach(result => {
        assert(result.success);
        assert(typeof result.nonce === 'number');
      });

      // Verify nonces are sequential (no collisions)
      const nonces = results.map(r => r.nonce).sort((a, b) => a - b);
      for (let i = 0; i < nonces.length - 1; i++) {
        assert.strictEqual(nonces[i] + 1, nonces[i + 1], 'Nonces should be sequential');
      }

      console.log('✅ Concurrent operations test passed - no nonce collisions');
    });

    it('should handle contract reverts gracefully', async () => {
      simulationMetrics.startSimulation();

      // Create a contract that sometimes reverts
      let revertCount = 0;
      const revertingContract = {
        testMethod: async () => {
          revertCount++;
          if (revertCount <= 2) { // Fail first 2 attempts
            throw new Error('execution reverted: insufficient balance');
          }
          return { hash: '0x123', wait: async () => ({ status: 1 }) };
        },
        connect: () => revertingContract
      };

      // Try multiple operations with retry logic
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          simulationMetrics.recordAttempt('whale');

          const result = await transactionExecutor.execute(
            0,
            'sepolia',
            revertingContract,
            'testMethod',
            [],
            { simulate: false } // Skip simulation to test actual execution
          );

          if (result.success) {
            simulationMetrics.recordSuccess('whale', 21000n, ethers.parseUnits('20', 'gwei'));
            break;
          } else {
            simulationMetrics.recordFailure('whale', new Error(result.error));
          }
        } catch (error) {
          simulationMetrics.recordFailure('whale', error);
        }
      }

      const report = simulationMetrics.generateReport();
      simulationMetrics.endSimulation();

      // Should have recovered from reverts
      assert(report.summary.failed > 0, 'Should have recorded some failures');
      assert(report.errors.errorBreakdown.ContractRevert > 0, 'Should classify reverts');

      console.log('✅ Contract revert handling test passed');
    });

    it('should enforce budget limits during simulation', async () => {
      // Set a very small budget
      const smallBudgetEnforcer = new BudgetEnforcer({
        maxTotalGas: ethers.parseUnits('0.001', 'ether') // Very small budget
      });

      simulationMetrics.startSimulation();

      let budgetExceeded = false;

      try {
        // Try to execute multiple expensive operations
        for (let i = 0; i < 10; i++) {
          simulationMetrics.recordAttempt('whale');

          smallBudgetEnforcer.checkTransaction(50000n, ethers.parseUnits('50', 'gwei'));
          smallBudgetEnforcer.recordTransaction(50000n, ethers.parseUnits('50', 'gwei'));

          simulationMetrics.recordSuccess('whale', 50000n, ethers.parseUnits('50', 'gwei'));
        }
      } catch (error) {
        if (error.message.includes('Total budget exceeded')) {
          budgetExceeded = true;
        } else {
          throw error;
        }
      }

      simulationMetrics.endSimulation();

      assert(budgetExceeded, 'Budget should have been exceeded');
      assert(!smallBudgetEnforcer.hasBudget(), 'Should report no budget remaining');

      console.log('✅ Budget enforcement test passed');
    });

    it('should trigger circuit breaker on consecutive failures', async () => {
      const testCircuitBreaker = new CircuitBreaker({ threshold: 3 });
      simulationMetrics.startSimulation();

      // Cause consecutive failures
      for (let i = 0; i < 5; i++) {
        try {
          simulationMetrics.recordAttempt('whale');

          await testCircuitBreaker.execute(async () => {
            throw new Error('Simulated network failure');
          });

          simulationMetrics.recordSuccess('whale', 21000n, ethers.parseUnits('20', 'gwei'));
        } catch (error) {
          if (error instanceof Error && error.message.includes('Simulated network failure')) {
            simulationMetrics.recordFailure('whale', error);
          } else if (error instanceof Error && error.message.includes('Circuit breaker')) {
            // Circuit breaker opened - this is expected
            break;
          } else {
            throw error;
          }
        }
      }

      simulationMetrics.endSimulation();

      // Circuit breaker should have opened
      assert(testCircuitBreaker.isInFailureState(), 'Circuit breaker should be in failure state');
      assert.strictEqual(testCircuitBreaker.getState().state, 'open');

      console.log('✅ Circuit breaker test passed');
    });

    it('should provide comprehensive metrics reporting', async () => {
      simulationMetrics.startSimulation();

      // Generate some test data
      const archetypes = ['whale', 'activeTrader', 'casual'];

      for (let i = 0; i < 20; i++) {
        const archetype = archetypes[i % archetypes.length];
        const shouldSkip = archetypeManager.shouldSkipInteraction(archetype);

        simulationMetrics.recordAttempt(archetype);

        if (shouldSkip) {
          simulationMetrics.recordSkip(archetype);
        } else {
          const delay = timingEngine.getDelaySync(archetypeManager.getDelayProfile(archetype));
          simulationMetrics.recordDelay(delay);

          if (Math.random() > 0.8) { // 20% failure rate
            simulationMetrics.recordFailure(archetype, new Error('random failure'));
          } else {
            const gasUsed = 21000n + BigInt(Math.floor(Math.random() * 10000));
            const gasPrice = ethers.parseUnits((15 + Math.random() * 10).toString(), 'gwei');
            simulationMetrics.recordSuccess(archetype, gasUsed, gasPrice);
          }
        }
      }

      simulationMetrics.endSimulation();
      const report = metrics.generateReport();
      const status = metrics.getStatus();

      // Verify comprehensive reporting
      assert(report.summary);
      assert(report.gas);
      assert(report.timing);
      assert(report.errors);
      assert(report.archetypes);
      assert(report.performance);

      assert(status.isActive === false); // Simulation ended
      assert(status.startTime);
      assert(status.lastActivity);

      // Verify raw data export
      const rawData = metrics.exportRawData();
      assert(rawData.summary);
      assert(Array.isArray(rawData.transactions));
      assert(Array.isArray(rawData.delays));
      assert(Array.isArray(rawData.errors));

      console.log('✅ Comprehensive metrics test passed');
    });
  });

  describe('Component Integration', () => {
    it('should integrate all components seamlessly', async () => {
      // Test that all components work together without conflicts

      // 1. Wallet management
      assert.strictEqual(walletFarm.getWalletCount(), 5);

      // 2. Archetype configuration
      assert(archetypeManager.getArchetypeNames().length > 0);

      // 3. Timing with seeded random
      const delay = timingEngine.getDelaySync('normal');
      assert(delay >= 2000 && delay <= 8000);

      // 4. Transaction execution with safety
      const gasEstimate = await transactionExecutor.estimateGas(
        { estimateGas: async () => 21000n },
        'testMethod',
        []
      );
      assert.strictEqual(gasEstimate, 23100n); // With 10% margin

      // 5. Budget tracking
      budgetEnforcer.recordTransaction(21000n, ethers.parseUnits('20', 'gwei'));
      assert(budgetEnforcer.getStatus().transactionCount === 1);

      // 6. Circuit breaker
      await circuitBreaker.recordSuccess();
      assert.strictEqual(circuitBreaker.getState().state, 'closed');

      // 7. Metrics collection
      simulationMetrics.recordSuccess('whale', 21000n, ethers.parseUnits('20', 'gwei'));
      const report = simulationMetrics.generateReport();
      assert(report.summary.successful === 1);

      console.log('✅ Component integration test passed');
    });

    it('should handle component failures gracefully', async () => {
      // Test error propagation and handling

      // 1. Test invalid wallet index
      await assert.rejects(
        async () => walletFarm.getWallet(999, 'sepolia'),
        /out of range/
      );

      // 2. Test invalid archetype
      assert.throws(
        () => archetypeManager.getArchetype('invalid'),
        /Unknown archetype/
      );

      // 3. Test budget exceeded
      budgetEnforcer.recordTransaction(
        budgetEnforcer.maxTotalGas,
        ethers.parseUnits('20', 'gwei')
      );

      assert.throws(
        () => budgetEnforcer.checkTransaction(1000n, ethers.parseUnits('1', 'gwei')),
        /Total budget exceeded/
      );

      // 4. Test circuit breaker block
      const blockingBreaker = new CircuitBreaker();
      blockingBreaker.open();

      await assert.rejects(
        async () => blockingBreaker.execute(async () => 'test'),
        /Circuit breaker is open/
      );

      console.log('✅ Error handling test passed');
    });
  });
});
