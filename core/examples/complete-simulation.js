#!/usr/bin/env node

/**
 * Complete Wallet Farm Simulation Example
 *
 * This example demonstrates a complete behavioral simulation using all
 * components of the Wallet Farm system:
 *
 * 1. Wallet generation and management
 * 2. Fund distribution (mocked)
 * 3. Archetype-based user behavior simulation
 * 4. Timing engine for realistic delays
 * 5. Transaction execution with safety controls
 * 6. Comprehensive metrics collection
 * 7. Budget enforcement and circuit breaker protection
 *
 * Run with: node examples/complete-simulation.js
 */

import { ethers } from 'ethers';
import { WalletFarm } from '../src/core/WalletFarm.js';
import { FundDistributor } from '../src/core/FundDistributor.js';
import { ArchetypeManager } from '../src/simulation/ArchetypeManager.js';
import { TimingEngine } from '../src/simulation/TimingEngine.js';
import { TransactionExecutor } from '../src/execution/TransactionExecutor.js';
import { SimulationMetrics } from '../src/simulation/SimulationMetrics.js';
import { BudgetEnforcer } from '../src/safety/BudgetEnforcer.js';
import { CircuitBreaker } from '../src/safety/CircuitBreaker.js';
import { SeededRandom } from '../src/timing/SeededRandom.js';

// Configuration
const CONFIG = {
  mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  walletCount: 10,
  simulationDuration: 30000, // 30 seconds
  seed: 12345,

  // Archetype distribution
  archetypes: {
    whale: { count: 1, active: true },
    activeTrader: { count: 3, active: true },
    casual: { count: 4, active: true },
    lurker: { count: 2, active: false } // Inactive for demonstration
  },

  // Budget limits (testnet safe)
  budget: {
    maxGasPerTx: ethers.parseUnits('0.001', 'ether'), // 0.001 ETH per tx
    maxTotalGas: ethers.parseUnits('0.01', 'ether')    // 0.01 ETH total
  }
};

class CompleteSimulation {
  constructor(config) {
    this.config = config;
    this.rng = new SeededRandom(config.seed);

    console.log('🚀 Initializing Complete Wallet Farm Simulation...\n');
  }

  async initialize() {
    console.log('📋 Step 1: Initializing Components');

    // Initialize all components
    this.walletFarm = new WalletFarm(this.config.mnemonic, this.config.walletCount, { verbose: false });
    this.fundDistributor = new FundDistributor(this.walletFarm);
    this.archetypeManager = new ArchetypeManager(this.rng);
    this.timingEngine = new TimingEngine(this.rng);
    this.transactionExecutor = new TransactionExecutor(this.walletFarm);
    this.simulationMetrics = new SimulationMetrics();
    this.budgetEnforcer = new BudgetEnforcer(this.config.budget);
    this.circuitBreaker = new CircuitBreaker();

    console.log(`✅ Generated ${this.walletFarm.getWalletCount()} wallets`);
    console.log(`✅ Loaded ${this.archetypeManager.getArchetypeNames().length} archetypes`);
    console.log(`✅ Budget limits: ${ethers.formatEther(this.config.budget.maxGasPerTx)} ETH/tx, ${ethers.formatEther(this.config.budget.maxTotalGas)} ETH total`);
    console.log('');
  }

  async simulateFundDistribution() {
    console.log('💰 Step 2: Simulating Fund Distribution');

    // In a real scenario, this would distribute actual tokens
    // For this example, we simulate the distribution logic
    const distributionResults = [];

    for (let i = 0; i < this.config.walletCount; i++) {
      const wallet = this.walletFarm.getWallet(i, 'sepolia');
      const amount = this.rng.nextFloat(0.001, 0.01); // 0.001-0.01 ETH

      distributionResults.push({
        walletIndex: i,
        address: wallet.address,
        amount: amount,
        status: 'simulated'
      });
    }

    console.log(`✅ Simulated funding ${distributionResults.length} wallets`);
    console.log(`💡 Total distributed: ${distributionResults.reduce((sum, r) => sum + r.amount, 0).toFixed(4)} ETH`);
    console.log('');
  }

