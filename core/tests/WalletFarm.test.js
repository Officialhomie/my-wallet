import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { WalletFarm } from '../src/core/WalletFarm.js';

// Test mnemonic (NEVER use real funds with this)
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('WalletFarm', () => {
  let farm;

  beforeEach(() => {
    farm = new WalletFarm(TEST_MNEMONIC, 5, { verbose: false });
  });

  describe('constructor', () => {
    it('should create a WalletFarm instance', () => {
      assert(farm instanceof WalletFarm);
      assert.strictEqual(farm.numberOfWallets, 5);
      assert.strictEqual(farm.mnemonic, TEST_MNEMONIC);
    });

    it('should generate the correct number of wallets', () => {
      assert.strictEqual(farm.wallets.size, 5);
    });

    it('should throw on invalid mnemonic', () => {
      assert.throws(() => {
        new WalletFarm('invalid mnemonic');
      }, /Invalid mnemonic/);
    });

    it('should throw on invalid number of wallets', () => {
      assert.throws(() => {
        new WalletFarm(TEST_MNEMONIC, 0);
      }, /numberOfWallets must be an integer between 1 and 1000/);

      assert.throws(() => {
        new WalletFarm(TEST_MNEMONIC, 1001);
      }, /numberOfWallets must be an integer between 1 and 1000/);
    });
  });

  describe('wallet generation', () => {
    it('should generate valid Ethereum addresses', () => {
      const addresses = farm.getAllAddresses();

      assert.strictEqual(addresses.length, 5);

      // Check that all addresses are valid Ethereum addresses
      addresses.forEach(address => {
        assert.match(address, /^0x[a-fA-F0-9]{40}$/);
      });
    });

    it('should generate deterministic addresses', () => {
      const farm2 = new WalletFarm(TEST_MNEMONIC, 5);
      const addresses1 = farm.getAllAddresses();
      const addresses2 = farm2.getAllAddresses();

      assert.deepStrictEqual(addresses1, addresses2);
    });

    it('should generate unique addresses', () => {
      const addresses = farm.getAllAddresses();
      const uniqueAddresses = new Set(addresses);

      assert.strictEqual(uniqueAddresses.size, addresses.length);
    });
  });

  describe('wallet data export', () => {
    it('should export wallet data without private keys by default', () => {
      const exported = farm.exportWalletData();

      assert.strictEqual(exported.length, 5);

      exported.forEach(wallet => {
        assert('index' in wallet);
        assert('address' in wallet);
        assert('derivationPath' in wallet);
        assert(!('privateKey' in wallet)); // Should not include private key
      });
    });

    it('should export wallet data with private keys when requested', () => {
      const exported = farm.exportWalletData(true);

      assert.strictEqual(exported.length, 5);

      exported.forEach(wallet => {
        assert('privateKey' in wallet);
        assert.match(wallet.privateKey, /^0x[a-fA-F0-9]{64}$/);
      });
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', () => {
      const stats = farm.getStats();

      assert.strictEqual(stats.totalWallets, 5);
      assert.strictEqual(stats.totalTransactions, 0);
      assert(Array.isArray(stats.connectedChains));
    });
  });

  describe('transaction history', () => {
    it('should record transactions', () => {
      farm.recordTransaction({
        walletIndex: 0,
        txHash: '0x123',
        chainName: 'sepolia'
      });

      const history = farm.getTransactionHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].walletIndex, 0);
      assert.strictEqual(history[0].txHash, '0x123');
    });

    it('should filter transaction history', () => {
      farm.recordTransaction({
        walletIndex: 0,
        txHash: '0x123',
        chainName: 'sepolia'
      });

      farm.recordTransaction({
        walletIndex: 1,
        txHash: '0x456',
        chainName: 'mainnet'
      });

      let history = farm.getTransactionHistory({ walletIndex: 0 });
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].walletIndex, 0);

      history = farm.getTransactionHistory({ chainName: 'mainnet' });
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].chainName, 'mainnet');
    });
  });

  describe('static methods', () => {
    it('should create instance from config', () => {
      const config = {
        mnemonic: TEST_MNEMONIC,
        numberOfWallets: 3,
        options: { verbose: false }
      };

      const farmFromConfig = WalletFarm.fromConfig(config);

      assert(farmFromConfig instanceof WalletFarm);
      assert.strictEqual(farmFromConfig.numberOfWallets, 3);
    });
  });
});
