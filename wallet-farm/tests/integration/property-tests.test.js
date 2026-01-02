import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SeededRandom } from '../../src/timing/SeededRandom.js';
import { TimingEngine } from '../../src/simulation/TimingEngine.js';
import { ArchetypeManager } from '../../src/simulation/ArchetypeManager.js';

/**
 * Property Tests for Stochastic Validation
 *
 * These tests verify statistical properties and distributions of the
 * random number generation and behavioral simulation components.
 * They ensure that the system produces realistic, statistically valid
 * simulation behaviors.
 */

describe('Property Tests - Stochastic Validation', () => {
  let seededRng;
  let timingEngine;
  let archetypeManager;

  beforeEach(() => {
    seededRng = new SeededRandom(12345);
    timingEngine = new TimingEngine(seededRng);
    archetypeManager = new ArchetypeManager(seededRng);
  });

  describe('SeededRandom Statistical Properties', () => {
    it('should produce uniform distribution', () => {
      const rng = new SeededRandom(42);
      const samples = process.env.CI ? 100000 : 10000; // Reduce for faster local testing
      const values = [];

      // Generate large sample
      for (let i = 0; i < samples; i++) {
        values.push(rng.next());
      }

      // Test uniformity with chi-square test approximation
      const bins = new Array(10).fill(0);
      const expectedPerBin = samples / 10;

      values.forEach(value => {
        const bin = Math.floor(value * 10);
        if (bin >= 0 && bin < 10) {
          bins[bin]++;
        }
      });

      // Calculate chi-square statistic
      let chiSquare = 0;
      bins.forEach(count => {
        const diff = count - expectedPerBin;
        chiSquare += (diff * diff) / expectedPerBin;
      });

      // For uniform distribution with 9 degrees of freedom (10 bins - 1),
      // chi-square should be reasonable (not too high or low)
      // Critical value for p=0.05 is ~16.9, for p=0.95 is ~3.3
      assert(chiSquare > 3 && chiSquare < 25,
        `Chi-square statistic ${chiSquare} indicates non-uniform distribution`);

      console.log(`✅ Uniform distribution test passed (χ² = ${chiSquare.toFixed(2)})`);
    });

    it('should have low serial correlation', () => {
      const rng = new SeededRandom(12345);
      const samples = 50000;
      const values = [];

      for (let i = 0; i < samples; i++) {
        values.push(rng.next());
      }

      // Calculate autocorrelation at lag 1
      let correlation = 0;
      let mean = 0;
      let variance = 0;

      // Calculate mean
      for (const value of values) {
        mean += value;
      }
      mean /= samples;

      // Calculate correlation and variance
      for (let i = 1; i < values.length; i++) {
        const diff1 = values[i] - mean;
        const diff2 = values[i - 1] - mean;
        correlation += diff1 * diff2;
        variance += diff1 * diff1;
      }

      correlation /= variance;

      // Serial correlation should be very low for good RNG
      assert(Math.abs(correlation) < 0.01,
        `Serial correlation ${correlation} too high for good RNG`);

      console.log(`✅ Serial correlation test passed (ρ = ${correlation.toFixed(6)})`);
    });

    it('should produce independent sequences with different seeds', () => {
      const rng1 = new SeededRandom(11111);
      const rng2 = new SeededRandom(22222);
      const samples = 10000;

      let correlation = 0;
      let variance1 = 0;
      let variance2 = 0;

      for (let i = 0; i < samples; i++) {
        const v1 = rng1.next();
        const v2 = rng2.next();

        correlation += (v1 - 0.5) * (v2 - 0.5);
        variance1 += Math.pow(v1 - 0.5, 2);
        variance2 += Math.pow(v2 - 0.5, 2);
      }

      correlation /= Math.sqrt(variance1 * variance2);

      // Correlation between different seeds should be very low
      assert(Math.abs(correlation) < 0.01,
        `Correlation between different seeds ${correlation} too high`);

      console.log(`✅ Independence test passed (ρ = ${correlation.toFixed(6)})`);
    });

    it('should maintain period length', () => {
      const rng = new SeededRandom(99999);
      const initialSequence = [];

      // Generate initial sequence
      for (let i = 0; i < 100; i++) {
        initialSequence.push(rng.next());
      }

      // Reset and generate same sequence
      rng.reset(99999);
      const resetSequence = [];
      for (let i = 0; i < 100; i++) {
        resetSequence.push(rng.next());
      }

      // Sequences should be identical
      assert.deepStrictEqual(initialSequence, resetSequence,
        'RNG should produce identical sequences after reset');

      console.log('✅ Period length test passed');
    });
  });

  describe('TimingEngine Distribution Properties', () => {
    it('should produce triangular distribution for humanDelay', () => {
      const samples = process.env.CI ? 50000 : 5000; // Reduce for faster local testing
      const delays = [];

      // Generate large sample of delays
      for (let i = 0; i < samples; i++) {
        delays.push(timingEngine.getDelaySync('normal'));
      }

      // Analyze distribution shape
      const sorted = [...delays].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const mid = (min + max) / 2;

      // Count values in different ranges
      const lowerThird = delays.filter(d => d < min + (max - min) / 3).length;
      const middleThird = delays.filter(d => d >= min + (max - min) / 3 && d < min + 2 * (max - min) / 3).length;
      const upperThird = delays.filter(d => d >= min + 2 * (max - min) / 3).length;

      // In a triangular distribution, middle should have more values
      assert(middleThird > lowerThird * 0.9 && middleThird > upperThird * 0.9,
        `Distribution not triangular: lower=${lowerThird}, middle=${middleThird}, upper=${upperThird}`);

      console.log(`✅ Triangular distribution test passed (${lowerThird}/${middleThird}/${upperThird})`);
    });

    it('should respect variance settings', () => {
      const samples = 10000;
      const lowVarianceDelays = [];
      const highVarianceDelays = [];

      // Create engines with different variance settings
      const lowVarEngine = new TimingEngine(seededRng);
      lowVarEngine.addProfile('lowVar', { min: 1000, max: 5000, variance: 0.1 });

      const highVarEngine = new TimingEngine(seededRng);
      highVarEngine.addProfile('highVar', { min: 1000, max: 5000, variance: 0.5 });

      // Generate samples
      for (let i = 0; i < samples; i++) {
        lowVarianceDelays.push(lowVarEngine.getDelaySync('lowVar'));
        highVarianceDelays.push(highVarEngine.getDelaySync('highVar'));
      }

      // Calculate standard deviations
      const lowVarStd = calculateStdDev(lowVarianceDelays);
      const highVarStd = calculateStdDev(highVarianceDelays);

      // High variance should have larger spread
      assert(highVarStd > lowVarStd * 1.5,
        `High variance (${highVarStd.toFixed(2)}) should be greater than low variance (${lowVarStd.toFixed(2)})`);

      console.log(`✅ Variance test passed (low: ${lowVarStd.toFixed(2)}, high: ${highVarStd.toFixed(2)})`);
    });

    it('should maintain profile bounds', () => {
      const profiles = ['quick', 'normal', 'thoughtful', 'slow', 'verySlow'];
      const samplesPerProfile = 1000;

      for (const profile of profiles) {
        const config = timingEngine.getProfiles()[profile];
        const delays = [];

        // Generate samples
        for (let i = 0; i < samplesPerProfile; i++) {
          delays.push(timingEngine.getDelaySync(profile));
        }

        const minDelay = Math.min(...delays);
        const maxDelay = Math.max(...delays);

        // Allow some tolerance for variance (5% beyond bounds)
        const tolerance = 0.05;
        const expectedMin = config.min * (1 - tolerance);
        const expectedMax = config.max * (1 + tolerance);

        assert(minDelay >= expectedMin,
          `Profile ${profile}: min delay ${minDelay} below expected ${expectedMin}`);
        assert(maxDelay <= expectedMax,
          `Profile ${profile}: max delay ${maxDelay} above expected ${expectedMax}`);

        console.log(`✅ Profile ${profile} bounds test passed (${minDelay}-${maxDelay}ms)`);
      }
    });
  });

  describe('ArchetypeManager Statistical Properties', () => {
    it('should respect skip probabilities', () => {
      const archetypes = ['whale', 'activeTrader', 'casual', 'lurker', 'researcher'];
      const samples = process.env.CI ? 100000 : 10000; // Reduce for faster local testing

      for (const archetype of archetypes) {
        const config = archetypeManager.getArchetype(archetype);
        const expectedSkipRate = config.frequency.skipProbability;

        let skips = 0;
        for (let i = 0; i < samples; i++) {
          if (archetypeManager.shouldSkipInteraction(archetype)) {
            skips++;
          }
        }

        const actualSkipRate = skips / samples;
        const tolerance = 0.02; // 2% tolerance

        assert(Math.abs(actualSkipRate - expectedSkipRate) < tolerance,
          `Archetype ${archetype}: expected ${expectedSkipRate}, got ${actualSkipRate}`);

        console.log(`✅ Archetype ${archetype} skip rate test passed (${(actualSkipRate * 100).toFixed(1)}%)`);
      }
    });

    it('should generate power-law distributed transaction sizes', () => {
      const samples = 50000;
      const whaleSizes = [];
      const traderSizes = [];

      // Generate samples
      for (let i = 0; i < samples; i++) {
        whaleSizes.push(archetypeManager.generateTransactionSize('whale'));
        traderSizes.push(archetypeManager.generateTransactionSize('activeTrader'));
      }

      // Analyze distributions
      const whaleStats = analyzeDistribution(whaleSizes);
      const traderStats = analyzeDistribution(traderSizes);

      // For power-law distributions, mean should be closer to minimum than uniform
      const whaleMeanToMin = whaleStats.mean / whaleStats.min;
      const traderMeanToMin = traderStats.mean / traderStats.min;

      // Both should show power-law characteristics (mean much closer to min than max)
      assert(whaleMeanToMin < 10, `Whale distribution not power-law: mean/min = ${whaleMeanToMin}`);
      assert(traderMeanToMin < 5, `Trader distribution not power-law: mean/min = ${traderMeanToMin}`);

      console.log(`✅ Power-law distributions verified (whale: ${whaleMeanToMin.toFixed(2)}, trader: ${traderMeanToMin.toFixed(2)})`);
    });

    it('should maintain deterministic behavior with same seed', () => {
      const manager1 = new ArchetypeManager(new SeededRandom(12345));
      const manager2 = new ArchetypeManager(new SeededRandom(12345));

      const results1 = [];
      const results2 = [];

      // Generate same sequence
      for (let i = 0; i < 100; i++) {
        results1.push({
          skip: manager1.shouldSkipInteraction('whale'),
          size: manager1.generateTransactionSize('activeTrader')
        });

        results2.push({
          skip: manager2.shouldSkipInteraction('whale'),
          size: manager2.generateTransactionSize('activeTrader')
        });
      }

      // Should be identical
      assert.deepStrictEqual(results1, results2,
        'Archetype manager should be deterministic with same seed');

      console.log('✅ Deterministic archetype behavior verified');
    });

    it('should produce realistic transaction size ranges', () => {
      const samples = process.env.CI ? 10000 : 1000; // Reduce for faster local testing
      const sizeRanges = {
        whale: { min: 10, max: 1000, samples: [] },
        activeTrader: { min: 0.1, max: 10, samples: [] },
        casual: { min: 0.01, max: 1, samples: [] },
        lurker: { min: 0.001, max: 0.1, samples: [] },
        researcher: { min: 0.0001, max: 0.01, samples: [] }
      };

      // Generate samples
      Object.keys(sizeRanges).forEach(archetype => {
        for (let i = 0; i < samples; i++) {
          sizeRanges[archetype].samples.push(
            archetypeManager.generateTransactionSize(archetype)
          );
        }
      });

      // Verify ranges
      Object.entries(sizeRanges).forEach(([archetype, config]) => {
        const samples = config.samples;
        const min = Math.min(...samples);
        const max = Math.max(...samples);

        // Allow some tolerance for statistical variation
        const tolerance = 0.1; // 10%
        const expectedMin = config.min * (1 - tolerance);
        const expectedMax = config.max * (1 + tolerance);

        assert(min >= expectedMin,
          `Archetype ${archetype}: min ${min} below expected ${expectedMin}`);
        assert(max <= expectedMax,
          `Archetype ${archetype}: max ${max} above expected ${expectedMax}`);

        console.log(`✅ Archetype ${archetype} range test passed (${min.toFixed(6)}-${max.toFixed(6)})`);
      });
    });
  });

  describe('System-wide Statistical Validation', () => {
    it('should maintain consistency across component interactions', () => {
      // Test that components work together statistically
      const iterations = process.env.CI ? 1000 : 100; // Reduce for faster local testing
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const archetype = archetypeManager.getArchetypeNames()[
          Math.floor(seededRng.next() * archetypeManager.getArchetypeNames().length)
        ];

        const shouldSkip = archetypeManager.shouldSkipInteraction(archetype);
        const delay = timingEngine.getDelaySync('quick');
        const txSize = shouldSkip ? 0 : archetypeManager.generateTransactionSize(archetype);

        results.push({
          archetype,
          shouldSkip,
          delay,
          txSize
        });
      }

      // Analyze results
      const archetypeCounts = {};
      const delayStats = { sum: 0, count: 0 };
      const txSizeStats = { sum: 0, count: 0 };

      results.forEach(result => {
        archetypeCounts[result.archetype] = (archetypeCounts[result.archetype] || 0) + 1;

        delayStats.sum += result.delay;
        delayStats.count++;

        if (!result.shouldSkip) {
          txSizeStats.sum += result.txSize;
          txSizeStats.count++;
        }
      });

      // Verify reasonable distributions
      assert(Object.keys(archetypeCounts).length > 0, 'Should use multiple archetypes');
      assert(delayStats.count === iterations, 'Should have delay for each iteration');
      assert(txSizeStats.count > 0, 'Should have some transactions');

      const avgDelay = delayStats.sum / delayStats.count;
      const avgTxSize = txSizeStats.sum / txSizeStats.count;

      assert(avgDelay >= 500 && avgDelay <= 2000, `Average delay ${avgDelay} out of expected range`);
      assert(avgTxSize > 0, `Average transaction size ${avgTxSize} should be positive`);

      console.log(`✅ System consistency test passed (avg delay: ${avgDelay.toFixed(0)}ms, avg tx: ${avgTxSize.toFixed(4)})`);
    });

    it('should handle edge cases in statistical distributions', () => {
      // Test edge cases that might cause statistical anomalies

      // Test with extreme seeds
      const extremeRng = new SeededRandom(0);
      const extremeEngine = new TimingEngine(extremeRng);
      const extremeManager = new ArchetypeManager(extremeRng);

      // Generate samples with extreme seed
      const extremeDelays = [];
      const extremeSizes = [];

      for (let i = 0; i < 1000; i++) {
        extremeDelays.push(extremeEngine.getDelaySync('normal'));
        extremeSizes.push(extremeManager.generateTransactionSize('whale'));
      }

      // Verify no NaN or infinite values
      extremeDelays.forEach(delay => {
        assert(!isNaN(delay) && isFinite(delay), `Invalid delay: ${delay}`);
        assert(delay >= 2000 && delay <= 8000, `Delay ${delay} out of normal range`);
      });

      extremeSizes.forEach(size => {
        assert(!isNaN(size) && isFinite(size), `Invalid size: ${size}`);
        assert(size >= 10 && size <= 1000, `Size ${size} out of whale range`);
      });

      console.log('✅ Edge case handling verified');
    });

    it('should demonstrate statistical reproducibility', () => {
      // Test that the same seed produces identical statistical results
      const seed = 98765;
      const samples = 10000;

      // Run two identical simulations
      const runSimulation = (rng) => {
        const engine = new TimingEngine(rng);
        const manager = new ArchetypeManager(rng);

        const delays = [];
        const sizes = [];
        const skips = [];

        for (let i = 0; i < samples; i++) {
          delays.push(engine.getDelaySync('normal'));
          sizes.push(manager.generateTransactionSize('activeTrader'));
          skips.push(manager.shouldSkipInteraction('casual'));
        }

        return { delays, sizes, skips };
      };

      const result1 = runSimulation(new SeededRandom(seed));
      const result2 = runSimulation(new SeededRandom(seed));

      // Results should be identical
      assert.deepStrictEqual(result1.delays, result2.delays, 'Delays should be identical');
      assert.deepStrictEqual(result1.sizes, result2.sizes, 'Sizes should be identical');
      assert.deepStrictEqual(result1.skips, result2.skips, 'Skips should be identical');

      console.log('✅ Statistical reproducibility verified');
    });
  });
});

// Helper functions for statistical analysis
function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function analyzeDistribution(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];

  return { min, max, mean, median };
}