  async createArchetypeActors() {
    console.log('🎭 Step 3: Creating Archetype Actors');

    this.actors = [];

    let walletIndex = 0;

    for (const [archetypeName, settings] of Object.entries(this.config.archetypes)) {
      for (let i = 0; i < settings.count; i++) {
        if (walletIndex >= this.config.walletCount) break;

        const actor = {
          id: `${archetypeName}_${i}`,
          archetype: archetypeName,
          walletIndex: walletIndex,
          active: settings.active,
          lastActivity: Date.now(),
          transactionCount: 0,
          totalVolume: 0
        };

        this.actors.push(actor);
        walletIndex++;
      }
    }

    console.log(`✅ Created ${this.actors.length} actors:`);
    this.actors.forEach(actor => {
      console.log(`  • ${actor.id} (${actor.active ? 'active' : 'inactive'})`);
    });
    console.log('');
  }

  async runBehavioralSimulation() {
    console.log('🎪 Step 4: Running Behavioral Simulation');
    console.log(`⏱️  Duration: ${this.config.simulationDuration / 1000} seconds`);
    console.log('');

    const startTime = Date.now();
    this.simulationMetrics.startSimulation();

    let simulationActive = true;
    const endTime = startTime + this.config.simulationDuration;

    // Simulation loop
    while (simulationActive && Date.now() < endTime) {
      // Process active actors
      const activeActors = this.actors.filter(actor => actor.active);

      for (const actor of activeActors) {
        await this.processActorAction(actor);
      }

      // Check circuit breaker status
      if (!this.circuitBreaker.shouldAllow()) {
        console.log('🚫 Circuit breaker open - pausing simulation');
        await this.delay(5000); // Wait 5 seconds
        continue;
      }

      // Small delay between actor cycles
      await this.delay(100);

      // Check if simulation should end
      if (Date.now() >= endTime) {
        simulationActive = false;
      }
    }

    this.simulationMetrics.endSimulation();

    console.log('\n✅ Simulation completed');
    console.log(`⏱️  Actual duration: ${((Date.now() - startTime) / 1000).toFixed(1)} seconds`);
  }

  async processActorAction(actor) {
    try {
      // Record attempt
      this.simulationMetrics.recordAttempt(actor.archetype);

      // Check if actor should skip this interaction
      if (this.archetypeManager.shouldSkipInteraction(actor.archetype)) {
        this.simulationMetrics.recordSkip(actor.archetype);
        return;
      }

      // Generate transaction parameters
      const transactionSize = this.archetypeManager.generateTransactionSize(actor.archetype);
      const timingProfile = this.archetypeManager.getDelayProfile(actor.archetype);

      // Apply human-like delay
      const delay = await this.timingEngine.humanDelay(timingProfile);
      this.simulationMetrics.recordDelay(delay);

      // Simulate transaction execution
      await this.simulateTransaction(actor, transactionSize);

      // Update actor stats
      actor.transactionCount++;
      actor.totalVolume += transactionSize;
      actor.lastActivity = Date.now();

    } catch (error) {
      console.log(`❌ Actor ${actor.id} failed: ${error.message}`);

      // Record failure and trigger circuit breaker
      this.simulationMetrics.recordFailure(actor.archetype, error);
      this.circuitBreaker.recordFailure();

      // Check budget alerts
      const alert = this.budgetEnforcer.checkBudgetAlerts();
      if (alert && alert.level === 'CRITICAL') {
        console.log(`🚨 Budget alert: ${alert.message}`);
      }
    }
  }

  async simulateTransaction(actor, transactionSize) {
    // Simulate gas estimation
    const estimatedGas = 21000n + BigInt(Math.floor(this.rng.next() * 10000)); // 21k-31k gas
    const gasPrice = 20000000000n + BigInt(Math.floor(this.rng.next() * 10000000000)); // 20-30 gwei

    // Check budget before proceeding
    this.budgetEnforcer.checkTransaction(estimatedGas, gasPrice);

    // Simulate network delay
    await this.delay(100 + Math.floor(this.rng.next() * 200)); // 100-300ms

    // Random success/failure (90% success rate)
    const success = this.rng.next() < 0.9;

    if (success) {
      // Record successful transaction
      const confirmationTime = 1000 + Math.floor(this.rng.next() * 4000); // 1-5 seconds
      this.simulationMetrics.recordSuccess(
        actor.archetype,
        estimatedGas,
        gasPrice,
        confirmationTime
      );

      // Update budget
      this.budgetEnforcer.recordTransaction(estimatedGas, gasPrice);

      // Reset circuit breaker on success
      this.circuitBreaker.recordSuccess();

      // Log successful transaction
      if (this.rng.next() < 0.1) { // Log 10% of transactions
        console.log(`💫 ${actor.id}: ${transactionSize.toFixed(6)} tokens (${confirmationTime}ms)`);
      }

    } else {
      // Simulate failure
      const error = new Error('Transaction reverted: insufficient liquidity');
      throw error;
    }
  }

