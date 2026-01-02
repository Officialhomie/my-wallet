import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TimingEngine } from '../src/simulation/TimingEngine.js';
import { SeededRandom } from '../src/timing/SeededRandom.js';

describe('TimingEngine', () => {
  let timingEngine;
  let seededRng;

  beforeEach(() => {
    seededRng = new SeededRandom(12345);
    timingEngine = new TimingEngine(seededRng);
  });

  describe('constructor', () => {
    it('should create a TimingEngine instance', () => {
      assert(timingEngine instanceof TimingEngine);
      assert(timingEngine.profiles);
      assert(typeof timingEngine.humanDelay === 'function');
      assert(timingEngine.rng instanceof SeededRandom);
    });

    it('should accept custom RNG', () => {
      const customRng = new SeededRandom(99999);
      const engine = new TimingEngine(customRng);

      assert.strictEqual(engine.rng, customRng);
    });
  });

  describe('humanDelay', () => {
    it('should delay for a valid timing profile', async () => {
      const start = Date.now();
      const delay = await timingEngine.humanDelay('normal');
      const elapsed = Date.now() - start;

      assert(delay >= 2000 && delay <= 8000);
      assert(elapsed >= delay);
    });

    it('should throw on invalid profile', async () => {
      await assert.rejects(
        async () => await timingEngine.humanDelay('invalid'),
        /Unknown delay profile/
      );
    });

    it('should apply multipliers', async () => {
      const delay = await timingEngine.humanDelay('quick', { multiplier: 2 });
      assert(delay >= 1000 && delay <= 4000); // 500-2000 * 2
    });

    it('should disable additional variance when requested', () => {
      // Create fresh RNG for each test to ensure deterministic behavior
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);
      const engine1 = new TimingEngine(rng1);
      const engine2 = new TimingEngine(rng2);

      const delay1 = engine1.getDelaySync('normal', { disableVariance: true });
      const delay2 = engine2.getDelaySync('normal', { disableVariance: true });

      // Should produce same delay with same seed and no additional variance
      assert.strictEqual(delay1, delay2);
    });
  });

  describe('getDelaySync', () => {
    it('should return delay synchronously', () => {
      const delay = timingEngine.getDelaySync('quick');
      assert(delay >= 500 && delay <= 2000);
    });

    it('should produce deterministic delays with same seed', () => {
      const engine1 = new TimingEngine(new SeededRandom(12345));
      const engine2 = new TimingEngine(new SeededRandom(12345));

      const delay1 = engine1.getDelaySync('normal');
      const delay2 = engine2.getDelaySync('normal');

      assert.strictEqual(delay1, delay2);
    });
  });

  describe('typingDelay', () => {
    it('should simulate typing time', async () => {
      const start = Date.now();
      const delay = await timingEngine.typingDelay('Hello World');
      const elapsed = Date.now() - start;

      assert(typeof delay === 'number');
      assert(delay > 0);
      assert(elapsed >= delay);
    });

    it('should scale with text length', async () => {
      const shortDelay = await timingEngine.typingDelay('Hi');
      const longDelay = await timingEngine.typingDelay('This is a much longer message to type');

      assert(longDelay > shortDelay);
    });

    it('should support different typing speeds', async () => {
      const slowDelay = await timingEngine.typingDelay('Hello', 'slow');
      const fastDelay = await timingEngine.typingDelay('Hello', 'fast');

      assert(fastDelay < slowDelay);
    });

    it('should throw on invalid typing speed', async () => {
      await assert.rejects(
        async () => await timingEngine.typingDelay('test', 'invalid'),
        /Unknown typing speed/
      );
    });
  });

  describe('burstPattern', () => {
    it('should execute burst pattern', async () => {
      const result = await timingEngine.burstPattern(3, 2000);

      assert.strictEqual(result.burstCount, 3);
      assert.strictEqual(result.pauseDuration, 2000);
      assert(Array.isArray(result.actionDelays));
      assert.strictEqual(result.actionDelays.length, 2); // n-1 actions
      assert(result.totalDuration >= 2000);
    });
  });

  describe('timingSequence', () => {
    it('should execute timing sequence', async () => {
      const actions = [
        { name: 'action1', profile: 'quick' },
        { name: 'action2', profile: 'normal' }
      ];

      const results = await timingEngine.timingSequence(actions);

      assert.strictEqual(results.length, 2);
      assert.strictEqual(results[0].action, 'action1');
      assert.strictEqual(results[1].action, 'action2');
      assert(results[0].delay >= 500 && results[0].delay <= 2000);
      assert(results[1].delay >= 2000 && results[1].delay <= 8000);
    });

    it('should use default profile when not specified', async () => {
      const actions = [{ name: 'test' }];
      const results = await timingEngine.timingSequence(actions, { defaultProfile: 'quick' });

      assert(results[0].delay >= 500 && results[0].delay <= 2000);
    });

    it('should execute callbacks', async () => {
      let callbackExecuted = false;
      const actions = [{
        name: 'test',
        profile: 'quick',
        callback: () => { callbackExecuted = true; }
      }];

      await timingEngine.timingSequence(actions);

      assert(callbackExecuted);
    });
  });

  describe('addProfile', () => {
    it('should add custom timing profile', () => {
      timingEngine.addProfile('custom', { min: 5000, max: 10000 });
      const profiles = timingEngine.getProfiles();

      assert(profiles.custom);
      assert.strictEqual(profiles.custom.min, 5000);
      assert.strictEqual(profiles.custom.max, 10000);
      assert.strictEqual(profiles.custom.variance, 0.3);
    });

    it('should use custom variance', () => {
      timingEngine.addProfile('custom', { min: 1000, max: 2000, variance: 0.5 });
      const profiles = timingEngine.getProfiles();

      assert.strictEqual(profiles.custom.variance, 0.5);
    });

    it('should throw on invalid profile name', () => {
      assert.throws(
        () => timingEngine.addProfile('', { min: 1000, max: 2000 }),
        /Profile name must be a non-empty string/
      );
    });

    it('should throw on invalid config', () => {
      assert.throws(
        () => timingEngine.addProfile('test', null),
        /Profile config must be an object/
      );
    });

    it('should throw on invalid min/max', () => {
      assert.throws(
        () => timingEngine.addProfile('test', { min: 2000, max: 1000 }),
        /Profile min must be less than max/
      );
    });
  });

  describe('getProfiles', () => {
    it('should return timing profiles', () => {
      const profiles = timingEngine.getProfiles();

      assert(profiles.quick);
      assert.strictEqual(profiles.quick.min, 500);
      assert.strictEqual(profiles.quick.max, 2000);
    });

    it('should return copy (not reference)', () => {
      const profiles1 = timingEngine.getProfiles();
      const profiles2 = timingEngine.getProfiles();

      assert.notStrictEqual(profiles1, profiles2);
      assert.deepStrictEqual(profiles1, profiles2);
    });
  });

  describe('calculateStats', () => {
    it('should calculate timing statistics', () => {
      const delays = [1000, 2000, 1500, 3000, 2500];
      const stats = timingEngine.calculateStats(delays);

      assert.strictEqual(stats.count, 5);
      assert.strictEqual(stats.mean, 2000);
      assert.strictEqual(stats.median, 2000);
      assert.strictEqual(stats.min, 1000);
      assert.strictEqual(stats.max, 3000);
      assert(stats.variance > 0);
      assert(stats.stdDev > 0);
    });

    it('should handle empty delays array', () => {
      const stats = timingEngine.calculateStats([]);

      assert.strictEqual(stats.count, 0);
      assert.strictEqual(stats.mean, 0);
      assert.strictEqual(stats.median, 0);
    });

    it('should handle single delay', () => {
      const stats = timingEngine.calculateStats([1500]);

      assert.strictEqual(stats.count, 1);
      assert.strictEqual(stats.mean, 1500);
      assert.strictEqual(stats.median, 1500);
      assert.strictEqual(stats.min, 1500);
      assert.strictEqual(stats.max, 1500);
    });
  });

  describe('RNG management', () => {
    it('should allow getting current RNG', () => {
      const rng = timingEngine.getRng();
      assert(rng instanceof SeededRandom);
      assert.strictEqual(rng, seededRng);
    });

    it('should allow setting new RNG', () => {
      const newRng = new SeededRandom(99999);
      timingEngine.setRng(newRng);

      assert.strictEqual(timingEngine.getRng(), newRng);
    });

    it('should throw on invalid RNG', () => {
      assert.throws(
        () => timingEngine.setRng('not an rng'),
        /RNG must be an instance of SeededRandom/
      );
    });
  });

  describe('triangular distribution', () => {
    it('should cluster delays around midpoint', () => {
      const delays = [];
      for (let i = 0; i < 1000; i++) {
        delays.push(timingEngine.getDelaySync('normal', { disableVariance: true }));
      }

      const stats = timingEngine.calculateStats(delays);
      const midpoint = (2000 + 8000) / 2; // 5000

      // Mean should be close to midpoint (within 10%)
      assert(Math.abs(stats.mean - midpoint) < midpoint * 0.1);
    });

    it('should produce more values near center than extremes', () => {
      const delays = [];
      for (let i = 0; i < 10000; i++) {
        delays.push(timingEngine.getDelaySync('quick', { disableVariance: true }));
      }

      const nearMin = delays.filter(d => d < 800).length;   // Bottom 25%
      const nearMax = delays.filter(d => d > 1700).length;  // Top 25%
      const nearCenter = delays.filter(d => d >= 1000 && d <= 1400).length; // Middle 25%

      // Center should have more values than extremes
      assert(nearCenter > nearMin);
      assert(nearCenter > nearMax);
    });
  });
});
