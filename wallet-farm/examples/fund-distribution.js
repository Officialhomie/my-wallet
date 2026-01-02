#!/usr/bin/env node

/**
 * Fund Distribution Example
 *
 * This example demonstrates how to:
 * 1. Set up a funding wallet
 * 2. Distribute native tokens (ETH) to all wallets
 * 3. Distribute ERC-20 tokens to all wallets
 * 4. Verify wallet balances
 * 5. Refill wallets when needed
 * 6. Use different distribution strategies
 */

import { WalletFarm, FundDistributor } from '../src/core/index.js';
import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

// Test mnemonic (NEVER use real funds with this in production!)
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// ERC-20 Token ABI (standard ERC-20 interface)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

// Example ERC-20 token addresses (on Sepolia testnet)
// Replace with actual token addresses you want to test with
const EXAMPLE_TOKENS = {
  sepolia: {
    // You would replace these with actual deployed token addresses
    // For this example, we'll use mock addresses
    testToken: '0x1234567890123456789012345678901234567890'
  }
};

async function fundDistributionExample() {
  console.log('💰 Fund Distribution Example\n');

  try {
    // 1. Create wallet farm
    console.log('📝 Creating wallet farm with 5 wallets...');
    const farm = new WalletFarm(TEST_MNEMONIC, 5, {
      verbose: true,
      enableAnalytics: true
    });
    console.log();

    // 2. Set up chains (only Sepolia for this example)
    const chainConfigs = [];

    if (process.env.ETHEREUM_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'sepolia',
        chainId: 11155111,
        rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC,
        blockTime: 12000
      });
    } else {
      // Use public RPC for demonstration
      chainConfigs.push({
        name: 'sepolia',
        chainId: 11155111,
        rpcUrl: 'https://rpc.sepolia.org',
        blockTime: 12000
      });
      console.log('⚠️  Using public RPC endpoint. For production use, set ETHEREUM_SEPOLIA_RPC in .env\n');
    }

    console.log('🌐 Connecting to Sepolia testnet...');
    farm.connectToChains(chainConfigs);
    console.log();

    // 3. Create fund distributor
    console.log('🚀 Setting up fund distributor...');
    const distributor = new FundDistributor(farm, {
      verbose: true,
      batchSize: 3, // Process 3 wallets at a time
      humanDelay: true // Add realistic delays
    });

    // 4. Set up funding wallet
    console.log('🔑 Setting up funding wallet...');

    // For demonstration, we'll create a mock funding wallet
    // In real usage, you would use a wallet with actual testnet funds
    const mockFundingWallet = createMockFundingWallet();

    console.log('💼 Funding wallet address:', mockFundingWallet.address);
    console.log('💰 Mock balance: 10 ETH\n');

    distributor.setFundingWallet(mockFundingWallet);

    // 5. Check current wallet balances
    console.log('📊 Checking current wallet balances...');
    try {
      const balanceCheck = await distributor.verifyBalances('sepolia', 0.01); // Need at least 0.01 ETH

      if (balanceCheck.allSufficient) {
        console.log('✅ All wallets have sufficient balance\n');
      } else {
        console.log(`⚠️  ${balanceCheck.insufficientWallets.length} wallets need funding\n`);

        // Show which wallets need funds
        balanceCheck.insufficientWallets.forEach(wallet => {
          console.log(`   Wallet ${wallet.index}: ${wallet.currentBalance} ETH (needs ${wallet.required})`);
        });
        console.log();
      }
    } catch (error) {
      console.log('⚠️  Could not check balances (network connection issue):', error.message);
      console.log('   Continuing with distribution simulation...\n');
    }

    // 6. Demonstrate different distribution strategies
    console.log('🎯 Demonstrating distribution strategies...\n');

    const strategies = ['equal', 'weighted', 'random'];
    const strategyDescriptions = {
      equal: 'All wallets get the same amount (0.02 ETH)',
      weighted: 'Earlier wallets get more (good for active users)',
      random: 'Random amounts between 50% and 150% of base'
    };

    for (const strategy of strategies) {
      console.log(`📈 Strategy: ${strategy.toUpperCase()}`);
      console.log(`   ${strategyDescriptions[strategy]}`);

      try {
        // For demonstration, we'll simulate the distribution
        // In real usage, this would send actual transactions
        const result = await simulateDistribution(distributor, strategy, 'sepolia', 0.02);

        console.log(`   ✅ Simulated distribution complete`);
        console.log(`   📊 Results: ${result.summary.successful}/${result.summary.totalWallets} successful`);
        console.log(`   💰 Total distributed: ${result.summary.totalDistributed.toFixed(4)} ETH`);
        console.log(`   ⏱️  Duration: ${result.summary.duration}ms\n`);

      } catch (error) {
        console.log(`   ❌ Strategy ${strategy} failed:`, error.message);
        console.log();
      }
    }

    // 7. Demonstrate ERC-20 token distribution
    console.log('🪙 Demonstrating ERC-20 token distribution...');

    if (process.env.ETHEREUM_SEPOLIA_RPC) {
      try {
        // Use a mock ERC-20 token for demonstration
        const tokenAddress = EXAMPLE_TOKENS.sepolia.testToken;
        const tokenAmount = 100; // 100 tokens per wallet

        console.log(`   Token: ${tokenAddress}`);
        console.log(`   Amount per wallet: ${tokenAmount} tokens`);

        const tokenResult = await simulateERC20Distribution(distributor, tokenAddress, ERC20_ABI, tokenAmount, 'sepolia');

        console.log(`   ✅ Simulated ERC-20 distribution complete`);
        console.log(`   📊 Results: ${tokenResult.summary.successful}/${tokenResult.summary.totalWallets} successful`);
        console.log(`   🪙 Total distributed: ${tokenResult.summary.totalDistributed} tokens\n`);

      } catch (error) {
        console.log(`   ❌ ERC-20 distribution failed:`, error.message);
        console.log();
      }
    } else {
      console.log('   ⚠️  Skipping ERC-20 distribution (no RPC configured)\n');
    }

    // 8. Show distribution history and analytics
    console.log('📋 Distribution History & Analytics:');
    const history = distributor.getDistributionHistory();
    console.log(`   Total distributions: ${history.length}`);

    if (history.length > 0) {
      console.log('   Recent distributions:');
      history.slice(-3).forEach(dist => {
        const date = new Date(dist.timestamp).toLocaleString();
        console.log(`     ${date}: ${dist.type} on ${dist.chainName} - ${dist.successfulDistributions}/${dist.totalWallets} successful`);
      });
    }
    console.log();

    // 9. Generate distribution report
    console.log('📊 Generating distribution report...');
    const report = distributor.generateDistributionReport();

    console.log(`   Total distributions: ${report.totalDistributions}`);
    console.log(`   Total wallets funded: ${report.totalWalletsFunded}`);
    console.log(`   Total tokens distributed: ${report.totalTokensDistributed}`);

    if (Object.keys(report.byChain).length > 0) {
      console.log('   By chain:');
      Object.entries(report.byChain).forEach(([chain, stats]) => {
        console.log(`     ${chain}: ${stats.distributions} distributions, ${stats.successfulWallets} successful wallets`);
      });
    }

    if (report.recentFailures.length > 0) {
      console.log(`   Recent failures: ${report.recentFailures.length}`);
    }
    console.log();

    // 10. Clean up
    distributor.destroy();
    await farm.destroy();

    console.log('🧹 Cleanup completed');
    console.log('\n🎉 Fund distribution example completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('• Get some testnet ETH from a faucet (e.g., sepoliafaucet.com)');
    console.log('• Deploy an ERC-20 token for testing');
    console.log('• Run this example with real transactions');
    console.log('• Check the behavioral-simulation.js example for next steps');

  } catch (error) {
    console.error('❌ Fund distribution example failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('• Make sure you have testnet ETH in your funding wallet');
    console.error('• Check your RPC endpoints in the .env file');
    console.error('• Verify your mnemonic is valid');
    console.error('• For real distributions, ensure funding wallet has sufficient balance');
    throw error;
  }
}

