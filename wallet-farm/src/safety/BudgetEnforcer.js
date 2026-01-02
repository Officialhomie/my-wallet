import { ethers } from 'ethers';

/**
 * BudgetEnforcer - Prevents runaway gas costs during simulation
 *
 * Enforces budget limits on gas spending to prevent accidental fund loss
 * and ensure simulations stay within expected cost bounds.
 */
export class BudgetEnforcer {
  /**
   * Initialize budget enforcer with limits
   *
   * @param {Object} [options={}] - Configuration options
   * @param {bigint} [options.maxGasPerTx] - Maximum gas per transaction (default: 0.01 ETH)
   * @param {bigint} [options.maxTotalGas] - Maximum total gas budget (default: 0.1 ETH)
   */
  constructor(options = {}) {
    // Default limits: 0.01 ETH per tx, 0.1 ETH total
    this.maxGasPerTx = options.maxGasPerTx || ethers.parseUnits('0.01', 'ether');
    this.maxTotalGas = options.maxTotalGas || ethers.parseUnits('0.1', 'ether');

    // Track spending
    this.totalGasSpent = 0n;
    this.transactionCount = 0;

    // Transaction history for analysis
    this.transactions = [];
  }

  /**
   * Check if transaction is within budget limits
   *
   * @param {bigint} estimatedGas - Estimated gas units
   * @param {bigint} gasPrice - Gas price in wei
   * @throws {Error} If budget exceeded
   */
  checkTransaction(estimatedGas, gasPrice) {
    if (typeof estimatedGas !== 'bigint' || typeof gasPrice !== 'bigint') {
      throw new Error('estimatedGas and gasPrice must be BigInt');
    }

    const txCost = estimatedGas * gasPrice;

    // Check per-transaction limit
    if (txCost > this.maxGasPerTx) {
      const txCostEth = ethers.formatEther(txCost);
      const limitEth = ethers.formatEther(this.maxGasPerTx);

      throw new Error(
        `Transaction cost ${txCostEth} ETH exceeds per-tx limit ${limitEth} ETH`
      );
    }

    // Check total budget
    if (this.totalGasSpent + txCost > this.maxTotalGas) {
      const projectedTotal = this.totalGasSpent + txCost;
      const projectedEth = ethers.formatEther(projectedTotal);
      const limitEth = ethers.formatEther(this.maxTotalGas);

      throw new Error(
        `Total budget exceeded: ${projectedEth} ETH (limit: ${limitEth} ETH)`
      );
    }
  }

