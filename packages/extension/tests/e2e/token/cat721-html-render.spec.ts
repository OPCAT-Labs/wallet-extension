/**
 * CAT721 HTML NFT Rendering Test
 *
 * 1. Deploy a collection (max=2)
 * 2. Mint NFT #0: a PNG image (keystone-product.png)
 * 3. Mint NFT #1: an HTML page that references NFT #0's image via absolute path
 * 4. Open NFT #1 in the wallet extension and verify the image renders
 */
import { test, expect } from '../fixtures';
import { Page, BrowserContext } from '@playwright/test';
import { loadExtension, ExtensionInfo } from '../helpers/extension-loader';
import { restoreWallet, closeVersionPopupIfExists, switchToTestnet } from '../helpers/wallet-utils';
import { getCAT721List } from '../helpers/api-client';
import { TEST_WALLET } from '../test-constants';
import { TestIds } from '../helpers/test-utils';
import {
  deployClosedMinterCollection,
  mintClosedMinterNft,
  toTokenOwnerAddress,
} from '@opcat-labs/cat-sdk';
import { DefaultSigner, PrivateKey, OpenApiProvider } from '@opcat-labs/scrypt-ts-opcat';
import * as fs from 'fs';
import * as path from 'path';

const IMAGE_HEX = fs.readFileSync(
  path.resolve(__dirname, '../../../src/ui/assets/keystone-product.png'),
).toString('hex');

const COLLECTION_NAME = 'htmlRenderTest';

function createSigner(): DefaultSigner {
  return new DefaultSigner(PrivateKey.fromWIF(TEST_WALLET.privateKey));
}

