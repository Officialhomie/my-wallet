import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * FundDistributor - Manages token distribution across wallet farms
 *
 * Handles distribution of both native tokens (ETH, MATIC, etc.) and ERC-20 tokens
 * across multiple wallets with various distribution strategies.
 */
export class FundDistributor {
  /**
   * Creates a new FundDistributor instance
   *
   * @param {WalletFarm} walletFarm - The wallet farm to distribute funds to
   * @param {Object} [options={}] - Configuration options
   */
  constructor(walletFarm, options = {}) {
    if (!walletFarm || typeof walletFarm.getWallet !== 'function') {
      throw new Error('Valid WalletFarm instance is required');
    }

    this.walletFarm = walletFarm;
    this.options = {
      verbose: options.verbose || false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      batchSize: options.batchSize || 10,
      humanDelay: options.humanDelay ?? true,
      ...options
    };

    // Distribution tracking
    this.distributionHistory = [];
    this.fundingWallet = null;

    if (this.options.verbose) {
      console.log(chalk.blue('💰 FundDistributor initialized'));
    }
  }

  /**
   * Sets the funding wallet that will provide tokens
   *
   * @param {ethers.Wallet} wallet - Connected wallet with sufficient funds
   */
  setFundingWallet(wallet) {
    if (!wallet || !wallet.address || !wallet.provider) {
      throw new Error('Valid connected ethers.Wallet instance is required');
    }

    this.fundingWallet = wallet;

    if (this.options.verbose) {
      console.log(chalk.green(`✅ Funding wallet set: ${wallet.address}`));
    }
  }

  /**
   * Distributes native tokens (ETH, MATIC, etc.) to all wallets
   *
   * @param {string|number} amountPerWallet - Amount to distribute to each wallet
   * @param {string} chainName - Target chain name
   * @param {string} [strategy='equal'] - Distribution strategy
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Distribution results
   */
  async distributeNativeTokens(amountPerWallet, chainName, strategy = 'equal', options = {}) {
    const opts = { ...this.options, ...options };

    if (!this.fundingWallet) {
      throw new Error('Funding wallet not set. Call setFundingWallet() first.');
    }

    if (!chainName) {
      throw new Error('Chain name is required');
    }

    const wallets = this.walletFarm.wallets;
    const results = [];
    const startTime = Date.now();

    if (opts.verbose) {
      console.log(chalk.blue(`🚀 Starting native token distribution of ${amountPerWallet} per wallet on ${chainName}`));
      console.log(chalk.gray(`   Strategy: ${strategy}, Wallets: ${wallets.size}`));
    }

    // Validate funding wallet balance
    await this.#validateFundingBalance(amountPerWallet, wallets.size, strategy, chainName, false);

    // Process wallets in batches to avoid overwhelming the network
    const walletIndices = Array.from(wallets.keys());
    const batches = this.#createBatches(walletIndices, opts.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (opts.verbose && batches.length > 1) {
        console.log(chalk.gray(`   Processing batch ${i + 1}/${batches.length} (${batch.length} wallets)`));
      }

