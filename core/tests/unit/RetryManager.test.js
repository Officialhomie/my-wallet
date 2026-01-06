import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { RetryManager } from '../../src/execution/RetryManager.js';

describe('RetryManager', () => {
  let retryManager;

  beforeEach(() => {
    retryManager = new RetryManager();
  });

  it('should classify errors correctly', () => {
    // Retriable errors
    assert.strictEqual(
      retryManager.classifyError(new Error('network timeout')),
      'retriable'
    );
    assert.strictEqual(
      retryManager.classifyError(new Error('nonce too low')),
      'retriable'
    );
    assert.strictEqual(
      retryManager.classifyError(new Error('rate limit exceeded')),
      'retriable'
    );
    assert.strictEqual(
      retryManager.classifyError(new Error('service unavailable')),
      'retriable'
    );

    // Terminal errors
    assert.strictEqual(
      retryManager.classifyError(new Error('insufficient funds')),
      'terminal'
    );
    assert.strictEqual(
      retryManager.classifyError(new Error('execution reverted')),
      'terminal'
    );
    assert.strictEqual(
      retryManager.classifyError(new Error('unauthorized')),
      'terminal'
    );

    // Unknown errors
    assert.strictEqual(
      retryManager.classifyError(new Error('something weird')),
      'unknown'
    );
  });

  it('should classify null/undefined errors as unknown', () => {
    assert.strictEqual(retryManager.classifyError(null), 'unknown');
    assert.strictEqual(retryManager.classifyError(undefined), 'unknown');
  });

  it('should calculate exponential backoff', () => {
    const manager = new RetryManager({
      baseDelay: 1000,
      maxDelay: 10000,
      backoffStrategy: 'exponential'
    });

    // Allow some variance due to jitter (±25%)
    const delay0 = manager.calculateBackoff(0);
    const delay1 = manager.calculateBackoff(1);
    const delay2 = manager.calculateBackoff(2);
    const delay3 = manager.calculateBackoff(3);
    const delay4 = manager.calculateBackoff(4);

    assert(delay0 >= 750 && delay0 <= 1250, `Delay 0: ${delay0} not in range [750, 1250]`);
    assert(delay1 >= 1500 && delay1 <= 2500, `Delay 1: ${delay1} not in range [1500, 2500]`);
    assert(delay2 >= 3000 && delay2 <= 5000, `Delay 2: ${delay2} not in range [3000, 5000]`);
    assert(delay3 >= 6000 && delay3 <= 10000, `Delay 3: ${delay3} not in range [6000, 10000]`);
    assert(delay4 >= 7500 && delay4 <= 10000, `Delay 4: ${delay4} not in range [7500, 10000]`);
  });

  it('should calculate linear backoff', () => {
    const manager = new RetryManager({
      baseDelay: 1000,
      backoffStrategy: 'linear'
    });

    // Allow some variance due to jitter (±25%)
    const delay0 = manager.calculateBackoff(0);
    const delay1 = manager.calculateBackoff(1);
    const delay2 = manager.calculateBackoff(2);

    assert(delay0 >= 750 && delay0 <= 1250, `Delay 0: ${delay0} not in range [750, 1250]`);
    assert(delay1 >= 1500 && delay1 <= 2500, `Delay 1: ${delay1} not in range [1500, 2500]`);
    assert(delay2 >= 2250 && delay2 <= 3750, `Delay 2: ${delay2} not in range [2250, 3750]`);
  });

  it('should calculate constant backoff', () => {
    const manager = new RetryManager({
      baseDelay: 2000,
      backoffStrategy: 'constant'
    });

    // Allow some variance due to jitter (±25%)
    const delay0 = manager.calculateBackoff(0);
    const delay1 = manager.calculateBackoff(1);
    const delay5 = manager.calculateBackoff(5);

    assert(delay0 >= 1500 && delay0 <= 2500, `Delay 0: ${delay0} not in range [1500, 2500]`);
    assert(delay1 >= 1500 && delay1 <= 2500, `Delay 1: ${delay1} not in range [1500, 2500]`);
    assert(delay5 >= 1500 && delay5 <= 2500, `Delay 5: ${delay5} not in range [1500, 2500]`);
  });

  it('should throw on unknown backoff strategy', () => {
    const manager = new RetryManager({
      backoffStrategy: 'invalid'
    });

    assert.throws(() => manager.calculateBackoff(0), /Unknown backoff strategy/);
  });

  it('should retry retriable errors', async () => {
    let attempts = 0;

    const flakyFunction = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('network timeout'); // Retriable
      }
      return 'success';
    };

    const result = await retryManager.executeWithRetry(flakyFunction);

    assert.strictEqual(result, 'success');
    assert.strictEqual(attempts, 3);
  });

  it('should not retry terminal errors', async () => {
    let attempts = 0;

    const faultyFunction = async () => {
      attempts++;
      throw new Error('insufficient funds'); // Terminal
    };

    await assert.rejects(
      async () => await retryManager.executeWithRetry(faultyFunction),
      /insufficient funds/
    );

    assert.strictEqual(attempts, 1); // Only tried once
  });

  it('should respect max retries', async () => {
    const manager = new RetryManager({ maxRetries: 2, baseDelay: 10 });
    let attempts = 0;

    const alwaysFailsFunction = async () => {
      attempts++;
      throw new Error('timeout'); // Retriable
    };

    await assert.rejects(
      async () => await manager.executeWithRetry(alwaysFailsFunction),
      /timeout/
    );

    assert.strictEqual(attempts, 3); // Initial + 2 retries
  });

  it('should succeed on first attempt', async () => {
    let attempts = 0;

    const reliableFunction = async () => {
      attempts++;
      return 'success';
    };

    const result = await retryManager.executeWithRetry(reliableFunction);

    assert.strictEqual(result, 'success');
    assert.strictEqual(attempts, 1);
  });

  it('should handle unknown errors based on configuration', async () => {
    let attempts = 0;

    const unknownErrorFunction = async () => {
      attempts++;
      throw new Error('unknown error type');
    };

    // Default behavior: don't retry unknown errors
    await assert.rejects(
      async () => await retryManager.executeWithRetry(unknownErrorFunction),
      /unknown error type/
    );
    assert.strictEqual(attempts, 1);

    // With retryUnknown enabled
    const managerWithRetry = new RetryManager({ retryUnknownErrors: true });
    attempts = 0;

    await assert.rejects(
      async () => await managerWithRetry.executeWithRetry(unknownErrorFunction),
      /unknown error type/
    );
    assert.strictEqual(attempts, 4); // Initial + 3 retries (default maxRetries)
  });

  it('should call onRetry callback', async () => {
    let attempts = 0;
    const retryCalls = [];

    const flakyFunction = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('network timeout');
      }
      return 'success';
    };

    const onRetry = (attempt, delay, error, context) => {
      retryCalls.push({ attempt, delay, error: error.message, context });
    };

    const result = await retryManager.executeWithRetry(flakyFunction, {
      onRetry,
      context: { test: 'data' }
    });

    assert.strictEqual(result, 'success');
    assert.strictEqual(retryCalls.length, 2); // 2 retries

    assert.strictEqual(retryCalls[0].attempt, 1);
    assert.strictEqual(retryCalls[0].error, 'network timeout');
    assert.strictEqual(retryCalls[0].context.test, 'data');

    assert.strictEqual(retryCalls[1].attempt, 2);
    assert.strictEqual(retryCalls[1].error, 'network timeout');
  });

  it('should track retry metrics', async () => {
    // First test successful retries
    await retryManager.executeWithRetry(async () => {
      throw new Error('network timeout');
    }).catch(() => {}); // Ignore the error

    let metrics = retryManager.getMetrics();

    assert.strictEqual(metrics.totalAttempts, 4); // Initial + 3 retries
    assert.strictEqual(metrics.totalRetries, 3);
    assert.strictEqual(metrics.retriableErrors, 4);
    assert.strictEqual(metrics.successfulRetries, 0);
    assert.strictEqual(metrics.failedRetries, 1);
    assert.strictEqual(metrics.retryRate, '75.00%');

    // Reset and test successful retry
    retryManager.resetMetrics();

    let attempts = 0;
    await retryManager.executeWithRetry(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('timeout');
      }
      return 'success';
    });

    metrics = retryManager.getMetrics();

    assert.strictEqual(metrics.totalAttempts, 2);
    assert.strictEqual(metrics.totalRetries, 1);
    assert.strictEqual(metrics.successfulRetries, 1);
    assert.strictEqual(metrics.failedRetries, 0);
    assert.strictEqual(metrics.successRate, '100.00%');
  });

  it('should execute with custom retry logic', async () => {
    let attempts = 0;
    const customDecisions = [];

    const errorHandler = (error, attempt, context) => {
      customDecisions.push({ error: error.message, attempt, context });

      // Custom logic: retry only once, with custom delay
      return {
        shouldRetry: attempt < 1,
        customDelay: 50
      };
    };

    const alwaysFailsFunction = async () => {
      attempts++;
      throw new Error('custom error');
    };

    const startTime = Date.now();

    await assert.rejects(
      async () => await retryManager.executeWithCustomRetry(alwaysFailsFunction, errorHandler, {
        context: { test: true }
      }),
      /custom error/
    );

    const duration = Date.now() - startTime;

    assert.strictEqual(attempts, 2); // Initial + 1 retry
    assert.strictEqual(customDecisions.length, 2);
    assert(duration >= 50, 'Should have waited for custom delay');
  });

  it('should provide pre-configured managers for use cases', () => {
    const networkManager = RetryManager.forUseCase('network');
    assert.strictEqual(networkManager.maxRetries, 5);
    assert.strictEqual(networkManager.backoffStrategy, 'exponential');
    assert.strictEqual(networkManager.retryUnknownErrors, true);

    const contractManager = RetryManager.forUseCase('contract');
    assert.strictEqual(contractManager.maxRetries, 2);
    assert.strictEqual(contractManager.backoffStrategy, 'linear');

    const nonceManager = RetryManager.forUseCase('nonce');
    assert.strictEqual(nonceManager.maxRetries, 3);
    assert.strictEqual(nonceManager.backoffStrategy, 'constant');
    assert.strictEqual(nonceManager.baseDelay, 500);

    assert.throws(() => RetryManager.forUseCase('invalid'), /Unknown use case/);
  });

  it('should handle backoff with jitter', () => {
    const manager = new RetryManager({
      baseDelay: 1000,
      backoffStrategy: 'constant'
    });

    // Generate multiple backoffs to check jitter
    const backoffs = [];
    for (let i = 0; i < 100; i++) {
      backoffs.push(manager.calculateBackoff(0));
    }

    // Should have some variance due to jitter
    const uniqueValues = new Set(backoffs);
    assert(uniqueValues.size > 1, 'Jitter should introduce variance');

    // All should be within expected range (1000 ± 25%)
    backoffs.forEach(delay => {
      assert(delay >= 750 && delay <= 1250, `Delay ${delay} out of expected range`);
    });
  });

  it('should handle edge cases in error classification', () => {
    // Test various error message formats
    assert.strictEqual(
      retryManager.classifyError({ message: 'Nonce too low' }),
      'retriable'
    );

    assert.strictEqual(
      retryManager.classifyError({ message: 'REPLACEMENT UNDERPRICED' }),
      'retriable'
    );

    assert.strictEqual(
      retryManager.classifyError({ code: 'INSUFFICIENT_FUNDS' }),
      'terminal'
    );

    assert.strictEqual(
      retryManager.classifyError({ code: 'CALL_EXCEPTION' }),
      'terminal'
    );
  });

  it('should handle malformed error objects', () => {
    assert.strictEqual(retryManager.classifyError({}), 'unknown');
    assert.strictEqual(retryManager.classifyError({ message: null }), 'unknown');
    assert.strictEqual(retryManager.classifyError({ code: null }), 'unknown');
  });
});
