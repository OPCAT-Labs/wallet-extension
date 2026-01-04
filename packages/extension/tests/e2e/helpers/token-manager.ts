/**
 * Token Manager for E2E Testing
 * Handles CAT20 token cleanup, deployment, and management
 */
import {
  deployClosedMinterToken,
  singleSendToken,
  mintClosedMinterToken,
  toTokenOwnerAddress,
  deployClosedMinterCollection,
  mintClosedMinterNft,
} from '@opcat-labs/cat-sdk';
import { DefaultSigner, PrivateKey, MempoolProvider } from '@opcat-labs/scrypt-ts-opcat';
import { TEST_WALLET, TEST_CAT20, TIMEOUT_CONFIG, TEST_CAT721 } from '../test-constants';
import { getCAT20List, CAT20Balance, getCAT721List, CAT721Balance } from './api-client';

// Tracker API base URL
const TRACKER_API_BASE_URL = 'https://testnet.opcatlabs.io/api/tracker';

/**
 * Helper to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create signer from test wallet private key
 */
export function createSigner(): DefaultSigner {
  return new DefaultSigner(PrivateKey.fromWIF(TEST_WALLET.privateKey));
}

/**
 * Create mempool provider for testnet
 */
export function createProvider(): MempoolProvider {
  return new MempoolProvider('opcat-testnet');
}

/**
 * Tracker API Service (subset needed for token management)
 */
