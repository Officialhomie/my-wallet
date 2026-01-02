import { ethers } from 'ethers';

/**
 * Mock Ethereum provider for testing without real RPC
 *
 * Implements the full ethers.js Provider interface for testing
 * Supports nonce management, balance tracking, and transaction simulation
 */
export class MockProvider {
  constructor(config = {}) {
    this.chainId = config.chainId || 11155111; // Sepolia default
    this.startBlock = config.startBlock || 1000000;
    this.blockNumber = this.startBlock;
    this.gasPrice = config.gasPrice || ethers.parseUnits('20', 'gwei');

    // Internal state management
    this._nonces = new Map(); // address => nonce
    this._balances = new Map(); // address => balance (in wei)
    this._pendingTxs = new Map(); // txHash => receipt
    this._confirmedTxs = new Map(); // txHash => receipt
    this._blocks = new Map(); // blockNumber => block data
    this._logs = new Map(); // blockNumber => logs array

    // Fee data for EIP-1559
    this.baseFeePerGas = ethers.parseUnits('10', 'gwei');
    this.maxFeePerGas = ethers.parseUnits('40', 'gwei');
    this.maxPriorityFeePerGas = ethers.parseUnits('2', 'gwei');

    // Initialize genesis block
    this._blocks.set(this.startBlock, {
      number: this.startBlock,
      hash: `0x${'0'.repeat(64)}`,
      timestamp: Math.floor(Date.now() / 1000),
      transactions: []
    });
  }

  // ============================================================================
  // Provider Interface Implementation
  // ============================================================================

  /**
   * Get network information
   */
  async getNetwork() {
    return {
      chainId: BigInt(this.chainId),
      name: this.chainId === 11155111 ? 'sepolia' :
            this.chainId === 1 ? 'homestead' :
            this.chainId === 137 ? 'matic' : 'unknown'
    };
  }

  /**
   * Get transaction count (nonce) for address
   */
  async getTransactionCount(address, blockTag = 'latest') {
    if (blockTag === 'pending') {
      // Include pending transactions
      return this._nonces.get(address.toLowerCase()) || 0;
    }
    // For confirmed, return current nonce
    return this._nonces.get(address.toLowerCase()) || 0;
  }

  /**
   * Get account balance
   */
  async getBalance(address, blockTag = 'latest') {
    const balance = this._balances.get(address.toLowerCase());
    return balance || ethers.parseEther('10'); // Default 10 ETH
  }

  /**
   * Get fee data for gas pricing
   */
  async getFeeData() {
    return {
      gasPrice: this.gasPrice,
      maxFeePerGas: this.maxFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
      lastBaseFeePerGas: this.baseFeePerGas
    };
  }

  /**
   * Get current block number
   */
  async getBlockNumber() {
    return this.blockNumber;
  }

