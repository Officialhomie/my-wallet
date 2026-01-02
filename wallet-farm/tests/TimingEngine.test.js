import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { TimingEngine } from '../src/simulation/TimingEngine.js';

describe('TimingEngine', () => {
  let timingEngine;

  beforeEach(() => {
    timingEngine = new TimingEngine({ verbose: false });
  });

  describe('constructor', () => {
    it('should create a TimingEngine instance', () => {
      assert(timingEngine instanceof TimingEngine);
      assert(timingEngine.timingProfiles);
      assert(timingEngine.options);
    });

    it('should accept options', () => {
      const customEngine = new TimingEngine({
        baseMultiplier: 2.0,
        variance: 0.5
      });

      assert.strictEqual(customEngine.options.baseMultiplier, 2.0);
      assert.strictEqual(customEngine.options.variance, 0.5);
    });
  });

  describe('humanDelay', () => {
    it('should delay for a valid timing profile', async () => {
      const startTime = Date.now();
      const delay = await timingEngine.humanDelay('quick');
      const endTime = Date.now();

      assert(typeof delay === 'number');
      assert(delay >= 100); // At least minimum possible delay (due to variance)
      assert(delay <= 5000); // Allow some variance above max
      assert(endTime - startTime >= delay - 50); // Actual delay occurred (with small tolerance)
    });

    it('should delay for custom profile object', async () => {
      const customProfile = { min: 500, max: 1000 };
      const delay = await timingEngine.humanDelay(customProfile);

      assert(delay >= 200); // Allow variance
      assert(delay <= 2000); // Allow variance
    });

    it('should throw on invalid profile', async () => {
      try {
        await timingEngine.humanDelay('invalid');
        assert.fail('Should have thrown');
      } catch (error) {
        assert(error.message.includes('Invalid timing profile'));
      }
    });

    it('should apply multipliers', async () => {
      const engine = new TimingEngine({ baseMultiplier: 2.0 });
      const delay = await engine.humanDelay({ min: 1000, max: 2000 });

      assert(delay >= 1000); // Should be at least base minimum
      assert(delay <= 6000); // Allow variance above 2.0 * 2000
    });
  });

  describe('randomDelay', () => {
    it('should delay for specified range', async () => {
      const startTime = Date.now();
      const delay = await timingEngine.randomDelay(500, 1000);
      const endTime = Date.now();

      assert(typeof delay === 'number');
      assert(delay >= 500);
      assert(delay <= 1000);
      assert(endTime - startTime >= delay);
    });
  });

  describe('simulateTyping', () => {
    it('should simulate typing time', async () => {
      const startTime = Date.now();
      const typingTime = await timingEngine.simulateTyping('Hello World');
      const endTime = Date.now();

      assert(typeof typingTime === 'number');
      assert(typingTime >= 500); // Minimum typing time
      assert(endTime - startTime >= typingTime);
    });

    it('should scale with text length', async () => {
      const shortTime = await timingEngine.simulateTyping('Hi');
      const longTime = await timingEngine.simulateTyping('This is a much longer sentence for testing purposes.');

      // Longer text should generally take more time
      assert(longTime > shortTime * 0.8); // Allow some variance
    });
  });

  describe('timingSequence', () => {
    it('should execute timing sequence', async () => {
      const startTime = Date.now();
      const delays = await timingEngine.timingSequence(['quick', 'normal', 'slow']);
      const endTime = Date.now();

      assert(Array.isArray(delays));
      assert.strictEqual(delays.length, 3);
      delays.forEach(delay => {
        assert(typeof delay === 'number');
        assert(delay > 0);
      });

      // Allow for some timing imprecision (±100ms)
      const totalDelay = delays.reduce((sum, d) => sum + d, 0);
      const actualDuration = endTime - startTime;
      assert(Math.abs(actualDuration - totalDelay) < 200);
    });

    it('should add inter-step delays', async () => {
      const delays = await timingEngine.timingSequence(
        ['quick', 'quick'],
        { interStepDelay: 'instant' }
      );

      assert.strictEqual(delays.length, 3); // 2 delays + 1 inter-step
    });
  });

  describe('burstPattern', () => {
    it('should execute burst pattern', async () => {
      const delays = await timingEngine.burstPattern(3, 'quick', 'normal', 2);

      assert(Array.isArray(delays));
      // Should have: burst1, burst2, burst3, pause, burst1, burst2, burst3
      assert.strictEqual(delays.length, 7);
    });
  });

  describe('addProfile', () => {
    it('should add custom timing profile', () => {
      timingEngine.addProfile('custom', { min: 5000, max: 10000 });

      const profiles = timingEngine.getProfiles();
      assert(profiles.custom);
      assert.strictEqual(profiles.custom.min, 5000);
      assert.strictEqual(profiles.custom.max, 10000);
    });

    it('should throw on invalid profile', () => {
      assert.throws(() => {
        timingEngine.addProfile('', { min: 1000, max: 2000 });
      }, /Profile name must be a non-empty string/);

      assert.throws(() => {
        timingEngine.addProfile('test', { min: 2000, max: 1000 });
      }, /Profile must have valid min and max values/);
    });
  });

  describe('getProfiles', () => {
    it('should return timing profiles', () => {
      const profiles = timingEngine.getProfiles();

      assert(profiles.quick);
      assert(profiles.normal);
      assert(profiles.slow);
      assert.strictEqual(profiles.quick.min, 1000);
      assert.strictEqual(profiles.quick.max, 3000);
    });
  });

  describe('calculateStats', () => {
    it('should calculate timing statistics', () => {
      const delays = [1000, 2000, 3000, 4000, 5000];
      const stats = timingEngine.calculateStats(delays);

      assert.strictEqual(stats.count, 5);
      assert.strictEqual(stats.total, 15000);
      assert.strictEqual(stats.average, 3000);
      assert.strictEqual(stats.median, 3000);
      assert.strictEqual(stats.min, 1000);
      assert.strictEqual(stats.max, 5000);
    });

    it('should handle empty delays array', () => {
      const stats = timingEngine.calculateStats([]);

      assert.strictEqual(stats.count, 0);
    });
  });
});
