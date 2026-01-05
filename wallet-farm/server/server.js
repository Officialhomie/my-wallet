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

// CORS configuration - supports environment variable for production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3002'];

console.log('🌐 Allowed CORS origins:', allowedOrigins);

// Create Express app and HTTP server
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Global state
let walletFarm = null;
let fundDistributor = null;
let behaviorSimulator = null;
let fundingWalletNetwork = null; // Track funding wallet's network

// Contract registry for testing
const contractRegistry = new Map(); // Map<contractId, { network, address, abi, name, metadata }>

// Active simulations
const activeSimulations = new Map(); // Map<simulationId, { status, results, config }>

// USDC Contract addresses for different networks
const USDC_ADDRESSES = {
  'sepolia': '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC231BcE1A81f',
  'arbitrum-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'polygon-mumbai': '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
  'optimism-sepolia': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  'ethereum': '0xA0b86a33E6441e88c5F2712C3E9b74EF3b7c7f0'
};

// Standard ERC-20 ABI (required for token distributions)
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)'
];

// RPC URLs for different networks (using reliable public endpoints)
const RPC_URLS = {
  'sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
  'base-sepolia': 'https://base-sepolia-rpc.publicnode.com',
  'arbitrum-sepolia': 'https://arbitrum-sepolia-rpc.publicnode.com',
  'polygon-mumbai': 'https://polygon-mumbai-rpc.publicnode.com',
  'optimism-sepolia': 'https://optimism-sepolia-rpc.publicnode.com',
  'ethereum': 'https://ethereum-rpc.publicnode.com'
};

// Chain configurations
const CHAIN_CONFIGS = {
  'sepolia': { chainId: 11155111, blockTime: 12000 },
  'base-sepolia': { chainId: 84532, blockTime: 2000 },
  'arbitrum-sepolia': { chainId: 421614, blockTime: 250 },
  'optimism-sepolia': { chainId: 11155420, blockTime: 2000 },
  'polygon-mumbai': { chainId: 80001, blockTime: 2000 }
};

// Initialize wallet farm
function initializeWalletFarm() {
  try {
    console.log('🚀 Initializing Wallet Farm...');

    // Step 1: Create wallet farm
    walletFarm = new WalletFarm(TEST_MNEMONIC, 10); // Default 10 wallets
    console.log(`✅ Generated ${walletFarm.getStats().totalWallets} wallets`);

    // Step 2: Connect wallets to all available chains
    const chainConfigs = [];

    Object.entries(RPC_URLS).forEach(([networkName, rpcUrl]) => {
      const chainConfig = CHAIN_CONFIGS[networkName];
      if (chainConfig && rpcUrl) {
        chainConfigs.push({
          name: networkName,
          chainId: chainConfig.chainId,
          rpcUrl: rpcUrl,
          blockTime: chainConfig.blockTime
        });
        console.log(`📡 Configured chain: ${networkName} (chainId: ${chainConfig.chainId})`);
      }
    });

    if (chainConfigs.length === 0) {
      throw new Error('No RPC URLs configured. Set environment variables like ETHEREUM_SEPOLIA_RPC, BASE_SEPOLIA_RPC, etc.');
    }

    // CRITICAL: Connect wallets to chains BEFORE creating distributor
    console.log(`🔗 Connecting wallets to ${chainConfigs.length} chains...`);
    walletFarm.connectToChains(chainConfigs);
    console.log(`✅ All wallets connected to ${chainConfigs.length} chains`);

    // Step 3: Initialize fund distributor (requires connected wallets)
    fundDistributor = new FundDistributor(walletFarm, { verbose: true });
    console.log('✅ FundDistributor initialized');

    // Step 4: Initialize BehaviorSimulator with deterministic RNG
    const seededRng = new SeededRandom(Date.now()); // Use timestamp for seed
    behaviorSimulator = new BehaviorSimulator(walletFarm, {
      verbose: false,
      enableAnalytics: true,
      rng: seededRng
    });
    console.log('✅ BehaviorSimulator initialized');

    // Step 5: Validate setup
    const stats = walletFarm.getStats();
    console.log('📊 Wallet Farm Stats:', {
      totalWallets: stats.totalWallets,
      connectedChains: stats.connectedChains,
      walletsPerChain: stats.walletsByChain
    });

    console.log('✅ Wallet Farm initialization complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize wallet farm:', error.message);
    console.error('Stack:', error.stack);
    throw error; // Fail fast - don't continue without working wallet farm
  }
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    walletFarm: walletFarm ? 'initialized' : 'not initialized',
    fundingWallet: fundDistributor?.fundingWallet ? 'configured' : 'not configured'
  });
});

