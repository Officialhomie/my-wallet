/**
 * RetryManager - Manages retry logic for transaction execution
 *
 * Handles transient failures with exponential backoff and smart error classification.
 * Distinguishes between retriable errors (network issues, rate limits) and terminal
 * errors (insufficient funds, contract reverts) that should not be retried.
 */
export class RetryManager {
  /**
   * Initialize retry manager with default settings
   *
   * @param {Object} [options={}] - Configuration options
   */
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.backoffStrategy = options.backoffStrategy || 'exponential'; // or 'linear', 'constant'
    this.retryUnknownErrors = options.retryUnknownErrors || false;

    // Metrics tracking
    this.metrics = {
      totalAttempts: 0,
      totalRetries: 0,
      retriableErrors: 0,
      terminalErrors: 0,
      unknownErrors: 0,
      successfulRetries: 0,
      failedRetries: 0
    };
  }

  /**
   * Classify error as retriable, terminal, or unknown
   *
   * @param {Error} error - Error to classify
   * @returns {string} 'retriable', 'terminal', or 'unknown'
   */
  classifyError(error) {
    if (!error) return 'unknown';

    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // Retriable errors (transient network/rpc issues)
    if (
      // Network and connectivity errors
      code === 'NETWORK_ERROR' ||
      code === 'TIMEOUT' ||
      code === 'ENOTFOUND' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('rpc') ||
      message.includes('fetch failed') ||
      message.includes('failed to fetch') ||
      message.includes('connection refused') ||
      message.includes('connection reset') ||
      message.includes('connection timeout') ||
      message.includes('request timeout') ||
      message.includes('gateway timeout') ||

      // Nonce-related errors (can be retried after sync)
      code === 'NONCE_TOO_LOW' ||
      code === 'REPLACEMENT_UNDERPRICED' ||
      message.includes('nonce too low') ||
      message.includes('nonce') ||
      message.includes('replacement transaction underpriced') ||
      message.includes('REPLACEMENT UNDERPRICED') ||
      message.includes('replacement underpriced') ||
      message.includes('nonce expired') ||
      message.includes('nonce too high') ||

      // Rate limiting
      code === 'TOO_MANY_REQUESTS' ||
      code === 'RATE_LIMIT_EXCEEDED' ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('request rate exceeded') ||
      message.includes('rate exceeded') ||
      message.includes('quota exceeded') ||
      message.includes('429') ||

      // Temporary service issues
      code === 'SERVICE_UNAVAILABLE' ||
      code === 'INTERNAL_SERVER_ERROR' ||
      message.includes('service unavailable') ||
      message.includes('internal server error') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('temporary failure') ||
      message.includes('try again later') ||

      // Gas estimation issues that might be temporary
      message.includes('gas required exceeds allowance') && message.includes('temporary') ||
      message.includes('intrinsic gas too low') ||
      message.includes('gas price too low')
    ) {
      return 'retriable';
    }

    // Terminal errors (permanent failures that shouldn't be retried)
    if (
      // Insufficient funds
      code === 'INSUFFICIENT_FUNDS' ||
      code === 'INSUFFICIENT_BALANCE' ||
      message.includes('insufficient funds') ||
      message.includes('insufficient balance') ||
      message.includes('not enough funds') ||
      message.includes('sender doesn\'t have enough funds') ||

      // Contract execution errors
      code === 'CALL_EXCEPTION' ||
      code === 'EXECUTION_REVERTED' ||
      code === 'UNPREDICTABLE_GAS_LIMIT' ||
      message.includes('execution reverted') ||
      message.includes('revert') ||
      message.includes('invalid opcode') ||
      message.includes('out of gas') ||
      message.includes('gas required exceeds allowance') && !message.includes('temporary') ||
      message.includes('stack overflow') ||
      message.includes('stack underflow') ||
      message.includes('invalid jump') ||
      message.includes('invalid instruction') ||

      // Authentication/authorization
      code === 'UNAUTHORIZED' ||
      code === 'FORBIDDEN' ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication failed') ||
      message.includes('invalid api key') ||
      message.includes('invalid credentials') ||

      // Invalid parameters
      code === 'INVALID_ARGUMENT' ||
      message.includes('invalid argument') ||
      message.includes('invalid parameter') ||
      message.includes('invalid input') ||
      message.includes('malformed') ||
      message.includes('bad request') ||
      message.includes('400') ||

      // Contract state issues
      message.includes('contract not deployed') ||
      message.includes('contract does not exist') ||
      message.includes('function not found') ||
      message.includes('method not found') ||
      message.includes('no such function')
    ) {
      return 'terminal';
    }

    // Unknown errors - depends on configuration
    return 'unknown';
  }

  /**
   * Calculate backoff delay for retry attempt
   *
   * @param {number} attemptNumber - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateBackoff(attemptNumber) {
    let delay;

    switch (this.backoffStrategy) {
      case 'exponential':
        delay = this.baseDelay * Math.pow(2, attemptNumber);
        break;

      case 'linear':
        delay = this.baseDelay * (attemptNumber + 1);
        break;

      case 'constant':
        delay = this.baseDelay;
        break;

      default:
        throw new Error(`Unknown backoff strategy: ${this.backoffStrategy}`);
    }

    // Add jitter to prevent thundering herd (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5) * 2;
    delay += jitter;

    // Cap at max delay
    return Math.min(Math.max(delay, 100), this.maxDelay); // Min 100ms
  }

  /**
   * Execute function with retry logic
   *
   * @param {Function} fn - Async function to execute
   * @param {Object} [options={}] - Retry options
   * @returns {Promise<any>} Function result
   */
  async executeWithRetry(fn, options = {}) {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const onRetry = options.onRetry; // Optional callback
    const context = options.context || {}; // Additional context

    let lastError;
    let attemptNumber = 0;

    while (attemptNumber <= maxRetries) {
      this.metrics.totalAttempts++;

      try {
        const result = await fn();

        // Success on first attempt
        if (attemptNumber === 0) {
          return result;
        }

        // Success after retry
        this.metrics.successfulRetries++;
        return result;

      } catch (error) {
        lastError = error;
        const errorClass = this.classifyError(error);

        // Update metrics
        switch (errorClass) {
          case 'retriable':
            this.metrics.retriableErrors++;
            break;
          case 'terminal':
            this.metrics.terminalErrors++;
            break;
          case 'unknown':
            this.metrics.unknownErrors++;
            break;
        }

        // Don't retry terminal errors
        if (errorClass === 'terminal') {
          this.metrics.failedRetries++;
          throw error;
        }

        // Don't retry unknown errors unless explicitly allowed
        if (errorClass === 'unknown' && !this.retryUnknownErrors && !options.retryUnknown) {
          this.metrics.failedRetries++;
          throw error;
        }

        // Don't retry if out of attempts
        if (attemptNumber === maxRetries) {
          this.metrics.failedRetries++;
          break;
        }

        // Calculate backoff and wait
        const delay = this.calculateBackoff(attemptNumber);
        attemptNumber++;
        this.metrics.totalRetries++;

        // Call retry callback if provided
        if (onRetry) {
          await onRetry(attemptNumber, delay, error, context);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Execute function with retry and custom error handling
   *
   * @param {Function} fn - Async function to execute
   * @param {Function} errorHandler - Function to handle errors and decide retry
   * @param {Object} [options={}] - Retry options
   * @returns {Promise<any>} Function result
   */
  async executeWithCustomRetry(fn, errorHandler, options = {}) {
    const maxRetries = options.maxRetries ?? this.maxRetries;
    const context = options.context || {};

    let attemptNumber = 0;
    let lastError;

    while (attemptNumber <= maxRetries) {
      this.metrics.totalAttempts++;

      try {
        const result = await fn();

        if (attemptNumber === 0) {
          return result;
        }

        this.metrics.successfulRetries++;
        return result;

      } catch (error) {
        lastError = error;

        // Use custom error handler to decide what to do
        const decision = await errorHandler(error, attemptNumber, context);

        if (!decision.shouldRetry) {
          this.metrics.failedRetries++;
          throw error;
        }

        // Custom delay or use calculated backoff
        const delay = decision.customDelay ?? this.calculateBackoff(attemptNumber);

        attemptNumber++;
        this.metrics.totalRetries++;

        // Call retry callback if provided
        if (options.onRetry) {
          await options.onRetry(attemptNumber, delay, error, context);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    this.metrics.failedRetries++;
    throw lastError;
  }

  /**
   * Get retry metrics
   *
   * @returns {Object} Metrics object
   */
  getMetrics() {
    const totalErrors = this.metrics.retriableErrors + this.metrics.terminalErrors + this.metrics.unknownErrors;

    return {
      ...this.metrics,
      retryRate: this.metrics.totalAttempts > 0
        ? (this.metrics.totalRetries / this.metrics.totalAttempts * 100).toFixed(2) + '%'
        : '0%',
      successRate: totalErrors > 0
        ? ((this.metrics.successfulRetries / this.metrics.totalRetries) * 100).toFixed(2) + '%'
        : '100%',
      errorBreakdown: {
        retriable: this.metrics.retriableErrors,
        terminal: this.metrics.terminalErrors,
        unknown: this.metrics.unknownErrors
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalAttempts: 0,
      totalRetries: 0,
      retriableErrors: 0,
      terminalErrors: 0,
      unknownErrors: 0,
      successfulRetries: 0,
      failedRetries: 0
    };
  }

  /**
   * Create a pre-configured retry manager for specific use case
   *
   * @param {string} useCase - Use case ('network', 'contract', 'nonce')
   * @returns {RetryManager} Configured retry manager
   */
  static forUseCase(useCase) {
    const configs = {
      network: {
        maxRetries: 5,
        baseDelay: 1000,
        backoffStrategy: 'exponential',
        retryUnknownErrors: true
      },
      contract: {
        maxRetries: 2,
        baseDelay: 2000,
        backoffStrategy: 'linear',
        retryUnknownErrors: false
      },
      nonce: {
        maxRetries: 3,
        baseDelay: 500,
        backoffStrategy: 'constant',
        retryUnknownErrors: true
      }
    };

    const config = configs[useCase];
    if (!config) {
      throw new Error(`Unknown use case: ${useCase}. Available: ${Object.keys(configs).join(', ')}`);
    }

    return new RetryManager(config);
  }
}

export default RetryManager;
