/**
 * NonceManager - Manages transaction nonces for wallets across multiple chains
 *
 * Prevents nonce collisions in concurrent transaction execution by:
 * - Tracking nonce per wallet per chain
 * - Thread-safe nonce acquisition with queuing
 * - Automatic sync with on-chain nonce values
 * - Handling nonce-related error recovery
 */
export class NonceManager {
  /**
   * Initialize nonce tracking for wallet farm
   *
   * @param {WalletFarm} walletFarm - The wallet farm instance
   */
  constructor(walletFarm) {
    if (!walletFarm || typeof walletFarm.getWallet !== 'function') {
      throw new Error('Valid WalletFarm instance is required');
    }

    this.walletFarm = walletFarm;

    // Map<"walletIndex:chainName", NonceState>
    this.nonceStates = new Map();

    // Map<"walletIndex:chainName", Promise[]> - queued requests
    this.nonceQueues = new Map();

    // Track sync operations to avoid excessive on-chain calls
    this.lastSyncTimes = new Map();
    this.syncCooldownMs = 5000; // 5 seconds between syncs

    // Performance tracking for stress testing
    this.stats = {
      totalAcquisitions: 0,
      totalReleases: 0,
      totalQueuedRequests: 0,
      queueTimes: [],
      maxQueueDepth: 0
    };
  }