      const batchPromises = batch.map(walletIndex =>
        this.#distributeToWallet(walletIndex, amountPerWallet, chainName, strategy, opts)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        const walletIndex = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            walletIndex,
            address: wallets.get(walletIndex).address,
            success: false,
            error: result.reason.message,
            timestamp: Date.now()
          });
        }
      });

      // Delay between batches (except for the last one)
      if (i < batches.length - 1 && opts.humanDelay) {
        await this.#humanDelay(2000, 5000);
      }
    }

    // Record distribution in history
    const distributionRecord = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: startTime,
      type: 'native',
      chainName,
      strategy,
      baseAmount: amountPerWallet,
      totalWallets: wallets.size,
      successfulDistributions: results.filter(r => r.success).length,
      failedDistributions: results.filter(r => !r.success).length,
      totalDistributed: results.filter(r => r.success).reduce((sum, r) => sum + parseFloat(r.amount), 0),
      duration: Date.now() - startTime,
      results
    };

    this.distributionHistory.push(distributionRecord);

    if (opts.verbose) {
      const successCount = distributionRecord.successfulDistributions;
      const totalCount = distributionRecord.totalWallets;
      console.log(chalk.green(`✅ Distribution complete: ${successCount}/${totalCount} successful`));
    }

    return {
      summary: {
        totalWallets: distributionRecord.totalWallets,
        successful: distributionRecord.successfulDistributions,
        failed: distributionRecord.failedDistributions,
        totalDistributed: distributionRecord.totalDistributed,
        duration: distributionRecord.duration,
        strategy,
        chainName
      },
      results,
      distributionId: distributionRecord.id
    };
  }

  /**
   * Distributes ERC-20 tokens to all wallets
   *
   * @param {string} tokenAddress - ERC-20 token contract address
   * @param {Array} tokenABI - ERC-20 contract ABI
   * @param {string|number} amountPerWallet - Amount to distribute to each wallet
   * @param {string} chainName - Target chain name
   * @param {string} [strategy='equal'] - Distribution strategy
   * @param {Object} [options={}] - Additional options
   * @returns {Promise<Object>} Distribution results
   */
  async distributeERC20Tokens(tokenAddress, tokenABI, amountPerWallet, chainName, strategy = 'equal', options = {}) {
    const opts = { ...this.options, ...options };

    if (!this.fundingWallet) {
      throw new Error('Funding wallet not set. Call setFundingWallet() first.');
    }

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      throw new Error('Valid token contract address is required');
    }

    if (!Array.isArray(tokenABI) || tokenABI.length === 0) {
      throw new Error('Valid token ABI array is required');
    }

    const wallets = this.walletFarm.wallets;
    const token = new ethers.Contract(tokenAddress, tokenABI, this.fundingWallet);
    const results = [];
    const startTime = Date.now();

    if (opts.verbose) {
      console.log(chalk.blue(`🚀 Starting ERC-20 token distribution of ${amountPerWallet} per wallet on ${chainName}`));
      console.log(chalk.gray(`   Token: ${tokenAddress}, Strategy: ${strategy}, Wallets: ${wallets.size}`));
    }

    // Validate token balance and get decimals
    const decimals = await this.#getTokenDecimals(token);
    await this.#validateFundingBalance(amountPerWallet, wallets.size, strategy, chainName, true, token);

    // Process wallets in batches
    const walletIndices = Array.from(wallets.keys());
    const batches = this.#createBatches(walletIndices, opts.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      if (opts.verbose && batches.length > 1) {
        console.log(chalk.gray(`   Processing batch ${i + 1}/${batches.length} (${batch.length} wallets)`));
      }

      const batchPromises = batch.map(walletIndex =>
        this.#distributeERC20ToWallet(walletIndex, token, amountPerWallet, decimals, chainName, strategy, opts)
      );

      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        const walletIndex = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            walletIndex,
            address: wallets.get(walletIndex).address,
            success: false,
            error: result.reason.message,
            timestamp: Date.now()
          });
        }
      });

      // Delay between batches
      if (i < batches.length - 1 && opts.humanDelay) {
        await this.#humanDelay(2000, 5000);
      }
    }

    // Record distribution in history
    const distributionRecord = {
      id: `dist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: startTime,
      type: 'erc20',
      tokenAddress,
      chainName,
      strategy,
      baseAmount: amountPerWallet,
      totalWallets: wallets.size,
      successfulDistributions: results.filter(r => r.success).length,
      failedDistributions: results.filter(r => !r.success).length,
      totalDistributed: results.filter(r => r.success).reduce((sum, r) => sum + parseFloat(r.amount), 0),
      duration: Date.now() - startTime,
      results
    };

    this.distributionHistory.push(distributionRecord);

    if (opts.verbose) {
      const successCount = distributionRecord.successfulDistributions;
      const totalCount = distributionRecord.totalWallets;
      console.log(chalk.green(`✅ ERC-20 distribution complete: ${successCount}/${totalCount} successful`));
    }

    return {
      summary: {
        totalWallets: distributionRecord.totalWallets,
        successful: distributionRecord.successfulDistributions,
        failed: distributionRecord.failedDistributions,
        totalDistributed: distributionRecord.totalDistributed,
        duration: distributionRecord.duration,
        strategy,
        chainName,
        tokenAddress
      },
      results,
      distributionId: distributionRecord.id
    };
  }

  /**
   * Verifies that all wallets have sufficient balance
   *
   * @param {string} chainName - Chain name to check
   * @param {string|number} minimumRequired - Minimum balance required
   * @param {string} [tokenAddress] - ERC-20 token address (null for native)
   * @param {Array} [tokenABI] - ERC-20 token ABI
   * @returns {Promise<Object>} Balance verification results
   */
  async verifyBalances(chainName, minimumRequired, tokenAddress = null, tokenABI = null) {
    const wallets = this.walletFarm.wallets;
    const insufficientWallets = [];
    const minRequired = parseFloat(minimumRequired);

    if (tokenAddress && tokenABI) {
      // Check ERC-20 token balances
      const token = new ethers.Contract(tokenAddress, tokenABI, this.fundingWallet.provider);
      const decimals = await token.decimals();

      for (const [index, walletData] of wallets) {
        try {
          const balance = await token.balanceOf(walletData.address);
          const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));

          if (balanceFormatted < minRequired) {
            insufficientWallets.push({
              index,
              address: walletData.address,
              currentBalance: balanceFormatted,
              required: minRequired,
              deficit: minRequired - balanceFormatted,
              tokenType: 'ERC20',
              tokenAddress
            });
          }
        } catch (error) {
          insufficientWallets.push({
            index,
            address: walletData.address,
            currentBalance: 0,
            required: minRequired,
            deficit: minRequired,
            tokenType: 'ERC20',
            tokenAddress,
            error: error.message
          });
        }
      }
    } else {
      // Check native token balances
      for (const [index, walletData] of wallets) {
        try {
          const balance = await this.walletFarm.getWalletBalance(index, chainName);
          const balanceFormatted = parseFloat(ethers.formatEther(balance));

          if (balanceFormatted < minRequired) {
            insufficientWallets.push({
              index,
              address: walletData.address,
              currentBalance: balanceFormatted,
              required: minRequired,
              deficit: minRequired - balanceFormatted,
              tokenType: 'native'
            });
          }
        } catch (error) {
          insufficientWallets.push({
            index,
            address: walletData.address,
            currentBalance: 0,
            required: minRequired,
            deficit: minRequired,
            tokenType: 'native',
            error: error.message
          });
        }
      }
    }

    return {
      allSufficient: insufficientWallets.length === 0,
      insufficientWallets,
      checkedWallets: wallets.size,
      minimumRequired: minRequired,
      tokenType: tokenAddress ? 'ERC20' : 'native'
    };
  }

  /**
   * Refills wallets that are below minimum balance
   *
   * @param {string} chainName - Chain name
   * @param {string|number} minimumRequired - Minimum balance required
   * @param {string|number} refillAmount - Amount to refill each wallet
   * @param {string} [tokenAddress] - ERC-20 token address (null for native)
   * @param {Array} [tokenABI] - ERC-20 token ABI
   * @returns {Promise<Object>} Refill results
   */
  async refillWallets(chainName, minimumRequired, refillAmount, tokenAddress = null, tokenABI = null) {
    const balanceCheck = await this.verifyBalances(chainName, minimumRequired, tokenAddress, tokenABI);

    if (balanceCheck.allSufficient) {
      return {
        refilled: 0,
        skipped: balanceCheck.checkedWallets,
        message: 'All wallets have sufficient balance'
      };
    }

    if (this.options.verbose) {
      console.log(chalk.yellow(`💰 Refilling ${balanceCheck.insufficientWallets.length} wallets with ${refillAmount} tokens`));
    }

    const results = [];
    const refillAmountNum = parseFloat(refillAmount);

    for (const walletInfo of balanceCheck.insufficientWallets) {
      try {
        let tx;

        if (tokenAddress && tokenABI) {
          // ERC-20 token transfer
          const token = new ethers.Contract(tokenAddress, tokenABI, this.fundingWallet);
          const decimals = await token.decimals();
          const amountUnits = ethers.parseUnits(refillAmountNum.toString(), decimals);
          tx = await token.transfer(walletInfo.address, amountUnits);
        } else {
          // Native token transfer
          tx = await this.fundingWallet.sendTransaction({
            to: walletInfo.address,
            value: ethers.parseEther(refillAmountNum.toString())
          });
        }

        await tx.wait();

        results.push({
          address: walletInfo.address,
          index: walletInfo.index,
          amount: refillAmountNum,
          txHash: tx.hash,
          success: true,
          timestamp: Date.now()
        });

        if (this.options.verbose) {
          console.log(chalk.green(`   ✅ Refilled wallet ${walletInfo.index}: ${tx.hash}`));
        }

      } catch (error) {
        results.push({
          address: walletInfo.address,
          index: walletInfo.index,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });

        if (this.options.verbose) {
          console.log(chalk.red(`   ❌ Failed to refill wallet ${walletInfo.index}: ${error.message}`));
        }
      }

      // Small delay between refills
      if (this.options.humanDelay) {
        await this.#humanDelay(500, 1500);
      }
    }

    return {
      refilled: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalRefilledAmount: results.filter(r => r.success).length * refillAmountNum
    };
  }

  /**
   * Calculates amount based on distribution strategy
   *
   * @private
   * @param {string|number} baseAmount - Base amount
   * @param {string} strategy - Distribution strategy
   * @param {number} index - Wallet index
   * @param {number} totalWallets - Total number of wallets
   * @returns {number} Calculated amount
   */
  #calculateAmount(baseAmount, strategy, index, totalWallets) {
    const base = parseFloat(baseAmount);

    switch (strategy) {
      case 'equal':
        return base;

      case 'weighted':
        // Give more to lower indices (wallets that might transact more)
        const weight = 1 + (totalWallets - index) * 0.1;
        return base * weight;

      case 'random':
        // Random amount between 50% and 150% of base
        return base * (0.5 + Math.random());

      case 'exponential':
        // Exponential decay - first wallet gets most
        const decay = Math.pow(0.9, index);
        return base * decay;

      case 'linear':
        // Linear decrease from first to last wallet
        const factor = 1 - (index / totalWallets) * 0.5;
        return Math.max(base * 0.1, base * factor); // Minimum 10% of base

      default:
        return base;
    }
  }

  /**
   * Validates funding wallet has sufficient balance
   *
   * @private
   * @param {string|number} amountPerWallet - Amount per wallet
   * @param {number} walletCount - Number of wallets
   * @param {string} strategy - Distribution strategy
   * @param {string} chainName - Chain name
   * @param {boolean} isERC20 - Whether distributing ERC-20 tokens
   * @param {ethers.Contract} [token] - Token contract (for ERC-20)
   */
  async #validateFundingBalance(amountPerWallet, walletCount, strategy, chainName, isERC20, token = null) {
    // Estimate total required (approximate for weighted/random strategies)
    const estimatedTotal = this.#calculateTotalRequired(amountPerWallet, walletCount, strategy);

    if (isERC20) {
      const decimals = await this.#getTokenDecimals(token);
      const requiredUnits = ethers.parseUnits(estimatedTotal.toString(), decimals);
      const balance = await token.balanceOf(this.fundingWallet.address);

      if (balance < requiredUnits) {
        const balanceFormatted = ethers.formatUnits(balance, decimals);
        throw new Error(
          `Insufficient token balance in funding wallet. Required: ~${estimatedTotal}, Available: ${balanceFormatted}`
        );
      }
    } else {
      const requiredWei = ethers.parseEther(estimatedTotal.toString());
      const balance = await this.fundingWallet.provider.getBalance(this.fundingWallet.address);

      if (balance < requiredWei) {
        const balanceFormatted = ethers.formatEther(balance);
        throw new Error(
          `Insufficient ETH balance in funding wallet. Required: ~${estimatedTotal}, Available: ${balanceFormatted}`
        );
      }
    }
  }

  /**
   * Estimates total tokens required for distribution
   *
   * @private
   * @param {string|number} baseAmount - Base amount per wallet
   * @param {number} walletCount - Number of wallets
   * @param {string} strategy - Distribution strategy
   * @returns {number} Estimated total required
   */
  #calculateTotalRequired(baseAmount, walletCount, strategy) {
    if (strategy === 'equal') {
      return parseFloat(baseAmount) * walletCount;
    }

    // For other strategies, estimate based on average
    let total = 0;
    for (let i = 0; i < walletCount; i++) {
      total += this.#calculateAmount(baseAmount, strategy, i, walletCount);
    }
    return total;
  }

  /**
   * Distributes tokens to a single wallet (native)
   *
   * @private
   * @param {number} walletIndex - Wallet index
   * @param {string|number} amount - Amount to distribute
   * @param {string} chainName - Chain name
   * @param {string} strategy - Distribution strategy
   * @param {Object} options - Options
   * @returns {Promise<Object>} Distribution result
   */
  async #distributeToWallet(walletIndex, amount, chainName, strategy, options) {
    const walletData = this.walletFarm.wallets.get(walletIndex);
    const calculatedAmount = this.#calculateAmount(amount, strategy, walletIndex, this.walletFarm.wallets.size);

    try {
      const tx = await this.fundingWallet.sendTransaction({
        to: walletData.address,
        value: ethers.parseEther(calculatedAmount.toString())
      });

      if (options.verbose) {
        console.log(chalk.green(`   ✅ Wallet ${walletIndex}: ${tx.hash} (${calculatedAmount} ETH)`));
      }

      await tx.wait();

      // Record transaction in wallet farm
      this.walletFarm.recordTransaction({
        walletIndex,
        chainName,
        functionName: 'receiveNative',
        txHash: tx.hash,
        gasUsed: 21000, // Approximate
        success: true,
        context: {
          type: 'fund_distribution',
          distributionType: 'native',
          amount: calculatedAmount,
          strategy
        }
      });

      return {
        walletIndex,
        address: walletData.address,
        amount: calculatedAmount,
        txHash: tx.hash,
        success: true,
        timestamp: Date.now()
      };

    } catch (error) {
      if (options.verbose) {
        console.log(chalk.red(`   ❌ Wallet ${walletIndex}: ${error.message}`));
      }

      // Record failed transaction
      this.walletFarm.recordTransaction({
        walletIndex,
        chainName,
        functionName: 'receiveNative',
        success: false,
        error: error.message,
        context: {
          type: 'fund_distribution',
          distributionType: 'native',
          amount: calculatedAmount,
          strategy
        }
      });

      throw error;
    }
  }

  /**
   * Distributes ERC-20 tokens to a single wallet
   *
   * @private
   * @param {number} walletIndex - Wallet index
   * @param {ethers.Contract} token - Token contract
   * @param {string|number} amount - Amount to distribute
   * @param {number} decimals - Token decimals
   * @param {string} chainName - Chain name
   * @param {string} strategy - Distribution strategy
   * @param {Object} options - Options
   * @returns {Promise<Object>} Distribution result
   */
  async #distributeERC20ToWallet(walletIndex, token, amount, decimals, chainName, strategy, options) {
    const walletData = this.walletFarm.wallets.get(walletIndex);
    const calculatedAmount = this.#calculateAmount(amount, strategy, walletIndex, this.walletFarm.wallets.size);
    const amountUnits = ethers.parseUnits(calculatedAmount.toString(), decimals);

    try {
      const tx = await token.transfer(walletData.address, amountUnits);

      if (options.verbose) {
        console.log(chalk.green(`   ✅ Wallet ${walletIndex}: ${tx.hash} (${calculatedAmount} tokens)`));
      }

      await tx.wait();

      // Record transaction in wallet farm
      this.walletFarm.recordTransaction({
        walletIndex,
        chainName,
        contractAddress: token.target,
        functionName: 'transfer',
        txHash: tx.hash,
        gasUsed: 65000, // Approximate for ERC-20 transfer
        success: true,
        context: {
          type: 'fund_distribution',
          distributionType: 'erc20',
          tokenAddress: token.target,
          amount: calculatedAmount,
          strategy
        }
      });

      return {
        walletIndex,
        address: walletData.address,
        amount: calculatedAmount,
        txHash: tx.hash,
        tokenAddress: token.target,
        success: true,
        timestamp: Date.now()
      };

    } catch (error) {
      if (options.verbose) {
        console.log(chalk.red(`   ❌ Wallet ${walletIndex}: ${error.message}`));
      }

      // Record failed transaction
      this.walletFarm.recordTransaction({
        walletIndex,
        chainName,
        contractAddress: token.target,
        functionName: 'transfer',
        success: false,
        error: error.message,
        context: {
          type: 'fund_distribution',
          distributionType: 'erc20',
          tokenAddress: token.target,
          amount: calculatedAmount,
          strategy
        }
      });

      throw error;
    }
  }

  /**
   * Gets token decimals
   *
   * @private
   * @param {ethers.Contract} token - Token contract
   * @returns {Promise<number>} Token decimals
   */
  async #getTokenDecimals(token) {
    try {
      return await token.decimals();
    } catch (error) {
      // Default to 18 if decimals() fails
      console.warn('Could not get token decimals, defaulting to 18:', error.message);
      return 18;
    }
  }

  /**
   * Creates batches of wallet indices
   *
   * @private
   * @param {Array<number>} indices - Wallet indices
   * @param {number} batchSize - Size of each batch
   * @returns {Array<Array<number>>} Batches of indices
   */
  #createBatches(indices, batchSize) {
    const batches = [];
    for (let i = 0; i < indices.length; i += batchSize) {
      batches.push(indices.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Human-like delay
   *
   * @private
   * @param {number} minMs - Minimum delay in milliseconds
   * @param {number} maxMs - Maximum delay in milliseconds
   */
  async #humanDelay(minMs, maxMs) {
    const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Gets distribution history
   *
   * @param {Object} [filters={}] - Optional filters
   * @returns {Array} Filtered distribution history
   */
  getDistributionHistory(filters = {}) {
    let history = [...this.distributionHistory];

    if (filters.chainName) {
      history = history.filter(h => h.chainName === filters.chainName);
    }

    if (filters.type) {
      history = history.filter(h => h.type === filters.type);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      history = history.filter(h => new Date(h.timestamp) >= sinceDate);
    }

    return history;
  }

  /**
   * Generates distribution report
   *
   * @param {string} [chainName] - Optional chain filter
   * @returns {Object} Distribution report
   */
  generateDistributionReport(chainName = null) {
    const history = chainName ?
      this.getDistributionHistory({ chainName }) :
      this.getDistributionHistory();

    const report = {
      totalDistributions: history.length,
      totalWalletsFunded: history.reduce((sum, h) => sum + h.totalWallets, 0),
      totalTokensDistributed: history.reduce((sum, h) => sum + h.totalDistributed, 0),
      byChain: {},
      byType: {},
      byStrategy: {},
      recentFailures: [],
      timestamp: Date.now()
    };

    // Group by various criteria
    history.forEach(dist => {
      // By chain
      if (!report.byChain[dist.chainName]) {
        report.byChain[dist.chainName] = {
          distributions: 0,
          totalDistributed: 0,
          successfulWallets: 0,
          failedWallets: 0
        };
      }
      const chain = report.byChain[dist.chainName];
      chain.distributions++;
      chain.totalDistributed += dist.totalDistributed;
      chain.successfulWallets += dist.successfulDistributions;
      chain.failedWallets += dist.failedDistributions;

      // By type
      if (!report.byType[dist.type]) {
        report.byType[dist.type] = 0;
      }
      report.byType[dist.type]++;

      // By strategy
      if (!report.byStrategy[dist.strategy]) {
        report.byStrategy[dist.strategy] = 0;
      }
      report.byStrategy[dist.strategy]++;

      // Recent failures
      const recentFailures = dist.results.filter(r => !r.success &&
        (Date.now() - r.timestamp) < 86400000); // Last 24h
      report.recentFailures.push(...recentFailures);
    });

    return report;
  }

  /**
   * Destroys the distributor and cleans up resources
   */
  destroy() {
    this.distributionHistory = [];
    this.fundingWallet = null;

    if (this.options.verbose) {
      console.log(chalk.yellow('🧹 FundDistributor resources cleaned up'));
    }
  }
}

export default FundDistributor;