// Get wallet farm statistics
app.get('/api/wallets/stats', (req, res) => {
  try {
    if (!walletFarm) {
      // Try to initialize if not already done
      if (!initializeWalletFarm()) {
        return res.status(500).json({ error: 'Failed to initialize wallet farm' });
      }
    }

    const stats = walletFarm.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting wallet stats:', error);
    res.status(500).json({ error: 'Failed to get wallet statistics' });
  }
});

// Get all wallet addresses
app.get('/api/wallets', (req, res) => {
  try {
    if (!walletFarm) {
      // Try to initialize if not already done
      if (!initializeWalletFarm()) {
        return res.status(500).json({ error: 'Failed to initialize wallet farm' });
      }
    }

    const walletData = walletFarm.exportWalletData();
    const wallets = walletData.map((wallet) => ({
      index: wallet.index,
      address: wallet.address,
      path: wallet.derivationPath
    }));

    res.json({ wallets });
  } catch (error) {
    console.error('Error getting wallets:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
});

// Get wallet balances for a specific network
app.get('/api/wallets/balances/:network', async (req, res) => {
  try {
    const { network } = req.params;

    if (!walletFarm) {
      // Try to initialize if not already done
      if (!initializeWalletFarm()) {
        return res.status(500).json({ error: 'Failed to initialize wallet farm' });
      }
    }

    if (!RPC_URLS[network]) {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URLS[network]);
    const walletData = walletFarm.exportWalletData();
    const balances = [];

    // Test provider connection first
    try {
      await provider.getBlockNumber();
      console.log(`✅ Connected to ${network} RPC`);
    } catch (error) {
      console.error(`❌ Failed to connect to ${network} RPC:`, error.message);
      return res.status(500).json({
        error: `Failed to connect to ${network} network`,
        details: error.message
      });
    }

    for (let i = 0; i < walletData.length; i++) {
      try {
        console.log(`📊 Getting balance for wallet ${i}: ${walletData[i].address}`);
        const balance = await provider.getBalance(walletData[i].address);
        const ethBalance = ethers.formatEther(balance);

        let usdcBalance = '0';
        if (USDC_ADDRESSES[network]) {
          try {
            const usdcContract = new ethers.Contract(
              USDC_ADDRESSES[network],
              ['function balanceOf(address) view returns (uint256)'],
              provider
            );
            const usdcBal = await usdcContract.balanceOf(walletData[i].address);
            usdcBalance = ethers.formatUnits(usdcBal, 6); // USDC has 6 decimals
          } catch (usdcError) {
            console.warn(`⚠️ Failed to get USDC balance for wallet ${i}:`, usdcError.message);
            usdcBalance = '0';
          }
        }

        balances.push({
          index: i,
          address: walletData[i].address,
          eth: ethBalance,
          usdc: usdcBalance,
          network
        });
      } catch (error) {
        console.error(`❌ Failed to get balance for wallet ${i}:`, error.message);
        balances.push({
          index: i,
          address: walletData[i].address,
          eth: '0',
          usdc: '0',
          network,
          error: error.message
        });
      }
    }

    res.json({ balances });
  } catch (error) {
    console.error('Error getting balances:', error);
    res.status(500).json({ error: 'Failed to get balances' });
  }
});

// Configure funding wallet
app.post('/api/funding/wallet', async (req, res) => {
  try {
    const { privateKey, network } = req.body;

    if (!privateKey || !network) {
      return res.status(400).json({ error: 'Private key and network are required' });
    }

    if (!RPC_URLS[network]) {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URLS[network]);
    const wallet = new ethers.Wallet(privateKey, provider);

    fundDistributor.setFundingWallet(wallet);
    fundingWalletNetwork = network;

    const balance = await provider.getBalance(wallet.address);

    res.json({
      address: wallet.address,
      balance: ethers.formatEther(balance),
      network: fundingWalletNetwork
    });
  } catch (error) {
    console.error('Error configuring funding wallet:', error);
    res.status(500).json({ error: 'Failed to configure funding wallet' });
  }
});

// Get funding wallet info
app.get('/api/funding/wallet', async (req, res) => {
  try {
    const fundingWallet = fundDistributor.fundingWallet;
    if (!fundingWallet) {
      return res.json({ configured: false });
    }

    const balance = await fundingWallet.provider.getBalance(fundingWallet.address);
    res.json({
      configured: true,
      address: fundingWallet.address,
      balance: ethers.formatEther(balance),
      network: fundingWalletNetwork
    });
  } catch (error) {
    console.error('Error getting funding wallet info:', error);
    res.status(500).json({ error: 'Failed to get funding wallet info' });
  }
});

// Distribute native tokens
app.post('/api/funding/distribute/native', async (req, res) => {
  try {
    const { network, amount, strategy = 'equal' } = req.body;

    if (!network || !amount) {
      return res.status(400).json({ error: 'Network and amount are required' });
    }

    if (network !== fundingWalletNetwork) {
      return res.status(400).json({
        error: `Funding wallet is configured for ${fundingWalletNetwork}, but requested ${network}`
      });
    }

    const roundedAmount = parseFloat(amount).toFixed(8);
    const distributionResult = await fundDistributor.distributeNativeTokens(roundedAmount, network, strategy);

    // FIXED: Access properties from distributionResult.summary (not root)
    res.json({
      success: true,
      network,
      amount: roundedAmount,
      strategy,
      distributionId: distributionResult.distributionId,
      totalWallets: distributionResult.summary.totalWallets,
      successful: distributionResult.summary.successful,
      failed: distributionResult.summary.failed,
      totalDistributed: distributionResult.summary.totalDistributed,
      duration: distributionResult.summary.duration,
      results: distributionResult.results.map((result) => ({
        walletIndex: result.walletIndex,
        address: result.address,
        success: result.success,
        amount: result.amount,
        txHash: result.txHash,
        gasUsed: result.gasUsed?.toString(),
        error: result.error,
        timestamp: result.timestamp
      }))
    });
  } catch (error) {
    console.error('Error distributing native tokens:', error);
    res.status(500).json({
      error: 'Failed to distribute native tokens',
      details: error.message
    });
  }
});

// Distribute ERC-20 tokens (USDC)
app.post('/api/funding/distribute/erc20', async (req, res) => {
  try {
    const { network, amount, strategy = 'equal' } = req.body;

    if (!network || !amount) {
      return res.status(400).json({ error: 'Network and amount are required' });
    }

    if (!USDC_ADDRESSES[network]) {
      return res.status(400).json({ error: 'USDC not supported on this network' });
    }

    if (network !== fundingWalletNetwork) {
      return res.status(400).json({
        error: `Funding wallet is configured for ${fundingWalletNetwork}, but requested ${network}`
      });
    }

    const roundedAmount = parseFloat(amount).toFixed(6); // USDC has 6 decimals

    // CRITICAL FIX: distributeERC20Tokens requires tokenABI as second parameter
    const distributionResult = await fundDistributor.distributeERC20Tokens(
      USDC_ADDRESSES[network],  // tokenAddress
      ERC20_ABI,                 // tokenABI (was missing!)
      roundedAmount,             // amountPerWallet
      network,                   // chainName
      strategy                   // strategy
    );

    // FIXED: Access properties from distributionResult.summary (not root)
    res.json({
      success: true,
      network,
      token: 'USDC',
      tokenAddress: USDC_ADDRESSES[network],
      amount: roundedAmount,
      strategy,
      distributionId: distributionResult.distributionId,
      totalWallets: distributionResult.summary.totalWallets,
      successful: distributionResult.summary.successful,
      failed: distributionResult.summary.failed,
      totalDistributed: distributionResult.summary.totalDistributed,
      duration: distributionResult.summary.duration,
      results: distributionResult.results.map((result) => ({
        walletIndex: result.walletIndex,
        address: result.address,
        success: result.success,
        amount: result.amount,
        txHash: result.txHash,
        gasUsed: result.gasUsed?.toString(),
        error: result.error,
        timestamp: result.timestamp
      }))
    });
  } catch (error) {
    console.error('Error distributing ERC-20 tokens:', error);
    res.status(500).json({
      error: 'Failed to distribute ERC-20 tokens',
      details: error.message
    });
  }
});

// Verify wallet balances
app.get('/api/funding/verify/:network', async (req, res) => {
  try {
    const { network } = req.params;
    const { minBalance = '0.0001' } = req.query;

    if (!walletFarm) {
      return res.status(400).json({ error: 'Wallet farm not initialized' });
    }

    if (!RPC_URLS[network]) {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    const minBal = parseFloat(minBalance).toFixed(8);
    const verificationResult = await fundDistributor.verifyBalances(network, minBal);

    // Map FundDistributor response to expected format
    const totalWallets = verificationResult.checkedWallets;
    const insufficientCount = verificationResult.insufficientWallets.length;
    const sufficientCount = totalWallets - insufficientCount;

    res.json({
      network,
      minBalance: minBal,
      allSufficient: verificationResult.allSufficient,
      insufficientWallets: verificationResult.insufficientWallets,
      checkedWallets: verificationResult.checkedWallets,
      minimumRequired: verificationResult.minimumRequired,
      tokenType: verificationResult.tokenType || 'native',
      // Legacy fields for compatibility
      allFunded: verificationResult.allSufficient,
      funded: sufficientCount,
      unfunded: insufficientCount,
      totalWallets: totalWallets
    });
  } catch (error) {
    console.error('Error verifying balances:', error);
    res.status(500).json({
      error: error.message || 'Failed to verify balances',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ============================================================================
// CONTRACT TESTING & SIMULATION ENDPOINTS
// ============================================================================

// Register a contract for testing
app.post('/api/contracts/register', (req, res) => {
  try {
    const { network, address, abi, name, metadata = {} } = req.body;

    // Validation
    if (!network || !address || !abi || !name) {
      return res.status(400).json({
        error: 'Missing required fields: network, address, abi, name'
      });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }

    if (!Array.isArray(abi) || abi.length === 0) {
      return res.status(400).json({ error: 'ABI must be a non-empty array' });
    }

    if (!RPC_URLS[network]) {
      return res.status(400).json({ error: `Unsupported network: ${network}` });
    }

    // Generate contract ID
    const contractId = `contract_${network}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store in registry
    contractRegistry.set(contractId, {
      id: contractId,
      network,
      address,
      abi,
      name,
      metadata,
      registeredAt: new Date().toISOString()
    });

    console.log(`📝 Registered contract: ${name} on ${network} (${address})`);

    res.json({
      success: true,
      contractId,
      message: `Contract ${name} registered successfully`
    });
  } catch (error) {
    console.error('Error registering contract:', error);
    res.status(500).json({
      error: 'Failed to register contract',
      details: error.message
    });
  }
});

// Get registered contracts
app.get('/api/contracts', (req, res) => {
  try {
    const contracts = Array.from(contractRegistry.values()).map(contract => ({
      id: contract.id,
      name: contract.name,
      network: contract.network,
      address: contract.address,
      registeredAt: contract.registeredAt,
      metadata: contract.metadata
    }));

    res.json({ contracts });
  } catch (error) {
    console.error('Error getting contracts:', error);
    res.status(500).json({
      error: 'Failed to get contracts',
      details: error.message
    });
  }
});

// Get specific contract details
app.get('/api/contracts/:contractId', (req, res) => {
  try {
    const { contractId } = req.params;
    const contract = contractRegistry.get(contractId);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({ contract });
  } catch (error) {
    console.error('Error getting contract:', error);
    res.status(500).json({
      error: 'Failed to get contract',
      details: error.message
    });
  }
});

// Start a behavioral simulation
app.post('/api/simulation/start', async (req, res) => {
  try {
    const {
      contractId,
      archetype,
      walletIndex,
      iterations = 10,
      method,
      params = [],
      value
    } = req.body;

    // Validation
    if (!contractId || !archetype || walletIndex === undefined || !method) {
      return res.status(400).json({
        error: 'Missing required fields: contractId, archetype, walletIndex, method'
      });
    }

    if (!behaviorSimulator) {
      return res.status(500).json({ error: 'BehaviorSimulator not initialized' });
    }

    const contract = contractRegistry.get(contractId);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found. Register it first.' });
    }

    // Get wallet and provider for the network
    const wallet = walletFarm.getWallet(walletIndex, contract.network);
    if (!wallet) {
      return res.status(400).json({
        error: `Wallet ${walletIndex} not connected to ${contract.network}`
      });
    }

    // Create contract instance connected to wallet
    const contractInstance = new ethers.Contract(contract.address, contract.abi, wallet);

    // Generate simulation ID
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store initial simulation state
    activeSimulations.set(simulationId, {
      id: simulationId,
      status: 'starting',
      contractId,
      contract: contract.name,
      network: contract.network,
      archetype,
      walletIndex,
      iterations,
      method,
      startedAt: new Date().toISOString(),
      results: []
    });

    // Return immediately with simulation ID
    res.json({
      success: true,
      simulationId,
      message: 'Simulation started',
      status: 'running'
    });

    // Run simulation asynchronously
    (async () => {
      try {
        const simulation = activeSimulations.get(simulationId);
        simulation.status = 'running';

        console.log(`🎬 Starting simulation ${simulationId}: ${archetype} on ${contract.name}`);

        // Execute simulation
        const result = await behaviorSimulator.simulateArchetype(
          archetype,
          contractInstance,
          wallet,
          iterations,
          {
            contractMethod: method,
            contractParams: params,
            value: value
          }
        );

        // Update simulation with results
        simulation.status = 'completed';
        simulation.completedAt = new Date().toISOString();
        simulation.results = result;

        console.log(`✅ Simulation ${simulationId} completed: ${result.successfulInteractions}/${result.totalIterations} successful`);

        // Emit via WebSocket
        io.emit('simulation:complete', {
          simulationId,
          results: result
        });

      } catch (error) {
        console.error(`❌ Simulation ${simulationId} failed:`, error);
        const simulation = activeSimulations.get(simulationId);
        if (simulation) {
          simulation.status = 'failed';
          simulation.error = error.message;
          simulation.failedAt = new Date().toISOString();
        }

        io.emit('simulation:error', {
          simulationId,
          error: error.message
        });
      }
    })();

  } catch (error) {
    console.error('Error starting simulation:', error);
    res.status(500).json({
      error: 'Failed to start simulation',
      details: error.message
    });
  }
});

// Get simulation status
app.get('/api/simulation/:simulationId', (req, res) => {
  try {
    const { simulationId } = req.params;
    const simulation = activeSimulations.get(simulationId);

    if (!simulation) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    res.json({ simulation });
  } catch (error) {
    console.error('Error getting simulation:', error);
    res.status(500).json({
      error: 'Failed to get simulation',
      details: error.message
    });
  }
});

// Get all simulations
app.get('/api/simulations', (req, res) => {
  try {
    const simulations = Array.from(activeSimulations.values()).map(sim => ({
      id: sim.id,
      status: sim.status,
      contract: sim.contract,
      network: sim.network,
      archetype: sim.archetype,
      walletIndex: sim.walletIndex,
      startedAt: sim.startedAt,
      completedAt: sim.completedAt,
      failedAt: sim.failedAt
    }));

    res.json({ simulations });
  } catch (error) {
    console.error('Error getting simulations:', error);
    res.status(500).json({
      error: 'Failed to get simulations',
      details: error.message
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });

  // Real-time simulation updates
  socket.on('subscribe_simulation', (simulationId) => {
    socket.join(`simulation:${simulationId}`);
    console.log(`📡 Client subscribed to simulation: ${simulationId}`);
  });

  socket.on('unsubscribe_simulation', (simulationId) => {
    socket.leave(`simulation:${simulationId}`);
    console.log(`📡 Client unsubscribed from simulation: ${simulationId}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Wallet Farm API Server running on port ${PORT}`);
  console.log(`🌐 WebSocket server ready`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);

  // Initialize wallet farm on startup
  initializeWalletFarm();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down Wallet Farm API Server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down Wallet Farm API Server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});