  /**
   * Generate unique key for wallet-chain combination
   *
   * @private
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @returns {string} Unique key
   */
  #getKey(walletIndex, chainName) {
    return `${walletIndex}:${chainName}`;
  }

  /**
   * Initialize nonce state for wallet-chain combination
   *
   * @private
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @returns {Promise<Object>} Nonce state object
   */
  async #initializeNonce(walletIndex, chainName) {
    const key = this.#getKey(walletIndex, chainName);

    if (this.nonceStates.has(key)) {
      return this.nonceStates.get(key);
    }

    try {
      const wallet = this.walletFarm.getWallet(walletIndex, chainName);
      const onChainNonce = await wallet.provider.getTransactionCount(
        wallet.address,
        'pending' // Include pending transactions
      );

      const state = {
        current: onChainNonce,
        locked: false,
        lastSync: Date.now(),
        walletIndex,
        chainName
      };

      this.nonceStates.set(key, state);
      this.nonceQueues.set(key, []);
      this.lastSyncTimes.set(key, Date.now());

      return state;

    } catch (error) {
      throw new Error(
        `Failed to initialize nonce for wallet ${walletIndex} on ${chainName}: ${error.message}`
      );
    }
  }

  /**
   * Acquire next nonce for transaction
   *
   * Thread-safe operation that queues requests if nonce is currently locked.
   * Waits until previous transaction completes before providing next nonce.
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @returns {Promise<number>} Next available nonce
   */
  async acquireNonce(walletIndex, chainName) {
    this.stats.totalAcquisitions++;
    const key = this.#getKey(walletIndex, chainName);

    // Initialize if needed
    if (!this.nonceStates.has(key)) {
      await this.#initializeNonce(walletIndex, chainName);
    }

    const state = this.nonceStates.get(key);

    // If nonce is locked, wait in queue
    if (state.locked) {
      this.stats.totalQueuedRequests++;
      const queueStartTime = Date.now();

      await new Promise((resolve) => {
        this.nonceQueues.get(key).push(resolve);

        // Track queue depth
        const queueDepth = this.nonceQueues.get(key).length;
        if (queueDepth > this.stats.maxQueueDepth) {
          this.stats.maxQueueDepth = queueDepth;
        }
      });

      const queueTime = Date.now() - queueStartTime;
      this.stats.queueTimes.push(queueTime);
    }

    // Lock nonce and increment for next caller
    state.locked = true;
    const nonce = state.current;
    state.current++;

    return nonce;
  }

  /**
   * Release nonce lock after transaction submitted
   *
   * Allows next queued transaction to proceed with nonce acquisition.
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   */
  releaseNonce(walletIndex, chainName) {
    this.stats.totalReleases++;
    const key = this.#getKey(walletIndex, chainName);
    const state = this.nonceStates.get(key);

    if (!state) {
      throw new Error(`Nonce state not found for ${key}`);
    }

    if (!state.locked) {
      console.warn(`Attempted to release unlocked nonce for ${key}`);
      return;
    }

    state.locked = false;

    // Process next in queue
    const queue = this.nonceQueues.get(key);
    if (queue.length > 0) {
      const nextResolve = queue.shift();
      nextResolve();
    }
  }

  /**
   * Sync nonce with on-chain value
   *
   * Use when recovering from nonce errors or when nonce state becomes uncertain.
   * Includes cooldown to prevent excessive on-chain calls.
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @param {boolean} [force=false] - Force sync even if recently synced
   * @returns {Promise<number>} Synced nonce value
   */
  async syncNonce(walletIndex, chainName, force = false) {
    const key = this.#getKey(walletIndex, chainName);

    // Check cooldown unless forced
    if (!force) {
      const lastSync = this.lastSyncTimes.get(key);
      if (lastSync && (Date.now() - lastSync) < this.syncCooldownMs) {
        // Return current nonce without syncing
        const state = this.nonceStates.get(key);
        return state ? state.current : 0;
      }
    }

    try {
      const wallet = this.walletFarm.getWallet(walletIndex, chainName);
      const onChainNonce = await wallet.provider.getTransactionCount(
        wallet.address,
        'pending'
      );

      // Update state
      const state = this.nonceStates.get(key);
      if (state) {
        state.current = onChainNonce;
        state.lastSync = Date.now();
        state.locked = false; // Reset lock on sync
      } else {
        // Initialize if not exists
        await this.#initializeNonce(walletIndex, chainName);
      }

      this.lastSyncTimes.set(key, Date.now());

      return onChainNonce;

    } catch (error) {
      throw new Error(
        `Failed to sync nonce for wallet ${walletIndex} on ${chainName}: ${error.message}`
      );
    }
  }

  /**
   * Handle nonce-related error by syncing with chain
   *
   * Detects nonce errors and automatically recovers by syncing with on-chain state.
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @param {Error} error - The error that occurred
   * @returns {Promise<boolean>} True if nonce was corrected
   */
  async handleNonceError(walletIndex, chainName, error) {
    const errorMessage = error.message?.toLowerCase() || '';
    const code = error.code;

    // Check if this is a nonce-related error
    const isNonceError =
      code === 'NONCE_TOO_LOW' ||
      code === 'REPLACEMENT_UNDERPRICED' ||
      errorMessage.includes('nonce too low') ||
      errorMessage.includes('nonce') ||
      errorMessage.includes('replacement transaction underpriced');

    if (!isNonceError) {
      return false;
    }

    console.warn(`🔄 Nonce error detected for wallet ${walletIndex} on ${chainName}, syncing...`);

    // Force sync to correct nonce
    await this.syncNonce(walletIndex, chainName, true);

    // Reset queue since nonce state was corrected
    const key = this.#getKey(walletIndex, chainName);
    this.nonceQueues.get(key).length = 0; // Clear queue

    return true;
  }

  /**
   * Get current nonce state for debugging
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @returns {Object|null} Nonce state or null if not initialized
   */
  getNonceState(walletIndex, chainName) {
    const key = this.#getKey(walletIndex, chainName);
    const state = this.nonceStates.get(key);

    if (!state) {
      return null;
    }

    // Return copy to prevent external modification
    return {
      ...state,
      queueLength: this.nonceQueues.get(key)?.length || 0
    };
  }

  /**
   * Get nonce statistics across all wallets and chains
   *
   * @returns {Object} Statistics about nonce management
   */
  getStats() {
    const stats = {
      totalStates: this.nonceStates.size,
      lockedStates: 0,
      totalQueuedRequests: 0,
      statesByChain: new Map(),
      recentSyncs: 0
    };

    const oneMinuteAgo = Date.now() - 60000;

    for (const [key, state] of this.nonceStates) {
      if (state.locked) {
        stats.lockedStates++;
      }

      const queue = this.nonceQueues.get(key);
      if (queue) {
        stats.totalQueuedRequests += queue.length;
      }

      // Group by chain
      const chainName = key.split(':')[1];
      if (!stats.statesByChain.has(chainName)) {
        stats.statesByChain.set(chainName, 0);
      }
      stats.statesByChain.set(chainName, stats.statesByChain.get(chainName) + 1);

      // Count recent syncs
      if (state.lastSync > oneMinuteAgo) {
        stats.recentSyncs++;
      }
    }

    stats.statesByChain = Object.fromEntries(stats.statesByChain);

    return stats;
  }

  /**
   * Reset all nonce states (use with caution)
   *
   * This will clear all nonce tracking and force re-sync with chains.
   * Use only when nonce state becomes completely corrupted.
   */
  async resetAll() {
    console.warn('🔄 Resetting all nonce states - this may cause temporary nonce issues');

    this.nonceStates.clear();
    this.nonceQueues.clear();
    this.lastSyncTimes.clear();

    // Re-initialize all known wallet-chain combinations
    // This is a best-effort operation since we don't track all combinations
    console.log('✅ Nonce states reset - new transactions will sync with chain');
  }

  /**
   * Detect nonce gaps between local state and on-chain state
   *
   * Nonce gaps occur when transactions fail after nonce acquisition but before broadcast,
   * causing local nonce to drift ahead of on-chain nonce.
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @returns {Promise<Object>} Gap detection result
   */
  async detectNonceGaps(walletIndex, chainName) {
    const key = this.#getKey(walletIndex, chainName);

    // Check if nonce state exists
    if (!this.nonceStates.has(key)) {
      return {
        hasGap: false,
        message: 'Nonce state not initialized'
      };
    }

    const state = this.nonceStates.get(key);
    const wallet = this.walletFarm.getWallet(walletIndex, chainName);

    try {
      // Get on-chain nonce (confirmed transactions only)
      const onChainNonce = await wallet.provider.getTransactionCount(
        wallet.address,
        'latest' // Use confirmed nonce, not pending
      );

      const localNonce = state.current;
      const gap = localNonce - onChainNonce;

      if (gap > 0) {
        console.warn(`⚠️  Nonce gap detected for wallet ${walletIndex} on ${chainName}:`);
        console.warn(`   Local nonce: ${localNonce}`);
        console.warn(`   Chain nonce: ${onChainNonce}`);
        console.warn(`   Gap size: ${gap} nonces lost`);

        // Auto-correct the nonce state
        state.current = onChainNonce;
        state.lastSync = Date.now();

        return {
          hasGap: true,
          localNonce: localNonce,
          chainNonce: onChainNonce,
          gapSize: gap,
          corrected: true,
          message: `Gap of ${gap} nonces detected and corrected`
        };
      } else if (gap < 0) {
        // Chain nonce is ahead - this shouldn't happen normally
        console.warn(`⚠️  Chain nonce ahead of local for wallet ${walletIndex} on ${chainName}`);
        console.warn(`   Local nonce: ${localNonce}`);
        console.warn(`   Chain nonce: ${onChainNonce}`);

        // Sync to chain nonce
        state.current = onChainNonce;
        state.lastSync = Date.now();

        return {
          hasGap: false,
          chainAhead: true,
          localNonce: localNonce,
          chainNonce: onChainNonce,
          difference: Math.abs(gap),
          corrected: true,
          message: 'Chain nonce was ahead, synchronized'
        };
      }

      // No gap
      return {
        hasGap: false,
        localNonce: localNonce,
        chainNonce: onChainNonce,
        message: 'Nonces are in sync'
      };

    } catch (error) {
      return {
        hasGap: false,
        error: true,
        message: `Failed to check nonce gap: ${error.message}`
      };
    }
  }

  /**
   * Monitor nonce gaps periodically
   *
   * Starts a background process that checks for nonce gaps at regular intervals.
   * Useful for long-running simulations to catch drift early.
   *
   * @param {number} [intervalMs=60000] - Check interval in milliseconds (default: 1 minute)
   * @returns {number} Interval ID (use stopGapMonitoring to stop)
   */
  monitorNonceGaps(intervalMs = 60000) {
    if (this.gapMonitorInterval) {
      console.warn('⚠️  Gap monitoring already active');
      return this.gapMonitorInterval;
    }

    console.log(`👁️  Starting nonce gap monitoring (interval: ${intervalMs}ms)`);

    this.gapMonitorInterval = setInterval(async () => {
      const gapsFound = [];

      for (const key of this.nonceStates.keys()) {
        const [walletIndex, chainName] = key.split(':').map((s, i) =>
          i === 0 ? parseInt(s) : s
        );

        const result = await this.detectNonceGaps(walletIndex, chainName);

        if (result.hasGap || result.chainAhead) {
          gapsFound.push({
            walletIndex,
            chainName,
            ...result
          });
        }
      }

      if (gapsFound.length > 0) {
        console.warn(`🔍 Gap monitoring found ${gapsFound.length} issue(s):`);
        gapsFound.forEach(gap => {
          console.warn(`   Wallet ${gap.walletIndex} on ${gap.chainName}: ${gap.message}`);
        });
      }
    }, intervalMs);

    return this.gapMonitorInterval;
  }

  /**
   * Stop nonce gap monitoring
   */
  stopGapMonitoring() {
    if (this.gapMonitorInterval) {
      clearInterval(this.gapMonitorInterval);
      this.gapMonitorInterval = null;
      console.log('✅ Nonce gap monitoring stopped');
    }
  }

  /**
   * Force sync all nonces with on-chain values
   *
   * Useful for recovery after network issues or when nonce state is uncertain.
   *
   * @returns {Promise<Object>} Sync results
   */
  async forceSyncAll() {
    const results = {
      attempted: this.nonceStates.size,
      successful: 0,
      failed: 0,
      errors: []
    };

    console.log(`🔄 Force syncing ${results.attempted} nonce states...`);

    for (const [key, state] of this.nonceStates) {
      const [walletIndex, chainName] = key.split(':').map((s, i) =>
        i === 0 ? parseInt(s) : s
      );

      try {
        await this.syncNonce(walletIndex, chainName, true);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          key,
          error: error.message
        });
      }
    }

    console.log(`✅ Force sync complete: ${results.successful} successful, ${results.failed} failed`);
    return results;
  }

  /**
   * Get nonce manager performance statistics
   *
   * @returns {Object} Statistics object
   */
  getStats() {
    const avgQueueTime = this.stats.queueTimes.length > 0
      ? this.stats.queueTimes.reduce((a, b) => a + b, 0) / this.stats.queueTimes.length
      : 0;

    return {
      totalAcquisitions: this.stats.totalAcquisitions,
      totalReleases: this.stats.totalReleases,
      totalQueuedRequests: this.stats.totalQueuedRequests,
      averageQueueTime: avgQueueTime,
      maxQueueDepth: this.stats.maxQueueDepth,
      queueTimeP95: this.#percentile(this.stats.queueTimes, 0.95),
      queueTimeP99: this.#percentile(this.stats.queueTimes, 0.99)
    };
  }

  /**
   * Calculate percentile from array
   * @private
   */
  #percentile(arr, p) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  }
}

export default NonceManager;
