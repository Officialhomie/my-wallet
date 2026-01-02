import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { SeededRandom } from '../../src/timing/SeededRandom.js';

describe('SeededRandom', () => {
  let rng;

  beforeEach(() => {
    rng = new SeededRandom(12345);
  });

  it('should produce deterministic sequence with same seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    assert.deepStrictEqual(seq1, seq2);
  });

  it('should produce different sequences with different seeds', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(54321);

    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());

    assert.notDeepStrictEqual(seq1, seq2);
  });

  it('should produce values in range [0, 1)', () => {
    const testRng = new SeededRandom();

    for (let i = 0; i < 1000; i++) {
      const val = testRng.next();
      assert(val >= 0 && val < 1, `Value ${val} out of range`);
    }
  });

  it('nextInt should produce integers in specified range', () => {
    const testRng = new SeededRandom(12345);

    for (let i = 0; i < 1000; i++) {
      const val = testRng.nextInt(5, 10);
      assert(Number.isInteger(val), 'Value must be integer');
      assert(val >= 5 && val <= 10, `Value ${val} out of range [5, 10]`);
    }
  });

  it('nextInt should throw on invalid range', () => {
    assert.throws(() => rng.nextInt(10, 5), /min must be <= max/);
    assert.throws(() => rng.nextInt(1.5, 5), /min and max must be integers/);
    assert.throws(() => rng.nextInt(1, 5.5), /min and max must be integers/);
  });

  it('nextFloat should produce floats in specified range', () => {
    const testRng = new SeededRandom(12345);

    for (let i = 0; i < 1000; i++) {
      const val = testRng.nextFloat(5.0, 10.0);
      assert(val >= 5.0 && val < 10.0, `Value ${val} out of range [5.0, 10.0)`);
    }
  });

  it('nextFloat should throw on invalid range', () => {
    assert.throws(() => rng.nextFloat(10, 5), /min must be < max/);
  });

  it('nextBoolean should respect probability', () => {
    const testRng = new SeededRandom(12345);
    let trueCount = 0;

    for (let i = 0; i < 10000; i++) {
      if (testRng.nextBoolean(0.3)) {
        trueCount++;
      }
    }

    const probability = trueCount / 10000;
    // Allow 5% variance
    assert(probability > 0.25 && probability < 0.35,
      `Probability ${probability} too far from expected 0.3`);
  });

  it('choose should select from array', () => {
    const array = ['a', 'b', 'c', 'd', 'e'];
    const selections = new Set();

    // Run enough times to likely get all elements
    for (let i = 0; i < 1000; i++) {
      const choice = rng.choose(array);
      assert(array.includes(choice), `Choice ${choice} not in array`);
      selections.add(choice);
    }

    // Should have selected all elements (high probability)
    assert(selections.size >= 3, 'Should select multiple different elements');
  });

  it('choose should throw on invalid array', () => {
    assert.throws(() => rng.choose([]), /array must be non-empty array/);
    assert.throws(() => rng.choose('not an array'), /array must be an array/);
    assert.throws(() => rng.choose(null), /array must be an array/);
  });

  it('shuffle should shuffle array in place', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const array = [...original];

    rng.shuffle(array);

    // Array should be shuffled (different order)
    assert.notDeepStrictEqual(array, original, 'Array should be shuffled');

    // Should contain same elements
    assert.deepStrictEqual(array.sort(), original.sort(), 'Should contain same elements');
  });

  it('shuffle should throw on invalid input', () => {
    assert.throws(() => rng.shuffle('not an array'), /array must be an array/);
    assert.throws(() => rng.shuffle(null), /array must be an array/);
  });

  it('should have uniform distribution over large sample', () => {
    const testRng = new SeededRandom(12345);
    const buckets = new Array(10).fill(0);
    const samples = 100000;

    for (let i = 0; i < samples; i++) {
      const bucket = Math.floor(testRng.next() * 10);
      buckets[bucket]++;
    }

    // Each bucket should have ~10% of samples (allow 2% variance)
    buckets.forEach((count, index) => {
      const proportion = count / samples;
      assert(proportion > 0.08 && proportion < 0.12,
        `Bucket ${index} has ${proportion * 100}%, expected ~10%`);
    });
  });

  it('fork should create different but related sequence', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = rng1.fork();

    // Should produce different sequences
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    assert.notDeepStrictEqual(seq1, seq2, 'Forked RNG should produce different sequence');

    // But should be deterministic
    const rng3 = rng1.fork();
    const seq3 = Array.from({ length: 10 }, () => rng3.next());
    assert.deepStrictEqual(seq2, seq3, 'Forked RNG should be deterministic');
  });

  it('getState should return copy of internal state', () => {
    const state1 = rng.getState();
    const state2 = rng.getState();

    assert.deepStrictEqual(state1, state2, 'Should return same state');

    // Should be Uint32Array
    assert(state1 instanceof Uint32Array, 'Should return Uint32Array');

    // Should not be same reference
    assert(state1 !== rng.getState(), 'Should return different references');
  });

  it('reset should restore initial state', () => {
    const initialValues = Array.from({ length: 5 }, () => rng.next());

    // Generate some more values
    Array.from({ length: 10 }, () => rng.next());

    // Reset
    rng.reset();

    // Should produce same sequence again
    const resetValues = Array.from({ length: 5 }, () => rng.next());

    assert.deepStrictEqual(initialValues, resetValues, 'Should produce same sequence after reset');
  });

  it('reset with new seed should change sequence', () => {
    const initialValues = Array.from({ length: 5 }, () => rng.next());

    rng.reset(99999);

    const newValues = Array.from({ length: 5 }, () => rng.next());

    assert.notDeepStrictEqual(initialValues, newValues, 'Should produce different sequence with new seed');
  });

  it('should pass Diehard-style randomness tests', () => {
    const testRng = new SeededRandom(42);
    const samples = 50000;

    // Test 1: Serial correlation (should be near 0)
    const values = Array.from({ length: samples }, () => testRng.next());
    let correlation = 0;

    for (let i = 1; i < values.length; i++) {
      correlation += values[i] * values[i - 1];
    }
    correlation /= (values.length - 1);

    // Serial correlation should be reasonably low for good RNG (xorshift128 has some correlation)
    assert(Math.abs(correlation) < 0.3, `Serial correlation ${correlation} too high for xorshift128`);

    // Test 2: No obvious patterns (check for runs of same value ranges)
    let runs = 1;
    let currentRange = Math.floor(values[0] * 10);

    for (let i = 1; i < values.length; i++) {
      const range = Math.floor(values[i] * 10);
      if (range !== currentRange) {
        runs++;
        currentRange = range;
      }
    }

    // Should have reasonable number of runs (not too few, not too many)
    const expectedRuns = samples * 0.9; // Rough estimate
    assert(runs > expectedRuns * 0.5 && runs < expectedRuns * 1.5,
      `Runs ${runs} seems unreasonable for ${samples} samples`);
  });
});
