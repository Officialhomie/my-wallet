import { ethers } from 'ethers';
import chalk from 'chalk';

/**
 * WalletFarm - Core class for managing HD wallet farms
 *
 * Generates multiple wallet addresses from a single mnemonic seed phrase
 * using BIP-44 derivation paths for EVM-compatible chains.
 */
export class WalletFarm {
  /**
   * Creates a new WalletFarm instance
   *
   * @param {string} mnemonic - BIP-39 mnemonic seed phrase (12 or 24 words)
   * @param {number} [numberOfWallets=10] - Number of wallets to generate
   * @param {Object} [options={}] - Configuration options
   */
  constructor(mnemonic, numberOfWallets = 10, options = {}) {
    // Validate inputs
    if (!mnemonic || typeof mnemonic !== 'string') {
      throw new Error('Valid mnemonic seed phrase is required');
    }

    if (!this.#validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic: must be 12 or 24 words following BIP-39 standard');
    }

    if (!Number.isInteger(numberOfWallets) || numberOfWallets < 1 || numberOfWallets > 1000) {
      throw new Error('numberOfWallets must be an integer between 1 and 1000');
    }

    // Initialize instance properties
    this.mnemonic = mnemonic;
    this.numberOfWallets = numberOfWallets;
    this.options = {
      verbose: options.verbose || false,
      enableAnalytics: options.enableAnalytics ?? true,
      ...options
    };

    // Core data structures
    this.wallets = new Map(); // Map<index, walletData>
    this.providers = new Map(); // Map<chainName, provider>
    this.transactionHistory = [];

    // Generate wallets during initialization
    this.#generateWallets();

    if (this.options.verbose) {
      console.log(chalk.green(`✅ WalletFarm initialized with ${numberOfWallets} wallets`));
    }
  }

  /**
   * Validates mnemonic format
   * @private
   * @param {string} mnemonic - Mnemonic to validate
   * @returns {boolean} True if valid
   */
  #validateMnemonic(mnemonic) {
    if (typeof mnemonic !== 'string') return false;

    const words = mnemonic.trim().split(/\s+/);

    // Check word count (12 or 24 words)
    if (words.length !== 12 && words.length !== 24) {
      return false;
    }

