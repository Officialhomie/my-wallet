import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SimulationMetrics } from '../../src/simulation/SimulationMetrics.js';

describe('SimulationMetrics', () => {
  let metrics;

  beforeEach(() => {
    metrics = new SimulationMetrics();
  });

  describe('constructor', () => {
    it('should create SimulationMetrics instance', () => {
      assert(metrics instanceof SimulationMetrics);
      assert(metrics.metrics);
      assert(metrics.rawData);
      assert(Array.isArray(metrics.rawData.transactions));
      assert(Array.isArray(metrics.rawData.delays));
      assert(Array.isArray(metrics.rawData.errors));
    });
  });

  describe('reset', () => {
    it('should reset all metrics to initial state', () => {
      // Add some data
      metrics.recordAttempt('whale');
      metrics.recordDelay(1000);

      metrics.reset();

      assert.strictEqual(metrics.metrics.totalAttempts, 0);
      assert.strictEqual(metrics.metrics.delays.length, 0);
      assert.strictEqual(metrics.rawData.transactions.length, 0);
    });
  });

  describe('startSimulation/endSimulation', () => {
    it('should track simulation timing', () => {
      metrics.startSimulation();
      assert(metrics.metrics.startTime);

      // Simulate some delay
      const startTime = metrics.metrics.startTime;
      metrics.endSimulation();

      assert(metrics.metrics.endTime);
      assert(metrics.metrics.endTime >= startTime);
    });
  });

  describe('recordAttempt', () => {
    it('should record transaction attempt', () => {
      metrics.recordAttempt('whale');

      assert.strictEqual(metrics.metrics.totalAttempts, 1);
      assert(metrics.metrics.txsByArchetype.has('whale'));
      assert.strictEqual(metrics.metrics.txsByArchetype.get('whale').attempts, 1);
    });

    it('should record multiple archetypes', () => {
      metrics.recordAttempt('whale');
      metrics.recordAttempt('activeTrader');
      metrics.recordAttempt('whale'); // Second whale attempt

      assert.strictEqual(metrics.metrics.totalAttempts, 3);
      assert.strictEqual(metrics.metrics.txsByArchetype.get('whale').attempts, 2);
      assert.strictEqual(metrics.metrics.txsByArchetype.get('activeTrader').attempts, 1);
    });

    it('should include metadata in raw data', () => {
      const metadata = { chain: 'sepolia', priority: 'high' };
      metrics.recordAttempt('whale', metadata);

      assert.strictEqual(metrics.rawData.transactions.length, 1);
      assert.strictEqual(metrics.rawData.transactions[0].archetype, 'whale');
      assert.strictEqual(metrics.rawData.transactions[0].chain, 'sepolia');
      assert.strictEqual(metrics.rawData.transactions[0].priority, 'high');
    });
  });

  describe('recordSuccess', () => {
    it('should record successful transaction', () => {
      const gasUsed = 21000n;
      const gasPrice = 20000000000n; // 20 gwei
      const confirmationTime = 15000; // 15 seconds

      metrics.recordSuccess('whale', gasUsed, gasPrice, confirmationTime);

      assert.strictEqual(metrics.metrics.successfulTxs, 1);
      assert.strictEqual(metrics.metrics.totalGasUsed, gasUsed);
      assert.strictEqual(metrics.metrics.totalGasCost, gasUsed * gasPrice);
      assert.strictEqual(metrics.metrics.confirmationTimes[0], confirmationTime);

      const archetypeStats = metrics.metrics.txsByArchetype.get('whale');
      assert.strictEqual(archetypeStats.successes, 1);
      assert.strictEqual(archetypeStats.totalGasUsed, gasUsed);
    });

    it('should update gas price statistics', () => {
      metrics.recordSuccess('whale', 21000n, 20000000000n);
      metrics.recordSuccess('whale', 25000n, 25000000000n);

      assert.strictEqual(metrics.metrics.gasPriceStats.count, 2);
      assert.strictEqual(metrics.metrics.gasPriceStats.min, 20000000000n);
      assert.strictEqual(metrics.metrics.gasPriceStats.max, 25000000000n);
      assert.strictEqual(metrics.metrics.gasPriceStats.sum, 45000000000n);
    });

    it('should handle transactions without confirmation time', () => {
      metrics.recordSuccess('whale', 21000n, 20000000000n);

      assert.strictEqual(metrics.metrics.confirmationTimes.length, 0);
    });
  });

  describe('recordFailure', () => {
    it('should record failed transaction', () => {
      const error = new Error('insufficient funds');
      const reverted = false;

      metrics.recordFailure('whale', error, reverted);

      assert.strictEqual(metrics.metrics.failedTxs, 1);
      assert.strictEqual(metrics.metrics.errorsByType.get('InsufficientFunds'), 1);

      const archetypeStats = metrics.metrics.txsByArchetype.get('whale');
      assert.strictEqual(archetypeStats.failures, 1);
    });

    it('should record reverted transactions', () => {
      const error = new Error('execution reverted');
      const reverted = true;

      metrics.recordFailure('whale', error, reverted);

      assert.strictEqual(metrics.metrics.revertedTxs, 1);
      assert.strictEqual(metrics.metrics.errorsByType.get('ContractRevert'), 1);
    });

    it('should track errors by archetype', () => {
      metrics.recordFailure('whale', new Error('nonce too low'));
      metrics.recordFailure('activeTrader', new Error('timeout'));

      assert(metrics.metrics.errorsByArchetype.has('whale'));
      assert(metrics.metrics.errorsByArchetype.has('activeTrader'));
      assert.strictEqual(metrics.metrics.errorsByArchetype.get('whale').get('NonceError'), 1);
      assert.strictEqual(metrics.metrics.errorsByArchetype.get('activeTrader').get('NetworkError'), 1);
    });

    it('should classify various error types', () => {
      const testCases = [
        { error: 'insufficient funds', expected: 'InsufficientFunds' },
        { error: 'nonce too low', expected: 'NonceError' },
        { error: 'gas required exceeds', expected: 'GasError' },
        { error: 'execution reverted', expected: 'ContractRevert' },
        { error: 'timeout', expected: 'NetworkError' },
        { error: 'circuit breaker', expected: 'CircuitBreaker' },
        { error: 'budget exceeded', expected: 'BudgetExceeded' },
        { error: 'unknown error', expected: 'Unknown' }
      ];

      testCases.forEach(({ error, expected }) => {
        metrics.recordFailure('test', new Error(error));
        assert(metrics.metrics.errorsByType.has(expected));
      });
    });
  });

  describe('recordSkip', () => {
    it('should record skipped interactions', () => {
      metrics.recordSkip('whale');

      assert.strictEqual(metrics.metrics.skippedInteractions, 1);
      assert.strictEqual(metrics.metrics.txsByArchetype.get('whale').skips, 1);
    });
  });

  describe('recordDelay', () => {
    it('should record delays', () => {
      metrics.recordDelay(1000);
      metrics.recordDelay(2000);

      assert.strictEqual(metrics.metrics.delays.length, 2);
      assert.strictEqual(metrics.metrics.delays[0], 1000);
      assert.strictEqual(metrics.metrics.delays[1], 2000);
      assert.strictEqual(metrics.metrics.totalSimulationTime, 3000);
    });

    it('should store raw delay data', () => {
      const metadata = { phase: 'warmup' };
      metrics.recordDelay(1500, metadata);

      assert.strictEqual(metrics.rawData.delays.length, 1);
      assert.strictEqual(metrics.rawData.delays[0].delay, 1500);
      assert.strictEqual(metrics.rawData.delays[0].phase, 'warmup');
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', () => {
      // Set up simulation timing
      metrics.startSimulation();
      metrics.endSimulation();

      // Add some data
      metrics.recordAttempt('whale');
      metrics.recordSuccess('whale', 21000n, 20000000000n, 12000);
      metrics.recordFailure('whale', new Error('timeout'));
      metrics.recordDelay(5000);

      const report = metrics.generateReport();

      // Check summary
      assert.strictEqual(report.summary.totalAttempts, 1);
      assert.strictEqual(report.summary.successful, 1);
      assert.strictEqual(report.summary.failed, 1);
      assert(report.summary.successRate);
      assert(report.summary.duration >= 0);

      // Check gas metrics
      assert(report.gas.totalGasUsed);
      assert(report.gas.averageGasPerTx > 0);
      assert(report.gas.gasPrice.min);
      assert(report.gas.gasPrice.average);

      // Check timing metrics
      assert(report.timing.averageConfirmation > 0);
      assert(report.timing.averageDelay === 5000);
      assert(report.timing.totalDelay === 5000);

      // Check error breakdown
      assert(report.errors.errorBreakdown.NetworkError === 1);

      // Check archetype breakdown
      assert(report.archetypes.breakdown.whale);
      assert(report.archetypes.breakdown.whale.successRate);

      // Check performance metrics
      assert(report.performance.transactionsPerSecond);
      assert(report.performance.gasEfficiency > 0);
    });

    it('should handle empty metrics', () => {
      const report = metrics.generateReport();

      assert.strictEqual(report.summary.totalAttempts, 0);
      assert.strictEqual(report.summary.successful, 0);
      assert.strictEqual(report.summary.successRate, '0.00%');
      assert.strictEqual(report.timing.averageConfirmation, 0);
    });

    it('should calculate averages correctly', () => {
      metrics.recordSuccess('whale', 21000n, 20000000000n, 10000);
      metrics.recordSuccess('whale', 25000n, 25000000000n, 15000);

      const report = metrics.generateReport();

      assert.strictEqual(report.timing.averageConfirmation, 12500);
      assert.strictEqual(report.gas.averageGasPerTx, 23000);
    });
  });

  describe('getStatus', () => {
    it('should return current status', () => {
      metrics.startSimulation();
      metrics.recordAttempt('whale');

      const status = metrics.getStatus();

      assert.strictEqual(status.isActive, true);
      assert(status.startTime);
      assert(status.lastActivity);
      assert.strictEqual(status.totalAttempts, 1);
      assert.strictEqual(status.successRate, '0.00%');
      assert.strictEqual(status.currentStats.attempts, 1);
    });

    it('should handle inactive simulation', () => {
      const status = metrics.getStatus();

      assert.strictEqual(status.isActive, false);
      assert.strictEqual(status.activeTime, 0);
    });
  });

  describe('exportRawData', () => {
    it('should export all raw data', () => {
      metrics.recordAttempt('whale');
      metrics.recordDelay(1000);
      metrics.recordFailure('whale', new Error('test'));

      const rawData = metrics.exportRawData();

      assert(rawData.summary);
      assert.strictEqual(rawData.transactions.length, 1);
      assert.strictEqual(rawData.delays.length, 1);
      assert.strictEqual(rawData.errors.length, 1);
    });
  });

  describe('statistics calculations', () => {
    it('should calculate statistics through public methods', () => {
      // Test average through timing calculations
      metrics.recordDelay(10);
      metrics.recordDelay(20);
      metrics.recordDelay(30);

      const report = metrics.generateReport();
      assert.strictEqual(report.timing.averageDelay, 20);
    });

    it('should calculate median through confirmation times', () => {
      // Add confirmation times for median calculation
      metrics.recordSuccess('whale', 21000n, 20000000000n, 10);
      metrics.recordSuccess('whale', 21000n, 20000000000n, 20);
      metrics.recordSuccess('whale', 21000n, 20000000000n, 30);

      const report = metrics.generateReport();
      assert.strictEqual(report.timing.medianConfirmation, 20);
    });
  });

  describe('integration scenario', () => {
    it('should track complete simulation workflow', () => {
      metrics.startSimulation();

      // Simulate some activity
      metrics.recordAttempt('whale');
      metrics.recordSuccess('whale', 21000n, 20000000000n, 10000);
      metrics.recordDelay(2000);

      metrics.recordAttempt('activeTrader');
      metrics.recordFailure('activeTrader', new Error('insufficient funds'));
      metrics.recordDelay(1500);

      metrics.recordSkip('casual');

      // Ensure some measurable duration
      setTimeout(() => {}, 10);
      metrics.endSimulation();

      const report = metrics.generateReport();

      // Overall metrics
      assert.strictEqual(report.summary.totalAttempts, 3); // whale attempt + trader attempt + casual skip
      assert.strictEqual(report.summary.successful, 1);
      assert.strictEqual(report.summary.failed, 1);
      assert.strictEqual(report.summary.skipped, 1);

      // Archetype breakdown
      assert(report.archetypes.breakdown.whale);
      assert(report.archetypes.breakdown.activeTrader);
      assert(report.archetypes.breakdown.casual);

      // Performance metrics
      assert(typeof report.performance.transactionsPerSecond === 'string');
      assert.strictEqual(report.performance.errorRate, '33.33%');

      // Timing
      assert.strictEqual(report.timing.averageDelay, 1750);
      assert.strictEqual(report.timing.totalDelay, 3500);
    });

    it('should handle high-volume simulation data', () => {
      // Simulate high-volume scenario
      for (let i = 0; i < 100; i++) {
        metrics.recordAttempt('whale');
        metrics.recordSuccess('whale', 21000n, 20000000000n, 5000 + i * 100);
        metrics.recordDelay(1000 + i * 10);
      }

      const report = metrics.generateReport();

      assert.strictEqual(report.summary.totalAttempts, 100);
      assert.strictEqual(report.summary.successful, 100);
      assert.strictEqual(report.summary.successRate, '100.00%');

      // Check performance calculations
      assert(report.performance.gasEfficiency > 0);
      assert(report.timing.averageConfirmation > 5000);
      assert(report.timing.averageDelay > 1000);
    });
  });
});
