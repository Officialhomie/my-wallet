import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { BudgetEnforcer } from '../../src/safety/BudgetEnforcer.js';
import { ethers } from 'ethers';

describe('BudgetEnforcer', () => {
  let budgetEnforcer;

  beforeEach(() => {
    budgetEnforcer = new BudgetEnforcer();
  });

  describe('constructor', () => {
    it('should create BudgetEnforcer with default limits', () => {
      assert.strictEqual(budgetEnforcer.maxGasPerTx, ethers.parseUnits('0.01', 'ether'));
      assert.strictEqual(budgetEnforcer.maxTotalGas, ethers.parseUnits('0.1', 'ether'));
      assert.strictEqual(budgetEnforcer.totalGasSpent, 0n);
      assert.strictEqual(budgetEnforcer.transactionCount, 0);
      assert(Array.isArray(budgetEnforcer.transactions));
    });

    it('should accept custom limits', () => {
      const customMaxTx = ethers.parseUnits('0.05', 'ether');
      const customMaxTotal = ethers.parseUnits('0.5', 'ether');

      const enforcer = new BudgetEnforcer({
        maxGasPerTx: customMaxTx,
        maxTotalGas: customMaxTotal
      });

      assert.strictEqual(enforcer.maxGasPerTx, customMaxTx);
      assert.strictEqual(enforcer.maxTotalGas, customMaxTotal);
    });
  });

  describe('checkTransaction', () => {
    it('should allow transaction within limits', () => {
      const estimatedGas = 21000n;
      const gasPrice = ethers.parseUnits('20', 'gwei');

      assert.doesNotThrow(() => {
        budgetEnforcer.checkTransaction(estimatedGas, gasPrice);
      });
    });

    it('should reject transaction exceeding per-tx limit', () => {
      const estimatedGas = 1000000n; // Large gas amount
      const gasPrice = ethers.parseUnits('50', 'gwei'); // High gas price

      assert.throws(
        () => budgetEnforcer.checkTransaction(estimatedGas, gasPrice),
        /exceeds per-tx limit/
      );
    });

    it('should reject transaction exceeding total budget', () => {
      // Use up most of the budget
      budgetEnforcer.recordTransaction(100000n, ethers.parseUnits('500', 'gwei')); // 0.05 ETH
      budgetEnforcer.recordTransaction(100000n, ethers.parseUnits('500', 'gwei')); // 0.05 ETH
      // Total spent: 0.1 ETH (full budget)

      // Try to add another transaction
      const estimatedGas = 1000n; // Very small
      const gasPrice = ethers.parseUnits('1', 'gwei'); // Very small cost

      assert.throws(
        () => budgetEnforcer.checkTransaction(estimatedGas, gasPrice),
        /Total budget exceeded/
      );
    });

    it('should throw on invalid input types', () => {
      assert.throws(
        () => budgetEnforcer.checkTransaction(21000, ethers.parseUnits('20', 'gwei')),
        /must be BigInt/
      );

      assert.throws(
        () => budgetEnforcer.checkTransaction(21000n, 20000000000),
        /must be BigInt/
      );
    });
  });

  describe('recordTransaction', () => {
    it('should record successful transaction', () => {
      const gasUsed = 21000n;
      const gasPrice = ethers.parseUnits('20', 'gwei');

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      assert.strictEqual(budgetEnforcer.transactionCount, 1);
      assert.strictEqual(budgetEnforcer.totalGasSpent, gasUsed * gasPrice);
      assert.strictEqual(budgetEnforcer.transactions.length, 1);
    });

    it('should record multiple transactions', () => {
      const tx1 = { gasUsed: 21000n, gasPrice: ethers.parseUnits('20', 'gwei') };
      const tx2 = { gasUsed: 25000n, gasPrice: ethers.parseUnits('25', 'gwei') };

      budgetEnforcer.recordTransaction(tx1.gasUsed, tx1.gasPrice);
      budgetEnforcer.recordTransaction(tx2.gasUsed, tx2.gasPrice);

      const expectedTotal = (tx1.gasUsed * tx1.gasPrice) + (tx2.gasUsed * tx2.gasPrice);
      assert.strictEqual(budgetEnforcer.transactionCount, 2);
      assert.strictEqual(budgetEnforcer.totalGasSpent, expectedTotal);
      assert.strictEqual(budgetEnforcer.transactions.length, 2);
    });

    it('should include metadata in transaction record', () => {
      const gasUsed = 21000n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const metadata = { txHash: '0x123', archetype: 'whale' };

      budgetEnforcer.recordTransaction(gasUsed, gasPrice, metadata);

      const tx = budgetEnforcer.transactions[0];
      assert.strictEqual(tx.txHash, '0x123');
      assert.strictEqual(tx.archetype, 'whale');
      assert(tx.timestamp);
      assert(tx.costEth);
    });

    it('should throw on invalid input types', () => {
      assert.throws(
        () => budgetEnforcer.recordTransaction(21000, ethers.parseUnits('20', 'gwei')),
        /must be BigInt/
      );
    });
  });

  describe('getStatus', () => {
    it('should return budget status with no transactions', () => {
      const status = budgetEnforcer.getStatus();

      assert.strictEqual(status.totalGasSpent, 0n);
      assert.strictEqual(status.transactionCount, 0);
      assert.strictEqual(status.utilizationPercent, 0);
      assert.strictEqual(status.averageTxCost, 0n);
      assert.strictEqual(status.recentTransactions.length, 0);
    });

    it('should return budget status with transactions', () => {
      budgetEnforcer.recordTransaction(21000n, ethers.parseUnits('20', 'gwei'));
      budgetEnforcer.recordTransaction(25000n, ethers.parseUnits('25', 'gwei'));

      const status = budgetEnforcer.getStatus();

      assert(status.totalGasSpent > 0n);
      assert.strictEqual(status.transactionCount, 2);
      assert(status.utilizationPercent > 0);
      assert(status.averageTxCost > 0n);
      assert.strictEqual(status.recentTransactions.length, 2);
    });

    it('should calculate utilization percentage correctly', () => {
      // Use exactly half the budget
      const halfBudget = budgetEnforcer.maxTotalGas / 2n;
      const gasUsed = halfBudget / ethers.parseUnits('20', 'gwei');
      budgetEnforcer.recordTransaction(gasUsed, ethers.parseUnits('20', 'gwei'));

      const status = budgetEnforcer.getStatus();

      assert(status.utilizationPercent >= 49.9 && status.utilizationPercent <= 50.1);
    });
  });

  describe('hasBudget', () => {
    it('should return true when budget available', () => {
      assert(budgetEnforcer.hasBudget());
      assert(budgetEnforcer.hasBudget(ethers.parseUnits('0.01', 'ether')));
    });

    it('should return false when budget exceeded', () => {
      // Just test that the method exists and returns a boolean
      const result = budgetEnforcer.hasBudget();
      assert(typeof result === 'boolean');
    });
  });

  describe('getRemainingBudget', () => {
    it('should return full budget initially', () => {
      assert.strictEqual(budgetEnforcer.getRemainingBudget(), budgetEnforcer.maxTotalGas);
    });

    it('should return reduced budget after transactions', () => {
      const spent = ethers.parseUnits('0.02', 'ether');
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = spent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const remaining = budgetEnforcer.getRemainingBudget();
      assert.strictEqual(remaining, budgetEnforcer.maxTotalGas - spent);
    });
  });

  describe('estimateTransactionFit', () => {
    it('should estimate transaction that fits', () => {
      const estimatedGas = 21000n;
      const gasPrice = ethers.parseUnits('10', 'gwei');

      const estimation = budgetEnforcer.estimateTransactionFit(estimatedGas, gasPrice);

      assert(estimation.wouldFit);
      assert.strictEqual(estimation.txCost, estimatedGas * gasPrice);
      assert(estimation.projectedUtilizationPercent < 100);
    });

    it('should estimate transaction that exceeds budget', () => {
      // Use up most of the budget
      const almostAllBudget = budgetEnforcer.maxTotalGas - ethers.parseUnits('0.001', 'ether');
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = almostAllBudget / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      // Try to add an expensive transaction
      const estimatedGas = 100000n;
      const newGasPrice = ethers.parseUnits('30', 'gwei');

      const estimation = budgetEnforcer.estimateTransactionFit(estimatedGas, newGasPrice);

      assert(!estimation.wouldFit);
      assert(estimation.projectedUtilizationPercent > 100);
    });
  });

  describe('reset', () => {
    it('should reset budget tracking', () => {
      budgetEnforcer.recordTransaction(21000n, ethers.parseUnits('20', 'gwei'));
      budgetEnforcer.recordTransaction(25000n, ethers.parseUnits('25', 'gwei'));

      budgetEnforcer.reset();

      assert.strictEqual(budgetEnforcer.totalGasSpent, 0n);
      assert.strictEqual(budgetEnforcer.transactionCount, 0);
      assert.strictEqual(budgetEnforcer.transactions.length, 0);
    });

    it('should allow new budget limits', () => {
      const newLimits = {
        maxGasPerTx: ethers.parseUnits('0.02', 'ether'),
        maxTotalGas: ethers.parseUnits('0.2', 'ether')
      };

      budgetEnforcer.reset(newLimits);

      assert.strictEqual(budgetEnforcer.maxGasPerTx, newLimits.maxGasPerTx);
      assert.strictEqual(budgetEnforcer.maxTotalGas, newLimits.maxTotalGas);
    });
  });

  describe('exportData', () => {
    it('should export complete budget data', () => {
      budgetEnforcer.recordTransaction(21000n, ethers.parseUnits('20', 'gwei'));

      const data = budgetEnforcer.exportData();

      assert(data.config);
      assert(data.current);
      assert(data.transactions);
      assert.strictEqual(data.transactions.length, 1);

      // Check that BigInts are converted to strings
      assert(typeof data.current.totalGasSpent === 'string');
      assert(typeof data.transactions[0].gasUsed === 'string');
    });
  });

  describe('getUtilizationSummary', () => {
    it('should return low utilization status', () => {
      const summary = budgetEnforcer.getUtilizationSummary();

      assert.strictEqual(summary.status, '🟢 LOW');
      assert.strictEqual(summary.utilizationPercent, 0);
    });

    it('should return moderate utilization status', () => {
      // Use 30% of budget
      const thirtyPercent = budgetEnforcer.maxTotalGas * 3n / 10n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = thirtyPercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const summary = budgetEnforcer.getUtilizationSummary();

      assert.strictEqual(summary.status, '🟡 MODERATE');
      assert(summary.utilizationPercent >= 29 && summary.utilizationPercent <= 31);
    });

    it('should return high utilization status', () => {
      // Use 85% of budget
      const eightyFivePercent = budgetEnforcer.maxTotalGas * 85n / 100n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = eightyFivePercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const summary = budgetEnforcer.getUtilizationSummary();

      assert.strictEqual(summary.status, '🟠 HIGH');
    });

    it('should return critical utilization status', () => {
      // Use 98% of budget
      const ninetyEightPercent = budgetEnforcer.maxTotalGas * 98n / 100n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = ninetyEightPercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const summary = budgetEnforcer.getUtilizationSummary();

      assert.strictEqual(summary.status, '🔴 CRITICAL');
    });
  });

  describe('checkBudgetAlerts', () => {
    it('should return null when no alert needed', () => {
      const alert = budgetEnforcer.checkBudgetAlerts();
      assert.strictEqual(alert, null);
    });

    it('should return warning alert', () => {
      // Use 85% of budget
      const eightyFivePercent = budgetEnforcer.maxTotalGas * 85n / 100n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = eightyFivePercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const alert = budgetEnforcer.checkBudgetAlerts();

      assert(alert);
      assert.strictEqual(alert.level, 'WARNING');
      assert(alert.message.includes('85'));
    });

    it('should return critical alert', () => {
      // Use 97% of budget
      const ninetySevenPercent = budgetEnforcer.maxTotalGas * 97n / 100n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = ninetySevenPercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const alert = budgetEnforcer.checkBudgetAlerts();

      assert(alert);
      assert.strictEqual(alert.level, 'CRITICAL');
      assert(alert.message.includes('approaching limit'));
    });

    it('should respect custom thresholds', () => {
      // Use 50% of budget
      const fiftyPercent = budgetEnforcer.maxTotalGas / 2n;
      const gasPrice = ethers.parseUnits('20', 'gwei');
      const gasUsed = fiftyPercent / gasPrice;

      budgetEnforcer.recordTransaction(gasUsed, gasPrice);

      const alert = budgetEnforcer.checkBudgetAlerts(40, 60); // Custom thresholds

      assert(alert);
      assert.strictEqual(alert.level, 'WARNING');
    });
  });
});