  /**
   * Get block data
   */
  async getBlock(blockHashOrBlockTag, includeTransactions = false) {
    let blockNumber;

    if (typeof blockHashOrBlockTag === 'string' && blockHashOrBlockTag.startsWith('0x')) {
      // It's a hash, find the block
      for (const [num, block] of this._blocks.entries()) {
        if (block.hash === blockHashOrBlockTag) {
          blockNumber = num;
          break;
        }
      }
    } else if (blockHashOrBlockTag === 'latest') {
      blockNumber = this.blockNumber;
    } else if (typeof blockHashOrBlockTag === 'number') {
      blockNumber = blockHashOrBlockTag;
    }

    const block = this._blocks.get(blockNumber);
    if (!block) {
      return null;
    }

    return {
      ...block,
      transactions: includeTransactions ? block.transactions : block.transactions.map(tx => tx.hash)
    };
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(tx) {
    // Simulate gas estimation based on transaction type
    if (tx.data && tx.data !== '0x') {
      // Contract interaction - higher gas
      return 100000n;
    } else {
      // Simple transfer
      return 21000n;
    }
  }

  /**
   * Send raw transaction
   */
  async sendTransaction(signedTx) {
    // Parse the signed transaction (simplified)
    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;

    // Extract from address (simplified - in real ethers this would be done differently)
    const from = signedTx.from || '0x0000000000000000000000000000000000000000';

    // Increment nonce
    const currentNonce = this._nonces.get(from.toLowerCase()) || 0;
    this._nonces.set(from.toLowerCase(), currentNonce + 1);

    // Create transaction receipt
    const receipt = {
      hash: txHash,
      status: 1, // Success
      blockNumber: this.blockNumber + 1,
      blockHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      transactionIndex: 0,
      from: from,
      to: signedTx.to || null,
      gasUsed: 21000n,
      effectiveGasPrice: this.gasPrice,
      logs: [],
      logsBloom: '0x' + '0'.repeat(512),
      type: 2, // EIP-1559
      cumulativeGasUsed: 21000n
    };

    // Store as pending initially
    this._pendingTxs.set(txHash, receipt);

    // Simulate mining after delay
    setTimeout(() => {
      this._mineTransaction(txHash);
    }, 100); // Mine after 100ms

    return txHash;
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    // Check pending first
    let receipt = this._pendingTxs.get(txHash);
    if (receipt) {
      return receipt;
    }

    // Check confirmed
    receipt = this._confirmedTxs.get(txHash);
    return receipt || null;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash, confirmations = 1) {
    // For mocking, just return the receipt immediately
    // In real implementation this would wait for confirmations
    return this.getTransactionReceipt(txHash);
  }

  /**
   * Call contract method (read-only)
   */
  async call(tx) {
    // Mock contract calls
    if (tx.to && tx.data) {
      // Simulate ERC-20 balanceOf call
      if (tx.data.startsWith('0x70a08231')) { // balanceOf signature
        return ethers.zeroPadValue(ethers.parseEther('100'), 32); // Return 100 tokens
      }
      // Simulate ERC-20 transfer call
      if (tx.data.startsWith('0xa9059cbb')) { // transfer signature
        return '0x0000000000000000000000000000000000000000000000000000000000000001'; // Return true
      }
    }

    return '0x'; // Default empty response
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash) {
    const receipt = this._pendingTxs.get(txHash) || this._confirmedTxs.get(txHash);
    if (!receipt) return null;

    return {
      hash: txHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      transactionIndex: receipt.transactionIndex,
      from: receipt.from,
      to: receipt.to,
      value: ethers.parseEther('0.1'), // Mock value
      gasLimit: 21000n,
      gasPrice: receipt.effectiveGasPrice,
      data: '0x',
      nonce: receipt.nonce || 0
    };
  }

  // ============================================================================
  // Helper Methods for Test Control
  // ============================================================================

  /**
   * Set balance for address
   */
  setBalance(address, balance) {
    this._balances.set(address.toLowerCase(), balance);
  }

  /**
   * Set nonce for address
   */
  setNonce(address, nonce) {
    this._nonces.set(address.toLowerCase(), nonce);
  }

  /**
   * Get nonce for address
   */
  getNonce(address) {
    return this._nonces.get(address.toLowerCase()) || 0;
  }

  /**
   * Mine a block with pending transactions
   */
  mineBlock() {
    this.blockNumber++;

    // Move pending transactions to confirmed
    const blockTxs = [];
    for (const [txHash, receipt] of this._pendingTxs.entries()) {
      receipt.blockNumber = this.blockNumber;
      receipt.blockHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      this._confirmedTxs.set(txHash, receipt);
      blockTxs.push(receipt);
    }

    // Clear pending
    this._pendingTxs.clear();

    // Create block
    this._blocks.set(this.blockNumber, {
      number: this.blockNumber,
      hash: `0x${Math.random().toString(16).substring(2, 66)}`,
      timestamp: Math.floor(Date.now() / 1000),
      transactions: blockTxs
    });

    return this.blockNumber;
  }

  /**
   * Mine a specific transaction
   */
  _mineTransaction(txHash) {
    const receipt = this._pendingTxs.get(txHash);
    if (!receipt) return;

    // Move to confirmed
    this._confirmedTxs.set(txHash, receipt);
    this._pendingTxs.delete(txHash);

    // Update block
    receipt.blockNumber = this.blockNumber;
    receipt.blockHash = `0x${Math.random().toString(16).substring(2, 66)}`;
  }

  /**
   * Reset provider state
   */
  reset() {
    this.blockNumber = this.startBlock;
    this._nonces.clear();
    this._balances.clear();
    this._pendingTxs.clear();
    this._confirmedTxs.clear();
    this._blocks.clear();

    // Re-initialize genesis block
    this._blocks.set(this.startBlock, {
      number: this.startBlock,
      hash: `0x${'0'.repeat(64)}`,
      timestamp: Math.floor(Date.now() / 1000),
      transactions: []
    });
  }

  /**
   * Get provider statistics
   */
  getStats() {
    return {
      chainId: this.chainId,
      blockNumber: this.blockNumber,
      totalWallets: this._nonces.size,
      pendingTxs: this._pendingTxs.size,
      confirmedTxs: this._confirmedTxs.size,
      totalBlocks: this._blocks.size
    };
  }
}

export default MockProvider;