    // Basic word validation (could be enhanced with BIP-39 wordlist check)
    return words.every(word => word.length > 0 && /^[a-z]+$/.test(word));
  }

  /**
   * Generates wallets using BIP-44 derivation path
   * @private
   */
  #generateWallets() {
    try {
      for (let i = 0; i < this.numberOfWallets; i++) {
        // BIP-44 derivation path: m/44'/60'/0'/0/n
        // 44' - BIP-44 purpose
        // 60' - Ethereum coin type
        // 0' - Account 0
        // 0 - External chain
        // n - Address index
        const derivationPath = `m/44'/60'/0'/0/${i}`;

        // Create HDNodeWallet from mnemonic and path
        const hdNode = ethers.HDNodeWallet.fromPhrase(this.mnemonic, null, derivationPath);
        const wallet = new ethers.Wallet(hdNode.privateKey);

        // Store wallet data
        const walletData = {
          index: i,
          address: wallet.address,
          privateKey: wallet.privateKey, // ⚠️ Only expose if explicitly requested
          wallet: wallet,
          derivationPath: derivationPath,
          balance: new Map(), // Map<chainName, balance>
          nonce: 0,
          transactionCount: 0,
          createdAt: new Date().toISOString(),
          connectedChains: new Set()
        };

        this.wallets.set(i, walletData);

        if (this.options.verbose && i < 3) { // Only log first few
          console.log(chalk.blue(`  Wallet ${i}: ${wallet.address}`));
        }
      }

      if (this.options.verbose && this.numberOfWallets > 3) {
        console.log(chalk.blue(`  ... and ${this.numberOfWallets - 3} more wallets`));
      }

    } catch (error) {
      throw new Error(`Failed to generate wallets: ${error.message}`);
    }
  }

  /**
   * Connects all wallets to specified blockchain networks
   *
   * @param {Array<Object>} chainConfigs - Array of chain configuration objects
   * @param {string} chainConfigs[].name - Chain name (e.g., 'sepolia', 'mainnet')
   * @param {number} chainConfigs[].chainId - Chain ID
   * @param {string} chainConfigs[].rpcUrl - RPC endpoint URL
   * @param {number} [chainConfigs[].blockTime] - Average block time in ms
   */
  connectToChains(chainConfigs) {
    if (!Array.isArray(chainConfigs)) {
      throw new Error('chainConfigs must be an array');
    }

    for (const config of chainConfigs) {
      this.#connectToChain(config);
    }

    if (this.options.verbose) {
      console.log(chalk.green(`✅ Connected to ${chainConfigs.length} chains`));
    }
  }

  /**
   * Connects to a single blockchain network
   * @private
   * @param {Object} config - Chain configuration
   */
  #connectToChain(config) {
    const { name, chainId, rpcUrl, blockTime = 12000 } = config;

    if (!name || !chainId || !rpcUrl) {
      throw new Error('Chain config must include name, chainId, and rpcUrl');
    }

    try {
      // Create provider with network configuration
      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId,
        name,
        ensAddress: null // Disable ENS for testnets
      });

      // Store provider
      this.providers.set(name, {
        provider,
        chainId,
        rpcUrl,
        blockTime,
        connectedAt: new Date().toISOString()
      });

      // Connect each wallet to this provider
      for (const [index, walletData] of this.wallets) {
        const connectedWallet = walletData.wallet.connect(provider);

        // Store connected wallet instance
        if (!walletData.connectedWallets) {
          walletData.connectedWallets = new Map();
        }

        walletData.connectedWallets.set(name, connectedWallet);
        walletData.connectedChains.add(name);
      }

      if (this.options.verbose) {
        console.log(chalk.blue(`  Connected to ${name} (chainId: ${chainId})`));
      }

    } catch (error) {
      throw new Error(`Failed to connect to chain ${name}: ${error.message}`);
    }
  }

  /**
   * Gets a connected wallet instance for specific chain
   *
   * @param {number} index - Wallet index (0-based)
   * @param {string} chainName - Chain name
   * @returns {ethers.Wallet} Connected wallet instance
   */
  getWallet(index, chainName) {
    if (!Number.isInteger(index) || index < 0 || index >= this.numberOfWallets) {
      throw new Error(`Wallet index ${index} out of range (0-${this.numberOfWallets - 1})`);
    }

    const walletData = this.wallets.get(index);
    if (!walletData) {
      throw new Error(`Wallet ${index} not found`);
    }

    if (!walletData.connectedChains.has(chainName)) {
      throw new Error(`Wallet ${index} not connected to chain ${chainName}`);
    }

    return walletData.connectedWallets.get(chainName);
  }

  /**
   * Gets wallet balance for specific chain
   *
   * @param {number} index - Wallet index
   * @param {string} chainName - Chain name
   * @returns {Promise<bigint>} Wallet balance in wei
   */
  async getWalletBalance(index, chainName) {
    const wallet = this.getWallet(index, chainName);
    const balance = await wallet.provider.getBalance(wallet.address);

    // Cache balance
    const walletData = this.wallets.get(index);
    walletData.balance.set(chainName, {
      amount: balance,
      updatedAt: new Date().toISOString()
    });

    return balance;
  }

  /**
   * Gets all wallet addresses
   *
   * @returns {string[]} Array of wallet addresses
   */
  getAllAddresses() {
    return Array.from(this.wallets.values()).map(wallet => wallet.address);
  }

  /**
   * Exports wallet data (optionally including private keys)
   *
   * @param {boolean} [includePrivateKeys=false] - Whether to include private keys
   * @returns {Array<Object>} Array of wallet data objects
   */
  exportWalletData(includePrivateKeys = false) {
    const exported = [];

    for (const [index, walletData] of this.wallets) {
      const data = {
        index,
        address: walletData.address,
        derivationPath: walletData.derivationPath,
        connectedChains: Array.from(walletData.connectedChains),
        transactionCount: walletData.transactionCount,
        createdAt: walletData.createdAt
      };

      // Only include private key if explicitly requested
      if (includePrivateKeys) {
        data.privateKey = walletData.privateKey;
      }

      exported.push(data);
    }

    return exported;
  }

  /**
   * Gets wallet statistics
   *
   * @returns {Object} Statistics about the wallet farm
   */
  getStats() {
    const stats = {
      totalWallets: this.numberOfWallets,
      connectedChains: Array.from(this.providers.keys()),
      totalTransactions: this.transactionHistory.length,
      walletsByChain: {}
    };

    // Count wallets per chain
    for (const [chainName] of this.providers) {
      stats.walletsByChain[chainName] = 0;
    }

    for (const walletData of this.wallets.values()) {
      for (const chainName of walletData.connectedChains) {
        stats.walletsByChain[chainName]++;
      }
    }

    return stats;
  }

  /**
   * Records a transaction in history
   *
   * @param {Object} txData - Transaction data
   */
  recordTransaction(txData) {
    if (!this.options.enableAnalytics) return;

    const record = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...txData
    };

    this.transactionHistory.push(record);

    // Update wallet transaction count
    if (txData.walletIndex !== undefined) {
      const walletData = this.wallets.get(txData.walletIndex);
      if (walletData) {
        walletData.transactionCount++;
      }
    }
  }

  /**
   * Gets transaction history
   *
   * @param {Object} [filters={}] - Optional filters
   * @returns {Array} Filtered transaction history
   */
  getTransactionHistory(filters = {}) {
    let history = [...this.transactionHistory];

    if (filters.walletIndex !== undefined) {
      history = history.filter(tx => tx.walletIndex === filters.walletIndex);
    }

    if (filters.chainName) {
      history = history.filter(tx => tx.chainName === filters.chainName);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      history = history.filter(tx => new Date(tx.timestamp) >= sinceDate);
    }

    return history;
  }

  /**
   * Cleans up resources and disconnects providers
   */
  async destroy() {
    // Clear sensitive data
    for (const walletData of this.wallets.values()) {
      if (walletData.privateKey) {
        walletData.privateKey = null;
      }
    }

    // Clear transaction history if configured
    if (this.options.clearHistoryOnDestroy) {
      this.transactionHistory = [];
    }

    if (this.options.verbose) {
      console.log(chalk.yellow('🧹 WalletFarm resources cleaned up'));
    }
  }

  /**
   * Creates a new WalletFarm instance from configuration
   *
   * @param {Object} config - Configuration object
   * @returns {WalletFarm} New WalletFarm instance
   */
  static fromConfig(config) {
    const {
      mnemonic,
      numberOfWallets = 10,
      chains = [],
      options = {}
    } = config;

    if (!mnemonic) {
      throw new Error('Mnemonic is required in config');
    }

    const farm = new WalletFarm(mnemonic, numberOfWallets, options);

    if (chains.length > 0) {
      farm.connectToChains(chains);
    }

    return farm;
  }
}

export default WalletFarm;
