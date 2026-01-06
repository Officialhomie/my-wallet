import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Import components for property testing
import { SeededRandom } from '../../src/timing/SeededRandom.js';
import { ArchetypeManager } from '../../src/simulation/ArchetypeManager.js';
import { TimingEngine } from '../../src/simulation/TimingEngine.js';
import { SimulationMetrics } from '../../src/simulation/SimulationMetrics.js';

describe('Property Tests - Stochastic Validation', () => {
  let seededRng;
  let archetypeManager;
  let timingEngine;
  let simulationMetrics;

  beforeEach(() => {
    seededRng = new SeededRandom(12345);
    archetypeManager = new ArchetypeManager(seededRng);
    timingEngine = new TimingEngine(seededRng);
    simulationMetrics = new SimulationMetrics();
  });

  describe('SeededRandom Statistical Properties', () => {
    it('should produce uniform distribution over large samples', () => {
      const samples = 100000;
      const values = Array.from({ length: samples }, () => seededRng.next());

      // Test uniformity with chi-squared test
      const bins = new Array(10).fill(0);
      const expectedPerBin = samples / 10;

      values.forEach(value => {
        const bin = Math.floor(value * 10);
        bins[bin]++;
      });

      // Chi-squared statistic should be reasonable for uniform distribution
      let chiSquared = 0;
      bins.forEach(count => {
        const diff = count - expectedPerBin;
        chiSquared += (diff * diff) / expectedPerBin;
      });

      // For 9 degrees of freedom (10 bins - 1), chi-squared should typically be < 16.92 (p=0.05)
      // Allow some tolerance for random variation
      assert(chiSquared < 25, `Chi-squared statistic ${chiSquared} too high for uniform distribution`);

      // All values should be in [0, 1)
      assert(values.every(v => v >= 0 && v < 1), 'All values should be in [0, 1)');
    });

    it('should produce deterministic sequences with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      const seq1 = Array.from({ length: 1000 }, () => rng1.next());
      const seq2 = Array.from({ length: 1000 }, () => rng2.next());

      assert.deepStrictEqual(seq1, seq2, 'Same seed should produce identical sequences');
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const seq1 = Array.from({ length: 1000 }, () => rng1.next());
      const seq2 = Array.from({ length: 1000 }, () => rng2.next());

      assert.notDeepStrictEqual(seq1, seq2, 'Different seeds should produce different sequences');
    });

    it('should pass serial correlation test', () => {
      const samples = 50000;
      const values = Array.from({ length: samples }, () => seededRng.next());

      // Calculate serial correlation
      let correlation = 0;
      for (let i = 1; i < values.length; i++) {
        correlation += values[i] * values[i - 1];
      }
      correlation /= (values.length - 1);

      // Serial correlation should be close to 0 for good PRNG
      assert(Math.abs(correlation) < 0.01, `Serial correlation ${correlation} too high`);
    });
  });

  describe('Archetype Behavior Properties', () => {
    it('should respect skip probabilities within statistical bounds', () => {
      const samples = 10000;
      const archetypes = ['whale', 'activeTrader', 'casual', 'lurker', 'researcher'];

      const results = {};

      archetypes.forEach(archetype => {
        let skipped = 0;

        for (let i = 0; i < samples; i++) {
          if (archetypeManager.shouldSkipInteraction(archetype)) {
            skipped++;
          }
        }

        const skipRate = skipped / samples;
        const expectedRate = archetypeManager.getArchetype(archetype).frequency.skipProbability;

        results[archetype] = { actual: skipRate, expected: expectedRate };
      });

      // Verify all archetypes are within 3 standard deviations (99.7% confidence)
      Object.entries(results).forEach(([archetype, { actual, expected }]) => {
        const stdDev = Math.sqrt((expected * (1 - expected)) / samples);
        const diff = Math.abs(actual - expected);

        assert(diff < 3 * stdDev,
          `${archetype}: skip rate ${actual} deviates too much from expected ${expected}`);
      });

      console.log('Skip probability validation:', results);
    });

    it('should generate transaction sizes following power law distribution', () => {
      const samples = 10000;
      const sizes = Array.from({ length: samples }, () =>
        archetypeManager.generateTransactionSize('whale')
      );

      // For power law distribution, most values should be small, few should be large
      const smallThreshold = 50; // Bottom 90% of whale range (10-1000)
      const largeThreshold = 900; // Top 10% of whale range

      const smallCount = sizes.filter(s => s < smallThreshold).length;
      const largeCount = sizes.filter(s => s > largeThreshold).length;

      // Should have significantly more small values than large
      const smallRatio = smallCount / samples;
      const largeRatio = largeCount / samples;

      assert(smallRatio > 0.8, `Too few small values: ${smallRatio}`);
      assert(largeRatio < 0.05, `Too many large values: ${largeRatio}`);
      assert(smallRatio > largeRatio * 10, 'Power law distribution not maintained');

      // Verify all sizes are within bounds
      assert(sizes.every(s => s >= 10 && s <= 1000), 'All sizes should be within whale bounds');
    });

    it('should produce consistent statistical properties across runs', () => {
      const run1 = runSimulationRun();
      const run2 = runSimulationRun();

      // Results should be statistically similar
      assert(Math.abs(run1.avgSkipRate - run2.avgSkipRate) < 0.05, 'Skip rates should be consistent');
      assert(Math.abs(run1.avgDelay - run2.avgDelay) < 100, 'Delays should be consistent');

      function runSimulationRun() {
        const localRng = new SeededRandom(12345);
        const localArchetypeManager = new ArchetypeManager(localRng);
        const localTimingEngine = new TimingEngine(localRng);

        let totalSkips = 0;
        let totalAttempts = 0;
        let totalDelay = 0;
        let delayCount = 0;

        for (let i = 0; i < 1000; i++) {
          const archetype = ['whale', 'activeTrader', 'casual'][i % 3];
          totalAttempts++;

          if (localArchetypeManager.shouldSkipInteraction(archetype)) {
            totalSkips++;
          } else {
            const delay = localTimingEngine.getDelaySync(
              localArchetypeManager.getDelayProfile(archetype)
            );
            totalDelay += delay;
            delayCount++;
          }
        }

        return {
          avgSkipRate: totalSkips / totalAttempts,
          avgDelay: delayCount > 0 ? totalDelay / delayCount : 0
        };
      }
    });
  });

  describe('Timing Engine Distribution Properties', () => {
    it('should converge to expected triangular distribution means', () => {
      const samples = 50000;
      const profiles = ['quick', 'normal', 'thoughtful', 'slow', 'verySlow'];

      profiles.forEach(profile => {
        const delays = Array.from({ length: samples }, () =>
          timingEngine.getDelaySync(profile, { disableVariance: true })
        );

        const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
        const config = timingEngine.getProfiles()[profile];
        const expectedMean = (config.min + config.max) / 2; // Triangular distribution mean

        // Allow 5% tolerance for statistical variation
        const tolerance = expectedMean * 0.05;
        assert(Math.abs(mean - expectedMean) < tolerance,
          `${profile}: mean ${mean} deviates from expected ${expectedMean}`);
      });
    });

    it('should maintain variance within expected bounds', () => {
      const samples = 10000;

      // Test normal profile variance
      const delays = Array.from({ length: samples }, () =>
        timingEngine.getDelaySync('normal')
      );

      const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
      const variance = delays.reduce((acc, delay) => acc + Math.pow(delay - mean, 2), 0) / delays.length;
      const stdDev = Math.sqrt(variance);

      // For triangular distribution with variance applied, expect reasonable spread
      const config = timingEngine.getProfiles().normal;
      const range = config.max - config.min;
      const expectedStdDev = range / Math.sqrt(6); // Approximation for triangular distribution

      // Variance should be significant but not excessive
      assert(stdDev > expectedStdDev * 0.5, `StdDev ${stdDev} too low`);
      assert(stdDev < expectedStdDev * 2, `StdDev ${stdDev} too high`);
    });

    it('should produce delays clustered around midpoint (triangular property)', () => {
      const samples = 100000;
      const delays = Array.from({ length: samples }, () =>
        timingEngine.getDelaySync('normal', { disableVariance: true })
      );

      const config = timingEngine.getProfiles().normal;
      const midpoint = (config.min + config.max) / 2;

      // Count values in different ranges
      const lowerThird = delays.filter(d => d < config.min + (config.max - config.min) / 3).length;
      const middleThird = delays.filter(d =>
        d >= config.min + (config.max - config.min) / 3 &&
        d <= config.min + 2 * (config.max - config.min) / 3
      ).length;
      const upperThird = delays.filter(d => d > config.min + 2 * (config.max - config.min) / 3).length;

      // Triangular distribution should have more values in the middle
      assert(middleThird > lowerThird, 'Should have more values in middle third');
      assert(middleThird > upperThird, 'Should have more values in middle third');

      // Middle should contain majority of values
      const middleRatio = middleThird / samples;
      assert(middleRatio > 0.4, `Middle third should contain >40% of values, got ${middleRatio}`);
    });
  });

  describe('Simulation Metrics Statistical Properties', () => {
    it('should accurately track success rates over time', () => {
      simulationMetrics.startSimulation();

      const totalAttempts = 1000;
      let actualSuccesses = 0;

      for (let i = 0; i < totalAttempts; i++) {
        simulationMetrics.recordAttempt('activeTrader');

        if (Math.random() > 0.3) { // 70% success rate
          simulationMetrics.recordSuccess('activeTrader', 21000n, 20000000000n);
          actualSuccesses++;
        } else {
          simulationMetrics.recordFailure('activeTrader', new Error('test failure'));
        }
      }

      simulationMetrics.endSimulation();
      const report = simulationMetrics.generateReport();

      const expectedSuccessRate = actualSuccesses / totalAttempts;
      const reportedSuccessRate = parseFloat(report.summary.successRate) / 100;

      // Should be very accurate (within 1%)
      assert(Math.abs(reportedSuccessRate - expectedSuccessRate) < 0.01,
        `Reported rate ${reportedSuccessRate} doesn't match actual ${expectedSuccessRate}`);
    });

    it('should maintain accurate error classification statistics', () => {
      const errorTypes = ['InsufficientFunds', 'NonceError', 'GasError', 'ContractRevert', 'NetworkError'];
      const errorCounts = {};

      // Generate known error patterns
      errorTypes.forEach(type => {
        errorCounts[type] = Math.floor(Math.random() * 50) + 10;

        for (let i = 0; i < errorCounts[type]; i++) {
          const error = new Error(`${type.toLowerCase()} test error`);
          simulationMetrics.recordFailure('whale', error);
        }
      });

      const report = simulationMetrics.generateReport();

      // Verify error classification accuracy
      errorTypes.forEach(type => {
        const reported = report.errors.errorBreakdown[type] || 0;
        const actual = errorCounts[type];

        assert.strictEqual(reported, actual,
          `${type}: reported ${reported} doesn't match actual ${actual}`);
      });
    });

    it('should handle high-frequency metrics collection', () => {
      simulationMetrics.startSimulation();

      const operations = 10000;
      const startTime = Date.now();

      // Simulate high-frequency operations
      for (let i = 0; i < operations; i++) {
        simulationMetrics.recordAttempt('activeTrader');

        if (i % 10 === 0) { // 10% failure rate
          simulationMetrics.recordFailure('activeTrader', new Error('high frequency test'));
        } else {
          simulationMetrics.recordSuccess('activeTrader', 21000n, 20000000000n);
        }

        simulationMetrics.recordDelay(Math.random() * 1000);
      }

      const endTime = Date.now();
      simulationMetrics.endSimulation();

      const report = simulationMetrics.generateReport();

      // Verify all operations were tracked
      assert.strictEqual(report.summary.totalAttempts, operations);
      assert(report.summary.successful > operations * 0.85); // ~90% success
      assert(report.summary.failed > operations * 0.05); // ~10% failure

      // Verify timing calculations
      assert(report.timing.averageDelay > 0);
      assert(report.timing.totalDelay > 0);

      // Performance should be acceptable (< 100ms total for 10k operations)
      const processingTime = endTime - startTime;
      assert(processingTime < 100, `Processing took too long: ${processingTime}ms`);
    });
  });

  describe('End-to-End Statistical Validation', () => {
    it('should maintain statistical consistency across full simulation runs', () => {
      const runs = 5;
      const runResults = [];

      for (let run = 0; run < runs; run++) {
        const runMetrics = new SimulationMetrics();
        runMetrics.startSimulation();

        // Run simulation with known parameters
        for (let i = 0; i < 1000; i++) {
          const archetype = ['whale', 'activeTrader', 'casual'][i % 3];
          runMetrics.recordAttempt(archetype);

          if (!archetypeManager.shouldSkipInteraction(archetype)) {
            runMetrics.recordDelay(timingEngine.getDelaySync(
              archetypeManager.getDelayProfile(archetype)
            ));

            if (Math.random() > 0.2) { // 80% success rate
              runMetrics.recordSuccess(archetype, 21000n, 20000000000n);
            } else {
              runMetrics.recordFailure(archetype, new Error('statistical test'));
            }
          } else {
            runMetrics.recordSkip(archetype);
          }
        }

        runMetrics.endSimulation();
        const report = runMetrics.generateReport();

        runResults.push({
          successRate: parseFloat(report.summary.successRate),
          averageDelay: report.timing.averageDelay,
          totalOperations: report.summary.totalAttempts
        });
      }

      // Verify consistency across runs
      const successRates = runResults.map(r => r.successRate);
      const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / runs;
      const successRateVariance = successRates.reduce((acc, rate) =>
        acc + Math.pow(rate - avgSuccessRate, 2), 0) / runs;

      // Success rates should be consistent (variance < 5%)
      assert(successRateVariance < 25, `Success rate variance too high: ${successRateVariance}`);

      // All runs should have similar operation counts
      const operationCounts = runResults.map(r => r.totalOperations);
      const minOps = Math.min(...operationCounts);
      const maxOps = Math.max(...operationCounts);
      const variation = (maxOps - minOps) / minOps;

      assert(variation < 0.1, `Operation count variation too high: ${variation}`);
    });

    it('should validate power law exponent accuracy', () => {
      const samples = 50000;
      const exponent = 1.5; // Whale exponent

      // Generate sizes using archetype manager
      const sizes = Array.from({ length: samples }, () =>
        archetypeManager.generateTransactionSize('whale')
      );

      // Calculate empirical exponent using log-log regression
      const sortedSizes = sizes.sort((a, b) => a - b);
      const logSizes = sortedSizes.map(s => Math.log(s));
      const logRanks = Array.from({ length: samples }, (_, i) =>
        Math.log((samples - i) / samples)
      );

      // Simple linear regression to estimate exponent
      const n = samples;
      const sumX = logSizes.reduce((a, b) => a + b, 0);
      const sumY = logRanks.reduce((a, b) => a + b, 0);
      const sumXY = logSizes.reduce((acc, size, i) => acc + size * logRanks[i], 0);
      const sumXX = logSizes.reduce((acc, size) => acc + size * size, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const estimatedExponent = -slope; // Power law: P(x) ∝ x^(-α), so α = -slope

      // Should be close to expected exponent (within 10%)
      const tolerance = exponent * 0.1;
      assert(Math.abs(estimatedExponent - exponent) < tolerance,
        `Estimated exponent ${estimatedExponent} deviates from expected ${exponent}`);
    });
  });
});