/**
 * Creates a mock funding wallet for demonstration
 * In real usage, you would use a wallet with actual funds
 */
function createMockFundingWallet() {
  // Create a random wallet for demonstration
  const wallet = ethers.Wallet.createRandom();

  // Create a mock provider
  const mockProvider = {
    getBalance: async () => ethers.parseEther('10'), // Mock 10 ETH balance
    getFeeData: async () => ({
      gasPrice: ethers.parseUnits('20', 'gwei')
    })
  };

  // Create a connected wallet that behaves like ethers.Wallet but with mocked methods
  const mockWallet = {
    address: wallet.address,
    privateKey: wallet.privateKey,

    // Mock provider methods
    provider: mockProvider,

    // Mock sendTransaction
    sendTransaction: async (tx) => {
      console.log(`   📤 Mock transaction: ${ethers.formatEther(tx.value)} ETH to ${tx.to}`);

      return {
        hash: `0x${Math.random().toString(16).substring(2, 66)}`,
        wait: async () => ({
          gasUsed: 21000,
          gasPrice: ethers.parseUnits('20', 'gwei'),
          blockNumber: Math.floor(Math.random() * 1000000)
        })
      };
    }
  };

  return mockWallet;
}

/**
 * Simulates native token distribution for demonstration
 */
async function simulateDistribution(distributor, strategy, chainName, amountPerWallet) {
  console.log(`   🔄 Simulating ${strategy} distribution of ${amountPerWallet} ETH per wallet...`);

  // Create mock results for demonstration
  const walletCount = distributor.walletFarm.wallets.size;
  const results = [];
  let totalDistributed = 0;

  for (let i = 0; i < walletCount; i++) {
    let amount;
    switch (strategy) {
      case 'equal':
        amount = amountPerWallet;
        break;
      case 'weighted':
        amount = amountPerWallet * (1 + (walletCount - i) * 0.1);
        break;
      case 'random':
        amount = amountPerWallet * (0.5 + Math.random());
        break;
      default:
        amount = amountPerWallet;
    }

    totalDistributed += amount;

    results.push({
      walletIndex: i,
      address: distributor.walletFarm.wallets.get(i).address,
      amount: amount,
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      success: Math.random() > 0.05, // 95% success rate
      timestamp: Date.now()
    });

    // Small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    summary: {
      totalWallets: walletCount,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDistributed: totalDistributed,
      duration: 500 + (walletCount * 100),
      strategy,
      chainName
    },
    results
  };
}