const TrackerApi = {
  async getTokenInfo(tokenId: string) {
    const response = await fetch(`${TRACKER_API_BASE_URL}/api/tokens/${tokenId}`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Failed to get token info: ${data.msg}`);
    return data.data;
  },

  async getTokenBalanceByOwnerAddress(tokenId: string, address: string) {
    const response = await fetch(
      `${TRACKER_API_BASE_URL}/api/tokens/${tokenId}/addresses/${address}/balance`
    );
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Failed to get balance: ${data.msg}`);
    return data.data;
  },

  async getTokenUtxosByOwnerAddress(tokenId: string, address: string) {
    const response = await fetch(
      `${TRACKER_API_BASE_URL}/api/tokens/${tokenId}/addresses/${address}/utxos`
    );
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Failed to get UTXOs: ${data.msg}`);
    return data.data;
  },

  async getMinterUtxos(tokenId: string) {
    const response = await fetch(`${TRACKER_API_BASE_URL}/api/minters/${tokenId}/utxos`);
    const data = await response.json();
    if (data.code !== 0) throw new Error(`Failed to get minter UTXOs: ${data.msg}`);
    return data.data;
  },
};

/**
 * Wait for token to be indexed by tracker
 */
async function waitForIndexing(tokenId: string, symbol: string): Promise<boolean> {
  console.log(`Waiting for ${symbol} to be indexed...`);
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_CONFIG.indexingTimeout) {
    try {
      const balance = await TrackerApi.getTokenBalanceByOwnerAddress(
        tokenId,
        TEST_WALLET.address
      );
      if (BigInt(balance.confirmed) > 0n) {
        console.log(`✓ ${symbol} indexed successfully`);
        return true;
      }
    } catch {
      // Not indexed yet, continue polling
    }
    await sleep(TIMEOUT_CONFIG.indexingPoll);
  }

  console.log(`✗ ${symbol} indexing timeout`);
  return false;
}

/**
 * Clear/burn a token by sending all balance to Satoshi address
 */
export async function clearToken(tokenId: string): Promise<void> {
  const signer = createSigner();
  const address = await signer.getAddress();
  const provider = createProvider();
  const feeRate = await provider.getFeeRate();
  const satoshisAddress = TEST_CAT20.SATOSHI_ADDRESS;

  const tokenInfo = await TrackerApi.getTokenInfo(tokenId);
  const balance = await TrackerApi.getTokenBalanceByOwnerAddress(tokenId, address);

  console.log(
    `Clearing token ${tokenInfo.name}(${tokenInfo.symbol}) tokenId=${tokenId} with balance ${balance.confirmed}`
  );

  if (BigInt(balance.confirmed) === 0n) {
    console.log('Token already has zero balance, skipping');
    return;
  }

  const utxos = await TrackerApi.getTokenUtxosByOwnerAddress(tokenId, address);

  await singleSendToken(
    signer,
    provider,
    tokenInfo.minterScriptHash,
    utxos.utxos,
    [{ address: toTokenOwnerAddress(satoshisAddress), amount: BigInt(balance.confirmed) }],
    toTokenOwnerAddress(satoshisAddress),
    feeRate,
    tokenInfo.hasAdmin,
    tokenInfo.adminScriptHash
  );

  console.log(`✓ Token ${tokenInfo.symbol} cleared`);
}

/**
 * Deploy a new testCat20 token
 */
export async function deployTestToken(): Promise<string> {
  const signer = createSigner();
  const provider = createProvider();
  const feeRate = await provider.getFeeRate();

  console.log(`Deploying ${TEST_CAT20.SYMBOL}...`);

  const result = await deployClosedMinterToken(
    signer,
    provider,
    {
      metadata: {
        name: TEST_CAT20.NAME,
        symbol: TEST_CAT20.SYMBOL,
        decimals: BigInt(TEST_CAT20.DECIMALS),
        hasAdmin: false,
      },
    },
    feeRate,
    TEST_WALLET.address
  );

  // Handle change UTXO
  const changeUtxo = result.deployPsbt.getChangeUTXO();
  if (changeUtxo) {
    provider.addNewUTXO(changeUtxo);
  }

  console.log(`✓ ${TEST_CAT20.SYMBOL} deployed, tokenId: ${result.tokenId}`);

  // Mint initial supply
  const mintRes = await mintClosedMinterToken(
    signer,
    provider,
    result.deployPsbt.getUtxo(0),
    result.metadata.hasAdmin,
    result.adminScriptHash,
    result.tokenId,
    toTokenOwnerAddress(TEST_WALLET.address),
    TEST_CAT20.DEPLOY_AMOUNT,
    TEST_WALLET.address,
    feeRate
  );

  console.log(`✓ ${TEST_CAT20.SYMBOL} minted, txId: ${mintRes.mintTxId}`);

  // Wait for block confirmation
  await sleep(TIMEOUT_CONFIG.blockConfirmation);

  // Wait for indexing
  await waitForIndexing(result.tokenId, TEST_CAT20.SYMBOL);

  return result.tokenId;
}

export async function deployTestNft(): Promise<string> {
  const signer = createSigner();
  const provider = createProvider();
  const feeRate = await provider.getFeeRate();

  console.log(`Deploying ${TEST_CAT721.NAME}...`);

  const result = await deployClosedMinterCollection(
    signer,
    provider,
    {
      metadata: {
        name: TEST_CAT721.NAME,
        symbol: TEST_CAT721.NAME,
        description: TEST_CAT721.DESCRIPTION,
        max: BigInt(TEST_CAT721.MAX),
        issuerAddress: toTokenOwnerAddress(TEST_WALLET.address),
      }
    },
    feeRate,
    TEST_WALLET.address
  );

  console.log(`✓ ${TEST_CAT721.NAME} deployed, collectionId: ${result.collectionId}`);

  // Get the change UTXO from deploy
  const changeUtxo = result.deployPsbt.getChangeUTXO();

  // Mint NFT using the change UTXO as fee input
  const mintRes = await mintClosedMinterNft(
    signer,
    signer,
    provider,
    result.minterUtxo,
    {
      contentType: 'image/gif',
      contentBody: '47494638396120002000f41300000000442219cc1e00ef3000a35030f76400ff9800fcbd0bfae3177824bfba40c3fa5ac87a83ef17cefa89d78782e0be8695e1bacfdfdcddddffffff00000000000000000000000000000000000000000000000000000000000000000000000021f904000000000021ff0b496d6167654d616769636b0d67616d6d613d302e3435343535002c00000000200020000005ad20238e64699e68aaae6cebbe702ccf746dbb40aee7761efcc01f4f06081a8100d86ec91cb20002a8604aad56934fe9b4d95c419793b0783cc69ebe63c984cb4ca1c56ac0a06038201c0dc84291709abe606c4b6e51514864886166675f41823a5946000494043a95964f47939398958b6e9b040f4b9f9a92940f0f9e99a78ea9aca02a45429da39eb25e3c82359c62beb9389611116b961311c15e9fc49ccd33b600cdc311ad4accc9d4d62721003b',
      nftmetadata: {},
    },
    result.collectionId,
    result.metadata,
    toTokenOwnerAddress(TEST_WALLET.address),
    TEST_WALLET.address,
    changeUtxo ? [changeUtxo] : [],
    feeRate
  );
  console.log(`✓ ${TEST_CAT721.NAME} minted, txId: ${mintRes.mintTxId}`);

  // Wait for indexing
  await waitForNftIndexing(result.collectionId, TEST_CAT721.NAME);

  // Additional wait for UTXO to be fully confirmed
  console.log('Waiting for UTXO to be fully confirmed (30s)...');
  await sleep(30000); // 30 seconds

  return result.collectionId
}

/**
 * Wait for NFT collection to be indexed by the wallet API
 */
async function waitForNftIndexing(collectionId: string, name: string): Promise<boolean> {
  console.log(`Waiting for ${name} to be indexed...`);
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_CONFIG.indexingTimeout) {
    try {
      const { list } = await getCAT721List(TEST_WALLET.address, 1, 100);
      const collection = list.find(c => c.collectionId === collectionId);
      if (collection && collection.count > 0) {
        console.log(`✓ ${name} indexed successfully with ${collection.count} NFT(s)`);
        return true;
      }
    } catch {
      // Not indexed yet, continue polling
    }
    await sleep(TIMEOUT_CONFIG.indexingPoll);
  }

  console.log(`✗ ${name} indexing timeout`);
  return false;
}

/**
 * Check if testCat20 token exists and has sufficient balance
 */
export async function findTestToken(): Promise<{ tokenId: string; balance: bigint } | null> {
  try {
    const { list } = await getCAT20List(TEST_WALLET.address, 1, 100);
    const testToken = list.find(
      (token: CAT20Balance) => token.symbol === TEST_CAT20.SYMBOL
    );

    if (testToken) {
      return {
        tokenId: testToken.tokenId,
        balance: BigInt(testToken.amount),
      };
    }
  } catch (error) {
    console.log('Error finding test token:', error);
  }
  return null;
}

/**
 * Clean all tokens except testCat20 (if it has sufficient balance)
 */
export async function cleanupTokens(): Promise<void> {
  console.log('\n--- Cleaning up tokens ---');

  const { list } = await getCAT20List(TEST_WALLET.address, 1, 100);

  for (const token of list) {
    if (token.symbol !== TEST_CAT20.SYMBOL) {
      console.log(`Burning token: ${token.symbol} (${token.tokenId})`);
      await clearToken(token.tokenId);
      await sleep(TIMEOUT_CONFIG.blockConfirmation);
    }
  }

  console.log('✓ Token cleanup complete');
}

/**
 * Ensure testCat20 token is ready for testing
 * 1. Clean up all other tokens
 * 2. Check if testCat20 exists with sufficient balance (> 200)
 * 3. If not sufficient, burn it and deploy new one
 */
export async function ensureTestToken(): Promise<string> {
  console.log('\n=== Ensuring testCat20 token is ready ===');

  // Step 1: Clean up other tokens
  await cleanupTokens();

  // Step 2: Check existing testCat20
  const existingToken = await findTestToken();

  if (existingToken) {
    console.log(
      `Found existing ${TEST_CAT20.SYMBOL} with balance: ${existingToken.balance}`
    );

    if (existingToken.balance > BigInt(TEST_CAT20.MIN_BALANCE_FOR_TEST)) {
      console.log('✓ Existing token has sufficient balance');
      return existingToken.tokenId;
    }

    // Balance too low, burn it
    console.log('Balance too low, burning existing token...');
    await clearToken(existingToken.tokenId);
    await sleep(TIMEOUT_CONFIG.blockConfirmation);
  }

  // Step 3: Deploy new token
  console.log('Deploying new testCat20 token...');
  const tokenId = await deployTestToken();

  console.log(`\n✓ testCat20 ready, tokenId: ${tokenId}\n`);
  return tokenId;
}

/**
 * Find existing testCat721 collection by name
 */
export async function findTestNft(): Promise<{ collectionId: string; count: number } | null> {
  try {
    const { list } = await getCAT721List(TEST_WALLET.address, 1, 100);
    const testCollection = list.find(
      (collection: CAT721Balance) => collection.name === TEST_CAT721.NAME
    );

    if (testCollection) {
      return {
        collectionId: testCollection.collectionId,
        count: testCollection.count,
      };
    }
  } catch (error) {
    console.log('Error finding test NFT:', error);
  }
  return null;
}

/**
 * Ensure testCat721 NFT collection is ready for testing
 * Always deploys a fresh NFT to ensure UTXO is available
 */
export async function ensureTestNft(): Promise<string> {
  console.log('\n=== Ensuring testCat721 NFT is ready ===');

  // Always deploy a fresh NFT to ensure UTXO is available
  console.log('Deploying fresh testCat721 NFT collection...');
  const collectionId = await deployTestNft();

  console.log(`\n✓ testCat721 ready, collectionId: ${collectionId}\n`);
  return collectionId;
}
