/**
 * SimulationMetrics - Tracks simulation performance and outcomes
 *
 * Comprehensive metrics collection for behavioral simulation including:
 * - Transaction success/failure rates
 * - Gas usage and cost tracking
 * - Timing distributions and delays
 * - Archetype-specific performance
 * - Error classification and analysis
 */
export class SimulationMetrics {
  /**
   * Initialize simulation metrics tracking
   */
  constructor() {
    this.reset();
  }

  /**
   * Reset all metrics to initial state
   */
  reset() {
    this.metrics = {
      // Overall simulation
      totalAttempts: 0,
      successfulTxs: 0,
      failedTxs: 0,
      revertedTxs: 0,
      skippedInteractions: 0,

      // Gas and cost tracking
      totalGasUsed: 0n,
      totalGasCost: 0n,
      gasPriceStats: {
        min: null,
        max: null,
        sum: 0n,
        count: 0
      },

      // Timing metrics
      confirmationTimes: [],
      delays: [],
      totalSimulationTime: 0,

      // Archetype breakdown
      txsByArchetype: new Map(),

      // Error tracking
      errorsByType: new Map(),
      errorsByArchetype: new Map(),

      // Timing bounds
      startTime: null,
      endTime: null,
      lastActivity: null
    };

    // Additional analysis data
    this.rawData = {
      transactions: [],
      delays: [],
      errors: []
    };
  }

  /**
   * Mark simulation start
   */
  startSimulation() {
    this.metrics.startTime = new Date();
    this.metrics.lastActivity = new Date();
  }

  /**
   * Mark simulation end
   */
  endSimulation() {
    this.metrics.endTime = new Date();
  }