/**
 * Simulates ERC-20 token distribution for demonstration
 */
async function simulateERC20Distribution(distributor, tokenAddress, tokenABI, amountPerWallet, chainName) {
  console.log(`   🔄 Simulating ERC-20 distribution of ${amountPerWallet} tokens per wallet...`);

  // Create mock token contract
  const mockToken = {
    target: tokenAddress,
    balanceOf: async () => ethers.parseUnits('10000', 18), // Mock balance
    decimals: async () => 18,
    transfer: async (to, amount) => ({
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      wait: async () => ({
        gasUsed: 65000,
        blockNumber: Math.floor(Math.random() * 1000000)
      })
    })
  };

  // Simulate the distribution process
  const walletCount = distributor.walletFarm.wallets.size;
  const results = [];
  let totalDistributed = 0;

  for (let i = 0; i < walletCount; i++) {
    const amount = amountPerWallet; // Equal distribution for simplicity
    totalDistributed += amount;

    const tx = await mockToken.transfer(distributor.walletFarm.wallets.get(i).address, ethers.parseUnits(amount.toString(), 18));
    await tx.wait();

    results.push({
      walletIndex: i,
      address: distributor.walletFarm.wallets.get(i).address,
      amount: amount,
      txHash: tx.hash,
      tokenAddress: tokenAddress,
      success: true,
      timestamp: Date.now()
    });

    // Small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return {
    summary: {
      totalWallets: walletCount,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalDistributed: totalDistributed,
      duration: 1000 + (walletCount * 150),
      strategy: 'equal',
      chainName,
      tokenAddress
    },
    results
  };
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fundDistributionExample().catch(console.error);
}

export default fundDistributionExample;
