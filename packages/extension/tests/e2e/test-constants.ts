/**
 * Test constants for E2E testing
 * Contains test private keys, addresses, and other test data
 */

// Test private keys (well-known test keys, NOT real wallets with funds)
export const TEST_PRIVATE_KEYS = {
  // WIF format private key for testing import functionality
  KEY_1: 'cUhsuuDEfD6uz5hoKgXA6oPF5MwJWanbRSMAJcEWYLfQc9Hz5ZwW',
  // Another test private key
  KEY_2: 'L1Knwj9W3qK3qMKdTvmg3VfzUs3ij2LETTFhxza9LfD5dngnoLG1',
  // Invalid private key for testing error handling
  INVALID: 'InvalidPrivateKey123',
};

// Expected addresses for test private keys
export const TEST_ADDRESSES = {
  // Full P2PKH address for KEY_1 (mainnet)
  KEY_1_P2PKH: '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
  // Full P2PKH address for KEY_2 (mainnet)
  KEY_2_P2PKH: '1JtK9CQw1syfWj1WtFMWomrYdV3W2tWBF9',
  // Full P2PKH address for KEY_1 (testnet)
  KEY_1_P2PKH_TESTNET: 'mpLiRqi39U4AmoiFQe2tEV9KysLJbyFKcd',
  // Full P2PKH address for KEY_2 (testnet)
  KEY_2_P2PKH_TESTNET: 'mveUFrTV1KzFiw7TqMXXxpEwDnNxHEKQz1',
  // Expected address for MNEMONIC_12 wallet (testnet)
  MNEMONIC_12_P2PKH_TESTNET: 'n1M8ZVQtL7QoFvGMg24D6b2ojWvFXCGpoS',
};

// Test mnemonics (well-known test mnemonics, NOT real wallets with funds)
export const TEST_MNEMONICS = {
  // 12-word mnemonic
  MNEMONIC_12: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  // 24-word mnemonic
  MNEMONIC_24: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
  // Invalid mnemonic for testing
  INVALID: 'invalid words that are not a valid mnemonic phrase at all here',
};

// Test passwords
export const TEST_PASSWORDS = {
  VALID: 'TestPassword123!',
  WEAK: '123',
  MISMATCH: 'DifferentPassword456!',
};

// Transaction test values
export const TEST_AMOUNTS = {
  // Minimum balance required for transfer tests (in BTC)
  MIN_BALANCE_FOR_TRANSFER: 0.001,
  // Amount to transfer in tests (in BTC)
  TRANSFER_AMOUNT: '0.00001',
};

// CAT20 test constants
export const TEST_CAT20 = {
  // Test token symbol
  SYMBOL: 'testCat20',
  // Test token name
  NAME: 'testCat20',
  // Token decimals
  DECIMALS: 2,
  // Deploy amount (1e8 in smallest unit = 1,000,000 tokens with 2 decimals)
  DEPLOY_AMOUNT: BigInt(1e8),
  // Minimum balance required for CAT20 transfer tests (200 in smallest unit)
  MIN_BALANCE_FOR_TEST: 200,
  // Amount to transfer in CAT20 tests
  TRANSFER_AMOUNT: '0.01',
  // Satoshi address for receiving test tokens (well-known test address)
  SATOSHI_ADDRESS: 'mpXwg4jMtRhuSpVq4xS3HFHmCmWp9NyGKt',
};

export const TEST_CAT721 = {
  SYMBOL: 'testCat721',
  NAME: 'testCat721',
  DESCRIPTION: 'A test CAT721 NFT',
  MAX: 100,
}

// Test wallet configuration (for CAT20 token operations)
// Uses the first derived address from MNEMONIC_12
export const TEST_WALLET = {
  mnemonic: TEST_MNEMONICS.MNEMONIC_12,
  password: TEST_PASSWORDS.VALID,
  address: TEST_ADDRESSES.MNEMONIC_12_P2PKH_TESTNET,
  // WIF private key derived from MNEMONIC_12 at path m/44'/0'/0'/0 + deriveChild(0)
  privateKey: 'cVB244V26CSLjv3xdR7KfoVdNufdqHSMuAMgjqBUfwWQR4WVFsky',
};

// Timeout configuration for token operations
export const TIMEOUT_CONFIG = {
  blockConfirmation: 10000,   // Wait 10s for block confirmation
  indexingPoll: 3000,         // Poll tracker every 3s
  indexingTimeout: 120000,    // Give up after 120s
};