  /**
   * Record transaction attempt
   *
   * @param {string} archetype - Archetype name
   * @param {Object} [metadata={}] - Additional metadata
   */
  recordAttempt(archetype, metadata = {}) {
    this.metrics.totalAttempts++;

    if (!this.metrics.txsByArchetype.has(archetype)) {
      this.metrics.txsByArchetype.set(archetype, {
        attempts: 0,
        successes: 0,
        failures: 0,
        reverts: 0,
        skips: 0,
        totalGasUsed: 0n,
        totalGasCost: 0n
      });
    }

    const archetypeStats = this.metrics.txsByArchetype.get(archetype);
    archetypeStats.attempts++;

    this.metrics.lastActivity = new Date();

    // Record raw data
    this.rawData.transactions.push({
      type: 'attempt',
      archetype,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Record successful transaction
   *
   * @param {string} archetype - Archetype name
   * @param {bigint} gasUsed - Gas used
   * @param {bigint} gasPrice - Gas price in wei
   * @param {number} [confirmationTime] - Confirmation time in ms
   * @param {Object} [metadata={}] - Additional metadata
   */
  recordSuccess(archetype, gasUsed, gasPrice, confirmationTime, metadata = {}) {
    this.metrics.successfulTxs++;
    this.metrics.totalGasUsed += gasUsed;
    this.metrics.totalGasCost += gasUsed * gasPrice;

    // Update gas price statistics
    this.#updateGasPriceStats(gasPrice);

    if (confirmationTime !== undefined) {
      this.metrics.confirmationTimes.push(confirmationTime);
    }

    // Ensure archetype stats exist
    if (!this.metrics.txsByArchetype.has(archetype)) {
      this.recordAttempt(archetype);
    }

    const archetypeStats = this.metrics.txsByArchetype.get(archetype);
    archetypeStats.successes++;
    archetypeStats.totalGasUsed += gasUsed;
    archetypeStats.totalGasCost += gasUsed * gasPrice;

    this.metrics.lastActivity = new Date();

    // Record raw data
    this.rawData.transactions.push({
      type: 'success',
      archetype,
      gasUsed: gasUsed.toString(),
      gasPrice: gasPrice.toString(),
      gasCost: (gasUsed * gasPrice).toString(),
      confirmationTime,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Record failed transaction
   *
   * @param {string} archetype - Archetype name
   * @param {Error|string} error - Error that occurred
   * @param {boolean} [reverted=false] - Whether transaction reverted on-chain
   * @param {Object} [metadata={}] - Additional metadata
   */
  recordFailure(archetype, error, reverted = false, metadata = {}) {
    this.metrics.failedTxs++;

    if (reverted) {
      this.metrics.revertedTxs++;
    }

    // Classify and track error
    const errorType = this.#classifyError(error);
    const count = this.metrics.errorsByType.get(errorType) || 0;
    this.metrics.errorsByType.set(errorType, count + 1);

    // Track errors by archetype
    if (!this.metrics.errorsByArchetype.has(archetype)) {
      this.metrics.errorsByArchetype.set(archetype, new Map());
    }
    const archetypeErrors = this.metrics.errorsByArchetype.get(archetype);
    const archetypeErrorCount = archetypeErrors.get(errorType) || 0;
    archetypeErrors.set(errorType, archetypeErrorCount + 1);

    // Ensure archetype stats exist
    if (!this.metrics.txsByArchetype.has(archetype)) {
      this.recordAttempt(archetype);
    }

    const archetypeStats = this.metrics.txsByArchetype.get(archetype);
    archetypeStats.failures++;
    if (reverted) {
      archetypeStats.reverts++;
    }

    this.metrics.lastActivity = new Date();

    // Record raw data
    this.rawData.errors.push({
      archetype,
      error: error.message || error,
      errorType,
      reverted,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Record skipped interaction
   *
   * @param {string} archetype - Archetype name
   * @param {Object} [metadata={}] - Additional metadata
   */
  recordSkip(archetype, metadata = {}) {
    this.metrics.skippedInteractions++;

    // Ensure archetype stats exist
    if (!this.metrics.txsByArchetype.has(archetype)) {
      this.recordAttempt(archetype);
    }

    const archetypeStats = this.metrics.txsByArchetype.get(archetype);
    archetypeStats.skips++;

    // Record raw data
    this.rawData.transactions.push({
      type: 'skip',
      archetype,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Record delay between actions
   *
   * @param {number} delayMs - Delay duration in milliseconds
   * @param {Object} [metadata={}] - Additional metadata
   */
  recordDelay(delayMs, metadata = {}) {
    this.metrics.delays.push(delayMs);
    this.metrics.totalSimulationTime += delayMs;

    // Record raw data
    this.rawData.delays.push({
      delay: delayMs,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Classify error type for analysis
   *
   * @private
   * @param {Error|string} error - Error to classify
   * @returns {string} Error classification
   */
  #classifyError(error) {
    const message = (error.message || error).toLowerCase();

    if (message.includes('insufficient funds')) return 'InsufficientFunds';
    if (message.includes('nonce')) return 'NonceError';
    if (message.includes('gas')) return 'GasError';
    if (message.includes('reverted')) return 'ContractRevert';
    if (message.includes('timeout') || message.includes('network')) return 'NetworkError';
    if (message.includes('circuit breaker')) return 'CircuitBreaker';
    if (message.includes('budget')) return 'BudgetExceeded';

    return 'Unknown';
  }

  /**
   * Update gas price statistics
   *
   * @private
   * @param {bigint} gasPrice - Gas price to record
   */
  #updateGasPriceStats(gasPrice) {
    const stats = this.metrics.gasPriceStats;

    if (stats.min === null || gasPrice < stats.min) {
      stats.min = gasPrice;
    }

    if (stats.max === null || gasPrice > stats.max) {
      stats.max = gasPrice;
    }

    stats.sum += gasPrice;
    stats.count++;
  }

  /**
   * Generate comprehensive report
   *
   * @returns {Object} Complete metrics report
   */
  generateReport() {
    const duration = this.metrics.endTime && this.metrics.startTime
      ? this.metrics.endTime - this.metrics.startTime
      : this.metrics.lastActivity && this.metrics.startTime
        ? this.metrics.lastActivity - this.metrics.startTime
        : 0;

    const report = {
      summary: {
        duration: duration,
        durationSeconds: Math.floor(duration / 1000),
        totalAttempts: this.metrics.totalAttempts,
        successful: this.metrics.successfulTxs,
        failed: this.metrics.failedTxs,
        reverted: this.metrics.revertedTxs,
        skipped: this.metrics.skippedInteractions,
        successRate: this.metrics.totalAttempts > 0
          ? ((this.metrics.successfulTxs / this.metrics.totalAttempts) * 100).toFixed(2) + '%'
          : '0.00%'
      },

      gas: {
        totalGasUsed: this.metrics.totalGasUsed.toString(),
        averageGasPerTx: this.metrics.successfulTxs > 0
          ? Number(this.metrics.totalGasUsed / BigInt(this.metrics.successfulTxs))
          : 0,
        gasPrice: {
          min: this.metrics.gasPriceStats.min?.toString(),
          max: this.metrics.gasPriceStats.max?.toString(),
          average: this.metrics.gasPriceStats.count > 0
            ? (this.metrics.gasPriceStats.sum / BigInt(this.metrics.gasPriceStats.count)).toString()
            : '0'
        }
      },

      timing: {
        averageConfirmation: this.#calculateAverage(this.metrics.confirmationTimes),
        medianConfirmation: this.#calculateMedian(this.metrics.confirmationTimes),
        averageDelay: this.#calculateAverage(this.metrics.delays),
        totalDelay: this.metrics.delays.reduce((a, b) => a + b, 0),
        totalSimulationTime: this.metrics.totalSimulationTime
      },

      errors: {
        totalErrors: this.metrics.failedTxs,
        errorBreakdown: Object.fromEntries(this.metrics.errorsByType),
        errorsByArchetype: Object.fromEntries(
          Array.from(this.metrics.errorsByArchetype.entries()).map(([archetype, errors]) => [
            archetype,
            Object.fromEntries(errors)
          ])
        )
      },

      archetypes: {
        breakdown: Object.fromEntries(
          Array.from(this.metrics.txsByArchetype.entries()).map(([archetype, stats]) => [
            archetype,
            {
              attempts: stats.attempts,
              successes: stats.successes,
              failures: stats.failures,
              reverts: stats.reverts,
              skips: stats.skips,
              successRate: stats.attempts > 0
                ? ((stats.successes / stats.attempts) * 100).toFixed(2) + '%'
                : '0%',
              averageGasUsed: stats.successes > 0
                ? Number(stats.totalGasUsed / BigInt(stats.successes))
                : 0
            }
          ])
        )
      },

      performance: {
        transactionsPerSecond: duration > 0
          ? (this.metrics.totalAttempts / (duration / 1000)).toFixed(2)
          : '0',
        gasEfficiency: this.metrics.successfulTxs > 0
          ? Number(this.metrics.totalGasUsed / BigInt(this.metrics.successfulTxs))
          : 0,
        errorRate: this.metrics.totalAttempts > 0
          ? ((this.metrics.failedTxs / this.metrics.totalAttempts) * 100).toFixed(2) + '%'
          : '0%'
      }
    };

    return report;
  }

  /**
   * Get real-time status
   *
   * @returns {Object} Current status
   */
  getStatus() {
    const activeTime = this.metrics.lastActivity && this.metrics.startTime
      ? this.metrics.lastActivity - this.metrics.startTime
      : 0;

    return {
      isActive: this.metrics.startTime !== null && this.metrics.endTime === null,
      startTime: this.metrics.startTime,
      lastActivity: this.metrics.lastActivity,
      activeTime: activeTime,
      totalAttempts: this.metrics.totalAttempts,
      successRate: this.metrics.totalAttempts > 0
        ? ((this.metrics.successfulTxs / this.metrics.totalAttempts) * 100).toFixed(2) + '%'
        : '0.00%',
      currentStats: {
        attempts: this.metrics.totalAttempts,
        successes: this.metrics.successfulTxs,
        failures: this.metrics.failedTxs,
        skips: this.metrics.skippedInteractions
      }
    };
  }

  /**
   * Export raw data for external analysis
   *
   * @returns {Object} Raw metrics data
   */
  exportRawData() {
    return {
      summary: { ...this.metrics },
      transactions: [...this.rawData.transactions],
      delays: [...this.rawData.delays],
      errors: [...this.rawData.errors]
    };
  }

  /**
   * Calculate average of numeric array
   *
   * @private
   * @param {Array<number>} arr - Array of numbers
   * @returns {number} Average value
   */
  #calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Calculate median of numeric array
   *
   * @private
   * @param {Array<number>} arr - Array of numbers
   * @returns {number} Median value
   */
  #calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export default SimulationMetrics;
