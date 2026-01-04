/**
 * PageProvider API E2E Tests
 *
 * Tests the window.opcat PageProvider API exposed to dApps
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loadExtension, ExtensionInfo } from '../helpers/extension-loader';
import { restoreWallet } from '../helpers/wallet-utils';
import { TEST_WALLET } from '../test-constants';
import { handleNextWalletPopup, setupWalletPopupHandler, removeWalletPopupHandler } from './helpers/wallet-popup-handler';
import { bvmVerify, DummyProvider, ExtPsbt } from '@opcat-labs/scrypt-ts-opcat';

// Test configuration
const DAPP_URL = 'http://localhost:3939/test-dapp.html';

// Helper to wait for modal status
async function waitForModalStatus(
  page: Page,
  status: 'testing' | 'success' | 'fail',
  timeout = 30000
): Promise<string> {
  const modalOverlay = page.locator('[data-testid="modal-overlay"]');
  await modalOverlay.waitFor({ state: 'visible', timeout });

  const statusIcon = page.locator('#modal-status-icon');
  await expect(statusIcon).toHaveClass(new RegExp(status), { timeout });

  const content = await page.locator('[data-testid="modal-content"]').textContent();
  return content || '';
}

// Helper to close modal
async function closeModal(page: Page): Promise<void> {
  await page.locator('.modal-header button').click();
  await page.locator('[data-testid="modal-overlay"]').waitFor({ state: 'hidden' });
}


test.describe('PageProvider API', () => {
  let extensionInfo: ExtensionInfo;
  let dappPage: Page;
  let context: BrowserContext;

  test.beforeAll(async () => {
    // Load extension
    extensionInfo = await loadExtension();
    context = extensionInfo.context;

    // Create a page and restore wallet
    const setupPage = await context.newPage();
    await restoreWallet(
      setupPage,
      extensionInfo.extensionUrl,
      TEST_WALLET.password,
      TEST_WALLET.mnemonic
    );

    // Wait a bit for the extension service worker to fully initialize
    await setupPage.waitForTimeout(2000);
    await setupPage.close();
  });

  test.beforeEach(async () => {
    // Create new dApp page for each test
    dappPage = await context.newPage();
    await dappPage.goto(DAPP_URL);

    // Wait for wallet to be detected
    await expect(dappPage.locator('#wallet-detected')).toHaveText('Yes', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Clean up any popup handler from the test
    removeWalletPopupHandler(context);
    await dappPage?.close();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('requestAccounts should throw when rejected', async () => {
    // Setup popup handler to reject connection
    setupWalletPopupHandler(context, {
      password: TEST_WALLET.password,
      action: 'reject',
    });

    // Click the test button
    await dappPage.click('[data-testid="test-request-accounts-reject"]');

    // Wait for success (the test expects rejection to throw, so success means it threw)
    const content = await waitForModalStatus(dappPage, 'success', 60000);
    expect(content).toContain('Correctly threw error on rejection');

    await closeModal(dappPage);
  });

  test('requestAccounts should return address when approved', async () => {
    // Setup popup handler to approve connection
    setupWalletPopupHandler(context, {
      password: TEST_WALLET.password,
      action: 'approve',
    });

    // Click the test button
    await dappPage.click('[data-testid="test-request-accounts-approve"]');

    // Wait for success
    const content = await waitForModalStatus(dappPage, 'success', 60000);
    expect(content).toContain('Connected successfully');
    expect(content).toContain(TEST_WALLET.address);

    await closeModal(dappPage);
  });

  test('getAccounts should return address when connected', async () => {
    // Setup popup handler in advance - it will auto-approve if popup appears
    setupWalletPopupHandler(context, {
      password: TEST_WALLET.password,
      action: 'approve',
    });

    // Try to connect - if already connected, this will auto-resolve without popup
    await dappPage.click('[data-testid="test-request-accounts-approve"]');

    // Wait for success - either auto-resolved or popup was handled
    await waitForModalStatus(dappPage, 'success', 30000);
    await closeModal(dappPage);

    // Now test getAccounts
    await dappPage.click('[data-testid="test-get-accounts-connected"]');

    // This should succeed without popup since we're connected
    const content = await waitForModalStatus(dappPage, 'success', 5000);
    expect(content).toContain('Got accounts');
    expect(content).toContain(TEST_WALLET.address);

    await closeModal(dappPage);
  });

  test('disconnect should work and require re-authorization', async () => {
    // Setup popup handler in advance - it will auto-approve if popup appears
    setupWalletPopupHandler(context, {
      password: TEST_WALLET.password,
      action: 'approve',
    });

    // First connect (popup will be auto-handled if needed)
    await dappPage.click('[data-testid="test-request-accounts-approve"]');
    await waitForModalStatus(dappPage, 'success', 30000);
    await closeModal(dappPage);

    // Now disconnect
    await dappPage.click('[data-testid="test-disconnect"]');
    const content = await waitForModalStatus(dappPage, 'success', 5000);
    expect(content).toContain('Disconnected successfully');
    await closeModal(dappPage);

    // Verify getAccounts returns empty array after disconnect
    await dappPage.click('[data-testid="test-get-accounts-disconnected"]');
    const disconnectedContent = await waitForModalStatus(dappPage, 'success', 5000);
    expect(disconnectedContent).toContain('Correctly returned empty array');
    await closeModal(dappPage);

    // Verify requestAccounts reconnects (popup will be auto-handled)
    await dappPage.click('[data-testid="test-request-accounts-approve"]');
    const reconnectContent = await waitForModalStatus(dappPage, 'success', 30000);
    expect(reconnectContent).toContain('Connected successfully');
    await closeModal(dappPage);
  });

  test('getAccounts should return empty array when not connected', async () => {
    // Make sure we're disconnected first
    // Try to disconnect (might fail if not connected, that's ok)
    await dappPage.click('[data-testid="test-disconnect"]');
    try {
      await waitForModalStatus(dappPage, 'success', 3000);
      await closeModal(dappPage);
    } catch {
      // Already disconnected
      await closeModal(dappPage);
    }

    // Now test getAccounts
    await dappPage.click('[data-testid="test-get-accounts-disconnected"]');
    const content = await waitForModalStatus(dappPage, 'success', 5000);
    expect(content).toContain('Correctly returned empty array');
    await closeModal(dappPage);
  });

  test('signPsbt should sign transaction correctly', async () => {
    // Setup popup handler in advance - it will auto-handle all popups
    setupWalletPopupHandler(context, {
      password: TEST_WALLET.password,
      action: 'approve',
    });

    // First connect (popup will be auto-handled if needed)
    await dappPage.click('[data-testid="test-request-accounts-approve"]');
    await waitForModalStatus(dappPage, 'success', 30000);
    await closeModal(dappPage);

    // Create a test PSBT
    const provider = new DummyProvider('opcat-testnet')
    const psbt = new ExtPsbt({network: 'opcat-testnet'})
      .spendUTXO(await provider.getUtxos(TEST_WALLET.address))
      .change(TEST_WALLET.address, 1)
      .seal()
    const psbtHex = psbt.toHex()
    console.log('psbtHex', psbtHex)

    // Enter PSBT in the input field
    await dappPage.fill('[data-testid="psbt-input"]', psbtHex);

    // Click sign button - signature popup will be auto-handled
    await dappPage.click('[data-testid="test-sign-psbt"]');

    // Wait for success
    const content = await waitForModalStatus(dappPage, 'success', 60000);
    expect(content).toContain('PSBT signed successfully');

    // Get the signed PSBT from output
    const signedPsbtHex = await dappPage.locator('[data-testid="psbt-output"]').inputValue();
    expect(signedPsbtHex).toBeTruthy();
    expect(signedPsbtHex.length).toBeGreaterThan(psbtHex.length); // Signed should be longer

    // Verify the signed PSBT can be parsed and finalized
    const signedPsbt = ExtPsbt.fromHex(signedPsbtHex);
    expect(bvmVerify(signedPsbt, 0)).toBe(true)

    await closeModal(dappPage);
  });
});
