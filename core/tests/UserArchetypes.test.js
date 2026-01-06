import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { UserArchetypes } from '../src/simulation/UserArchetypes.js';

describe('UserArchetypes', () => {
  let archetypes;

  beforeEach(() => {
    archetypes = new UserArchetypes({ verbose: false });
  });

  describe('constructor', () => {
    it('should create a UserArchetypes instance', () => {
      assert(archetypes instanceof UserArchetypes);
      assert(archetypes.archetypes);
    });

    it('should include default archetypes', () => {
      const names = archetypes.getArchetypeNames();
      assert(names.includes('whale'));
      assert(names.includes('activeTrader'));
      assert(names.includes('casual'));
      assert(names.includes('lurker'));
      assert(names.includes('researcher'));
      assert(names.includes('bot'));
    });

    it('should accept custom archetypes', () => {
      const customArchetypes = {
        customUser: {
          frequency: 'medium',
          volume: 'low',
          delayMin: 10000,
          delayMax: 20000,
          transactionSize: { min: 0.1, max: 1.0 },
          skipProbability: 0.2
        }
      };

      const customInstance = new UserArchetypes({ customArchetypes });
      assert(customInstance.archetypes.customUser);
      assert.strictEqual(customInstance.archetypes.customUser.frequency, 'medium');
    });
  });

  describe('getArchetype', () => {
    it('should return valid archetype', () => {
      const whale = archetypes.getArchetype('whale');

      assert.strictEqual(whale.name, 'whale');
      assert.strictEqual(whale.frequency, 'veryLow');
      assert.strictEqual(whale.volume, 'veryHigh');
      assert(whale.transactionSize);
      assert(whale.timingPatterns);
    });

    it('should throw on invalid archetype', () => {
      assert.throws(() => {
        archetypes.getArchetype('invalid');
      }, /Unknown archetype/);
    });
  });

  describe('getTimingConfig', () => {
    it('should return timing configuration', () => {
      const timing = archetypes.getTimingConfig('whale');

      assert(timing.delayMin);
      assert(timing.delayMax);
      assert(timing.interActionDelay);
      assert(timing.decisionTime);
      assert(timing.sessionLength);
    });
  });

  describe('shouldSkipInteraction', () => {
    it('should determine skip behavior based on probability', () => {
      // Test whale (high skip probability)
      let skipCount = 0;
      for (let i = 0; i < 100; i++) {
        if (archetypes.shouldSkipInteraction('whale')) {
          skipCount++;
        }
      }
      // Should skip ~85% of the time (with some variance)
      assert(skipCount > 70 && skipCount < 95);

      // Test active trader (low skip probability)
      skipCount = 0;
      for (let i = 0; i < 100; i++) {
        if (archetypes.shouldSkipInteraction('activeTrader')) {
          skipCount++;
        }
      }
      // Should skip ~5% of the time
      assert(skipCount >= 0 && skipCount < 20);
    });
  });

  describe('generateTransactionSize', () => {
    it('should generate size within archetype range', () => {
      const sizes = [];
      for (let i = 0; i < 100; i++) {
        sizes.push(archetypes.generateTransactionSize('casual'));
      }

      sizes.forEach(size => {
        assert(size >= 0.01 && size <= 1.0); // Casual range
      });

      // Should have some variation
      const uniqueSizes = new Set(sizes);
      assert(uniqueSizes.size > 1);
    });

    it('should respect constraints', () => {
      const size = archetypes.generateTransactionSize('casual', {
        size: { min: 0.5, max: 0.8 }
      });

      assert(size >= 0.5 && size <= 0.8);
    });
  });

  describe('shouldBurst', () => {
    it('should determine burst behavior', () => {
      // Active trader has burst behavior
      let burstCount = 0;
      for (let i = 0; i < 100; i++) {
        if (archetypes.shouldBurst('activeTrader')) {
          burstCount++;
        }
      }
      // Should burst ~40% of the time
      assert(burstCount > 20 && burstCount < 60);

      // Whale doesn't burst
      burstCount = 0;
      for (let i = 0; i < 100; i++) {
        if (archetypes.shouldBurst('whale')) {
          burstCount++;
        }
      }
      assert.strictEqual(burstCount, 0);
    });
  });

  describe('getBurstConfig', () => {
    it('should return burst configuration', () => {
      const config = archetypes.getBurstConfig('activeTrader');

      assert(config.burstSize);
      assert(config.interBurstDelay);
    });
  });

  describe('getPreferredFunctions', () => {
    it('should return preferred functions', () => {
      const functions = archetypes.getPreferredFunctions('whale');

      assert(Array.isArray(functions));
      assert(functions.includes('stake'));
      assert(functions.includes('deposit'));
    });
  });

  describe('isFunctionSuitable', () => {
    it('should determine function suitability', () => {
      // Whale should like stake functions
      assert(archetypes.isFunctionSuitable('whale', 'stake'));
      // Whale should avoid small transfers
      assert(!archetypes.isFunctionSuitable('whale', 'smallTransfer'));

      // Active trader should like swap functions
      assert(archetypes.isFunctionSuitable('activeTrader', 'swap'));
    });
  });

  describe('generateParameters', () => {
    it('should generate parameters with variation', () => {
      const baseParams = [1.0, 'test'];
      const variedParams = archetypes.generateParameters('casual', 'transfer', baseParams);

      assert(Array.isArray(variedParams));
      assert.strictEqual(variedParams.length, 2);
      assert(typeof variedParams[0] === 'number');
      assert.strictEqual(variedParams[1], 'test'); // String unchanged
    });
  });

  describe('getArchetypeNames', () => {
    it('should return all archetype names', () => {
      const names = archetypes.getArchetypeNames();

      assert(Array.isArray(names));
      assert(names.length >= 6); // Default archetypes
      assert(names.includes('whale'));
      assert(names.includes('bot'));
    });
  });

  describe('addArchetype', () => {
    it('should add custom archetype', () => {
      archetypes.addArchetype('custom', {
        frequency: 'medium',
        volume: 'low',
        delayMin: 10000,
        delayMax: 20000,
        transactionSize: { min: 0.1, max: 1.0 },
        skipProbability: 0.2
      });

      const custom = archetypes.getArchetype('custom');
      assert.strictEqual(custom.frequency, 'medium');
      assert.strictEqual(custom.delayMin, 10000);

      const names = archetypes.getArchetypeNames();
      assert(names.includes('custom'));
    });

    it('should throw on invalid archetype', () => {
      assert.throws(() => {
        archetypes.addArchetype('', {
          frequency: 'medium',
          volume: 'low',
          delayMin: 10000,
          delayMax: 20000,
          transactionSize: { min: 0.1, max: 1.0 }
        });
      }, /Archetype name must be a non-empty string/);

      assert.throws(() => {
        archetypes.addArchetype('test', {});
      }, /Archetype config missing required fields/);
    });
  });

  describe('getArchetypeStats', () => {
    it('should return archetype statistics', () => {
      const stats = archetypes.getArchetypeStats();

      assert(stats.whale);
      assert(stats.activeTrader);
      assert(typeof stats.whale.avgDelay === 'number');
      assert(typeof stats.whale.skipRate === 'number');
    });
  });
});
