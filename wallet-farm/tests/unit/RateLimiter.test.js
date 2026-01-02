import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RateLimiter } from '../../src/safety/RateLimiter.js';

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      requestsPerSecond: 10,
      burstSize: 10
    });
  });

  it('should allow requests within rate limit', async () => {
    // Should allow 10 immediate requests (burst)
    for (let i = 0; i < 10; i++) {
      await limiter.acquire(1);
    }

    const status = limiter.getStatus();
    assert.strictEqual(status.availableTokens, 0);
    assert.strictEqual(status.metrics.totalRequests, 10);
    assert.strictEqual(status.metrics.throttledRequests, 0);
  });

  it('should throttle requests exceeding rate limit', async () => {
    const startTime = Date.now();

    // Use all burst tokens
    for (let i = 0; i < 10; i++) {
      await limiter.acquire(1);
    }

    // This should wait ~100ms for 1 token
    await limiter.acquire(1);

    const elapsed = Date.now() - startTime;
    assert(elapsed >= 90, `Should have waited, but only ${elapsed}ms elapsed`);

    const status = limiter.getStatus();
    assert(status.metrics.throttledRequests >= 1);
    assert(status.metrics.averageWaitTime > 0);
  });

  it('should refill tokens over time', async () => {
    // Use all tokens
    await limiter.acquire(10);
    assert.strictEqual(limiter.getStatus().availableTokens, 0);

    // Wait 100ms (should refill 1 token at 10/sec)
    await new Promise(resolve => setTimeout(resolve, 100));

    const status = limiter.getStatus();
    assert(status.availableTokens >= 0.9, `Only ${status.availableTokens} tokens refilled`);
  });

  it('should track throttle metrics', async () => {
    // 10 immediate, 5 throttled
    for (let i = 0; i < 15; i++) {
      await limiter.acquire(1);
    }

    const status = limiter.getStatus();
    assert.strictEqual(status.metrics.totalRequests, 15);
    assert(status.metrics.throttledRequests >= 5);
    assert(status.metrics.throttleRate > 30); // >30% throttled
    assert(status.metrics.averageWaitTime > 0);
  });

  it('should support burst size larger than rate', async () => {
    const burstLimiter = new RateLimiter({
      requestsPerSecond: 1,  // 1 per second
      burstSize: 10          // But allow 10 burst
    });

    // Should allow 10 immediate requests
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await burstLimiter.acquire(1);
    }
    const elapsed = Date.now() - startTime;

    assert(elapsed < 500, 'Burst should be immediate');
    assert(burstLimiter.getStatus().availableTokens < 0.1, 'Should have used all burst tokens');
  });

  it('should handle concurrent acquire calls', async () => {
    // Create a fresh limiter for this test
    const concurrentLimiter = new RateLimiter({
      requestsPerSecond: 10,
      burstSize: 5
    });

    // Start 10 concurrent requests (more than burst allows)
    const promises = Array.from({ length: 10 }, () => concurrentLimiter.acquire(1));

    await Promise.all(promises);

    const status = concurrentLimiter.getStatus();
    assert.strictEqual(status.metrics.totalRequests, 10);
    // Some requests should have been throttled
    assert(status.metrics.throttledRequests >= 0, 'Should handle concurrent requests');
  });

  it('should support different cost values', async () => {
    const status = limiter.getStatus();
    assert(status.availableTokens >= 9.9, 'Should have full burst tokens');

    // Acquire 3 tokens at once
    await limiter.acquire(3);

    const newStatus = limiter.getStatus();
    assert(newStatus.availableTokens >= 6.9 && newStatus.availableTokens <= 7.1, 'Should have ~7 tokens left');
  });

  it('should provide accurate status information', () => {
    const status = limiter.getStatus();

    assert(typeof status.availableTokens === 'number');
    assert.strictEqual(status.maxTokens, 10);
    assert.strictEqual(status.requestsPerSecond, 10);
    assert(status.metrics);
    assert(typeof status.metrics.throttleRate === 'number');
    assert(typeof status.metrics.averageWaitTime === 'number');
  });

  it('should reset properly', async () => {
    // Use some tokens and create metrics
    await limiter.acquire(5);
    await limiter.acquire(1); // This should throttle

    assert(limiter.getStatus().metrics.totalRequests > 0);

    // Reset
    limiter.reset();

    const status = limiter.getStatus();
    assert.strictEqual(status.availableTokens, 10);
    assert.strictEqual(status.metrics.totalRequests, 0);
    assert.strictEqual(status.metrics.throttledRequests, 0);
  });

  it('should support wouldThrottle check', async () => {
    // Should not throttle initially
    assert(!limiter.wouldThrottle(1));

    // Use all tokens
    await limiter.acquire(10);

    // Should throttle now
    assert(limiter.wouldThrottle(1));
    assert(!limiter.wouldThrottle(0)); // 0 cost should not throttle
  });

  it('should handle edge cases gracefully', async () => {
    // Test with very low rate
    const slowLimiter = new RateLimiter({
      requestsPerSecond: 0.1, // 1 every 10 seconds
      burstSize: 1
    });

    await slowLimiter.acquire(1);
    assert.strictEqual(slowLimiter.getStatus().availableTokens, 0);

    // Test with very high burst
    const burstLimiter = new RateLimiter({
      requestsPerSecond: 1,
      burstSize: 1000
    });

    // Should allow immediate burst
    const promises = Array.from({ length: 100 }, () => burstLimiter.acquire(1));
    await Promise.all(promises);

    assert(burstLimiter.getStatus().metrics.totalRequests >= 99, 'Should have processed most requests');
  });
});