  /**
   * Record actual gas spent after successful transaction
   *
   * @param {bigint} gasUsed - Actual gas used
   * @param {bigint} gasPrice - Gas price in wei
   * @param {Object} [metadata={}] - Additional transaction metadata
   */
  recordTransaction(gasUsed, gasPrice, metadata = {}) {
    if (typeof gasUsed !== 'bigint' || typeof gasPrice !== 'bigint') {
      throw new Error('gasUsed and gasPrice must be BigInt');
    }

    const actualCost = gasUsed * gasPrice;
    this.totalGasSpent += actualCost;
    this.transactionCount++;

    // Record transaction details
    const transaction = {
      index: this.transactionCount,
      gasUsed,
      gasPrice,
      cost: actualCost,
      costEth: ethers.formatEther(actualCost),
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.transactions.push(transaction);
  }

  /**
   * Get current budget status
   *
   * @returns {Object} Budget status information
   */
  getStatus() {
    const remainingBudget = this.maxTotalGas - this.totalGasSpent;
    const utilizationPercent = this.maxTotalGas > 0n
      ? Number(this.totalGasSpent * 100n / this.maxTotalGas)
      : 0;

    const avgTxCost = this.transactionCount > 0
      ? this.totalGasSpent / BigInt(this.transactionCount)
      : 0n;

    return {
      // Current spending
      totalGasSpent: this.totalGasSpent,
      totalGasSpentEth: ethers.formatEther(this.totalGasSpent),
      remainingBudget,
      remainingBudgetEth: ethers.formatEther(remainingBudget),
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,

      // Limits
      maxGasPerTx: this.maxGasPerTx,
      maxGasPerTxEth: ethers.formatEther(this.maxGasPerTx),
      maxTotalGas: this.maxTotalGas,
      maxTotalGasEth: ethers.formatEther(this.maxTotalGas),

      // Statistics
      transactionCount: this.transactionCount,
      averageTxCost: avgTxCost,
      averageTxCostEth: ethers.formatEther(avgTxCost),

      // Recent transactions (last 10)
      recentTransactions: this.transactions.slice(-10)
    };
  }

  /**
   * Check if budget has remaining capacity
   *
   * @param {bigint} [requiredAmount] - Required budget amount (optional)
   * @returns {boolean} True if budget available
   */
  hasBudget(requiredAmount = 0n) {
    return this.totalGasSpent + requiredAmount <= this.maxTotalGas;
  }

  /**
   * Get remaining budget
   *
   * @returns {bigint} Remaining budget in wei
   */
  getRemainingBudget() {
    return this.maxTotalGas - this.totalGasSpent;
  }

  /**
   * Estimate if transaction would fit in remaining budget
   *
   * @param {bigint} estimatedGas - Estimated gas units
   * @param {bigint} gasPrice - Gas price in wei
   * @returns {Object} Estimation result
   */
  estimateTransactionFit(estimatedGas, gasPrice) {
    const txCost = estimatedGas * gasPrice;
    const remainingBudget = this.getRemainingBudget();

    const wouldFit = txCost <= remainingBudget;
    const projectedUtilization = this.maxTotalGas > 0n
      ? Number((this.totalGasSpent + txCost) * 100n / this.maxTotalGas)
      : 0;

    return {
      wouldFit,
      txCost,
      txCostEth: ethers.formatEther(txCost),
      remainingAfterTx: remainingBudget - txCost,
      remainingAfterTxEth: ethers.formatEther(remainingBudget - txCost),
      projectedUtilizationPercent: Math.round(projectedUtilization * 100) / 100
    };
  }

  /**
   * Reset budget tracking (use with caution)
   *
   * @param {Object} [newLimits] - Optional new budget limits
   */
  reset(newLimits = {}) {
    this.totalGasSpent = 0n;
    this.transactionCount = 0;
    this.transactions = [];

    if (newLimits.maxGasPerTx !== undefined) {
      this.maxGasPerTx = newLimits.maxGasPerTx;
    }

    if (newLimits.maxTotalGas !== undefined) {
      this.maxTotalGas = newLimits.maxTotalGas;
    }
  }

  /**
   * Export budget data for analysis
   *
   * @returns {Object} Complete budget data
   */
  exportData() {
    return {
      config: {
        maxGasPerTx: this.maxGasPerTx.toString(),
        maxTotalGas: this.maxTotalGas.toString(),
        maxGasPerTxEth: ethers.formatEther(this.maxGasPerTx),
        maxTotalGasEth: ethers.formatEther(this.maxTotalGas)
      },
      current: {
        totalGasSpent: this.totalGasSpent.toString(),
        totalGasSpentEth: ethers.formatEther(this.totalGasSpent),
        transactionCount: this.transactionCount,
        utilizationPercent: this.maxTotalGas > 0n
          ? Number(this.totalGasSpent * 100n / this.maxTotalGas)
          : 0
      },
      transactions: this.transactions.map(tx => ({
        ...tx,
        gasUsed: tx.gasUsed.toString(),
        gasPrice: tx.gasPrice.toString(),
        cost: tx.cost.toString()
      }))
    };
  }

  /**
   * Get budget utilization summary
   *
   * @returns {Object} Budget utilization summary
   */
  getUtilizationSummary() {
    const status = this.getStatus();
    const utilizationLevel = status.utilizationPercent;

    let statusIndicator;
    if (utilizationLevel < 25) {
      statusIndicator = '🟢 LOW';
    } else if (utilizationLevel < 75) {
      statusIndicator = '🟡 MODERATE';
    } else if (utilizationLevel < 90) {
      statusIndicator = '🟠 HIGH';
    } else {
      statusIndicator = '🔴 CRITICAL';
    }

    return {
      status: statusIndicator,
      utilizationPercent: status.utilizationPercent,
      remainingBudgetEth: status.remainingBudgetEth,
      transactionCount: status.transactionCount,
      averageTxCostEth: status.averageTxCostEth
    };
  }

  /**
   * Create budget alert if approaching limits
   *
   * @param {number} [warningThreshold=80] - Warning threshold percentage
   * @param {number} [criticalThreshold=95] - Critical threshold percentage
   * @returns {Object|null} Alert information or null if no alert
   */
  checkBudgetAlerts(warningThreshold = 80, criticalThreshold = 95) {
    const status = this.getStatus();
    const utilization = status.utilizationPercent;

    if (utilization >= criticalThreshold) {
      return {
        level: 'CRITICAL',
        message: `Budget utilization at ${utilization}% - approaching limit`,
        utilization,
        remainingEth: status.remainingBudgetEth,
        recommendation: 'Consider stopping simulation or increasing budget'
      };
    } else if (utilization >= warningThreshold) {
      return {
        level: 'WARNING',
        message: `Budget utilization at ${utilization}% - monitor closely`,
        utilization,
        remainingEth: status.remainingBudgetEth,
        recommendation: 'Monitor spending and consider budget adjustments'
      };
    }

    return null;
  }
}

export default BudgetEnforcer;
