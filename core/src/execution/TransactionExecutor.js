import { ethers } from 'ethers';
import { NonceManager } from './NonceManager.js';
import { RetryManager } from './RetryManager.js';
import { RateLimiter } from '../safety/RateLimiter.js';

/**
 * TransactionExecutor - Executes transactions with proper nonce management and retry logic
 *
 * Handles the complete transaction lifecycle including:
 * - Pre-flight simulation
 * - Gas estimation with safety margins
 * - Nonce management for concurrent execution
 * - Retry logic for transient failures
 * - Result classification and structured reporting
 */
export class TransactionExecutor {
  /**
   * Initialize transaction executor with required dependencies
   *
   * @param {WalletFarm} walletFarm - The wallet farm instance
   * @param {NonceManager} [nonceManager] - Nonce manager (creates if not provided)
   * @param {RetryManager} [retryManager] - Retry manager (creates if not provided)
   * @param {RateLimiter} [rateLimiter] - Rate limiter (creates if not provided)
   */
  constructor(walletFarm, nonceManager = null, retryManager = null, rateLimiter = null) {
    if (!walletFarm || typeof walletFarm.getWallet !== 'function') {
      throw new Error('Valid WalletFarm instance is required');
    }

    this.walletFarm = walletFarm;
    this.nonceManager = nonceManager || new NonceManager(walletFarm);
    this.retryManager = retryManager || new RetryManager();
    this.rateLimiter = rateLimiter || new RateLimiter({
      requestsPerSecond: 10, // Conservative default
      burstSize: 20
    });

    // Default gas margin (10% safety buffer)
    this.gasMargin = 1.1;

    // Default confirmation settings
    this.defaultConfirmations = 1;
  }

  /**
   * Simulate transaction without sending (pre-flight check)
   *
   * @param {ethers.Wallet} wallet - Connected wallet instance
   * @param {ethers.Contract} contract - Contract instance
   * @param {string} method - Method name to call
   * @param {Array} params - Method parameters
   * @param {Object} [options={}] - Transaction options
   * @returns {Promise<Object>} Simulation result
   */
  async simulate(wallet, contract, method, params, options = {}) {
    try {
      // Use staticCall for read-only simulation
      const result = await contract[method].staticCall(
        ...params,
        {
          from: wallet.address,
          value: options.value || 0,
          // Add any other simulation-specific overrides
          ...options.simulationOverrides
        }
      );

      return {
        willSucceed: true,
        result,
        simulatedAt: new Date().toISOString()
      };

    } catch (error) {
      return {
        willSucceed: false,
        reason: this.#classifySimulationError(error),
        error,
        simulatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Classify simulation error for better error reporting
   *
   * @private
   * @param {Error} error - Simulation error
   * @returns {string} Classified error reason
   */
  #classifySimulationError(error) {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('execution reverted')) {
      return 'Contract execution would revert';
    }

    if (message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }

    if (message.includes('gas required exceeds')) {
      return 'Transaction would exceed gas limit';
    }

    if (message.includes('invalid opcode')) {
      return 'Invalid contract operation';
    }

    if (message.includes('stack overflow') || message.includes('stack underflow')) {
      return 'Contract stack error';
    }

    return `Simulation failed: ${error.message}`;
  }

  /**
   * Estimate gas for transaction with safety margin
   *
   * @param {ethers.Contract} contract - Contract instance
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @param {Object} [options={}] - Transaction options
   * @returns {Promise<bigint>} Estimated gas with safety margin
   */
  async estimateGas(contract, method, params, options = {}) {
    try {
      const estimated = await contract[method].estimateGas(
        ...params,
        {
          value: options.value || 0,
          // Add any gas estimation overrides
          ...options.gasEstimationOverrides
        }
      );

      // Apply safety margin
      const withMargin = BigInt(Math.floor(Number(estimated) * this.gasMargin));

      return withMargin;

    } catch (error) {
      throw new Error(`Gas estimation failed for ${method}: ${error.message}`);
    }
  }

  /**
   * Execute transaction with full lifecycle management
   *
   * @param {number} walletIndex - Wallet index from farm
   * @param {string} chainName - Chain name
   * @param {ethers.Contract} contract - Contract instance
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<Object>} Transaction result
   */
  async execute(walletIndex, chainName, contract, method, params, options = {}) {
    const startTime = Date.now();
    const wallet = this.walletFarm.getWallet(walletIndex, chainName);

    // Pre-flight simulation (optional)
    let simulationResult = null;
    if (options.simulate !== false) {
      simulationResult = await this.simulate(wallet, contract, method, params, options);

      if (!simulationResult.willSucceed) {
        return {
          success: false,
          error: simulationResult.reason,
          simulated: true,
          simulationResult,
          executionTime: Date.now() - startTime
        };
      }
    }

    // Execute with retry logic
    const result = await this.retryManager.executeWithRetry(
      async () => {
        return await this.#executeOnce(walletIndex, chainName, contract, method, params, options);
      },
      {
        onRetry: (attempt, delay, error, context) => {
          if (options.verbose) {
            console.log(`🔄 Transaction retry ${attempt} after ${delay}ms: ${error.message}`);
          }

          // Handle nonce errors specially
          if (error.message.includes('nonce')) {
            this.nonceManager.handleNonceError(walletIndex, chainName, error);
          }
        },
        context: { walletIndex, chainName, method }
      }
    );

    result.executionTime = Date.now() - startTime;
    result.simulated = simulationResult !== null;

    return result;
  }

  /**
   * Execute transaction once (internal, used by retry logic)
   *
   * @private
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @param {ethers.Contract} contract - Contract instance
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Transaction result
   */
  async #executeOnce(walletIndex, chainName, contract, method, params, options) {
    const wallet = this.walletFarm.getWallet(walletIndex, chainName);

    // Rate limit before RPC call
    await this.rateLimiter.acquire(1);

    // Acquire nonce (blocks until available)
    const nonce = await this.nonceManager.acquireNonce(walletIndex, chainName);

    try {
      // Rate limit before gas estimation
      await this.rateLimiter.acquire(1);

      // Estimate gas with safety margin
      const gasLimit = await this.estimateGas(contract, method, params, options);

      // Build transaction options
      const txOptions = {
        nonce,
        gasLimit,
        value: options.value || 0
      };

      // Add gas price settings if provided
      if (options.maxFeePerGas) {
        txOptions.maxFeePerGas = options.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas ||
          ethers.parseUnits('1', 'gwei');
      } else if (options.gasPrice) {
        txOptions.gasPrice = options.gasPrice;
      }

      // Add any additional transaction overrides
      Object.assign(txOptions, options.txOverrides || {});

      // Send transaction
      const tx = await contract.connect(wallet)[method](
        ...params,
        txOptions
      );

      // Wait for confirmation
      const confirmations = options.confirmations || this.defaultConfirmations;
      const receipt = await tx.wait(confirmations);

      // Release nonce
      this.nonceManager.releaseNonce(walletIndex, chainName);

      // Classify result
      const result = this.#classifyTransactionResult(receipt, tx);

      return {
        ...result,
        txHash: tx.hash,
        nonce,
        gasLimit,
        confirmations,
        confirmedAt: new Date().toISOString()
      };

    } catch (error) {
      // Release nonce on error
      this.nonceManager.releaseNonce(walletIndex, chainName);

      throw error;
    }
  }

