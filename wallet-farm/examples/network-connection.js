#!/usr/bin/env node

/**
 * Network Connection Example
 *
 * This example demonstrates how to:
 * 1. Connect WalletFarm to blockchain networks
 * 2. Check wallet balances
 * 3. Handle network-specific configurations
 */

import { WalletFarm } from '../src/core/WalletFarm.js';
import { ethers } from 'ethers';
import { config } from 'dotenv';

// Load environment variables
config();

// Test mnemonic (NEVER use real funds!)
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

async function networkConnectionExample() {
  console.log('🌐 Network Connection Example\n');

  try {
    // 1. Create wallet farm
    console.log('📝 Creating wallet farm...');
    const farm = new WalletFarm(TEST_MNEMONIC, 5, {
      verbose: true,
      enableAnalytics: true
    });
    console.log();

    // 2. Define network configurations
    const chainConfigs = [];

    // Add Sepolia if configured
    if (process.env.ETHEREUM_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'sepolia',
        chainId: 11155111,
        rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC,
        blockTime: 12000 // 12 seconds
      });
    }

    // Add Base Sepolia if configured
    if (process.env.BASE_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'base-sepolia',
        chainId: 84532,
        rpcUrl: process.env.BASE_SEPOLIA_RPC,
        blockTime: 2000 // 2 seconds (Layer 2)
      });
    }

    // Add Optimism Sepolia if configured
    if (process.env.OPTIMISM_SEPOLIA_RPC) {
      chainConfigs.push({
        name: 'optimism-sepolia',
        chainId: 11155420,
        rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC,
        blockTime: 2000 // 2 seconds (Layer 2)
      });
    }

    if (chainConfigs.length === 0) {
      console.log('⚠️  No RPC URLs configured in .env file');
      console.log('   This example will demonstrate offline functionality only\n');

      // Show how we would connect
      console.log('📋 Example network configurations:');
      console.log(`
ETHEREUM_SEPOLIA_RPC="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
BASE_SEPOLIA_RPC="https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
OPTIMISM_SEPOLIA_RPC="https://opt-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
      `);
      console.log();

      // Still show the wallet data
      const addresses = farm.getAllAddresses();
      console.log('📋 Generated Wallet Addresses (not connected to networks):');
      addresses.forEach((address, index) => {
        console.log(`  ${index}: ${address}`);
      });

      await farm.destroy();
      return;
    }

    // 3. Connect to networks
    console.log(`🌐 Connecting to ${chainConfigs.length} blockchain network(s)...`);
    farm.connectToChains(chainConfigs);
    console.log();

    // 4. Check balances for each wallet on each network
    console.log('💰 Checking wallet balances...\n');

    for (const chainConfig of chainConfigs) {
      const { name: chainName } = chainConfig;
      console.log(`📊 Balances on ${chainName.toUpperCase()}:`);

      for (let i = 0; i < farm.numberOfWallets; i++) {
        try {
          const balance = await farm.getWalletBalance(i, chainName);
          const balanceInEth = ethers.formatEther(balance);

          console.log(`  Wallet ${i}: ${balanceInEth} ETH`);

          // Record this balance check as a transaction (for analytics)
          farm.recordTransaction({
            walletIndex: i,
            chainName,
            functionName: 'getBalance',
            gasUsed: 0, // Balance checks are free
            success: true,
            context: { type: 'balance_check' }
          });

        } catch (error) {
          console.log(`  Wallet ${i}: Error - ${error.message}`);

          farm.recordTransaction({
            walletIndex: i,
            chainName,
            functionName: 'getBalance',
            success: false,
            error: error.message,
            context: { type: 'balance_check' }
          });
        }
      }
      console.log();
    }

    // 5. Demonstrate wallet retrieval
    console.log('🔑 Testing wallet retrieval...');
    try {
      const wallet = farm.getWallet(0, chainConfigs[0].name);
      console.log(`✅ Successfully retrieved wallet 0 for ${chainConfigs[0].name}`);
      console.log(`   Address: ${wallet.address}`);
    } catch (error) {
      console.log(`❌ Failed to retrieve wallet: ${error.message}`);
    }
    console.log();

    // 6. Show farm statistics
    const stats = farm.getStats();
    console.log('📈 Farm Statistics:');
    console.log(`   Total Wallets: ${stats.totalWallets}`);
    console.log(`   Connected Chains: ${stats.connectedChains.join(', ')}`);
    console.log(`   Wallets per Chain:`, JSON.stringify(stats.walletsByChain, null, 2));
    console.log(`   Total Transactions Recorded: ${stats.totalTransactions}`);
    console.log();

    // 7. Show transaction history
    const txHistory = farm.getTransactionHistory();
    console.log('📝 Recent Transactions:');
    txHistory.slice(0, 5).forEach(tx => {
      console.log(`   ${tx.timestamp}: ${tx.functionName} on ${tx.chainName} - ${tx.success ? '✅' : '❌'}`);
    });

    if (txHistory.length > 5) {
      console.log(`   ... and ${txHistory.length - 5} more`);
    }
    console.log();

    // 8. Export wallet data
    console.log('💾 Exporting wallet data...');
    const walletData = farm.exportWalletData(false);
    console.log(`✅ Exported data for ${walletData.length} wallets`);
    console.log('   Sample wallet data:');
    console.log(`   - Address: ${walletData[0].address}`);
    console.log(`   - Index: ${walletData[0].index}`);
    console.log(`   - Connected Chains: ${walletData[0].connectedChains.join(', ')}`);
    console.log();

    // 9. Clean up
    await farm.destroy();
    console.log('🧹 Cleanup completed');

    console.log('\n🎉 Network connection example completed successfully!');
    console.log('\n💡 Tips:');
    console.log('• Use testnet RPC endpoints for development');
    console.log('• Monitor your API usage to avoid rate limits');
    console.log('• Keep your mnemonic secure and never commit it');
    console.log('• Use different mnemonics for different test environments');

  } catch (error) {
    console.error('❌ Network connection example failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('• Check your RPC URLs in the .env file');
    console.error('• Verify network connectivity');
    console.error('• Make sure your mnemonic is valid');
    throw error;
  }
}

// Run the example if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  networkConnectionExample().catch(console.error);
}

export default networkConnectionExample;