  async generateFinalReport() {
    console.log('\n📊 Step 5: Generating Final Report');

    const report = this.simulationMetrics.generateReport();
    const budgetStatus = this.budgetEnforcer.getStatus();
    const circuitStatus = this.circuitBreaker.getStats();

    console.log('\n' + '='.repeat(60));
    console.log('📈 SIMULATION REPORT');
    console.log('='.repeat(60));

    console.log('\n📊 OVERALL METRICS:');
    console.log(`  • Duration: ${report.summary.durationSeconds} seconds`);
    console.log(`  • Total Attempts: ${report.summary.totalAttempts}`);
    console.log(`  • Successful Transactions: ${report.summary.successful}`);
    console.log(`  • Failed Transactions: ${report.summary.failed}`);
    console.log(`  • Skipped Interactions: ${report.summary.skipped}`);
    console.log(`  • Success Rate: ${report.summary.successRate}`);

    console.log('\n⛽ GAS STATISTICS:');
    console.log(`  • Total Gas Used: ${report.gas.totalGasUsed}`);
    console.log(`  • Average Gas Per Tx: ${report.gas.averageGasPerTx}`);
    console.log(`  • Average Gas Price: ${report.gas.gasPrice.average || '0'} wei`);

    console.log('\n⏱️  TIMING STATISTICS:');
    console.log(`  • Average Confirmation Time: ${report.timing.averageConfirmation}ms`);
    console.log(`  • Average Delay: ${report.timing.averageDelay}ms`);
    console.log(`  • Total Simulation Time: ${report.timing.totalSimulationTime}ms`);

    console.log('\n🎭 ARCHETYPE BREAKDOWN:');
    Object.entries(report.archetypes.breakdown).forEach(([archetype, stats]) => {
      console.log(`  • ${archetype}: ${stats.successes}/${stats.attempts} successful (${stats.successRate})`);
    });

    console.log('\n💰 BUDGET STATUS:');
    console.log(`  • Utilized: ${budgetStatus.utilizationPercent}%`);
    console.log(`  • Remaining: ${budgetStatus.remainingBudgetEth} ETH`);
    console.log(`  • Transactions: ${budgetStatus.transactionCount}`);

    console.log('\n🔄 CIRCUIT BREAKER:');
    console.log(`  • State: ${circuitStatus.currentState}`);
    console.log(`  • Success Rate: ${circuitStatus.successRate}`);
    console.log(`  • Failures: ${circuitStatus.failedRequests}`);

    console.log('\n🎪 ACTOR PERFORMANCE:');
    this.actors.forEach(actor => {
      const status = actor.active ? '🟢' : '⚫';
      console.log(`  ${status} ${actor.id}: ${actor.transactionCount} txs, ${actor.totalVolume.toFixed(4)} volume`);
    });

    console.log('\n❌ ERROR BREAKDOWN:');
    Object.entries(report.errors.errorBreakdown).forEach(([errorType, count]) => {
      console.log(`  • ${errorType}: ${count}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Simulation Complete!');
    console.log('='.repeat(60));
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async run() {
    try {
      await this.initialize();
      await this.simulateFundDistribution();
      await this.createArchetypeActors();
      await this.runBehavioralSimulation();
      await this.generateFinalReport();

    } catch (error) {
      console.error('💥 Simulation failed:', error);
      process.exit(1);
    }
  }
}

// Run the simulation
const simulation = new CompleteSimulation(CONFIG);
simulation.run().catch(console.error);
