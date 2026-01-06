/**
 * CircuitBreaker - Stops execution after consecutive failures
 *
 * Implements circuit breaker pattern to prevent cascading failures and
 * provide graceful degradation when systems are experiencing issues.
 */
export class CircuitBreaker {
  /**
   * Initialize circuit breaker
   *
   * @param {Object} [options={}] - Configuration options
   * @param {number} [options.threshold=5] - Consecutive failures before opening
   * @param {number} [options.timeout=60000] - Recovery timeout in ms (1 minute)
   * @param {number} [options.halfOpenAttempts=1] - Attempts in half-open state
   */
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.halfOpenAttempts = options.halfOpenAttempts || 1;

    // State management
    this.state = 'closed'; // 'closed', 'open', 'half-open'
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenTrials = 0;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: []
    };

    // Recovery timer
    this.recoveryTimer = null;
  }

  /**
   * Record successful execution
   */
  recordSuccess() {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;

    this.consecutiveFailures = 0;

    if (this.state === 'half-open') {
      // Transition to closed on successful half-open attempt
      this.#changeState('closed');
      this.halfOpenTrials = 0;

      if (this.recoveryTimer) {
        clearTimeout(this.recoveryTimer);
        this.recoveryTimer = null;
      }
    }
  }

  /**
   * Record failed execution
   */
  recordFailure() {
    this.stats.totalRequests++;
    this.stats.failedRequests++;

    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      // Half-open failure - back to open
      this.#changeState('open');
      this.halfOpenTrials = 0;

      // Schedule recovery
      this.#scheduleRecovery();

    } else if (this.state === 'closed' && this.consecutiveFailures >= this.threshold) {
      // Threshold exceeded - open circuit
      this.#changeState('open');
      this.#scheduleRecovery();
    }
  }

  /**
   * Check if execution should be allowed
   *
   * @returns {boolean} True if execution should proceed
   */
  shouldAllow() {
    switch (this.state) {
      case 'closed':
        return true;

      case 'open':
        return false;

      case 'half-open':
        // Allow limited attempts in half-open state
        return this.halfOpenTrials < this.halfOpenAttempts;

      default:
        return false;
    }
  }

  /**
   * Execute function with circuit breaker protection
   *
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Function result or throws CircuitBreakerError
   */
  async execute(fn) {
    if (!this.shouldAllow()) {
      this.stats.rejectedRequests++;
      throw new CircuitBreakerError(
        `Circuit breaker is ${this.state} - execution blocked`,
        this.state
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   *
   * @returns {Object} State information
   */
  getState() {
    const timeSinceLastFailure = this.lastFailureTime
      ? Date.now() - this.lastFailureTime
      : null;

    const nextAttemptIn = this.state === 'open' && this.recoveryTimer
      ? Math.max(0, this.timeout - timeSinceLastFailure)
      : null;

    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.threshold,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: timeSinceLastFailure,
      nextAttemptIn: nextAttemptIn,
      halfOpenTrials: this.halfOpenTrials,
      halfOpenAttempts: this.halfOpenAttempts
    };
  }

  /**
   * Get circuit breaker statistics
   *
   * @returns {Object} Statistics
   */
  getStats() {
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2)
      : '0.00';

    const failureRate = this.stats.totalRequests > 0
      ? (this.stats.failedRequests / this.stats.totalRequests * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      failureRate: `${failureRate}%`,
      stateChanges: this.stats.stateChanges.length,
      currentState: this.state,
      consecutiveFailures: this.consecutiveFailures
    };
  }

  /**
   * Manually open circuit breaker
   *
   * @param {string} [reason='manual'] - Reason for opening
   */
  open(reason = 'manual') {
    if (this.state !== 'open') {
      this.#changeState('open', reason);
      this.#scheduleRecovery();
    }
  }

  /**
   * Manually close circuit breaker
   *
   * @param {string} [reason='manual'] - Reason for closing
   */
  close(reason = 'manual') {
    if (this.state !== 'closed') {
      this.#changeState('closed', reason);
      this.consecutiveFailures = 0;
      this.halfOpenTrials = 0;

      if (this.recoveryTimer) {
        clearTimeout(this.recoveryTimer);
        this.recoveryTimer = null;
      }
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.halfOpenTrials = 0;

    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    // Reset stats but keep historical data
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: []
    };
  }

  /**
   * Check if circuit breaker is in a failure state
   *
   * @returns {boolean} True if in open or half-open state
   */
  isInFailureState() {
    return this.state === 'open' || this.state === 'half-open';
  }

  /**
   * Get failure status summary
   *
   * @returns {Object} Failure status
   */
  getFailureStatus() {
    const state = this.getState();
    const stats = this.getStats();

    let status;
    let recommendation;

    switch (state.state) {
      case 'closed':
        status = 'OPERATIONAL';
        recommendation = 'System is functioning normally';
        break;

      case 'open':
        status = 'PROTECTED';
        recommendation = state.nextAttemptIn
          ? `Circuit open - next attempt in ${Math.ceil(state.nextAttemptIn / 1000)}s`
          : 'Circuit open - manual intervention required';
        break;

      case 'half-open':
        status = 'TESTING';
        recommendation = `Testing recovery - ${state.halfOpenTrials}/${state.halfOpenAttempts} attempts`;
        break;
    }

    return {
      status,
      state: state.state,
      consecutiveFailures: state.consecutiveFailures,
      threshold: state.threshold,
      successRate: stats.successRate,
      failureRate: stats.failureRate,
      recommendation,
      lastFailureTime: state.lastFailureTime,
      timeSinceLastFailure: state.timeSinceLastFailure
    };
  }

  /**
   * Change circuit breaker state
   *
   * @private
   * @param {string} newState - New state
   * @param {string} [reason='automatic'] - Reason for state change
   */
  #changeState(newState, reason = 'automatic') {
    const oldState = this.state;
    this.state = newState;

    this.stats.stateChanges.push({
      timestamp: new Date().toISOString(),
      from: oldState,
      to: newState,
      reason,
      consecutiveFailures: this.consecutiveFailures
    });
  }

  /**
   * Schedule recovery timeout
   *
   * @private
   */
  #scheduleRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    this.recoveryTimer = setTimeout(() => {
      if (this.state === 'open') {
        this.#changeState('half-open', 'recovery_timeout');
        this.halfOpenTrials = 0;
      }
    }, this.timeout);
  }

  /**
   * Handle half-open attempt
   *
   * @private
   */
  #handleHalfOpenAttempt() {
    this.halfOpenTrials++;

    if (this.halfOpenTrials >= this.halfOpenAttempts) {
      // Exhausted half-open attempts, stay in half-open for now
      // Will transition on next success/failure
    }
  }
}

/**
 * CircuitBreakerError - Thrown when circuit breaker blocks execution
 */
export class CircuitBreakerError extends Error {
  constructor(message, state) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
    this.timestamp = new Date().toISOString();
  }
}

export default CircuitBreaker;
