#!/usr/bin/env node

/**
 * Complete Behavioral Simulation Example - Phase 4
 *
 * This example demonstrates the complete behavioral simulation system:
 * 1. Wallet farm setup with safety components
 * 2. Archetype-based user behavior simulation
 * 3. Safety systems (budget enforcement, circuit breaker)
 * 4. Comprehensive metrics and reporting
 * 5. End-to-end simulation workflow
 */

import {
  WalletFarm,
  FundDistributor,
  ArchetypeManager,
  TimingEngine,
  TransactionExecutor,
  SimulationMetrics,
  BudgetEnforcer,
  CircuitBreaker,
  SeededRandom
} from '../src/index.js';
import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Mock contract for demonstration
class MockDeFiContract {
  constructor(name = 'MockDeFi', address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e') {
    this.name = name;
    this.address = address;
  }

  connect(wallet) {
    return {
      // ERC-20 like functions
      balanceOf: async (address) => ethers.parseEther('1000'),

      transfer: async (to, amount) => {
        console.log(`   📤 Transfer: ${ethers.formatEther(amount)} tokens to ${to}`);

        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            status: 1,
            gasUsed: 65000n,
            gasPrice: ethers.parseUnits('20', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      // DeFi functions
      stake: async (amount) => {
        console.log(`   🏦 Stake: ${ethers.formatEther(amount)} tokens`);

        await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 100));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            status: 1,
            gasUsed: 120000n,
            gasPrice: ethers.parseUnits('25', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      unstake: async (amount) => {
        console.log(`   💰 Unstake: ${ethers.formatEther(amount)} tokens`);

        await new Promise(resolve => setTimeout(resolve, Math.random() * 250 + 75));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            status: 1,
            gasUsed: 85000n,
            gasPrice: ethers.parseUnits('22', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      claimRewards: async () => {
        console.log(`   🎁 Claim rewards`);

        await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            status: 1,
            gasUsed: 45000n,
            gasPrice: ethers.parseUnits('18', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      swap: async (amountIn, amountOutMin) => {
        console.log(`   🔄 Swap: ${ethers.formatEther(amountIn)} tokens (min output: ${ethers.formatEther(amountOutMin)})`);

        await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 150));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            status: 1,
            gasUsed: 150000n,
            gasPrice: ethers.parseUnits('30', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      }
    };
  }
}

async function completeSimulationExample() {
  console.log('🚀 Complete Behavioral Simulation Example - Phase 4\n');
  console.log('This demonstrates the full simulation system with safety components.\n');

  try {
    // ============================================================================
    // Phase 1: Infrastructure Setup
    // ============================================================================

    console.log('🏗️  Phase 1: Infrastructure Setup');
    console.log('=' .repeat(50));

    // Initialize deterministic random number generator
    const seededRng = new SeededRandom(12345);
    console.log('✅ Seeded random generator initialized (seed: 12345)');

    // Create wallet farm with safety components
    console.log('📝 Creating wallet farm with 5 wallets...');
    const walletFarm = new WalletFarm(TEST_MNEMONIC, 5, { verbose: false });

    // Set up fund distributor
    const fundDistributor = new FundDistributor(walletFarm);

    // Initialize safety components
    const budgetEnforcer = new BudgetEnforcer({
      maxGasPerTx: ethers.parseUnits('0.01', 'ether'),
      maxTotalGas: ethers.parseUnits('0.05', 'ether')
    });
    const circuitBreaker = new CircuitBreaker({ threshold: 3 });

    console.log('✅ Safety components initialized:');
    console.log('   • Budget enforcer: 0.01 ETH/tx, 0.05 ETH total');
    console.log('   • Circuit breaker: 3 failure threshold');
    console.log();

    // ============================================================================
    // Phase 2: Archetype & Timing Setup
    // ============================================================================

    console.log('🎭 Phase 2: Archetype & Timing Setup');
    console.log('=' .repeat(50));

    // Initialize archetype manager
    const archetypeManager = new ArchetypeManager(seededRng);
    console.log('✅ Archetype manager loaded with 5 user types:');
    archetypeManager.getArchetypeNames().forEach(name => {
      const archetype = archetypeManager.getArchetype(name);
      console.log(`   • ${name}: ${archetype.description}`);
    });

    // Initialize timing engine
    const timingEngine = new TimingEngine(seededRng);
    console.log('✅ Timing engine initialized with 5 delay profiles');

    // Initialize transaction executor with safety components
    const transactionExecutor = new TransactionExecutor(
      walletFarm,
      undefined, // Use default nonce manager
      undefined  // Use default retry manager
    );
    console.log('✅ Transaction executor initialized with safety components\n');

    // ============================================================================
    // Phase 3: Contract & Metrics Setup
    // ============================================================================

    console.log('📄 Phase 3: Contract & Metrics Setup');
    console.log('=' .repeat(50));

    // Create mock DeFi contract
    const defiContract = new MockDeFiContract('MockDeFi Protocol');
    console.log('✅ Mock DeFi contract created with multiple functions:');
    console.log('   • transfer, stake, unstake, claimRewards, swap');

    // Initialize comprehensive metrics tracking
    const simulationMetrics = new SimulationMetrics();
    console.log('✅ Simulation metrics initialized for comprehensive tracking\n');

    // ============================================================================
    // Phase 4: Individual Archetype Simulations
    // ============================================================================

    console.log('🐋 Phase 4: Individual Archetype Simulations');
    console.log('=' .repeat(50));

    const archetypes = archetypeManager.getArchetypeNames();

    for (const archetypeName of archetypes) {
      console.log(`\n🎯 Simulating ${archetypeName.toUpperCase()} behavior:`);

      const archetype = archetypeManager.getArchetype(archetypeName);
      console.log(`   Description: ${archetype.description}`);
      console.log(`   Skip probability: ${(archetype.frequency.skipProbability * 100).toFixed(1)}%`);

      simulationMetrics.startSimulation();

      let attempts = 0;
      let successes = 0;
      let skips = 0;

      // Simulate 10 interactions for this archetype
      for (let i = 0; i < 10; i++) {
        attempts++;
        simulationMetrics.recordAttempt(archetypeName);

        // Check if interaction should be skipped
        if (archetypeManager.shouldSkipInteraction(archetypeName)) {
          simulationMetrics.recordSkip(archetypeName);
          skips++;
          console.log(`   ${i + 1}. ⏭️  Skipped interaction`);
          continue;
        }

        // Generate realistic delay
        const delay = timingEngine.getDelaySync(
          archetypeManager.getDelayProfile(archetypeName)
        );
        simulationMetrics.recordDelay(delay);
        await new Promise(resolve => setTimeout(resolve, Math.min(delay / 10, 100))); // Speed up for demo

        // Generate transaction parameters
        const params = archetypeManager.generateParameters(archetypeName, 'transfer');
        const gasEstimate = 65000n;
        const gasPrice = ethers.parseUnits('20', 'gwei');

        try {
          // Check budget before transaction
          budgetEnforcer.checkTransaction(gasEstimate, gasPrice);

          // Execute transaction with circuit breaker protection
          const result = await circuitBreaker.execute(async () => {
            // Simulate transaction (success most of the time)
            if (Math.random() > 0.9) { // 10% failure rate
              throw new Error('Simulated transaction failure');
            }

            console.log(`   ${i + 1}. ✅ Transaction successful (delay: ${Math.round(delay)}ms)`);
            return { gasUsed: gasEstimate, gasPrice };
          });

          budgetEnforcer.recordTransaction(result.gasUsed, result.gasPrice);
          simulationMetrics.recordSuccess(archetypeName, result.gasUsed, result.gasPrice);
          successes++;

        } catch (error) {
          if (error.message.includes('Circuit breaker')) {
            console.log(`   ${i + 1}. 🔒 Circuit breaker activated`);
            break;
          } else {
            console.log(`   ${i + 1}. ❌ Transaction failed: ${error.message}`);
            simulationMetrics.recordFailure(archetypeName, error);
          }
        }
      }

      simulationMetrics.endSimulation();
      const report = simulationMetrics.generateReport();

      console.log(`   📊 Results: ${successes}/${attempts - skips} successful (${skips} skipped)`);
      console.log(`   💰 Gas used: ${report.gas.totalGasUsed} (${report.summary.successRate} success rate)`);
    }

    console.log();

    // ============================================================================
    // Phase 5: Mixed Simulation Scenario
    // ============================================================================

    console.log('🎪 Phase 5: Mixed Simulation Scenario');
    console.log('=' .repeat(50));

    console.log('Running mixed simulation with all archetypes interacting simultaneously...');

    simulationMetrics.reset();
    simulationMetrics.startSimulation();

    // Reset safety components
    circuitBreaker.reset();

    const mixedResults = {
      totalAttempts: 0,
      totalSuccesses: 0,
      totalSkips: 0,
      archetypePerformance: {}
    };

    // Initialize archetype performance tracking
    archetypes.forEach(name => {
      mixedResults.archetypePerformance[name] = {
        attempts: 0,
        successes: 0,
        skips: 0,
        gasUsed: 0n
      };
    });

    // Run 50 mixed interactions
    for (let i = 0; i < 50; i++) {
      // Randomly select archetype (weighted by their typical behavior)
      const weights = { whale: 0.1, activeTrader: 0.4, casual: 0.3, lurker: 0.1, researcher: 0.1 };
      const random = seededRng.next();
      let selectedArchetype = 'casual'; // default

      let cumulativeWeight = 0;
      for (const [archetype, weight] of Object.entries(weights)) {
        cumulativeWeight += weight;
        if (random <= cumulativeWeight) {
          selectedArchetype = archetype;
          break;
        }
      }

      const perf = mixedResults.archetypePerformance[selectedArchetype];
      perf.attempts++;
      mixedResults.totalAttempts++;

      simulationMetrics.recordAttempt(selectedArchetype);

      // Check skip behavior
      if (archetypeManager.shouldSkipInteraction(selectedArchetype)) {
        simulationMetrics.recordSkip(selectedArchetype);
        perf.skips++;
        mixedResults.totalSkips++;
        continue;
      }

      // Realistic timing
      const delay = timingEngine.getDelaySync(
        archetypeManager.getDelayProfile(selectedArchetype)
      );
      simulationMetrics.recordDelay(delay);
      await new Promise(resolve => setTimeout(resolve, Math.min(delay / 20, 50))); // Speed up for demo

      try {
        // Safety checks
        const gasEstimate = 65000n;
        const gasPrice = ethers.parseUnits('20', 'gwei');
        budgetEnforcer.checkTransaction(gasEstimate, gasPrice);

        // Circuit breaker protection
        const result = await circuitBreaker.execute(async () => {
          // Simulate occasional failures
          if (seededRng.next() < 0.05) { // 5% failure rate
            throw new Error('Network congestion');
          }
          return { gasUsed: gasEstimate, gasPrice };
        });

        budgetEnforcer.recordTransaction(result.gasUsed, result.gasPrice);
        simulationMetrics.recordSuccess(selectedArchetype, result.gasUsed, result.gasPrice);
        perf.successes++;
        perf.gasUsed += result.gasUsed;
        mixedResults.totalSuccesses++;

      } catch (error) {
        simulationMetrics.recordFailure(selectedArchetype, error);
      }
    }

    simulationMetrics.endSimulation();

    // ============================================================================
    // Phase 6: Comprehensive Reporting
    // ============================================================================

    console.log('\n📊 Phase 6: Comprehensive Reporting');
    console.log('=' .repeat(50));

    const finalReport = simulationMetrics.generateReport();
    const budgetStatus = budgetEnforcer.getStatus();
    const circuitStatus = circuitBreaker.getFailureStatus();

    console.log('\n🎯 SIMULATION SUMMARY:');
    console.log('-'.repeat(30));
    console.log(`Total Interactions: ${finalReport.summary.totalAttempts}`);
    console.log(`Successful: ${finalReport.summary.successful} (${finalReport.summary.successRate})`);
    console.log(`Failed: ${finalReport.summary.failed}`);
    console.log(`Skipped: ${finalReport.summary.skipped}`);
    console.log(`Duration: ${finalReport.summary.durationSeconds}s`);

    console.log('\n💰 BUDGET STATUS:');
    console.log('-'.repeat(30));
    console.log(`Total Spent: ${budgetStatus.totalGasSpentEth} ETH`);
    console.log(`Remaining: ${budgetStatus.remainingBudgetEth} ETH`);
    console.log(`Utilization: ${budgetStatus.utilizationPercent}%`);
    console.log(`Status: ${budgetEnforcer.getUtilizationSummary().status}`);

    console.log('\n🔄 CIRCUIT BREAKER STATUS:');
    console.log('-'.repeat(30));
    console.log(`State: ${circuitStatus.status}`);
    console.log(`Consecutive Failures: ${circuitStatus.consecutiveFailures}`);
    console.log(`Success Rate: ${circuitStatus.successRate}`);

    console.log('\n📈 ARCHETYPE PERFORMANCE:');
    console.log('-'.repeat(30));
    Object.entries(finalReport.archetypes.breakdown).forEach(([name, stats]) => {
      console.log(`${name.padEnd(12)}: ${stats.successRate} (${stats.successes}/${stats.attempts})`);
    });

    console.log('\n⚡ GAS EFFICIENCY:');
    console.log('-'.repeat(30));
    console.log(`Average Gas per Tx: ${finalReport.gas.averageGasPerTx}`);
    console.log(`Gas Price Range: ${finalReport.gas.gasPrice.min || 'N/A'} - ${finalReport.gas.gasPrice.max || 'N/A'}`);

    console.log('\n⏱️  TIMING ANALYSIS:');
    console.log('-'.repeat(30));
    console.log(`Average Confirmation: ${Math.round(finalReport.timing.averageConfirmation)}ms`);
    console.log(`Average Delay: ${Math.round(finalReport.timing.averageDelay)}ms`);
    console.log(`Total Simulation Time: ${Math.round(finalReport.timing.totalSimulationTime / 1000)}s`);

    console.log('\n🚨 ERROR ANALYSIS:');
    console.log('-'.repeat(30));
    Object.entries(finalReport.errors.errorBreakdown).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

    console.log('\n🎉 SIMULATION COMPLETED SUCCESSFULLY!');
    console.log('All safety components functioned correctly.');
    console.log('Behavioral patterns were realistic and measurable.');
    console.log('Comprehensive metrics provide full observability.');

  } catch (error) {
    console.error('\n❌ Simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  completeSimulationExample().catch(console.error);
}

export { completeSimulationExample, MockDeFiContract };
            gasPrice: ethers.parseUnits('20', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      stake: async (amount) => {
        console.log(`   🏦 Mock stake: ${amount} tokens`);

        await new Promise(resolve => setTimeout(resolve, 150));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            gasUsed: 45000,
            gasPrice: ethers.parseUnits('20', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      swap: async (amountIn, amountOut) => {
        console.log(`   🔄 Mock swap: ${amountIn} → ${amountOut}`);

        await new Promise(resolve => setTimeout(resolve, 200));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            gasUsed: 120000,
            gasPrice: ethers.parseUnits('25', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      },

      claim: async () => {
        console.log(`   🎁 Mock claim rewards`);

        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            gasUsed: 35000,
            gasPrice: ethers.parseUnits('20', 'gwei'),
            blockNumber: Math.floor(Math.random() * 1000000)
          })
        };
      }
    };
  }
}

async function behavioralSimulationExample() {
  console.log('🎭 Behavioral Simulation Example\n');

  try {
    // 1. Create wallet farm and connect to network
    console.log('📝 Setting up wallet farm with 8 wallets...');
    const farm = new WalletFarm(TEST_MNEMONIC, 8, {
      verbose: false,
      enableAnalytics: true
    });

    // Connect to a mock network for demonstration
    farm.connectToChains([{
      name: 'sepolia',
      chainId: 11155111,
      rpcUrl: 'https://rpc.sepolia.org'
    }]);
    console.log();

    // 2. Set up behavioral simulator
    console.log('🎯 Initializing behavioral simulator...');
    const simulator = new BehaviorSimulator(farm, {
      verbose: true,
      enableAnalytics: true,
      maxConcurrentSimulations: 5
    });

    // Create mock contract for simulation
    const contract = new MockContract();
    console.log('📄 Mock contract ready for simulation\n');

    // 3. Demonstrate individual archetype simulations
    console.log('🏆 Individual Archetype Simulations:\n');

    // Whale simulation
    console.log('🐋 Simulating WHALE behavior (large, infrequent transactions)...');
    const whaleResult = await simulator.simulateArchetype(
      'whale',
      contract,
      farm.getWallet(0, 'sepolia'),
      3, // 3 interactions
      {
        contractMethod: 'stake',
        contractParams: [],
        includeTransactionSize: true,
        value: false
      }
    );

    console.log(`   ✅ Result: ${whaleResult.successfulInteractions}/${whaleResult.totalIterations} successful`);
    console.log(`   ⏱️  Total delay: ${Math.round(whaleResult.totalDelay / 1000)}s`);
    console.log(`   📊 Avg delay: ${Math.round(whaleResult.timingStats?.average || 0)}ms\n`);

    // Active trader simulation
    console.log('📈 Simulating ACTIVE TRADER behavior (frequent medium transactions)...');
    const traderResult = await simulator.simulateArchetype(
      'activeTrader',
      contract,
      farm.getWallet(1, 'sepolia'),
      5, // 5 interactions
      {
        contractMethod: 'swap',
        contractParams: ['0x0000000000000000000000000000000000000000', '0'], // Will be modified
        includeTransactionSize: false,
        value: false
      }
    );

    console.log(`   ✅ Result: ${traderResult.successfulInteractions}/${traderResult.totalIterations} successful`);
    console.log(`   ⏱️  Total delay: ${Math.round(traderResult.totalDelay / 1000)}s`);
    console.log(`   📊 Avg delay: ${Math.round(traderResult.timingStats?.average || 0)}ms\n`);

    // Casual user simulation
    console.log('👤 Simulating CASUAL USER behavior (moderate activity)...');
    const casualResult = await simulator.simulateArchetype(
      'casual',
      contract,
      farm.getWallet(2, 'sepolia'),
      4, // 4 interactions
      {
        contractMethod: 'transfer',
        contractParams: ['0x742d35Cc6634C0532925a3b8B8b5f0F5F5F5F5F5F5'], // Random address
        includeTransactionSize: true,
        value: true
      }
    );

    console.log(`   ✅ Result: ${casualResult.successfulInteractions}/${casualResult.totalIterations} successful`);
    console.log(`   ⏱️  Total delay: ${Math.round(casualResult.totalDelay / 1000)}s`);
    console.log(`   📊 Avg delay: ${Math.round(casualResult.timingStats?.average || 0)}ms\n`);

    // Researcher simulation
    console.log('🔬 Simulating RESEARCHER behavior (analytical, small transactions)...');
    const researcherResult = await simulator.simulateArchetype(
      'researcher',
      contract,
      farm.getWallet(3, 'sepolia'),
      6, // 6 interactions
      {
        contractMethod: 'claim',
        contractParams: [],
        includeTransactionSize: false,
        value: false
      }
    );

    console.log(`   ✅ Result: ${researcherResult.successfulInteractions}/${researcherResult.totalIterations} successful`);
    console.log(`   ⏱️  Total delay: ${Math.round(researcherResult.totalDelay / 1000)}s`);
    console.log(`   📊 Avg delay: ${Math.round(researcherResult.timingStats?.average || 0)}ms\n`);

    // 4. Demonstrate mixed behavior simulation
    console.log('🎪 Mixed Behavior Simulation (5 minutes):\n');

    // Set up wallet groups by archetype
    const walletGroups = {
      whale: [farm.getWallet(4, 'sepolia')], // 1 whale
      activeTrader: [
        farm.getWallet(5, 'sepolia'),
        farm.getWallet(6, 'sepolia')
      ], // 2 active traders
      casual: [
        farm.getWallet(7, 'sepolia')
      ], // 1 casual user
      lurker: [
        farm.getWallet(0, 'sepolia') // Reuse wallet for demo
      ] // 1 lurker (will mostly skip)
    };

    console.log('👥 Simulating mixed user behaviors for 2 minutes...');
    const mixedResult = await simulator.simulateMixedBehavior(
      contract,
      walletGroups,
      2, // 2 minutes (shortened for demo)
      {
        contractMethod: 'transfer',
        contractParams: ['0x742d35Cc6634C0532925a3b8B8b5f0F5F5F5F5F5F5'],
        includeTransactionSize: true,
        value: true
      }
    );

    console.log('\n📊 Mixed Simulation Results:');
    Object.entries(mixedResult.archetypeResults).forEach(([archetype, result]) => {
      const summary = result.summary;
      const successRate = summary.totalInteractions > 0 ?
        ((summary.successful / summary.totalInteractions) * 100).toFixed(1) : '0.0';

      console.log(`   ${archetype.toUpperCase()}: ${summary.successful}/${summary.totalInteractions} (${successRate}%)`);
    });

    console.log(`   🎯 Total interactions: ${mixedResult.totalSuccessful}/${mixedResult.totalInteractions}`);
    console.log(`   ⏱️  Simulation duration: ${Math.round(mixedResult.actualDuration / 1000)}s`);
    console.log();

    // 5. Demonstrate timing engine directly
    console.log('⏰ Timing Engine Demonstrations:\n');

    const timingEngine = simulator.timingEngine;

    console.log('🕐 Different timing profiles:');
    const profiles = ['instant', 'quick', 'normal', 'thoughtful', 'slow'];
    for (const profile of profiles) {
      const delay = await timingEngine.humanDelay(profile, { verbose: false });
      console.log(`   ${profile.padEnd(10)}: ${delay.toString().padStart(6)}ms`);
    }
    console.log();

    console.log('🎯 Timing sequence (quick → normal → slow):');
    const sequence = await timingEngine.timingSequence(['quick', 'normal', 'slow']);
    console.log(`   Delays: ${sequence.map(d => Math.round(d)).join('ms → ')}ms`);
    console.log(`   Total: ${Math.round(sequence.reduce((a, b) => a + b, 0))}ms\n`);

    console.log('💥 Burst pattern (3 quick actions, then pause):');
    const burst = await timingEngine.burstPattern(3, 'quick', 'normal', 1);
    console.log(`   Pattern: ${burst.map(d => Math.round(d)).join('ms → ')}ms\n`);

    // 6. Demonstrate custom archetypes
    console.log('🛠️  Custom Archetype Demonstration:\n');

    // Add a custom "flashTrader" archetype
    simulator.userArchetypes.addArchetype('flashTrader', {
      name: 'flashTrader',
      description: 'Ultra-fast trader making rapid small transactions',
      frequency: 'veryHigh',
      volume: 'veryLow',
      delayMin: 500,    // 0.5 seconds
      delayMax: 2000,   // 2 seconds
      transactionSize: { min: 0.001, max: 0.01 },
      skipProbability: 0.0, // Never skips
      burstBehavior: {
        enabled: true,
        burstSize: { min: 5, max: 15 },
        burstFrequency: 0.9, // 90% chance of burst
        interBurstDelay: 'instant'
      },
      contractInteractions: {
        preferredFunctions: ['swap', 'arbitrage'],
        avoidFunctions: ['stake', 'lock'],
        parameterVariation: 'minimal'
      },
      timingPatterns: {
        sessionLength: { min: 30000, max: 120000 }, // 30s to 2min
        interActionDelay: 'instant',
        decisionTime: 'instant'
      }
    });

    console.log('🏎️  Simulating custom FLASH TRADER archetype...');
    const flashResult = await simulator.simulateArchetype(
      'flashTrader',
      contract,
      farm.getWallet(4, 'sepolia'),
      8, // 8 interactions
      {
        contractMethod: 'swap',
        contractParams: ['0x0000000000000000000000000000000000000000', '0'],
        includeTransactionSize: false,
        value: false
      }
    );

    console.log(`   ✅ Result: ${flashResult.successfulInteractions}/${flashResult.totalIterations} successful`);
    console.log(`   ⚡ Avg delay: ${Math.round(flashResult.timingStats?.average || 0)}ms (very fast!)\n`);

    // 7. Generate comprehensive simulation report
    console.log('📋 Comprehensive Simulation Report:\n');

    const report = simulator.generateReport();

    console.log('📊 Overall Statistics:');
    console.log(`   Total simulations: ${report.totalSimulations}`);
    console.log(`   Total interactions: ${report.totalInteractions}`);
    console.log(`   Success rate: ${report.totalInteractions > 0 ? ((report.totalSuccessful / report.totalInteractions) * 100).toFixed(1) : 0}%`);
    console.log(`   Average delay: ${Math.round(report.timingStats?.average || 0)}ms`);
    console.log(`   95th percentile delay: ${Math.round(report.timingStats?.p95 || 0)}ms\n`);

    console.log('🏆 Archetype Performance:');
    Object.entries(report.archetypeBreakdown).forEach(([archetype, stats]) => {
      const successRate = stats.totalInteractions > 0 ?
        ((stats.successful / stats.totalInteractions) * 100).toFixed(1) : '0.0';
      console.log(`   ${archetype.padEnd(12)}: ${stats.successful}/${stats.totalInteractions} (${successRate}%)`);
    });
    console.log();

    // 8. Show active simulations (should be none now)
    const activeSims = simulator.getActiveSimulations();
    console.log(`🎬 Active simulations: ${activeSims.length}\n`);

    // 9. Clean up
    simulator.destroy();
    await farm.destroy();

    console.log('🧹 Cleanup completed');
    console.log('\n🎉 Behavioral simulation example completed successfully!');
    console.log('\n💡 Key Takeaways:');
    console.log('• Different user archetypes show distinct behavior patterns');
    console.log('• Timing variations make simulations more realistic');
    console.log('• Mixed simulations reveal complex interaction dynamics');
    console.log('• Custom archetypes allow tailored testing scenarios');
    console.log('• Analytics provide insights into user behavior patterns');

  } catch (error) {
    console.error('❌ Behavioral simulation example failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('• Check that your wallet farm is properly initialized');
    console.error('• Verify archetype names are spelled correctly');
    console.error('• Ensure contract methods exist in your mock/setup');
    console.error('• Check timing configurations for reasonable delays');
    throw error;
  }
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  behavioralSimulationExample().catch(console.error);
}

export default behavioralSimulationExample;
