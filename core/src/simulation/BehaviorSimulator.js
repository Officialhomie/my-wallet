import { ethers } from 'ethers';
import chalk from 'chalk';
import { TimingEngine } from './TimingEngine.js';
import { UserArchetypes } from './UserArchetypes.js';

/**
 * BehaviorSimulator - Orchestrates realistic user behavior simulation
 *
 * Combines timing engines and user archetypes to create realistic
 * interaction patterns with smart contracts.
 */
export class BehaviorSimulator {
  constructor(walletFarm, options = {}) {
    if (!walletFarm || typeof walletFarm.getWallet !== 'function') {
      throw new Error('Valid WalletFarm instance is required');
    }

    this.walletFarm = walletFarm;

    // Share RNG between components for deterministic behavior
    const sharedRng = options.rng || new SeededRandom();
    this.timingEngine = new TimingEngine(sharedRng);
    this.userArchetypes = new UserArchetypes({
      ...options.archetypes,
      rng: sharedRng
    });

    this.options = {
      verbose: options.verbose || false,
      enableAnalytics: options.enableAnalytics ?? true,
      maxConcurrentSimulations: options.maxConcurrentSimulations || 10,
      defaultIterations: options.defaultIterations || 10,
      ...options
    };

    // Active simulations tracking
    this.activeSimulations = new Map();
    this.simulationResults = new Map();

    if (this.options.verbose) {
      console.log(chalk.magenta('🎭 BehaviorSimulator initialized'));
    }
  }

