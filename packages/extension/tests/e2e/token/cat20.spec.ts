/**
 * CAT20 Token Transfer Test
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { loadExtension, ExtensionInfo } from '../helpers/extension-loader';
import { restoreWallet, closeVersionPopupIfExists } from '../helpers/wallet-utils';
import { ensureTestToken } from '../helpers/token-manager';
import { getCAT20List } from '../helpers/api-client';
import { TEST_WALLET, TEST_CAT20 } from '../test-constants';
import { TestIds, fillTestId, waitForTestId } from '../helpers/test-utils';

// Helper function to get CAT20 balance via API
async function getCAT20Balance(address: string, tokenId: string): Promise<number> {
  const { list } = await getCAT20List(address, 1, 100);
  const token = list.find(t => t.tokenId === tokenId);
  return token ? parseInt(token.amount, 10) : 0;
}

// Helper function to navigate to CAT20 token screen by simulating user actions
async function navigateToCAT20Token(
  page: Page,
  test: typeof import('@playwright/test').test,
  tokenName: string
): Promise<void> {
  // CAT tab and CAT20 sub-tab are selected by default
  // Just wait for the token list to load and click the token

  await test.step('Wait for CAT20 token list to load', async () => {
    // Close version popup if it appeared after wallet restore
    await closeVersionPopupIfExists(page);

    // Wait for CAT20 sub-tab to appear (confirms CAT tab is rendered)
    console.log('[DEBUG] Waiting for CAT20 tab to appear...');
    await page.waitForSelector('text=CAT20', { timeout: 30000 });
    console.log('[DEBUG] CAT20 tab found');

    // Wait for token item to appear (API must return data)
    console.log('[DEBUG] Waiting for CAT20 token item...');
    await page.waitForSelector(`[data-testid="${TestIds.CAT20.TOKEN_ITEM}"]`, {
      timeout: 120000,
    });
    console.log('[DEBUG] CAT20 token item found');
  });

  await test.step(`Click token: ${tokenName}`, async () => {
    const tokenCard = page.locator(`[data-testid="${TestIds.CAT20.TOKEN_ITEM}"][data-token-name="${tokenName}"]`);
    await tokenCard.waitFor({ timeout: 10000 });
    await tokenCard.click();
  });

  await test.step('Wait for token screen to load', async () => {
    await page.waitForSelector(`[data-testid="${TestIds.CAT20.TOKEN_SCREEN}"]`, {
      timeout: 30000,
    });
  });
}

// Helper function to perform CAT20 transfer
async function transferCAT20(
  page: Page,
  test: typeof import('@playwright/test').test,
  recipientAddress: string,
  amount: string
): Promise<void> {
  await test.step('Click send button', async () => {
    await page.click(`[data-testid="${TestIds.CAT20.SEND_BUTTON}"]`);
    await page.waitForSelector(`[data-testid="${TestIds.CAT20.SEND_SCREEN}"]`, {
      timeout: 10000,
    });
  });

  await test.step('Enter recipient address', async () => {
    await fillTestId(page, TestIds.CAT20.SEND_RECIPIENT_INPUT, recipientAddress);
  });

  await test.step(`Enter amount: ${amount}`, async () => {
    const amountInput = page.locator(`[data-testid="${TestIds.CAT20.SEND_AMOUNT_INPUT}"]`);
    await amountInput.click();
    await amountInput.pressSequentially(amount, { delay: 50 });
  });

  await test.step('Click next button', async () => {
    const nextButton = page.locator(`[data-testid="${TestIds.CAT20.SEND_NEXT_BUTTON}"]`);
    await nextButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1000);
    await nextButton.click();
  });

  await test.step('Wait for preparing transactions', async () => {
    // Wait for preparing progress to complete (up to 2 minutes for complex transfers)
    // The preparing page shows progress percentage
    console.log('Waiting for transaction preparation...');

    // Wait for the confirmation page to appear (Sign button becomes visible)
    await page.waitForSelector(`[data-testid="${TestIds.SEND.SIGN_AND_PAY_BUTTON}"]`, {
      timeout: 120000,
    });
    console.log('Transaction preparation complete, confirmation page loaded');
  });

  await test.step('Sign and broadcast transactions', async () => {
    // On the new confirmation page, click the Sign button to broadcast all transactions
    await page.waitForTimeout(500);
    await page.click(`[data-testid="${TestIds.SEND.SIGN_AND_PAY_BUTTON}"]`);
  });

  await test.step('Wait for success and click done', async () => {
    await page.waitForSelector(`[data-testid="${TestIds.TX_SUCCESS.CONTAINER}"]`, {
      timeout: 60000,
    });
    await page.click(`[data-testid="${TestIds.TX_SUCCESS.DONE_BUTTON}"]`);
  });
}

test.describe('CAT20 Token', () => {
  let extensionInfo: ExtensionInfo;
  let page: Page;
  let context: BrowserContext;
  let testTokenId: string;

  test.beforeAll(async () => {
    // Step 1: Clean up tokens and ensure testCat20 is ready
    // This is done BEFORE loading the extension to avoid wallet state conflicts
    console.log('Setting up test token...');
    testTokenId = await ensureTestToken();
    console.log(`Test token ready: ${testTokenId}`);

    // Step 2: Load extension
    extensionInfo = await loadExtension();
    context = extensionInfo.context;

    // Step 3: Create page and restore wallet
    page = await context.newPage();
    await restoreWallet(
      page,
      extensionInfo.extensionUrl,
      TEST_WALLET.password,
      TEST_WALLET.mnemonic
    );
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('should transfer CAT20 token to Satoshi address', async () => {
    let initialBalance: number;

    await test.step('Navigate to CAT20 token screen', async () => {
      await navigateToCAT20Token(page, test, TEST_CAT20.NAME);
    });

    await test.step('Get initial balance', async () => {
      initialBalance = await getCAT20Balance(TEST_WALLET.address, testTokenId);
      console.log(`Initial balance: ${initialBalance}`);
    });

    await test.step('Perform CAT20 transfer', async () => {
      await transferCAT20(page, test, TEST_CAT20.SATOSHI_ADDRESS, TEST_CAT20.TRANSFER_AMOUNT);
    });

    await test.step('Wait for balance to update', async () => {
      await page.waitForTimeout(5000);
    });

    await test.step('Verify balance decreased', async () => {
      const finalBalance = await getCAT20Balance(TEST_WALLET.address, testTokenId);
      console.log(`Final balance: ${finalBalance}`);
      expect(finalBalance).toBeLessThan(initialBalance);
    });
  });
});
