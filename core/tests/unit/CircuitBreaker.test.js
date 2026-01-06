import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { CircuitBreaker, CircuitBreakerError } from '../../src/safety/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
  });

  afterEach(() => {
    // Clean up any timers
    circuitBreaker.reset();
  });

  describe('constructor', () => {
    it('should create CircuitBreaker with default settings', () => {
      assert.strictEqual(circuitBreaker.threshold, 5);
      assert.strictEqual(circuitBreaker.timeout, 60000);
      assert.strictEqual(circuitBreaker.halfOpenAttempts, 1);
      assert.strictEqual(circuitBreaker.state, 'closed');
      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);
    });

    it('should accept custom settings', () => {
      const custom = new CircuitBreaker({
        threshold: 3,
        timeout: 30000,
        halfOpenAttempts: 2
      });

      assert.strictEqual(custom.threshold, 3);
      assert.strictEqual(custom.timeout, 30000);
      assert.strictEqual(custom.halfOpenAttempts, 2);
    });
  });

  describe('recordSuccess', () => {
    it('should record successful request in closed state', () => {
      circuitBreaker.recordSuccess();

      assert.strictEqual(circuitBreaker.stats.totalRequests, 1);
      assert.strictEqual(circuitBreaker.stats.successfulRequests, 1);
      assert.strictEqual(circuitBreaker.state, 'closed');
    });

    it('should transition from half-open to closed on success', () => {
      // Set up half-open state
      circuitBreaker.state = 'half-open';
      circuitBreaker.halfOpenTrials = 1;

      circuitBreaker.recordSuccess();

      assert.strictEqual(circuitBreaker.state, 'closed');
      assert.strictEqual(circuitBreaker.halfOpenTrials, 0);
      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);
    });

    it('should reset consecutive failures on success', () => {
      circuitBreaker.consecutiveFailures = 3;
      circuitBreaker.recordSuccess();

      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);
    });
  });

  describe('recordFailure', () => {
    it('should record failed request and increment consecutive failures', () => {
      circuitBreaker.recordFailure();

      assert.strictEqual(circuitBreaker.stats.totalRequests, 1);
      assert.strictEqual(circuitBreaker.stats.failedRequests, 1);
      assert.strictEqual(circuitBreaker.consecutiveFailures, 1);
      assert(circuitBreaker.lastFailureTime);
    });

    it('should open circuit when threshold exceeded', () => {
      // Record failures up to threshold
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }

      assert.strictEqual(circuitBreaker.state, 'open');
      assert.strictEqual(circuitBreaker.consecutiveFailures, 5);
    });

    it('should transition half-open to open on failure', () => {
      circuitBreaker.state = 'half-open';
      circuitBreaker.halfOpenTrials = 1;

      circuitBreaker.recordFailure();

      assert.strictEqual(circuitBreaker.state, 'open');
      assert.strictEqual(circuitBreaker.halfOpenTrials, 0);
    });

    it('should schedule recovery timeout when opening', async () => {
      // Use shorter timeout for testing
      const fastBreaker = new CircuitBreaker({ timeout: 100 });

      for (let i = 0; i < 5; i++) {
        fastBreaker.recordFailure();
      }

      assert.strictEqual(fastBreaker.state, 'open');

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 150));

      assert.strictEqual(fastBreaker.state, 'half-open');
    });
  });

  describe('shouldAllow', () => {
    it('should allow requests in closed state', () => {
      assert(circuitBreaker.shouldAllow());
    });

    it('should not allow requests in open state', () => {
      circuitBreaker.state = 'open';
      assert(!circuitBreaker.shouldAllow());
    });

    it('should allow limited requests in half-open state', () => {
      circuitBreaker.state = 'half-open';
      circuitBreaker.halfOpenAttempts = 2;

      // Should allow first attempt
      assert(circuitBreaker.shouldAllow());

      // Manually increment trials (simulate attempt)
      circuitBreaker.halfOpenTrials = 1;
      assert(circuitBreaker.shouldAllow());

      // Should not allow third attempt
      circuitBreaker.halfOpenTrials = 2;
      assert(!circuitBreaker.shouldAllow());
    });
  });

  describe('execute', () => {
    it('should execute successful function', async () => {
      const result = await circuitBreaker.execute(async () => 'success');

      assert.strictEqual(result, 'success');
      assert.strictEqual(circuitBreaker.stats.successfulRequests, 1);
    });

    it('should execute and handle failed function', async () => {
      await assert.rejects(
        async () => await circuitBreaker.execute(async () => {
          throw new Error('test error');
        }),
        /test error/
      );

      assert.strictEqual(circuitBreaker.stats.failedRequests, 1);
      assert.strictEqual(circuitBreaker.consecutiveFailures, 1);
    });

    it('should block execution when circuit is open', async () => {
      // Open the circuit
      circuitBreaker.state = 'open';

      await assert.rejects(
        async () => await circuitBreaker.execute(async () => 'success'),
        CircuitBreakerError
      );

      assert.strictEqual(circuitBreaker.stats.rejectedRequests, 1);
    });

    it('should throw CircuitBreakerError with correct state', async () => {
      circuitBreaker.state = 'open';

      try {
        await circuitBreaker.execute(async () => 'success');
        assert.fail('Should have thrown');
      } catch (error) {
        assert(error instanceof CircuitBreakerError);
        assert.strictEqual(error.state, 'open');
        assert(error.message.includes('is open'));
      }
    });
  });

  describe('getState', () => {
    it('should return current state information', () => {
      const state = circuitBreaker.getState();

      assert.strictEqual(state.state, 'closed');
      assert.strictEqual(state.consecutiveFailures, 0);
      assert.strictEqual(state.threshold, 5);
      assert.strictEqual(state.halfOpenAttempts, 1);
    });

    it('should include timing information', () => {
      circuitBreaker.recordFailure();
      const state = circuitBreaker.getState();

      assert(state.lastFailureTime);
      assert(typeof state.timeSinceLastFailure === 'number');
      assert.strictEqual(state.nextAttemptIn, null); // Not open
    });

    it('should include recovery timing when open', () => {
      // Open the circuit properly (which schedules recovery)
      for (let i = 0; i < 5; i++) {
        circuitBreaker.recordFailure();
      }

      const state = circuitBreaker.getState();

      assert.strictEqual(state.state, 'open');
      assert(state.nextAttemptIn !== null);
      assert(state.nextAttemptIn <= 60000); // Less than or equal to timeout
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure();

      const stats = circuitBreaker.getStats();

      assert.strictEqual(stats.totalRequests, 2);
      assert.strictEqual(stats.successfulRequests, 1);
      assert.strictEqual(stats.failedRequests, 1);
      assert.strictEqual(stats.rejectedRequests, 0);
      assert.strictEqual(stats.successRate, '50.00%');
      assert.strictEqual(stats.failureRate, '50.00%');
      assert.strictEqual(stats.stateChanges, 0);
    });

    it('should calculate rates correctly', () => {
      // All successes
      for (let i = 0; i < 10; i++) {
        circuitBreaker.recordSuccess();
      }

      const stats = circuitBreaker.getStats();

      assert.strictEqual(stats.successRate, '100.00%');
      assert.strictEqual(stats.failureRate, '0.00%');
    });
  });

  describe('open/close', () => {
    it('should allow manual opening', () => {
      const initialChanges = circuitBreaker.stats.stateChanges.length;
      circuitBreaker.open('manual test');

      assert.strictEqual(circuitBreaker.state, 'open');
      assert.strictEqual(circuitBreaker.stats.stateChanges.length, initialChanges + 1);
    });

    it('should allow manual closing', () => {
      circuitBreaker.state = 'open';
      circuitBreaker.close('manual test');

      assert.strictEqual(circuitBreaker.state, 'closed');
      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);
    });

    it('should not change state when already in target state', () => {
      const initialChanges = circuitBreaker.stats.stateChanges.length;

      circuitBreaker.open('test');
      circuitBreaker.open('test again'); // Should not change

      assert.strictEqual(circuitBreaker.stats.stateChanges.length, initialChanges + 1);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.state = 'open';

      circuitBreaker.reset();

      assert.strictEqual(circuitBreaker.state, 'closed');
      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);
      assert.strictEqual(circuitBreaker.stats.totalRequests, 0);
    });
  });

  describe('failure status', () => {
    it('should return operational status when closed', () => {
      const status = circuitBreaker.getFailureStatus();

      assert.strictEqual(status.status, 'OPERATIONAL');
      assert.strictEqual(status.state, 'closed');
      assert.strictEqual(status.consecutiveFailures, 0);
    });

    it('should return protected status when open', () => {
      circuitBreaker.state = 'open';
      circuitBreaker.lastFailureTime = Date.now();

      const status = circuitBreaker.getFailureStatus();

      assert.strictEqual(status.status, 'PROTECTED');
      assert.strictEqual(status.state, 'open');
    });

    it('should return testing status when half-open', () => {
      circuitBreaker.state = 'half-open';
      circuitBreaker.halfOpenTrials = 1;

      const status = circuitBreaker.getFailureStatus();

      assert.strictEqual(status.status, 'TESTING');
      assert.strictEqual(status.state, 'half-open');
    });
  });

  describe('isInFailureState', () => {
    it('should return false for closed state', () => {
      assert(!circuitBreaker.isInFailureState());
    });

    it('should return true for open state', () => {
      circuitBreaker.state = 'open';
      assert(circuitBreaker.isInFailureState());
    });

    it('should return true for half-open state', () => {
      circuitBreaker.state = 'half-open';
      assert(circuitBreaker.isInFailureState());
    });
  });

  describe('recovery timeout', () => {
    it('should transition from open to half-open after timeout', async () => {
      const fastBreaker = new CircuitBreaker({ timeout: 50 });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        fastBreaker.recordFailure();
      }
      assert.strictEqual(fastBreaker.state, 'open');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(fastBreaker.state, 'half-open');
      assert.strictEqual(fastBreaker.halfOpenTrials, 0);
    });

    it('should cancel recovery timer when manually closed', () => {
      circuitBreaker.state = 'open';
      circuitBreaker.close();

      // Should not transition to half-open
      assert.strictEqual(circuitBreaker.state, 'closed');
    });
  });

  describe('CircuitBreakerError', () => {
    it('should create error with state and timestamp', () => {
      const error = new CircuitBreakerError('test message', 'open');

      assert(error instanceof Error);
      assert(error.name === 'CircuitBreakerError');
      assert.strictEqual(error.state, 'open');
      assert(error.timestamp);
      assert(error.message.includes('test message'));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete failure recovery cycle', async () => {
      // Start with successful requests
      await circuitBreaker.execute(async () => 'success1');
      await circuitBreaker.execute(async () => 'success2');

      assert.strictEqual(circuitBreaker.state, 'closed');
      assert.strictEqual(circuitBreaker.consecutiveFailures, 0);

      // Experience failures
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (error) {
          // Expected
        }
      }

      assert.strictEqual(circuitBreaker.state, 'open');

      // Wait for recovery (use fast timeout for test)
      const fastBreaker = new CircuitBreaker({ timeout: 50 });
      for (let i = 0; i < 5; i++) {
        try {
          await fastBreaker.execute(async () => {
            throw new Error('failure');
          });
        } catch (error) {
          // Expected
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
      assert.strictEqual(fastBreaker.state, 'half-open');

      // Successful recovery
      const result = await fastBreaker.execute(async () => 'recovered');
      assert.strictEqual(result, 'recovered');
      assert.strictEqual(fastBreaker.state, 'closed');
    });

    it('should handle half-open exhaustion', async () => {
      const breaker = new CircuitBreaker({
        timeout: 50,
        halfOpenAttempts: 1
      });

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => { throw new Error('fail'); });
        } catch (error) {
          // Expected
        }
      }

      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.strictEqual(breaker.state, 'half-open');

      // Fail the half-open attempt
      try {
        await breaker.execute(async () => { throw new Error('half-open fail'); });
      } catch (error) {
        // Expected
      }

      // Should go back to open
      assert.strictEqual(breaker.state, 'open');
    });
  });
});
