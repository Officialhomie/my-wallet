import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UserArchetypes } from '../../src/simulation/UserArchetypes.js';
import { SeededRandom } from '../../src/timing/SeededRandom.js';
import { BehaviorSimulator } from '../../src/simulation/BehaviorSimulator.js';

describe('Parameter Generation Determinism', () => {
  it('should generate identical parameters with same seed', () => {
    const rng1 = new SeededRandom(12345);
    const archetypes1 = new UserArchetypes({ rng: rng1 });

    const rng2 = new SeededRandom(12345);
    const archetypes2 = new UserArchetypes({ rng: rng2 });

    // Generate 100 parameter sets
    const params1 = [];
    const params2 = [];

    for (let i = 0; i < 100; i++) {
      params1.push(archetypes1.generateTransactionSize('whale'));
      params2.push(archetypes2.generateTransactionSize('whale'));
    }

    // Should be identical
    assert.deepStrictEqual(params1, params2, 'Transaction sizes should match with same seed');
  });

  it('should generate different parameters with different seeds', () => {
    const archetypes1 = new UserArchetypes({ rng: new SeededRandom(12345) });
    const archetypes2 = new UserArchetypes({ rng: new SeededRandom(54321) });

    const params1 = [];
    const params2 = [];

    for (let i = 0; i < 50; i++) {
      params1.push(archetypes1.generateTransactionSize('activeTrader'));
      params2.push(archetypes2.generateTransactionSize('activeTrader'));
    }

    // Should be different
    assert.notDeepStrictEqual(params1, params2, 'Different seeds should produce different sizes');
  });

  it('should have deterministic skip behavior', () => {
    const rng1 = new SeededRandom(12345);
    const archetypes1 = new UserArchetypes({ rng: rng1 });

    const rng2 = new SeededRandom(12345);
    const archetypes2 = new UserArchetypes({ rng: rng2 });

    // Check 1000 skip decisions
    for (let i = 0; i < 1000; i++) {
      const skip1 = archetypes1.shouldSkipInteraction('whale');
      const skip2 = archetypes2.shouldSkipInteraction('whale');

      assert.strictEqual(skip1, skip2, `Skip decision ${i} should match`);
    }
  });

  it('should maintain determinism across different archetypes', () => {
    const rng1 = new SeededRandom(99999);
    const archetypes1 = new UserArchetypes({ rng: rng1 });

    const rng2 = new SeededRandom(99999);
    const archetypes2 = new UserArchetypes({ rng: rng2 });

    const archetypeNames = ['whale', 'activeTrader', 'casual', 'lurker', 'researcher'];

    // Test each archetype
    for (const archetype of archetypeNames) {
      const results1 = [];
      const results2 = [];

      for (let i = 0; i < 100; i++) {
        results1.push({
          size: archetypes1.generateTransactionSize(archetype),
          skip: archetypes1.shouldSkipInteraction(archetype)
        });

        results2.push({
          size: archetypes2.generateTransactionSize(archetype),
          skip: archetypes2.shouldSkipInteraction(archetype)
        });
      }

      assert.deepStrictEqual(results1, results2, `Results for ${archetype} should match`);
    }
  });

  it('should be deterministic when used through BehaviorSimulator', () => {
    // Mock wallet farm for testing
    const mockWalletFarm = {
      getWallet: () => ({ address: '0x123' }),
      getWalletCount: () => 1
    };

    const sim1 = new BehaviorSimulator(mockWalletFarm, { rng: new SeededRandom(11111) });
    const sim2 = new BehaviorSimulator(mockWalletFarm, { rng: new SeededRandom(11111) });

    // Generate sequences from both simulators
    const results1 = [];
    const results2 = [];

    for (let i = 0; i < 50; i++) {
      results1.push({
        whaleSize: sim1.userArchetypes.generateTransactionSize('whale'),
        traderSkip: sim1.userArchetypes.shouldSkipInteraction('activeTrader'),
        casualSize: sim1.userArchetypes.generateTransactionSize('casual')
      });

      results2.push({
        whaleSize: sim2.userArchetypes.generateTransactionSize('whale'),
        traderSkip: sim2.userArchetypes.shouldSkipInteraction('activeTrader'),
        casualSize: sim2.userArchetypes.generateTransactionSize('casual')
      });
    }

    // Should be identical
    assert.deepStrictEqual(results1, results2, 'BehaviorSimulator should be deterministic');
  });

  it('should maintain backward compatibility without RNG', () => {
    // Test that UserArchetypes still works without explicit RNG
    const archetypes = new UserArchetypes();

    // Should use Math as fallback
    assert(archetypes.rng === Math, 'Should use Math as fallback RNG');

    // Should still generate values (though not deterministic)
    const size = archetypes.generateTransactionSize('whale');
    const skip = archetypes.shouldSkipInteraction('casual');

    assert(typeof size === 'number', 'Should generate numeric size');
    assert(typeof skip === 'boolean', 'Should generate boolean skip decision');
    assert(size >= 10 && size <= 1000, 'Size should be in whale range');
  });

  it('should handle edge cases in random generation', () => {
    const rng = new SeededRandom(0); // Edge case seed
    const archetypes = new UserArchetypes({ rng });

    // Test with seed 0 (potential edge case)
    for (let i = 0; i < 100; i++) {
      const size = archetypes.generateTransactionSize('researcher');
      const skip = archetypes.shouldSkipInteraction('lurker');

      assert(typeof size === 'number' && isFinite(size), 'Size should be finite number');
      assert(typeof skip === 'boolean', 'Skip should be boolean');
      assert(size >= 0.0001 && size <= 0.01, 'Size should be in researcher range');
    }
  });
});