  /**
   * Simulates behavior for a specific archetype
   *
   * @param {string} archetype - Archetype name
   * @param {ethers.Contract} contract - Contract to interact with
   * @param {ethers.Wallet} wallet - Wallet to use for interactions
   * @param {number} [iterations] - Number of interactions
   * @param {Object} [options={}] - Simulation options
   * @returns {Promise<Object>} Simulation results
   */
  async simulateArchetype(archetype, contract, wallet, iterations, options = {}) {
    const opts = {
      ...this.options,
      ...options,
      contractMethod: options.contractMethod,
      contractParams: options.contractParams || [],
      includeTransactionSize: options.includeTransactionSize || false,
      value: options.value || false
    };

    if (!archetype || !contract || !wallet) {
      throw new Error('Archetype, contract, and wallet are required');
    }

    const archetypeConfig = this.userArchetypes.getArchetype(archetype);
    const simulationId = `sim_${archetype}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Register active simulation
    this.activeSimulations.set(simulationId, {
      id: simulationId,
      archetype,
      walletIndex: wallet.index || 0,
      startTime: Date.now(),
      iterations,
      completedIterations: 0,
      status: 'running',
      config: archetypeConfig
    });

    const results = {
      simulationId,
      archetype,
      walletAddress: wallet.address,
      contractAddress: contract.target,
      totalIterations: iterations,
      completedIterations: 0,
      skippedIterations: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      totalDelay: 0,
      interactions: [],
      timingStats: null,
      startTime: Date.now(),
      endTime: null,
      errors: []
    };

    const delays = [];

    try {
      for (let i = 0; i < iterations; i++) {
        // Check if archetype should skip this interaction
        if (this.userArchetypes.shouldSkipInteraction(archetype)) {
          results.skippedIterations++;

          if (opts.verbose) {
            console.log(chalk.gray(`⏭️  ${archetype} iteration ${i + 1}/${iterations}: Skipped`));
          }

          // Still apply timing for realistic behavior
          const skipDelay = await this.timingEngine.humanDelay('slow', { verbose: false });
          delays.push(skipDelay);
          results.totalDelay += skipDelay;

          continue;
        }

        // Check for burst behavior
        if (this.userArchetypes.shouldBurst(archetype)) {
          const burstConfig = this.userArchetypes.getBurstConfig(archetype);
          const burstResult = await this.#executeBurst(
            archetype,
            contract,
            wallet,
            burstConfig,
            opts
          );

          // Record burst results
          results.interactions.push(...burstResult.interactions);
          results.successfulInteractions += burstResult.successful;
          results.failedInteractions += burstResult.failed;
          results.completedIterations += burstResult.completed;
          results.totalDelay += burstResult.totalDelay;
          delays.push(...burstResult.delays);

          if (opts.verbose) {
            console.log(chalk.cyan(`💥 ${archetype} burst: ${burstResult.successful}/${burstResult.completed} successful`));
          }

          // Skip normal interaction for this iteration
          continue;
        }

        // Execute normal interaction
        const interactionResult = await this.#executeInteraction(
          archetype,
          contract,
          wallet,
          i,
          iterations,
          opts
        );

        results.interactions.push(interactionResult);
        results.completedIterations++;
        results.totalDelay += interactionResult.delay;

        if (interactionResult.success) {
          results.successfulInteractions++;
        } else {
          results.failedInteractions++;
          results.errors.push(interactionResult.error);
        }

        delays.push(interactionResult.delay);
      }

      // Calculate timing statistics
      results.timingStats = this.timingEngine.calculateStats(delays);
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

      // Update active simulation
      this.activeSimulations.get(simulationId).status = 'completed';
      this.activeSimulations.get(simulationId).endTime = results.endTime;

      // Store results
      this.simulationResults.set(simulationId, results);

      if (opts.verbose) {
        console.log(chalk.green(`✅ ${archetype} simulation complete: ${results.successfulInteractions}/${results.completedIterations} successful`));
      }

    } catch (error) {
      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;
      results.errors.push(error.message);

      this.activeSimulations.get(simulationId).status = 'failed';
      this.activeSimulations.get(simulationId).error = error.message;

      console.error(chalk.red(`❌ ${archetype} simulation failed:`, error.message));
    }

    return results;
  }

  /**
   * Simulates mixed behavior across multiple archetypes
   *
   * @param {Object} contract - Contract to interact with
   * @param {Object} walletGroups - Groups of wallets by archetype
   * @param {number} durationMinutes - Simulation duration in minutes
   * @param {Object} [options={}] - Simulation options
   * @returns {Promise<Object>} Combined simulation results
   */
  async simulateMixedBehavior(contract, walletGroups, durationMinutes, options = {}) {
    const opts = { ...this.options, ...options };
    const endTime = Date.now() + (durationMinutes * 60 * 1000);
    const simulationId = `mixed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (opts.verbose) {
      console.log(chalk.magenta(`🎭 Starting mixed behavior simulation for ${durationMinutes} minutes`));
    }

    // Register active simulation
    this.activeSimulations.set(simulationId, {
      id: simulationId,
      type: 'mixed',
      startTime: Date.now(),
      endTime,
      walletGroups: Object.keys(walletGroups),
      status: 'running'
    });

    const results = {
      simulationId,
      type: 'mixed',
      duration: durationMinutes,
      startTime: Date.now(),
      endTime,
      archetypeResults: {},
      totalInteractions: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      timingStats: null
    };

    const allDelays = [];
    const promises = [];

    // Start simulation for each archetype group
    for (const [archetype, wallets] of Object.entries(walletGroups)) {
      const archetypePromises = wallets.map(wallet =>
        this.#simulateArchetypeContinuous(archetype, contract, wallet, endTime, opts)
      );

      promises.push(...archetypePromises);
    }

    // Wait for all simulations to complete
    const simulationResults = await Promise.allSettled(promises);

    // Process results
    let resultIndex = 0;
    for (const [archetype, wallets] of Object.entries(walletGroups)) {
      results.archetypeResults[archetype] = {
        archetype,
        wallets: wallets.length,
        totalResults: [],
        summary: {
          totalInteractions: 0,
          successful: 0,
          failed: 0,
          totalDelay: 0
        }
      };

      for (let i = 0; i < wallets.length; i++) {
        const result = simulationResults[resultIndex];
        if (result.status === 'fulfilled') {
          const simResult = result.value;
          results.archetypeResults[archetype].totalResults.push(simResult);

          results.archetypeResults[archetype].summary.totalInteractions += simResult.successfulInteractions;
          results.archetypeResults[archetype].summary.successful += simResult.successfulInteractions;
          results.archetypeResults[archetype].summary.failed += simResult.failedInteractions;
          results.archetypeResults[archetype].summary.totalDelay += simResult.totalDelay;

          results.totalInteractions += simResult.successfulInteractions + simResult.failedInteractions;
          results.totalSuccessful += simResult.successfulInteractions;
          results.totalFailed += simResult.failedInteractions;

          if (simResult.timingStats) {
            allDelays.push(...Array(simResult.interactions.length).fill(0).map((_, idx) =>
              simResult.interactions[idx]?.delay || 0
            ));
          }
        }
        resultIndex++;
      }
    }

    // Calculate overall timing statistics
    results.timingStats = this.timingEngine.calculateStats(allDelays);
    results.actualEndTime = Date.now();
    results.actualDuration = results.actualEndTime - results.startTime;

    // Update active simulation
    this.activeSimulations.get(simulationId).status = 'completed';
    this.activeSimulations.get(simulationId).actualEndTime = results.actualEndTime;

    // Store results
    this.simulationResults.set(simulationId, results);

    if (opts.verbose) {
      console.log(chalk.green(`✅ Mixed behavior simulation complete: ${results.totalSuccessful}/${results.totalInteractions} successful`));
    }

    return results;
  }

