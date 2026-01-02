#!/usr/bin/env node

/**
 * Behavioral Simulation Example
 *
 * This example demonstrates how to:
 * 1. Set up behavioral simulation with different user archetypes
 * 2. Run individual archetype simulations
 * 3. Execute mixed-behavior simulations
 * 4. Analyze simulation results and timing patterns
 * 5. Compare different user behaviors
 */

import { WalletFarm, BehaviorSimulator, TimingEngine, UserArchetypes } from '../src/index.js';
import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

// Test mnemonic (NEVER use real funds with this in production!)
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// ERC-20 Token ABI (standard interface)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Mock contract for demonstration
class MockContract {
  constructor(address = '0x1234567890123456789012345678901234567890') {
    this.target = address;
  }

  connect(wallet) {
    return {
      transfer: async (to, amount) => {
        console.log(`   📤 Mock transfer: ${ethers.formatEther(amount)} ETH to ${to}`);

        // Simulate transaction
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
          hash: `0x${Math.random().toString(16).substring(2, 66)}`,
          wait: async () => ({
            gasUsed: 21000,
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