function createProvider(): OpenApiProvider {
  return new OpenApiProvider('opcat-testnet');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForNftIndexing(collectionId: string, expectedCount: number): Promise<boolean> {
  console.log(`Waiting for ${expectedCount} NFT(s) to be indexed...`);
  const startTime = Date.now();
  const timeout = 120_000;

  while (Date.now() - startTime < timeout) {
    try {
      const { list } = await getCAT721List(TEST_WALLET.address, 1, 100);
      const col = list.find(c => c.collectionId === collectionId);
      if (col && col.count >= expectedCount) {
        console.log(`Indexed: ${col.count} NFT(s)`);
        return true;
      }
    } catch {
      // not indexed yet
    }
    await sleep(3000);
  }
  return false;
}

/**
 * Deploy collection + mint 2 NFTs:
 *   localId 0 = image/gif
 *   localId 1 = text/html referencing localId 0
 */
async function deployAndMint(): Promise<string> {
  const signer = createSigner();
  const provider = createProvider();
  const feeRate = await provider.getFeeRate();

  // --- deploy ---
  console.log('Deploying collection...');
  const deployResult = await deployClosedMinterCollection(
    signer,
    provider,
    {
      metadata: {
        name: COLLECTION_NAME,
        symbol: COLLECTION_NAME,
        description: 'Test HTML NFT that embeds an image NFT',
        max: BigInt(2),
        issuerAddress: toTokenOwnerAddress(TEST_WALLET.address),
      },
      content: {
        type: 'text/html',
        body: Buffer.from('<html></html>', 'utf-8').toString('hex'),
      },
    },
    feeRate,
    TEST_WALLET.address,
  );
  const collectionId = deployResult.collectionId;
  console.log(`Collection deployed: ${collectionId}`);

  // --- mint #0: pure image ---
  console.log(`Minting NFT #0 (image/png, ${IMAGE_HEX.length / 2} bytes)...`);
  const changeUtxo0 = deployResult.deployPsbt.getChangeUTXO();
  const mint0 = await mintClosedMinterNft(
    signer,
    signer,
    provider,
    deployResult.minterUtxo,
    {
      contentType: 'image/png',
      contentBody: IMAGE_HEX,
      nftmetadata: {},
    },
    collectionId,
    deployResult.metadata,
    toTokenOwnerAddress(TEST_WALLET.address),
    TEST_WALLET.address,
    changeUtxo0 ? [changeUtxo0] : [],
    feeRate,
  );
  console.log(`NFT #0 minted, txId: ${mint0.mintTxId}`);

  // --- mint #1: html that references NFT #0 image via <img> ---
  const htmlContent = [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="utf-8"><title>HTML NFT</title></head>',
    '<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111">',
    `  <img id="nft-image" src="/api/v1/collections/${collectionId}/localId/0/content"`,
    '       style="max-width:100%;image-rendering:pixelated" />',
    '</body>',
    '</html>',
  ].join('\n');
  const htmlHex = Buffer.from(htmlContent, 'utf-8').toString('hex');

  console.log('Minting NFT #1 (text/html)...');
  // Get next minterUtxo from mint0's mintPsbt (output index 0 is the minter)
  const nextMinterUtxo = mint0.mintPsbt.getUtxo(0);
  const changeUtxo1 = mint0.mintPsbt.getChangeUTXO();

  const mint1 = await mintClosedMinterNft(
    signer,
    signer,
    provider,
    nextMinterUtxo,
    {
      contentType: 'text/html',
      contentBody: htmlHex,
      nftmetadata: {},
    },
    collectionId,
    deployResult.metadata,
    toTokenOwnerAddress(TEST_WALLET.address),
    TEST_WALLET.address,
    changeUtxo1 ? [changeUtxo1] : [],
    feeRate,
  );
  console.log(`NFT #1 minted, txId: ${mint1.mintTxId}`);

  // Wait for indexing
  await waitForNftIndexing(collectionId, 2);
  console.log('Waiting for UTXO confirmation (15s)...');
  await sleep(15_000);

  return collectionId;
}

const CONTENT_BASE_URL = 'https://testnet-openapi.opcatlabs.io';

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe('CAT721 HTML NFT Rendering', () => {
  let page: Page;
  let context: BrowserContext;
  let collectionId: string;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(300_000); // 5 min

    // Deploy + mint on-chain
    collectionId = await deployAndMint();
    console.log(`Collection ready: ${collectionId}`);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  // ---- Test 1: verify content API serves both NFTs correctly ----
  test('content API should serve image and HTML with correct content-type', async () => {
    const nft0Url = `${CONTENT_BASE_URL}/api/v1/collections/${collectionId}/localId/0/content`;
    const nft1Url = `${CONTENT_BASE_URL}/api/v1/collections/${collectionId}/localId/1/content`;

    const nft0Resp = await fetch(nft0Url);
    console.log(`NFT #0 content-type: ${nft0Resp.headers.get('content-type')}`);
    expect(nft0Resp.ok).toBe(true);
    expect(nft0Resp.headers.get('content-type')).toContain('image/png');
    const nft0Body = await nft0Resp.arrayBuffer();
    console.log(`NFT #0 body size: ${nft0Body.byteLength}`);
    expect(nft0Body.byteLength).toBeGreaterThan(0);

    const nft1Resp = await fetch(nft1Url);
    console.log(`NFT #1 content-type: ${nft1Resp.headers.get('content-type')}`);
    expect(nft1Resp.ok).toBe(true);
    expect(nft1Resp.headers.get('content-type')).toContain('text/html');
    const nft1Body = await nft1Resp.text();
    expect(nft1Body).toContain('<img');
    expect(nft1Body).toContain(`/api/v1/collections/${collectionId}/localId/0/content`);
  });

  // ---- Test 2: open NFT #1 HTML directly in browser, verify embedded image loads ----
  test('HTML NFT should render embedded image in browser', async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    const nft1Url = `${CONTENT_BASE_URL}/api/v1/collections/${collectionId}/localId/1/content`;
    console.log(`Opening NFT #1 directly: ${nft1Url}`);
    await page.goto(nft1Url, { waitUntil: 'networkidle' });

    const img = page.locator('#nft-image');
    await expect(img).toBeVisible({ timeout: 30_000 });

    await expect(async () => {
      const w = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(w).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });

    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    console.log(`Image naturalWidth: ${naturalWidth}`);

    await page.screenshot({
      path: 'test-results/artifacts/cat721-nft1-browser.png',
      fullPage: true,
    });
  });

  // ---- Test 3: verify wallet extension renders the HTML NFT in an iframe ----
  test('both NFTs should be clickable and navigate to detail page', async () => {
    const extensionInfo = await loadExtension();
    context = extensionInfo.context;
    page = await context.newPage();

    await restoreWallet(
      page,
      extensionInfo.extensionUrl,
      TEST_WALLET.password,
      TEST_WALLET.mnemonic,
    );
    await switchToTestnet(page);

    // Navigate to CAT721 collection
    await closeVersionPopupIfExists(page);
    await page.waitForSelector('text=CAT20', { timeout: 30_000 });
    await page.click('text=CAT721');

    await page.waitForSelector(`[data-testid="${TestIds.CAT721.COLLECTION_ITEM}"]`, {
      timeout: 120_000,
    });

    const card = page.locator(
      `[data-testid="${TestIds.CAT721.COLLECTION_ITEM}"][data-collection-id="${collectionId}"]`,
    );
    await card.waitFor({ timeout: 10_000 });
    await card.click();

    await page.waitForSelector(`[data-testid="${TestIds.CAT721.COLLECTION_SCREEN}"]`, {
      timeout: 30_000,
    });

    // --- Test NFT #0 (HTML with base64 image) click ---
    console.log('Clicking NFT #0...');
    const nft0 = page.locator(
      `[data-testid="${TestIds.CAT721.NFT_ITEM}"][data-local-id="0"]`,
    );
    await nft0.waitFor({ timeout: 30_000 });
    await nft0.click();

    await page.waitForSelector(`[data-testid="${TestIds.CAT721.NFT_SCREEN}"]`, {
      timeout: 30_000,
    });
    console.log('NFT #0 detail page loaded');

    // NFT #0 is image/png but collection contentType is text/html,
    // so it renders in an iframe that loads the PNG directly (browsers display images in iframes)
    await page.screenshot({
      path: 'test-results/artifacts/cat721-nft0-detail.png',
      fullPage: true,
    });

    // Go back to collection screen
    await page.goBack();
    await page.waitForSelector(`[data-testid="${TestIds.CAT721.COLLECTION_SCREEN}"]`, {
      timeout: 30_000,
    });

    // --- Test NFT #1 (HTML with <img> referencing NFT #0) click ---
    console.log('Clicking NFT #1...');
    const nft1 = page.locator(
      `[data-testid="${TestIds.CAT721.NFT_ITEM}"][data-local-id="1"]`,
    );
    await nft1.waitFor({ timeout: 30_000 });
    await nft1.click();

    await page.waitForSelector(`[data-testid="${TestIds.CAT721.NFT_SCREEN}"]`, {
      timeout: 30_000,
    });
    console.log('NFT #1 detail page loaded');

    // Verify iframe exists and the embedded image loaded
    const iframe = page.frameLocator('iframe').first();
    const img = iframe.locator('#nft-image');
    await expect(img).toBeVisible({ timeout: 30_000 });

    await expect(async () => {
      const w = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(w).toBeGreaterThan(0);
    }).toPass({ timeout: 60_000 });

    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    console.log(`NFT #1: embedded image naturalWidth: ${naturalWidth}`);

    await page.screenshot({
      path: 'test-results/artifacts/cat721-nft1-detail.png',
      fullPage: true,
    });
  });
});
