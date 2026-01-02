import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { FundDistributor } from '../src/core/FundDistributor.js';
import { WalletFarm } from '../src/core/WalletFarm.js';
import { ethers } from 'ethers';

// Test mnemonic (NEVER use real funds with this)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('FundDistributor', () => {
  let walletFarm;
  let distributor;
  let mockFundingWallet;

  beforeEach(() => {
    // Create a small wallet farm for testing
    walletFarm = new WalletFarm(TEST_MNEMONIC, 3, { verbose: false });

    // Create distributor
    distributor = new FundDistributor(walletFarm, { verbose: false });

    // Mock funding wallet
    mockFundingWallet = {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      provider: {
        getBalance: mock.fn(() => Promise.resolve(ethers.parseEther('10'))),
        getFeeData: mock.fn(() => Promise.resolve({
          gasPrice: ethers.parseUnits('20', 'gwei')
        }))
      },
      sendTransaction: mock.fn(() => Promise.resolve({
        hash: '0x1234567890abcdef',
        wait: mock.fn(() => Promise.resolve({
          gasUsed: 21000,
          gasPrice: ethers.parseUnits('20', 'gwei'),
          blockNumber: 12345
        }))
      }))
    };
  });

  describe('constructor', () => {
    it('should create a FundDistributor instance', () => {
      assert(distributor instanceof FundDistributor);
      assert.strictEqual(distributor.walletFarm, walletFarm);
    });

    it('should throw on invalid wallet farm', () => {
      assert.throws(() => {
        new FundDistributor(null);
      }, /Valid WalletFarm instance is required/);

      assert.throws(() => {
        new FundDistributor({});
      }, /Valid WalletFarm instance is required/);
    });

    it('should accept options', () => {
      const customDistributor = new FundDistributor(walletFarm, {
        verbose: true,
        maxRetries: 5,
        batchSize: 20
      });

      assert.strictEqual(customDistributor.options.verbose, true);
      assert.strictEqual(customDistributor.options.maxRetries, 5);
      assert.strictEqual(customDistributor.options.batchSize, 20);
    });
  });

  describe('setFundingWallet', () => {
    it('should set funding wallet', () => {
      distributor.setFundingWallet(mockFundingWallet);
      assert.strictEqual(distributor.fundingWallet, mockFundingWallet);
    });

    it('should throw on invalid wallet', () => {
      assert.throws(() => {
        distributor.setFundingWallet(null);
      }, /Valid connected ethers.Wallet instance is required/);

      assert.throws(() => {
        distributor.setFundingWallet({});
      }, /Valid connected ethers.Wallet instance is required/);
    });
  });

  describe('public API', () => {
    it('should expose required public methods', () => {
      assert(typeof distributor.setFundingWallet === 'function');
      assert(typeof distributor.distributeNativeTokens === 'function');
      assert(typeof distributor.distributeERC20Tokens === 'function');
      assert(typeof distributor.verifyBalances === 'function');
      assert(typeof distributor.refillWallets === 'function');
      assert(typeof distributor.getDistributionHistory === 'function');
      assert(typeof distributor.generateDistributionReport === 'function');
      assert(typeof distributor.destroy === 'function');
    });

    it('should have proper initialization state', () => {
      assert(Array.isArray(distributor.distributionHistory));
      assert.strictEqual(distributor.distributionHistory.length, 0);
      assert.strictEqual(distributor.fundingWallet, null);
    });
  });

  describe('balance verification', () => {
    it('should verify native token balances', async () => {
      // Mock wallet farm balance method
      walletFarm.getWalletBalance = mock.fn((index, chainName) => {
        const balances = ['2.0', '0.5', '0.1']; // ETH
        return Promise.resolve(ethers.parseEther(balances[index]));
      });

      const result = await distributor.verifyBalances('sepolia', 1.0);

      assert.strictEqual(result.allSufficient, false);
      assert.strictEqual(result.insufficientWallets.length, 2);
      assert.strictEqual(result.checkedWallets, 3);
      assert.strictEqual(result.minimumRequired, 1.0);
    });

    it('should return true when all balances are sufficient', async () => {
      walletFarm.getWalletBalance = mock.fn(() =>
        Promise.resolve(ethers.parseEther('2.0'))
      );

      const result = await distributor.verifyBalances('sepolia', 1.0);

      assert.strictEqual(result.allSufficient, true);
      assert.strictEqual(result.insufficientWallets.length, 0);
    });
  });

  describe('distribution history', () => {
    it('should track distribution history', () => {
      distributor.distributionHistory.push({
        id: 'test_dist_1',
        timestamp: Date.now(),
        type: 'native',
        chainName: 'sepolia',
        results: []
      });

      const history = distributor.getDistributionHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].type, 'native');
    });

    it('should filter distribution history', () => {
      distributor.distributionHistory.push(
        { id: 'dist1', timestamp: Date.now(), type: 'native', chainName: 'sepolia' },
        { id: 'dist2', timestamp: Date.now(), type: 'erc20', chainName: 'mainnet' }
      );

      let history = distributor.getDistributionHistory({ type: 'native' });
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].type, 'native');

      history = distributor.getDistributionHistory({ chainName: 'mainnet' });
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].chainName, 'mainnet');
    });
  });

  describe('distribution report', () => {
    it('should generate distribution report', () => {
      distributor.distributionHistory.push(
        {
          id: 'dist1',
          timestamp: Date.now(),
          type: 'native',
          chainName: 'sepolia',
          strategy: 'equal',
          totalWallets: 5,
          successfulDistributions: 5,
          failedDistributions: 0,
          totalDistributed: 2.5,
          results: []
        },
        {
          id: 'dist2',
          timestamp: Date.now(),
          type: 'erc20',
          chainName: 'sepolia',
          strategy: 'weighted',
          totalWallets: 5,
          successfulDistributions: 4,
          failedDistributions: 1,
          totalDistributed: 3.0,
          results: []
        }
      );

      const report = distributor.generateDistributionReport();

      assert.strictEqual(report.totalDistributions, 2);
      assert.strictEqual(report.totalWalletsFunded, 10);
      assert.strictEqual(report.totalTokensDistributed, 5.5);
      assert(report.byChain.sepolia);
      assert.strictEqual(report.byType.native, 1);
      assert.strictEqual(report.byType.erc20, 1);
    });
  });

  describe('configuration', () => {
    it('should support different batch sizes', () => {
      const customDistributor = new FundDistributor(walletFarm, { batchSize: 5 });
      assert.strictEqual(customDistributor.options.batchSize, 5);
    });

    it('should support disabling human delays', () => {
      const fastDistributor = new FundDistributor(walletFarm, { humanDelay: false });
      assert.strictEqual(fastDistributor.options.humanDelay, false);
    });
  });

  describe('error handling', () => {
    it('should throw when funding wallet not set', async () => {
      await assert.rejects(
        distributor.distributeNativeTokens(0.01, 'sepolia'),
        /Funding wallet not set/
      );
    });

    it('should throw on invalid token address', async () => {
      distributor.setFundingWallet(mockFundingWallet);

      await assert.rejects(
        distributor.distributeERC20Tokens('invalid', [], 100, 'sepolia'),
        /Valid token contract address is required/
      );
    });

    it('should throw on invalid token ABI', async () => {
      distributor.setFundingWallet(mockFundingWallet);

      await assert.rejects(
        distributor.distributeERC20Tokens('0x1234567890123456789012345678901234567890', null, 100, 'sepolia'),
        /Valid token ABI array is required/
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      distributor.distributionHistory.push({ test: 'data' });
      distributor.fundingWallet = mockFundingWallet;

      distributor.destroy();

      assert.strictEqual(distributor.distributionHistory.length, 0);
      assert.strictEqual(distributor.fundingWallet, null);
    });
  });
});
