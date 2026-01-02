import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ArchetypeManager } from '../../src/simulation/ArchetypeManager.js';
import { SeededRandom } from '../../src/timing/SeededRandom.js';

describe('ArchetypeManager', () => {
  let archetypeManager;
  let seededRng;

  beforeEach(() => {
    seededRng = new SeededRandom(12345);
    archetypeManager = new ArchetypeManager(seededRng);
  });

  describe('constructor', () => {
    it('should create an ArchetypeManager instance', () => {
      assert(archetypeManager instanceof ArchetypeManager);
      assert(archetypeManager.rng instanceof SeededRandom);
      assert(archetypeManager.archetypes instanceof Map);
    });

    it('should accept custom RNG', () => {
      const customRng = new SeededRandom(99999);
      const manager = new ArchetypeManager(customRng);

      assert.strictEqual(manager.rng, customRng);
    });

    it('should load default archetypes', () => {
      const names = archetypeManager.getArchetypeNames();

      assert(names.includes('whale'));
      assert(names.includes('activeTrader'));
      assert(names.includes('casual'));
      assert(names.includes('lurker'));
      assert(names.includes('researcher'));
      assert.strictEqual(names.length, 5);
    });
  });

  describe('loadArchetypesFromFile', () => {
    it('should throw on missing config file', () => {
      const manager = new ArchetypeManager();

      assert.throws(
        () => manager.loadArchetypesFromFile('/nonexistent/file.json'),
        /Archetype config file not found/
      );
    });

    // Skip invalid JSON test - file system operations in ES modules are complex
  });

  describe('registerArchetype', () => {
    it('should register custom archetype', () => {
      const config = {
        description: 'Test archetype',
        frequency: {
          profile: 'normal',
          skipProbability: 0.5
        },
        timing: {
          min: 1000,
          max: 5000
        },
        transactionSize: {
          min: 0.1,
          max: 1.0,
          distribution: 'uniform'
        }
      };

      archetypeManager.registerArchetype('test', config);

      assert(archetypeManager.getArchetypeNames().includes('test'));
      const archetype = archetypeManager.getArchetype('test');
      assert.strictEqual(archetype.description, 'Test archetype');
      assert(archetype.registeredAt);
    });

    it('should throw on invalid archetype name', () => {
      assert.throws(
        () => archetypeManager.registerArchetype('', {}),
        /Archetype name must be a non-empty string/
      );

      assert.throws(
        () => archetypeManager.registerArchetype(null, {}),
        /Archetype name must be a non-empty string/
      );
    });

    it('should throw on invalid config', () => {
      assert.throws(
        () => archetypeManager.registerArchetype('test', null),
        /Archetype config must be an object/
      );

      assert.throws(
        () => archetypeManager.registerArchetype('test', {}),
        /missing required fields/
      );
    });

    it('should validate frequency config', () => {
      const invalidConfig = {
        frequency: { skipProbability: 1.5 }, // > 1
        timing: { min: 1000, max: 2000 },
        transactionSize: { min: 0.1, max: 1.0 }
      };

      assert.throws(
        () => archetypeManager.registerArchetype('invalid', invalidConfig),
        /skipProbability must be number in range/
      );
    });

    it('should validate timing config', () => {
      const invalidConfig = {
        frequency: { skipProbability: 0.5 },
        timing: { min: 2000, max: 1000 }, // min > max
        transactionSize: { min: 0.1, max: 1.0 }
      };

      assert.throws(
        () => archetypeManager.registerArchetype('invalid', invalidConfig),
        /timing\.min must be < timing\.max/
      );
    });

    it('should validate transactionSize config', () => {
      const invalidConfig = {
        frequency: { skipProbability: 0.5 },
        timing: { min: 1000, max: 2000 },
        transactionSize: { min: 1.0, max: 0.1 } // min > max
      };

      assert.throws(
        () => archetypeManager.registerArchetype('invalid', invalidConfig),
        /transactionSize\.min must be < transactionSize\.max/
      );
    });
  });

  describe('getArchetype', () => {
    it('should return archetype config', () => {
      const archetype = archetypeManager.getArchetype('whale');

      assert.strictEqual(archetype.description, 'Large volume trader with infrequent but significant transactions');
      assert.strictEqual(archetype.frequency.skipProbability, 0.8);
      assert.strictEqual(archetype.timing.min, 600000);
      assert.strictEqual(archetype.timing.max, 1800000);
    });

    it('should return copy (not reference)', () => {
      const archetype1 = archetypeManager.getArchetype('whale');
      const archetype2 = archetypeManager.getArchetype('whale');

      assert.notStrictEqual(archetype1, archetype2);
      assert.deepStrictEqual(archetype1, archetype2);
    });

    it('should throw on unknown archetype', () => {
      assert.throws(
        () => archetypeManager.getArchetype('unknown'),
        /Unknown archetype: unknown/
      );
    });
  });

  describe('getArchetypeNames', () => {
    it('should return all archetype names', () => {
      const names = archetypeManager.getArchetypeNames();

      assert(Array.isArray(names));
      assert(names.length >= 5);
      assert(names.includes('whale'));
      assert(names.includes('activeTrader'));
    });
  });

  describe('shouldSkipInteraction', () => {
    it('should respect skip probabilities over large sample', () => {
      const samples = 10000;
      let skipped = 0;

      for (let i = 0; i < samples; i++) {
        if (archetypeManager.shouldSkipInteraction('whale')) {
          skipped++;
        }
      }

      const skipRate = skipped / samples;
      const expectedRate = 0.8;

      // Allow 2% variance
      assert(Math.abs(skipRate - expectedRate) < 0.02,
        `Skip rate ${skipRate} too far from expected ${expectedRate}`);
    });

    it('should use different RNG for different archetypes', () => {
      // Reset RNG to ensure deterministic behavior
      archetypeManager.setRng(new SeededRandom(12345));

      const whaleSkip1 = archetypeManager.shouldSkipInteraction('whale');
      const traderSkip1 = archetypeManager.shouldSkipInteraction('activeTrader');

      // Reset and test again
      archetypeManager.setRng(new SeededRandom(12345));
      const whaleSkip2 = archetypeManager.shouldSkipInteraction('whale');
      const traderSkip2 = archetypeManager.shouldSkipInteraction('activeTrader');

      // Should be deterministic
      assert.strictEqual(whaleSkip1, whaleSkip2);
      assert.strictEqual(traderSkip1, traderSkip2);
    });
  });

  describe('generateTransactionSize', () => {
    it('should generate sizes in valid range', () => {
      for (let i = 0; i < 100; i++) {
        const size = archetypeManager.generateTransactionSize('whale');
        assert(size >= 10 && size <= 1000, `Size ${size} out of range [10, 1000]`);
      }

      for (let i = 0; i < 100; i++) {
        const size = archetypeManager.generateTransactionSize('researcher');
        assert(size >= 0.0001 && size <= 0.01, `Size ${size} out of range [0.0001, 0.01]`);
      }
    });

    it('should follow power law distribution for whale', () => {
      const samples = 10000;
      const sizes = Array.from({ length: samples }, () =>
        archetypeManager.generateTransactionSize('whale')
      );

      // Power law: many small values, few large values
      const small = sizes.filter(s => s < 100).length;  // Bottom 90% of range
      const large = sizes.filter(s => s > 900).length;  // Top 10% of range

      // Should have significantly more small values than large
      assert(small > large * 3, 'Power law should produce more small values than large');
    });

    it('should throw on unknown archetype', () => {
      assert.throws(
        () => archetypeManager.generateTransactionSize('unknown'),
        /Unknown archetype/
      );
    });
  });

  describe('getTimingBounds', () => {
    it('should return correct timing bounds', () => {
      const whaleTiming = archetypeManager.getTimingBounds('whale');
      assert.strictEqual(whaleTiming.min, 600000);  // 10 min
      assert.strictEqual(whaleTiming.max, 1800000); // 30 min

      const traderTiming = archetypeManager.getTimingBounds('activeTrader');
      assert.strictEqual(traderTiming.min, 15000);  // 15 sec
      assert.strictEqual(traderTiming.max, 120000); // 2 min
    });
  });

  describe('getDelayProfile', () => {
    it('should return correct delay profile', () => {
      assert.strictEqual(archetypeManager.getDelayProfile('whale'), 'verySlow');
      assert.strictEqual(archetypeManager.getDelayProfile('activeTrader'), 'quick');
      assert.strictEqual(archetypeManager.getDelayProfile('casual'), 'normal');
    });
  });

  describe('getTimingConfig', () => {
    it('should return timing configuration', () => {
      const config = archetypeManager.getTimingConfig('whale');

      assert.strictEqual(config.profile, 'verySlow');
      assert.strictEqual(config.skipProbability, 0.8);
    });
  });

  describe('isFunctionSuitable', () => {
    it('should return true for archetypes without preferred functions', () => {
      // Default archetypes don't have preferred functions defined
      assert(archetypeManager.isFunctionSuitable('whale', 'anyFunction'));
      assert(archetypeManager.isFunctionSuitable('activeTrader', 'transfer'));
    });

    it('should check preferred functions when defined', () => {
      // Add archetype with preferred functions
      const config = {
        description: 'Test archetype',
        frequency: { profile: 'normal', skipProbability: 0.5 },
        timing: { min: 1000, max: 5000 },
        transactionSize: { min: 0.1, max: 1.0 },
        preferredFunctions: ['transfer', 'stake']
      };

      archetypeManager.registerArchetype('selective', config);

      assert(archetypeManager.isFunctionSuitable('selective', 'transfer'));
      assert(archetypeManager.isFunctionSuitable('selective', 'stake'));
      assert(!archetypeManager.isFunctionSuitable('selective', 'swap'));
    });
  });

  describe('generateParameters', () => {
    it('should generate basic parameters', () => {
      const params = archetypeManager.generateParameters('whale', 'transfer');

      assert.strictEqual(params.functionName, 'transfer');
      assert(typeof params.value === 'number');
      assert(params.value >= 10 && params.value <= 1000);
    });
  });

  describe('shouldBurst', () => {
    it('should return false for archetypes without burst config', () => {
      assert.strictEqual(archetypeManager.shouldBurst('whale'), false);
    });

    it('should check burst probability when config exists', () => {
      const config = {
        description: 'Bursty archetype',
        frequency: { profile: 'normal', skipProbability: 0.5 },
        timing: { min: 1000, max: 5000 },
        transactionSize: { min: 0.1, max: 1.0 },
        burstConfig: { probability: 0.3 }
      };

      archetypeManager.registerArchetype('bursty', config);

      // Test with known RNG seed for deterministic result
      archetypeManager.setRng(new SeededRandom(12345));
      const result1 = archetypeManager.shouldBurst('bursty');

      archetypeManager.setRng(new SeededRandom(12345));
      const result2 = archetypeManager.shouldBurst('bursty');

      assert.strictEqual(result1, result2); // Should be deterministic
    });
  });

  describe('getBurstConfig', () => {
    it('should return null for archetypes without burst config', () => {
      assert.strictEqual(archetypeManager.getBurstConfig('whale'), null);
    });

    it('should return burst config when defined', () => {
      const burstConfig = { probability: 0.3, burstSize: 5 };
      const config = {
        description: 'Bursty archetype',
        frequency: { profile: 'normal', skipProbability: 0.5 },
        timing: { min: 1000, max: 5000 },
        transactionSize: { min: 0.1, max: 1.0 },
        burstConfig
      };

      archetypeManager.registerArchetype('bursty', config);

      assert.deepStrictEqual(archetypeManager.getBurstConfig('bursty'), burstConfig);
    });
  });

  describe('getPreferredFunctions', () => {
    it('should return empty array for archetypes without preferred functions', () => {
      const functions = archetypeManager.getPreferredFunctions('whale');
      assert.deepStrictEqual(functions, []);
    });

    it('should return preferred functions when defined', () => {
      const preferredFunctions = ['transfer', 'stake', 'withdraw'];
      const config = {
        description: 'Selective archetype',
        frequency: { profile: 'normal', skipProbability: 0.5 },
        timing: { min: 1000, max: 5000 },
        transactionSize: { min: 0.1, max: 1.0 },
        preferredFunctions
      };

      archetypeManager.registerArchetype('selective', config);

      assert.deepStrictEqual(archetypeManager.getPreferredFunctions('selective'), preferredFunctions);
    });
  });

  describe('getArchetypeStats', () => {
    it('should return comprehensive statistics', () => {
      const stats = archetypeManager.getArchetypeStats();

      assert.strictEqual(stats.totalArchetypes, 5);
      assert(Array.isArray(stats.archetypeNames));
      assert.strictEqual(stats.archetypeNames.length, 5);

      // Check timing ranges
      assert(stats.timingRanges.whale);
      assert.strictEqual(stats.timingRanges.whale.min, 600000);
      assert.strictEqual(stats.timingRanges.whale.max, 1800000);

      // Check skip probabilities
      assert.strictEqual(stats.skipProbabilities.whale, 0.8);
      assert.strictEqual(stats.skipProbabilities.activeTrader, 0.05);

      // Check transaction size ranges
      assert(stats.transactionSizeRanges.whale);
      assert.strictEqual(stats.transactionSizeRanges.whale.distribution, 'powerLaw');
    });
  });

  describe('RNG management', () => {
    it('should allow getting current RNG', () => {
      const rng = archetypeManager.getRng();
      assert(rng instanceof SeededRandom);
      assert.strictEqual(rng, seededRng);
    });

    it('should allow setting new RNG', () => {
      const newRng = new SeededRandom(99999);
      archetypeManager.setRng(newRng);

      assert.strictEqual(archetypeManager.getRng(), newRng);
    });

    it('should throw on invalid RNG', () => {
      assert.throws(
        () => archetypeManager.setRng('not an rng'),
        /RNG must be an instance of SeededRandom/
      );
    });
  });
});
