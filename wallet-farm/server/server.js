#!/usr/bin/env node

/**
 * Wallet Farm API Server
 *
 * Provides REST API and WebSocket endpoints for the Wallet Farm Visual Simulator
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from 'dotenv';
import { ethers } from 'ethers';
import { WalletFarm } from '../src/core/WalletFarm.js';
import { FundDistributor } from '../src/core/FundDistributor.js';
import { BehaviorSimulator } from '../src/simulation/BehaviorSimulator.js';
import { SeededRandom } from '../src/timing/SeededRandom.js';

// Load environment variables
config();

const PORT = process.env.PORT || 3001;

// Initialize wallet farm
const TEST_MNEMONIC = process.env.TEST_MNEMONIC ||
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

console.log('🚀 Starting Wallet Farm API Server...');

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Global state
let walletFarm = null;
let fundDistributor = null;
let simulations = new Map(); // Map<runId, simulationState>
let fundingWalletNetwork = null; // Track which network the funding wallet is configured for

// Initialize wallet farm
try {
  walletFarm = new WalletFarm(TEST_MNEMONIC, 10, {
    verbose: true,
    enableAnalytics: true
  });
  console.log('✅ Wallet farm initialized');

  // Initialize fund distributor
  fundDistributor = new FundDistributor(walletFarm, {
    verbose: true,
    batchSize: 5,
    humanDelay: true
  });
  console.log('✅ Fund distributor initialized');
} catch (error) {
  console.error('❌ Failed to initialize wallet farm or fund distributor:', error);
  process.exit(1);
}

// Initialize ethers providers for multiple networks
const providers = {
  'ethereum': process.env.ETHEREUM_MAINNET_RPC
    ? new ethers.JsonRpcProvider(process.env.ETHEREUM_MAINNET_RPC)
    : null,
  'sepolia': process.env.ETHEREUM_SEPOLIA_RPC
    ? new ethers.JsonRpcProvider(process.env.ETHEREUM_SEPOLIA_RPC)
    : null,
  'base-sepolia': process.env.BASE_SEPOLIA_RPC
    ? new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC)
    : null,
  'arbitrum-sepolia': process.env.ARBITRUM_SEPOLIA_RPC
    ? new ethers.JsonRpcProvider(process.env.ARBITRUM_SEPOLIA_RPC)
    : null,
  'polygon-mumbai': process.env.POLYGON_MUMBAI_RPC
    ? new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC)
    : null,
  'optimism-sepolia': process.env.OPTIMISM_SEPOLIA_RPC
    ? new ethers.JsonRpcProvider(process.env.OPTIMISM_SEPOLIA_RPC)
    : null,
};

// USDC contract addresses on different networks
const USDC_ADDRESSES = {
  'ethereum': '0xA0b86a33E6441c9c5e8d4bE7fB2F5f5f5f5f5f5f5',
  'sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'arbitrum-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'polygon-mumbai': '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
  'optimism-sepolia': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
};

console.log('✅ Ethers providers initialized');

// REST API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    walletCount: walletFarm?.numberOfWallets || 0
  });
});

// Get wallet addresses
app.get('/api/wallets', (req, res) => {
  try {
    const addresses = walletFarm.getAllAddresses();
    res.json({ addresses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ERC20 ABI for USDC balance calls
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

// Get wallet balances (default to sepolia)
app.get('/api/wallets/balances', async (req, res) => {
  try {
    const addresses = walletFarm.getAllAddresses();
    const balances = [];

    const provider = providers['sepolia'];
    const usdcAddress = USDC_ADDRESSES['sepolia'];

    if (!provider) {
      return res.status(400).json({
        error: 'Sepolia network not configured. Please set ETHEREUM_SEPOLIA_RPC in environment variables.'
      });
    }

    for (let i = 0; i < addresses.length; i++) {
      const walletData = {
        index: i,
        address: addresses[i],
        network: 'sepolia',
        eth: { balance: '0.0', raw: '0', status: 'loading' },
        usdc: { balance: '0.0', raw: '0', status: 'loading' }
      };

      try {
        // Get ETH balance
        const ethBalance = await provider.getBalance(addresses[i]);
        walletData.eth = {
          balance: ethers.formatEther(ethBalance),
          raw: ethBalance.toString(),
          status: 'success'
        };

        // Get USDC balance if contract address is available
        if (usdcAddress) {
          try {
            const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
            const usdcBalance = await usdcContract.balanceOf(addresses[i]);
            walletData.usdc = {
              balance: ethers.formatUnits(usdcBalance, 6), // USDC has 6 decimals
              raw: usdcBalance.toString(),
              status: 'success'
            };
          } catch (error) {
            walletData.usdc.status = 'error';
            walletData.usdc.error = `USDC contract error: ${error.message}`;
          }
        } else {
          walletData.usdc.status = 'not_available';
        }

      } catch (error) {
        walletData.eth.status = 'error';
        walletData.eth.error = error.message;
        walletData.usdc.status = 'error';
        walletData.usdc.error = error.message;
      }

      balances.push(walletData);
    }

    res.json({ network: 'sepolia', wallets: balances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get wallet balances for a specific network
app.get('/api/wallets/balances/:network', async (req, res) => {
  try {
    const { network } = req.params;
    const addresses = walletFarm.getAllAddresses();
    const balances = [];

    const provider = providers[network];
    const usdcAddress = USDC_ADDRESSES[network];

    if (!provider) {
      return res.status(400).json({
        error: `Network '${network}' not configured. Please set ${network.toUpperCase()}_RPC in environment variables.`
      });
    }

    for (let i = 0; i < addresses.length; i++) {
      const walletData = {
        index: i,
        address: addresses[i],
        network,
        eth: { balance: '0.0', raw: '0', status: 'loading' },
        usdc: { balance: '0.0', raw: '0', status: 'loading' }
      };

      try {
        // Get ETH balance
        const ethBalance = await provider.getBalance(addresses[i]);
        walletData.eth = {
          balance: ethers.formatEther(ethBalance),
          raw: ethBalance.toString(),
          status: 'success'
        };

        // Get USDC balance if contract address is available
        if (usdcAddress) {
          try {
            const usdcContract = new ethers.Contract(usdcAddress, ERC20_ABI, provider);
            const usdcBalance = await usdcContract.balanceOf(addresses[i]);
            walletData.usdc = {
              balance: ethers.formatUnits(usdcBalance, 6), // USDC has 6 decimals
              raw: usdcBalance.toString(),
              status: 'success'
            };
          } catch (error) {
            walletData.usdc.status = 'error';
            walletData.usdc.error = `USDC contract error: ${error.message}`;
          }
        } else {
          walletData.usdc.status = 'not_available';
        }

      } catch (error) {
        walletData.eth.status = 'error';
        walletData.eth.error = error.message;
        walletData.usdc.status = 'error';
        walletData.usdc.error = error.message;
      }

      balances.push(walletData);
    }

    res.json({ network, wallets: balances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funding endpoints

// Set funding wallet
app.post('/api/funding/wallet', async (req, res) => {
  try {
    const { privateKey, network } = req.body;

    if (!privateKey) {
      return res.status(400).json({ error: 'Private key is required' });
    }

    // Create funding wallet
    const provider = providers[network] || providers['sepolia'];
    if (!provider) {
      return res.status(400).json({ error: `Network '${network}' not configured` });
    }

    const fundingWallet = new ethers.Wallet(privateKey, provider);
    fundDistributor.setFundingWallet(fundingWallet);

    // Track the network this wallet is configured for
    fundingWalletNetwork = network;

    // Get funding wallet balance
    const balance = await fundingWallet.provider.getBalance(fundingWallet.address);

    res.json({
      address: fundingWallet.address,
      balance: ethers.formatEther(balance),
      network
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribute native tokens
app.post('/api/funding/distribute/native', async (req, res) => {
  try {
    const { network, amount, strategy = 'equal' } = req.body;

    if (!network || !amount) {
      return res.status(400).json({ error: 'Network and amount are required' });
    }

    // Fix precision issues by rounding to 8 decimal places
    const roundedAmount = parseFloat(amount).toFixed(8);

    const distributionResult = await fundDistributor.distributeNativeTokens(roundedAmount, network, strategy);

    res.json({
      success: true,
      network,
      amount,
      strategy,
      transactions: distributionResult.results.length,
      results: distributionResult.results.map((result, index) => ({
        walletIndex: result.walletIndex,
        address: result.address,
        success: result.success,
        amount: result.amount,
        txHash: result.txHash,
        gasUsed: result.gasUsed ? result.gasUsed.toString() : null,
        error: result.error || null,
        timestamp: result.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Distribute ERC-20 tokens
app.post('/api/funding/distribute/erc20', async (req, res) => {
  try {
    const { network, tokenAddress, amount, strategy = 'equal' } = req.body;

    if (!network || !tokenAddress || !amount) {
      return res.status(400).json({ error: 'Network, token address, and amount are required' });
    }

    // Fix precision issues by rounding ERC-20 amounts appropriately
    const roundedAmount = parseFloat(amount).toFixed(6); // ERC-20 tokens typically have 6-18 decimals

    const distributionResult = await fundDistributor.distributeERC20Tokens(tokenAddress, roundedAmount, network, strategy);

    res.json({
      success: true,
      network,
      tokenAddress,
      amount,
      strategy,
      transactions: distributionResult.results.length,
      results: distributionResult.results.map((result, index) => ({
        walletIndex: result.walletIndex,
        address: result.address,
        success: result.success,
        amount: result.amount,
        txHash: result.txHash,
        gasUsed: result.gasUsed ? result.gasUsed.toString() : null,
        error: result.error || null,
        timestamp: result.timestamp
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify balances
app.get('/api/funding/verify/:network', async (req, res) => {
  try {
    const { network } = req.params;
    const { minBalance = '0.01' } = req.query;

    // Fix precision issues for balance verification
    const roundedMinBalance = parseFloat(minBalance).toFixed(8);

    const verification = await fundDistributor.verifyBalances(network, roundedMinBalance);

    res.json({
      network,
      minBalance: roundedMinBalance,
      allFunded: verification.allSufficient,
      funded: verification.checkedWallets - verification.insufficientWallets.length,
      unfunded: verification.insufficientWallets.length,
      details: verification.insufficientWallets.map(wallet => ({
        ...wallet,
        sufficient: false
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get funding wallet info
app.get('/api/funding/wallet', async (req, res) => {
  try {
    const fundingWallet = fundDistributor.fundingWallet;
    if (!fundingWallet) {
      return res.json({ configured: false });
    }

    // Get fresh balance
    const balance = await fundingWallet.provider.getBalance(fundingWallet.address);

    res.json({
      configured: true,
      address: fundingWallet.address,
      balance: ethers.formatEther(balance),
      network: fundingWalletNetwork || 'sepolia'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulation endpoints
app.post('/api/simulation/start', (req, res) => {
  try {
    const config = req.body;
    const runId = generateRunId(config);

    // Create simulation state
    const simulation = {
      id: runId,
      status: 'starting',
      config,
      startTime: new Date(),
      wallets: [],
      metrics: {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        tps: 0,
        avgGasUsed: 0n,
        totalGasCost: 0n,
        avgDelay: 0,
        nonceGaps: 0,
        rateLimitedEvents: 0,
        circuitBreakerTrips: 0,
        activeWallets: 0,
        startTime: new Date(),
        lastUpdateTime: new Date(),
      }
    };

    simulations.set(runId, simulation);

    // Start simulation asynchronously
    setTimeout(() => runSimulation(runId), 100);

    res.json({ runId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simulation/:runId/pause', (req, res) => {
  const { runId } = req.params;
  const simulation = simulations.get(runId);

  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  simulation.status = 'paused';
  io.emit('simulation_status', { runId, status: 'paused' });

  res.json({ success: true });
});

app.post('/api/simulation/:runId/resume', (req, res) => {
  const { runId } = req.params;
  const simulation = simulations.get(runId);

  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  simulation.status = 'running';
  io.emit('simulation_status', { runId, status: 'running' });

  res.json({ success: true });
});

app.post('/api/simulation/:runId/stop', (req, res) => {
  const { runId } = req.params;
  const simulation = simulations.get(runId);

  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  simulation.status = 'completed';
  io.emit('simulation_completed', { runId, finalMetrics: simulation.metrics });

  res.json({ success: true });
});

app.get('/api/simulation/:runId/status', (req, res) => {
  const { runId } = req.params;
  const simulation = simulations.get(runId);

  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  res.json(simulation);
});

// Utility functions
function generateRunId(config) {
  // Simple hash function for demo
  const configString = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function runSimulation(runId) {
  const simulation = simulations.get(runId);
  if (!simulation) return;

  simulation.status = 'running';
  io.emit('simulation_started', { runId });
  io.emit('simulation_status', { runId, status: 'running' });

  // Initialize wallets for simulation
  simulation.wallets = walletFarm.getAllAddresses().map((address, index) => ({
    index,
    address,
    archetype: 'casual', // Default archetype
    status: 'idle',
    nonce: 0,
    balance: 0n,
    transactions: [],
    lastActivity: null,
    errorCount: 0,
  }));

  // Send initial wallet data
  io.emit('wallet_update', {
    runId,
    walletIndex: -1, // Update all wallets
    wallets: simulation.wallets
  });

  // Simulate some activity
  let transactionCount = 0;
  const interval = setInterval(() => {
    if (simulation.status !== 'running') {
      clearInterval(interval);
      return;
    }

    // Simulate a transaction
    const walletIndex = Math.floor(Math.random() * simulation.wallets.length);
    const wallet = simulation.wallets[walletIndex];

    const transaction = {
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      functionName: 'transfer',
      parameters: { to: '0x...', amount: '1.0' },
      value: 0n,
      gasUsed: BigInt(Math.floor(Math.random() * 100000) + 21000),
      gasPrice: BigInt(Math.floor(Math.random() * 100) + 10) * 1000000000n,
      status: Math.random() > 0.1 ? 'confirmed' : 'reverted',
      timestamp: new Date(),
      blockNumber: Math.floor(Math.random() * 1000000),
      error: null,
      retryCount: 0,
      timingDelay: Math.floor(Math.random() * 5000),
    };

    wallet.transactions.push(transaction);
    wallet.lastActivity = transaction.timestamp;

    if (transaction.status === 'confirmed') {
      simulation.metrics.successfulTransactions++;
    } else {
      simulation.metrics.failedTransactions++;
    }

    simulation.metrics.totalTransactions++;
    simulation.metrics.lastUpdateTime = new Date();

    // Send updates
    io.emit('transaction_update', { runId, walletIndex, transaction });
    io.emit('metrics_update', { runId, metrics: simulation.metrics });

    transactionCount++;
    if (transactionCount >= 50) {
      simulation.status = 'completed';
      io.emit('simulation_completed', { runId, finalMetrics: simulation.metrics });
      clearInterval(interval);
    }
  }, 1000);
}

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Wallet Farm API Server running on port ${PORT}`);
  console.log(`📊 REST API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});