  /**
   * Executes a burst of interactions
   * @private
   * @param {string} archetype - Archetype name
   * @param {ethers.Contract} contract - Contract instance
   * @param {ethers.Wallet} wallet - Wallet instance
   * @param {Object} burstConfig - Burst configuration
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Burst results
   */
  async #executeBurst(archetype, contract, wallet, burstConfig, options) {
    const results = {
      interactions: [],
      delays: [],
      successful: 0,
      failed: 0,
      completed: 0,
      totalDelay: 0
    };

    for (let i = 0; i < burstConfig.burstSize; i++) {
      const interactionResult = await this.#executeInteraction(
        archetype,
        contract,
        wallet,
        i,
        burstConfig.burstSize,
        { ...options, burstMode: true }
      );

      results.interactions.push(interactionResult);
      results.delays.push(interactionResult.delay);
      results.totalDelay += interactionResult.delay;
      results.completed++;

      if (interactionResult.success) {
        results.successful++;
      } else {
        results.failed++;
      }

      // Small delay between burst actions
      if (i < burstConfig.burstSize - 1) {
        const burstDelay = await this.timingEngine.humanDelay('quick', { verbose: false });
        results.delays.push(burstDelay);
        results.totalDelay += burstDelay;
      }
    }

    return results;
  }

  /**
   * Executes a single interaction
   * @private
   * @param {string} archetype - Archetype name
   * @param {ethers.Contract} contract - Contract instance
   * @param {ethers.Wallet} wallet - Wallet instance
   * @param {number} iteration - Current iteration
   * @param {number} totalIterations - Total iterations
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Interaction result
   */
  async #executeInteraction(archetype, contract, wallet, iteration, totalIterations, options) {
    const startTime = Date.now();

    try {
      // Generate human-like delay based on archetype timing
      const timingConfig = this.userArchetypes.getTimingConfig(archetype);
      const delay = await this.timingEngine.humanDelay(timingConfig.interActionDelay, {
        verbose: options.verbose && !options.burstMode
      });

      if (options.verbose && !options.burstMode) {
        console.log(chalk.blue(`🎯 ${archetype} interaction ${iteration + 1}/${totalIterations} (delay: ${Math.round(delay)}ms)`));
      }

      // Generate transaction parameters
      let txParams = [...(options.contractParams || [])];

      if (options.contractMethod) {
        // Generate transaction size if needed
        if (options.includeTransactionSize) {
          const txSize = this.userArchetypes.generateTransactionSize(archetype);
          txParams.unshift(txSize); // Add to beginning for typical staking/deposit functions
        }

        // Apply archetype-specific parameter variation
        txParams = this.userArchetypes.generateParameters(archetype, options.contractMethod, txParams);

        // Check if function is suitable for this archetype
        if (!this.userArchetypes.isFunctionSuitable(archetype, options.contractMethod)) {
          if (options.verbose) {
            console.log(chalk.yellow(`⚠️  ${options.contractMethod} not suitable for ${archetype}, skipping`));
          }
          return {
            iteration: iteration + 1,
            archetype,
            functionName: options.contractMethod,
            success: false,
            error: 'Function not suitable for archetype',
            delay,
            timestamp: Date.now(),
            duration: Date.now() - startTime
          };
        }

        // Execute contract interaction
        const tx = await this.#performContractInteraction(
          contract,
          wallet,
          options.contractMethod,
          txParams,
          options
        );

        // Record transaction in wallet farm analytics
        if (this.options.enableAnalytics && this.walletFarm.recordTransaction) {
          this.walletFarm.recordTransaction({
            walletIndex: wallet.index || 0,
            chainName: options.chainName || 'unknown',
            contractAddress: contract.target,
            functionName: options.contractMethod,
            txHash: tx.hash,
            gasUsed: 0, // Will be updated after confirmation
            success: true,
            context: {
              type: 'behavior_simulation',
              archetype,
              simulationId: options.simulationId,
              iteration: iteration + 1,
              burstMode: options.burstMode || false
            }
          });
        }

        if (options.verbose && !options.burstMode) {
          console.log(chalk.green(`✅ ${archetype} interaction successful: ${tx.hash}`));
        }

        return {
          iteration: iteration + 1,
          archetype,
          functionName: options.contractMethod,
          params: txParams,
          txHash: tx.hash,
          success: true,
          delay,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };

      } else {
        // No specific contract method - just delay
        return {
          iteration: iteration + 1,
          archetype,
          functionName: 'delay',
          success: true,
          delay,
          timestamp: Date.now(),
          duration: Date.now() - startTime
        };
      }

    } catch (error) {
      if (options.verbose && !options.burstMode) {
        console.log(chalk.red(`❌ ${archetype} interaction failed: ${error.message}`));
      }

      return {
        iteration: iteration + 1,
        archetype,
        functionName: options.contractMethod || 'unknown',
        success: false,
        error: error.message,
        delay: Date.now() - startTime, // Use actual time spent
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Performs contract interaction
   * @private
   * @param {ethers.Contract} contract - Contract instance
   * @param {ethers.Wallet} wallet - Wallet instance
   * @param {string} methodName - Method name
   * @param {Array} params - Method parameters
   * @param {Object} options - Options
   * @returns {Promise<Object>} Transaction result
   */
  async #performContractInteraction(contract, wallet, methodName, params, options) {
    // This is a template implementation
    // In real usage, this would be customized based on your specific contract

    if (options.value) {
      // Send ETH with transaction
      const value = ethers.parseEther(params[0]?.toString() || '0');
      const tx = await contract.connect(wallet)[methodName](
        ...params.slice(1),
        { value }
      );
      return tx;
    } else {
      // Regular contract call
      const tx = await contract.connect(wallet)[methodName](...params);
      return tx;
    }
  }

  /**
   * Simulates continuous behavior for an archetype until end time
   * @private
   * @param {string} archetype - Archetype name
   * @param {ethers.Contract} contract - Contract instance
   * @param {ethers.Wallet} wallet - Wallet instance
   * @param {number} endTime - End timestamp
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Simulation results
   */
  async #simulateArchetypeContinuous(archetype, contract, wallet, endTime, options) {
    const results = {
      archetype,
      walletAddress: wallet.address,
      interactions: [],
      successfulInteractions: 0,
      failedInteractions: 0,
      totalDelay: 0,
      startTime: Date.now()
    };

    while (Date.now() < endTime) {
      const remainingTime = endTime - Date.now();
      if (remainingTime < 10000) break; // Stop if less than 10 seconds remaining

      try {
        const singleResult = await this.simulateArchetype(
          archetype,
          contract,
          wallet,
          1,
          { ...options, verbose: false }
        );

        results.interactions.push(...singleResult.interactions);
        results.successfulInteractions += singleResult.successfulInteractions;
        results.failedInteractions += singleResult.failedInteractions;
        results.totalDelay += singleResult.totalDelay;

      } catch (error) {
        console.error(`Continuous simulation error for ${archetype}:`, error);
        break;
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    return results;
  }

  /**
   * Gets active simulations
   *
   * @returns {Array<Object>} Active simulations
   */
  getActiveSimulations() {
    return Array.from(this.activeSimulations.values()).filter(sim => sim.status === 'running');
  }

  /**
   * Gets simulation results
   *
   * @param {string} [simulationId] - Specific simulation ID
   * @returns {Object|Array} Simulation results
   */
  getSimulationResults(simulationId = null) {
    if (simulationId) {
      return this.simulationResults.get(simulationId) || null;
    }
    return Array.from(this.simulationResults.values());
  }

  /**
   * Stops a running simulation
   *
   * @param {string} simulationId - Simulation ID to stop
   * @returns {boolean} True if stopped successfully
   */
  stopSimulation(simulationId) {
    if (this.activeSimulations.has(simulationId)) {
      this.activeSimulations.get(simulationId).status = 'stopped';
      return true;
    }
    return false;
  }

  /**
   * Generates behavior simulation report
   *
   * @param {string} [simulationId] - Specific simulation to report on
   * @returns {Object} Simulation report
   */
  generateReport(simulationId = null) {
    const simulations = simulationId ?
      [this.getSimulationResults(simulationId)].filter(Boolean) :
      this.getSimulationResults();

    if (simulations.length === 0) {
      return { message: 'No simulation data available' };
    }

    const report = {
      totalSimulations: simulations.length,
      totalInteractions: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      archetypeBreakdown: {},
      timingStats: null,
      generatedAt: new Date().toISOString()
    };

    const allDelays = [];

    simulations.forEach(sim => {
      if (sim.type === 'mixed') {
        // Handle mixed simulation results
        Object.values(sim.archetypeResults).forEach(archetypeResult => {
          report.totalInteractions += archetypeResult.summary.totalInteractions;
          report.totalSuccessful += archetypeResult.summary.successful;
          report.totalFailed += archetypeResult.summary.failed;

          if (!report.archetypeBreakdown[archetypeResult.archetype]) {
            report.archetypeBreakdown[archetypeResult.archetype] = {
              simulations: 0,
              totalInteractions: 0,
              successful: 0,
              failed: 0
            };
          }

          const breakdown = report.archetypeBreakdown[archetypeResult.archetype];
          breakdown.simulations++;
          breakdown.totalInteractions += archetypeResult.summary.totalInteractions;
          breakdown.successful += archetypeResult.summary.successful;
          breakdown.failed += archetypeResult.summary.failed;
        });
      } else {
        // Handle single archetype simulation
        report.totalInteractions += sim.successfulInteractions + sim.failedInteractions;
        report.totalSuccessful += sim.successfulInteractions;
        report.totalFailed += sim.failedInteractions;

        if (!report.archetypeBreakdown[sim.archetype]) {
          report.archetypeBreakdown[sim.archetype] = {
            simulations: 0,
            totalInteractions: 0,
            successful: 0,
            failed: 0
          };
        }

        const breakdown = report.archetypeBreakdown[sim.archetype];
        breakdown.simulations++;
        breakdown.totalInteractions += sim.successfulInteractions + sim.failedInteractions;
        breakdown.successful += sim.successfulInteractions;
        breakdown.failed += sim.failedInteractions;
      }

      // Collect timing data
      if (sim.timingStats) {
        allDelays.push(sim.timingStats.average || 0);
      }
    });

    report.timingStats = this.timingEngine.calculateStats(allDelays);

    return report;
  }

  /**
   * Cleans up resources
   */
  destroy() {
    this.activeSimulations.clear();
    this.simulationResults.clear();

    if (this.options.verbose) {
      console.log(chalk.yellow('🧹 BehaviorSimulator resources cleaned up'));
    }
  }
}

export default BehaviorSimulator;
