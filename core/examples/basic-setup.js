#!/usr/bin/env node

/**
 * Basic Wallet Farm Setup Example
 *
 * This example demonstrates how to:
 * 1. Create a WalletFarm instance
 * 2. Generate multiple wallets from a mnemonic
 * 3. Connect to blockchain networks
 * 4. Export wallet information
 */

import { WalletFarm } from '../src/core/WalletFarm.js';
import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

// Use test mnemonic (NEVER use real funds with this in production!)
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function basicSetup() {
  console.log('🚀 Setting up basic wallet farm...\n');

  try {
    // 1. Create WalletFarm instance
    console.log('📝 Creating wallet farm with 10 wallets...');
    const farm = new WalletFarm(TEST_MNEMONIC, 10, {
      verbose: true,
      enableAnalytics: true
    });

    console.log(`✅ Generated ${farm.numberOfWallets} wallets from mnemonic`);
    console.log();

    // 2. Display wallet information
    console.log('📋 Generated Wallet Addresses:');
    const addresses = farm.getAllAddresses();
    addresses.forEach((address, index) => {
      console.log(`  ${index.toString().padStart(2, '0')}: ${address}`);
    });
    console.log();

    // 3. Connect to test networks (if RPC URLs are configured)
    const chainConfigs = [];

    if (process.env.ETHEREUM_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'sepolia',
        chainId: 11155111,
        rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC
      });
    }

    if (process.env.BASE_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'base-sepolia',
        chainId: 84532,
        rpcUrl: process.env.BASE_SEPOLIA_RPC
      });
    }

    if (chainConfigs.length > 0) {
      console.log('🌐 Connecting to blockchain networks...');
      farm.connectToChains(chainConfigs);
      console.log(`✅ Connected to ${chainConfigs.length} networks\n`);
    } else {
      console.log('⚠️  No RPC URLs configured. Skipping network connections.\n');
      console.log('   To connect to networks, set these environment variables:');
      console.log('   - ETHEREUM_SEPOLIA_RPC');
      console.log('   - BASE_SEPOLIA_RPC');
      console.log();
    }

    // 4. Export wallet data (without private keys for security)
    console.log('💾 Exporting wallet data...');
    const walletData = farm.exportWalletData(false); // Don't include private keys

    console.log('📊 Wallet Farm Summary:');
    console.log(`   Total Wallets: ${walletData.length}`);
    console.log(`   Connected Chains: ${Array.from(farm.providers.keys()).join(', ') || 'None'}`);
    console.log(`   Analytics Enabled: ${farm.options.enableAnalytics}`);
    console.log();

    // 5. Get farm statistics
    const stats = farm.getStats();
    console.log('📈 Farm Statistics:');
    console.log(`   Total Wallets: ${stats.totalWallets}`);
    console.log(`   Connected Chains: ${stats.connectedChains.join(', ') || 'None'}`);
    console.log(`   Wallets per Chain:`, JSON.stringify(stats.walletsByChain, null, 2));
    console.log();

    // 6. Demonstrate transaction recording (simulated)
    console.log('📝 Recording sample transactions...');
    farm.recordTransaction({
      walletIndex: 0,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      chainName: 'sepolia',
      functionName: 'transfer',
      gasUsed: 21000,
      success: true
    });

    farm.recordTransaction({
      walletIndex: 1,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      chainName: 'sepolia',
      functionName: 'approve',
      gasUsed: 45000,
      success: true
    });

    const txHistory = farm.getTransactionHistory();
    console.log(`✅ Recorded ${txHistory.length} transactions`);
    console.log();

    // 7. Clean up
    await farm.destroy();
    console.log('🧹 Cleanup completed');

    console.log('\n🎉 Basic wallet farm setup completed successfully!');
    console.log('\nNext steps:');
    console.log('• Run fund-distribution.js to fund your wallets');
    console.log('• Run behavioral-simulation.js to simulate user interactions');
    console.log('• Check the docs/ folder for detailed implementation guides');

    return farm;

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('• Make sure you have Node.js 18+ installed');
    console.error('• Check that your .env file is configured correctly');
    console.error('• Verify your mnemonic is valid (12 or 24 words)');
    throw error;
  }
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicSetup().catch(console.error);
}

export default basicSetup;
