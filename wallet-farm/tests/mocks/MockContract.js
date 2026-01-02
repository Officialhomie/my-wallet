import { ethers } from 'ethers';

/**
 * Mock smart contract for testing
 *
 * Implements ethers.js Contract interface methods needed for testing
 * Supports ERC-20 operations and general contract interactions
 */
export class MockContract {
  constructor(address, abi, provider) {
    this.target = address;
    this.interface = new ethers.Interface(abi);
    this.provider = provider;
    this.runner = { provider }; // Simplified runner

    // Internal contract state
    this._balances = new Map(); // address => balance
    this._allowances = new Map(); // owner => spender => amount
    this._totalSupply = ethers.parseEther('1000000'); // 1M tokens
    this._name = 'Mock Token';
    this._symbol = 'MOCK';
    this._decimals = 18;

    // Mock some initial balances
    this._balances.set('0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('100000'));

    // Create ethers.js compatible methods
    this._createContractMethods();
  }

  /**
   * Create ethers.js compatible contract methods
   * @private
   */
  _createContractMethods() {
    // For each function in the ABI, create a method that returns an object with estimateGas
    this.interface.forEachFunction((func, index) => {
      const methodName = func.name;

      // Create the method that ethers.js expects
      if (!this[methodName]) {
        // Only create if it doesn't exist
        this[methodName] = Object.assign(
          // The actual method implementation
          async (...args) => {
            return this[`_${methodName}`](...args);
          },
          {
            // Add estimateGas method that ethers.js calls
            estimateGas: async (...args) => {
              return this.estimateGas(methodName, ...args);
            },

            // Add staticCall for simulation
            staticCall: async (...args) => {
              return this[`_${methodName}Static`] ? this[`_${methodName}Static`](...args) : this[`_${methodName}`](...args);
            },

            // Add populateTransaction if needed
            populateTransaction: async (...args) => {
              return {
                to: this.target,
                data: this.interface.encodeFunctionData(methodName, args),
                value: 0
              };
            }
          }
        );
      } else {
        // If method exists, just add the ethers.js properties
        this[methodName].estimateGas = this[methodName].estimateGas || (async (...args) => {
          return this.estimateGas(methodName, ...args);
        });

        this[methodName].staticCall = this[methodName].staticCall || (async (...args) => {
          return this[`_${methodName}Static`] ? this[`_${methodName}Static`](...args) : this[methodName](...args);
        });
      }
    });
  }

  // ============================================================================
  // Private method implementations (called by the public ethers.js compatible methods)
  // ============================================================================

  // ============================================================================
  // ERC-20 Standard Methods
  // ============================================================================

  /**
   * Get token balance
   */
  async balanceOf(address) {
    return this._balances.get(address.toLowerCase()) || ethers.parseEther('0');
  }

  /**
   * Get total supply
   */
  async totalSupply() {
    return this._totalSupply;
  }

  /**
   * Transfer tokens (internal implementation)
   */
  async _transfer(to, amount, overrides = {}) {
    // Get the sender address from runner (connected wallet) or overrides
    const from = overrides.from || (this.runner?.address) || '0x0000000000000000000000000000000000000000';
    const fromBalance = await this.balanceOf(from);

    if (fromBalance < amount) {
      throw new Error(`ERC20: transfer amount exceeds balance (from=${from}, balance=${ethers.formatEther(fromBalance)}, amount=${ethers.formatEther(amount)})`);
    }

    // Update balances
    this._balances.set(from.toLowerCase(), fromBalance - amount);
    const toBalance = await this.balanceOf(to);
    this._balances.set(to.toLowerCase(), toBalance + amount);

    // Return transaction result
    return this._createTransactionResult('transfer', [to, amount], { ...overrides, from });
  }

  /**
   * Transfer static call for simulation
   */
  async _transferStatic(to, amount, overrides = {}) {
    const from = overrides.from || '0x0000000000000000000000000000000000000000';
    const fromBalance = await this.balanceOf(from);

    if (fromBalance < amount) {
      throw new Error('ERC20: transfer amount exceeds balance');
    }

    // Simulate success
    return true;
  }

  /**
   * Transfer from (with allowance)
   */
  async transferFrom(from, to, amount, overrides = {}) {
    const spender = overrides.from || '0x0000000000000000000000000000000000000000';

    // Check allowance
    const allowanceKey = `${from.toLowerCase()}:${spender.toLowerCase()}`;
    const allowance = this._allowances.get(allowanceKey) || ethers.parseEther('0');

    if (allowance < amount) {
      throw new Error('ERC20: insufficient allowance');
    }

    // Check balance
    const fromBalance = await this.balanceOf(from);
    if (fromBalance < amount) {
      throw new Error('ERC20: transfer amount exceeds balance');
    }

    // Update balances and allowance
    this._balances.set(from.toLowerCase(), fromBalance - amount);
    const toBalance = await this.balanceOf(to);
    this._balances.set(to.toLowerCase(), toBalance + amount);
    this._allowances.set(allowanceKey, allowance - amount);

    return this._createTransactionResult('transferFrom', [from, to, amount], overrides);
  }

  /**
   * Approve spending
   */
  async approve(spender, amount, overrides = {}) {
    const owner = overrides.from || '0x0000000000000000000000000000000000000000';
    const allowanceKey = `${owner.toLowerCase()}:${spender.toLowerCase()}`;

    this._allowances.set(allowanceKey, amount);

    return this._createTransactionResult('approve', [spender, amount], overrides);
  }

  /**
   * Get allowance
   */
  async allowance(owner, spender) {
    const allowanceKey = `${owner.toLowerCase()}:${spender.toLowerCase()}`;
    return this._allowances.get(allowanceKey) || ethers.parseEther('0');
  }

  /**
   * Get token name
   */
  async name() {
    return this._name;
  }

  /**
   * Get token symbol
   */
  async symbol() {
    return this._symbol;
  }

  /**
   * Get decimals
   */
  async decimals() {
    return this._decimals;
  }

  // ============================================================================
  // Contract Interface Methods
  // ============================================================================

  /**
   * Connect wallet to contract
   */
  connect(wallet) {
    // Create a shallow copy that shares the same state (balances, allowances, etc)
    // but has a different runner
    const connectedContract = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    connectedContract.runner = wallet;
    return connectedContract;
  }

  /**
   * Get contract address
   */
  getAddress() {
    return this.target;
  }

  /**
   * Estimate gas for method call
   */
  async estimateGas(methodName, ...args) {
    // Mock gas estimation
    const methodFragment = this.interface.getFunction(methodName);
    if (!methodFragment) {
      throw new Error(`Method ${methodName} not found`);
    }

    // Base gas for ERC-20 operations
    return 50000n;
  }

  // ============================================================================
  // Static Call Support (for pre-flight simulation)
  // ============================================================================

  /**
   * Static call for balanceOf
   */
  static balanceOf = {
    staticCall: async function(address) {
      // Simulate read-only call
      return ethers.parseEther('100'); // Mock balance
    }
  };

  /**
   * Static call for transfer
   */
  static transfer = {
    staticCall: async function(to, amount) {
      // Simulate pre-flight check
      if (amount > ethers.parseEther('1000')) {
        throw new Error('ERC20: transfer amount exceeds mock balance');
      }
      return true; // Success
    }
  };

  /**
   * Static call for transferFrom
   */
  static transferFrom = {
    staticCall: async function(from, to, amount) {
      // Simulate pre-flight check
      if (amount > ethers.parseEther('500')) {
        throw new Error('ERC20: insufficient allowance');
      }
      return true; // Success
    }
  };

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create mock transaction result
   */
  _createTransactionResult(methodName, params, overrides = {}) {
    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;

    // Create transaction object
    const tx = {
      hash: txHash,
      wait: async (confirmations = 1) => {
        // Simulate waiting for confirmation
        await new Promise(resolve => setTimeout(resolve, 50));

        return {
          hash: txHash,
          status: 1, // Success
          blockNumber: this.provider.blockNumber + 1,
          blockHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          transactionIndex: 0,
          from: overrides.from || '0x0000000000000000000000000000000000000000',
          to: this.target,
          gasUsed: 50000n,
          effectiveGasPrice: this.provider.gasPrice,
          logs: [],
          logsBloom: '0x' + '0'.repeat(512)
        };
      }
    };

    return tx;
  }

  /**
   * Set balance for testing
   */
  setBalance(address, balance) {
    this._balances.set(address.toLowerCase(), balance);
  }

  /**
   * Get balance for testing
   */
  getBalance(address) {
    return this._balances.get(address.toLowerCase()) || ethers.parseEther('0');
  }

  /**
   * Set allowance for testing
   */
  setAllowance(owner, spender, amount) {
    const key = `${owner.toLowerCase()}:${spender.toLowerCase()}`;
    this._allowances.set(key, amount);
  }

  /**
   * Reset contract state
   */
  reset() {
    this._balances.clear();
    this._allowances.clear();
    this._totalSupply = ethers.parseEther('1000000');
    this._balances.set('0x742d35Cc6B5b0d2b0D1c6b2d7c0b0b0b0b0b0b0', ethers.parseEther('100000'));
  }

  /**
   * Get contract statistics
   */
  getStats() {
    return {
      address: this.target,
      totalSupply: this._totalSupply.toString(),
      holders: this._balances.size,
      allowances: this._allowances.size,
      name: this._name,
      symbol: this._symbol
    };
  }
}

export default MockContract;