  /**
   * Classify transaction result based on receipt
   *
   * @private
   * @param {Object} receipt - Transaction receipt
   * @param {Object} tx - Transaction object
   * @returns {Object} Classified result
   */
  #classifyTransactionResult(receipt, tx) {
    const baseResult = {
      success: receipt.status === 1,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      cumulativeGasUsed: receipt.cumulativeGasUsed
    };

    if (receipt.status === 1) {
      // Success
      return {
        ...baseResult,
        status: 'success',
        message: 'Transaction executed successfully'
      };
    } else {
      // Failure - try to determine if it was a revert
      return {
        ...baseResult,
        status: 'failed',
        message: 'Transaction failed or reverted'
      };
    }
  }

  /**
   * Execute multiple transactions concurrently
   *
   * @param {Array<Object>} transactions - Array of transaction configs
   * @param {Object} [options={}] - Batch execution options
   * @returns {Promise<Array<Object>>} Array of transaction results
   */
  async executeBatch(transactions, options = {}) {
    const promises = transactions.map((tx, index) =>
      this.execute(
        tx.walletIndex,
        tx.chainName,
        tx.contract,
        tx.method,
        tx.params,
        {
          ...options,
          ...tx.options,
          batchIndex: index
        }
      ).catch(error => ({
        success: false,
        error: error.message,
        batchIndex: index,
        executionTime: Date.now() - (options.startTime || Date.now())
      }))
    );

    const results = await Promise.all(promises);

    // Add batch metadata
    return results.map((result, index) => ({
      ...result,
      batchIndex: index,
      batchSize: transactions.length
    }));
  }

  /**
   * Execute transaction with dry run (simulation only)
   *
   * @param {number} walletIndex - Wallet index
   * @param {string} chainName - Chain name
   * @param {ethers.Contract} contract - Contract instance
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @param {Object} [options={}] - Execution options
   * @returns {Promise<Object>} Dry run result
   */
  async dryRun(walletIndex, chainName, contract, method, params, options = {}) {
    const startTime = Date.now();
    const wallet = this.walletFarm.getWallet(walletIndex, chainName);

    // Always simulate
    const simulationResult = await this.simulate(wallet, contract, method, params, options);

    let gasEstimate = null;
    let error = null;

    if (simulationResult.willSucceed) {
      try {
        gasEstimate = await this.estimateGas(contract, method, params, options);
      } catch (gasError) {
        error = `Simulation succeeded but gas estimation failed: ${gasError.message}`;
      }
    }

    return {
      success: simulationResult.willSucceed,
      simulationResult,
      gasEstimate,
      error,
      executionTime: Date.now() - startTime,
      dryRun: true
    };
  }

  /**
   * Get executor statistics
   *
   * @returns {Object} Executor statistics
   */
  getStats() {
    return {
      nonceManager: this.nonceManager.getStats(),
      retryManager: this.retryManager.getMetrics(),
      gasMargin: this.gasMargin,
      defaultConfirmations: this.defaultConfirmations
    };
  }

  /**
   * Configure executor settings
   *
   * @param {Object} config - Configuration options
   */
  configure(config) {
    if (config.gasMargin !== undefined) {
      this.gasMargin = config.gasMargin;
    }

    if (config.defaultConfirmations !== undefined) {
      this.defaultConfirmations = config.defaultConfirmations;
    }

    if (config.retryManager) {
      Object.assign(this.retryManager, config.retryManager);
    }
  }

  /**
   * Reset executor state
   */
  async reset() {
    await this.nonceManager.resetAll();
    this.retryManager.resetMetrics();
  }
}

export default TransactionExecutor;
