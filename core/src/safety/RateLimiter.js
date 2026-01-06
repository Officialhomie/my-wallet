/**
 * Token Bucket Rate Limiter
 *
 * Prevents overwhelming RPC endpoints with too many requests.
 * Uses token bucket algorithm to allow bursts while maintaining average rate limits.
 */
export class RateLimiter {
  constructor(options = {}) {
    // Rate limit configuration
    this.requestsPerSecond = options.requestsPerSecond || 10;
    this.burstSize = options.burstSize || 20; // Allow bursts up to this size
    this.verbose = options.verbose || false;

    // Token bucket state
    this.tokens = this.burstSize;
    this.lastRefillTime = Date.now();

    // Metrics
    this.metrics = {
      totalRequests: 0,
      throttledRequests: 0,
      totalWaitTime: 0
    };

    if (this.verbose) {
      console.log(`🎫 RateLimiter initialized: ${this.requestsPerSecond} req/sec, burst ${this.burstSize}`);
    }
  }

  /**
   * Acquire permission to make request(s)
   *
   * @param {number} cost - Number of tokens to consume (default: 1)
   * @returns {Promise<void>} Resolves when tokens available
   */
  async acquire(cost = 1) {
    this.metrics.totalRequests++;

    // Refill tokens based on elapsed time
    this._refillTokens();

    // If we have enough tokens, consume and proceed
    if (this.tokens >= cost) {
      this.tokens -= cost;

      if (this.verbose) {
        console.log(`🎫 Rate limiter: ${this.tokens.toFixed(1)} tokens remaining`);
      }

      return;
    }

    // Not enough tokens - calculate wait time
    const tokensNeeded = cost - this.tokens;
    const waitTimeMs = (tokensNeeded / this.requestsPerSecond) * 1000;

    this.metrics.throttledRequests++;
    this.metrics.totalWaitTime += waitTimeMs;

    if (this.verbose) {
      console.log(`⏳ Rate limiter: waiting ${Math.round(waitTimeMs)}ms for tokens`);
    }

    // Wait for tokens to become available
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));

    // Refill again after waiting
    this._refillTokens();
    this.tokens = Math.max(0, this.tokens - cost);
  }

  /**
   * Refill token bucket based on elapsed time
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTime;
    const elapsedSeconds = elapsedMs / 1000;

    // Add tokens based on rate
    const tokensToAdd = elapsedSeconds * this.requestsPerSecond;

    // Cap at burst size
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);

    this.lastRefillTime = now;
  }

  /**
   * Check if request would be throttled (without consuming tokens)
   *
   * @param {number} cost - Number of tokens needed
   * @returns {boolean} True if request would be throttled
   */
  wouldThrottle(cost = 1) {
    this._refillTokens();
    return this.tokens < cost;
  }

  /**
   * Get current rate limiter status
   *
   * @returns {Object} Status information
   */
  getStatus() {
    this._refillTokens();

    return {
      availableTokens: this.tokens,
      maxTokens: this.burstSize,
      utilizationPercent: ((this.burstSize - this.tokens) / this.burstSize) * 100,
      requestsPerSecond: this.requestsPerSecond,
      metrics: {
        ...this.metrics,
        throttleRate: this.metrics.totalRequests > 0
          ? (this.metrics.throttledRequests / this.metrics.totalRequests) * 100
          : 0,
        averageWaitTime: this.metrics.throttledRequests > 0
          ? this.metrics.totalWaitTime / this.metrics.throttledRequests
          : 0
      }
    };
  }

  /**
   * Reset rate limiter and metrics
   */
  reset() {
    this.tokens = this.burstSize;
    this.lastRefillTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      throttledRequests: 0,
      totalWaitTime: 0
    };
  }
}

export default RateLimiter;
