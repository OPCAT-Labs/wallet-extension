import { test, expect } from '../fixtures';
import { Page, BrowserContext } from '@playwright/test';
import { loadExtension } from '../helpers/extension-loader';
import {
  restoreWallet,
  createNewPrivateKeyWallet,
  getTotalBTCBalance,
  switchToWalletByAddress,
  closeVersionPopupIfExists,
  switchToTestnet,
} from '../helpers/wallet-utils';
import { log, locateTestId, TestIds } from '../helpers/test-utils';
import {
  TEST_PRIVATE_KEYS,
  TEST_ADDRESSES,
  TEST_PASSWORDS,
  TEST_MNEMONICS,
  TEST_AMOUNTS,
} from '../test-constants';

/**
 * Helper function to perform BTC transfer
 * @param page - Playwright page
 * @param walletAddress - Wallet address to transfer from (and to - sends to self)
 * @param walletName - Display name for logging
 */
async function transferBTC(page: Page, walletAddress: string, walletName: string): Promise<void> {
  log(`Starting BTC transfer test from ${walletName}...`);

  // 1. Switch to the wallet
  log('1. Switching to wallet...');
  await switchToWalletByAddress(page, walletAddress);
  log(`✓ Switched to ${walletName}`);

  // Close version popup if it appears
  await closeVersionPopupIfExists(page);

  // 2. Verify we're on the main page and get initial balance
  log('2. Getting initial balance...');
  const initialBalance = await getTotalBTCBalance(page);
  log(`   Initial balance: ${initialBalance} BTC`);

  // 3. Ensure balance is sufficient for transfer
  if (initialBalance < TEST_AMOUNTS.MIN_BALANCE_FOR_TRANSFER) {
    throw new Error(
      `Insufficient balance for transfer test. Required: ${TEST_AMOUNTS.MIN_BALANCE_FOR_TRANSFER} BTC, Available: ${initialBalance} BTC`
    );
  }
  log(`✓ Balance sufficient (>= ${TEST_AMOUNTS.MIN_BALANCE_FOR_TRANSFER} BTC)`);

  // 4. Click send button to start transfer
  log('3. Clicking send button...');
  const sendButton = locateTestId(page, TestIds.WALLET.SEND_BUTTON);
  await expect(sendButton).toBeVisible({ timeout: 10000 });
  await sendButton.click();
  await page.waitForTimeout(3000); // Wait for send page to load
  log('✓ Navigated to send BTC page');

  // 5. Enter recipient address (send to self)
  log('4. Entering recipient address...');
  const recipientInput = locateTestId(page, TestIds.SEND.RECIPIENT_INPUT);
  await expect(recipientInput).toBeVisible({ timeout: 10000 });
  await recipientInput.fill(walletAddress);
  await page.waitForTimeout(1000);
  log(`✓ Entered recipient: ${walletAddress}`);

  // 6. Enter transfer amount
  log('5. Entering transfer amount...');
  const amountInput = locateTestId(page, TestIds.SEND.AMOUNT_INPUT);
  await expect(amountInput).toBeVisible({ timeout: 10000 });
  await amountInput.fill(TEST_AMOUNTS.TRANSFER_AMOUNT);
  await page.waitForTimeout(1000);
  log(`✓ Entered amount: ${TEST_AMOUNTS.TRANSFER_AMOUNT} BTC`);

  // 7. Click next button to proceed to sign transaction page
  log('6. Clicking next button...');
  const nextButton = locateTestId(page, TestIds.SEND.NEXT_BUTTON);
  await expect(nextButton).toBeEnabled({ timeout: 15000 });
  await nextButton.click();
  await page.waitForTimeout(3000); // Wait for sign page to load
  log('✓ Navigated to sign transaction page');

  // 8. Click sign & pay button
  log('7. Clicking sign & pay button...');
  const signAndPayButton = locateTestId(page, TestIds.SEND.SIGN_AND_PAY_BUTTON);
  await expect(signAndPayButton).toBeVisible({ timeout: 15000 });
  await expect(signAndPayButton).toBeEnabled({ timeout: 10000 });
  await signAndPayButton.click();
  log('✓ Transaction signing initiated');

  // 9. Wait for payment sent page
  log('8. Waiting for payment confirmation...');
  const txSuccessContainer = locateTestId(page, TestIds.TX_SUCCESS.CONTAINER);
  await expect(txSuccessContainer).toBeVisible({ timeout: 60000 }); // May take a while for broadcast
  log('✓ Payment sent successfully');

  // 10. Click Done button
  log('9. Clicking Done button...');
  const doneButton = locateTestId(page, TestIds.TX_SUCCESS.DONE_BUTTON);
  await expect(doneButton).toBeVisible({ timeout: 10000 });
  await doneButton.click();
  await page.waitForTimeout(3000);
  log('✓ Returned to main page');

  // 11. Verify we're back on main page
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 15000 });

  // 12. Get final balance and verify it decreased (due to network fee)
  log('10. Verifying balance decreased...');
  await page.waitForTimeout(5000); // Wait for balance to update
  const finalBalance = await getTotalBTCBalance(page);
  log(`   Final balance: ${finalBalance} BTC`);

  // Balance should be less than initial due to network fee
  // Note: Since we're sending to self, we only lose the network fee
  expect(finalBalance).toBeLessThan(initialBalance);
  log(`✓ Balance decreased from ${initialBalance} to ${finalBalance} (fee paid)`);

  log(`✅ BTC transfer test from ${walletName} completed successfully!`);
}

test.describe('Transfer BTC', () => {
  let context: BrowserContext;
  let page: Page;
  let extensionUrl: string;
  let mnemonicWalletAddress: string;
  let privateKeyWalletAddress: string;

  test.beforeAll(async ({ }, testInfo) => {
    testInfo.setTimeout(180000); // 3 minutes
    // Load extension
    const extension = await loadExtension();
    context = extension.context;
    extensionUrl = extension.extensionUrl;
    page = await context.newPage();

    log('Setting up wallets for transfer tests...');

    // 1. Restore wallet using mnemonic
    mnemonicWalletAddress = await restoreWallet(
      page,
      extensionUrl,
      TEST_PASSWORDS.VALID,
      TEST_MNEMONICS.MNEMONIC_12
    );
    log(`✓ Mnemonic wallet restored: ${mnemonicWalletAddress}`);

    // Switch to testnet for E2E tests
    await switchToTestnet(page);

    // After switching to testnet, the wallet address changes to testnet format
    mnemonicWalletAddress = TEST_ADDRESSES.MNEMONIC_12_P2PKH_TESTNET;
    log(`✓ Wallet address updated to testnet: ${mnemonicWalletAddress}`);

    // 2. Import private key wallet
    privateKeyWalletAddress = await createNewPrivateKeyWallet(page, TEST_PRIVATE_KEYS.KEY_1);
    log(`✓ Private key wallet imported: ${privateKeyWalletAddress}`);

    // Verify address matches expected
    expect(privateKeyWalletAddress).toBe(TEST_ADDRESSES.KEY_1_P2PKH_TESTNET);

    log('✅ Wallet setup complete');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('should transfer BTC from mnemonic wallet', async () => {
    await transferBTC(page, mnemonicWalletAddress, 'mnemonic wallet');
  });

  test('should transfer BTC from private key wallet', async () => {
    await transferBTC(page, privateKeyWalletAddress, 'private key wallet');
  });
});