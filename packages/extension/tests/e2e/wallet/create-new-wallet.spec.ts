import { test, expect } from '@playwright/test';
import { loadExtension } from '../helpers/extension-loader';
import { createWallet } from '../helpers/wallet-utils';
import { log, locateTestId, TestIds } from '../helpers/test-utils';
import { TEST_PRIVATE_KEYS, TEST_ADDRESSES, TEST_PASSWORDS } from '../test-constants';

test.describe('Create New Wallet', () => {

  test('should import wallet from private key', async () => {
    // Load extension
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    log('1. Creating initial wallet...');
    await createWallet(page, extensionUrl, TEST_PASSWORDS.VALID);
    log('✓ Initial wallet created');

    // Wait for main page to fully load
    await page.waitForTimeout(2000);

    log('2. Clicking wallet switcher button...');
    const walletSwitcher = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
    await expect(walletSwitcher).toBeVisible({ timeout: 10000 });
    await walletSwitcher.click();
    log('✓ Opened wallet switcher');

    // Wait for switcher page to load
    await page.waitForTimeout(2000);

    log('3. Clicking add wallet button (top right)...');
    const addWalletBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADD_WALLET_BUTTON);
    await expect(addWalletBtn).toBeVisible({ timeout: 10000 });
    await addWalletBtn.click();
    log('✓ Clicked add wallet button');

    // Wait for create new wallet page
    await page.waitForTimeout(2000);

    log('4. Selecting "Restore from single private key" option...');
    const privateKeyOption = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.RESTORE_PRIVATE_KEY_OPTION);
    await expect(privateKeyOption).toBeVisible({ timeout: 10000 });
    await privateKeyOption.click();
    log('✓ Selected private key import option');

    // Wait for private key input page
    await page.waitForTimeout(2000);

    log('5. Step 1: Entering private key...');
    const privateKeyInput = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.PRIVATE_KEY_INPUT);
    await expect(privateKeyInput).toBeVisible({ timeout: 10000 });
    await privateKeyInput.fill(TEST_PRIVATE_KEYS.KEY_1);
    log('✓ Private key entered');

    // Click continue button
    log('6. Clicking continue button...');
    const continueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.CONTINUE_BUTTON);
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await continueBtn.click();
    log('✓ Proceeding to Step 2');

    // Wait for Step 2
    await page.waitForTimeout(3000);

    log('7. Step 2: Copying address from clipboard...');

    // Click on the address copy button to copy full address to clipboard
    const addressCopyBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADDRESS_COPY_BUTTON);
    await expect(addressCopyBtn).toBeVisible({ timeout: 10000 });
    await addressCopyBtn.click();
    await page.waitForTimeout(500);

    // Read address from clipboard
    const clipboardAddress = await page.evaluate(() => navigator.clipboard.readText());
    log(`   Address from clipboard: ${clipboardAddress}`);

    // Verify the full address matches expected (testnet address)
    expect(clipboardAddress).toBe(TEST_ADDRESSES.KEY_1_P2PKH_TESTNET);
    log(`✓ Address verified: ${clipboardAddress}`);

    // Click final continue button
    log('8. Clicking continue to import wallet...');
    const finalContinueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.STEP2_CONTINUE_BUTTON);
    await expect(finalContinueBtn).toBeVisible({ timeout: 10000 });
    await finalContinueBtn.click();
    log('✓ Wallet import initiated');

    // Wait for navigation to main page
    await page.waitForTimeout(5000);

    log('9. Verifying wallet imported successfully...');

    // Check if we're back on main page
    const mainBalanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
    await expect(mainBalanceDisplay).toBeVisible({ timeout: 15000 });

    log('✅ Private key wallet imported successfully!');

    // Clean up
    await context.close();
  });

  test('should show error for invalid private key', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    log('1. Creating initial wallet...');
    await createWallet(page, extensionUrl, TEST_PASSWORDS.VALID);

    await page.waitForTimeout(2000);

    log('2. Opening wallet switcher...');
    const walletSwitcher = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
    await expect(walletSwitcher).toBeVisible({ timeout: 10000 });
    await walletSwitcher.click();

    await page.waitForTimeout(2000);

    log('3. Clicking add wallet...');
    const addWalletBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADD_WALLET_BUTTON);
    await expect(addWalletBtn).toBeVisible({ timeout: 10000 });
    await addWalletBtn.click();

    await page.waitForTimeout(2000);

    log('4. Selecting private key option...');
    const privateKeyOption = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.RESTORE_PRIVATE_KEY_OPTION);
    await expect(privateKeyOption).toBeVisible({ timeout: 10000 });
    await privateKeyOption.click();

    await page.waitForTimeout(2000);

    log('5. Entering invalid private key...');
    const privateKeyInput = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.PRIVATE_KEY_INPUT);
    await expect(privateKeyInput).toBeVisible({ timeout: 10000 });
    await privateKeyInput.fill(TEST_PRIVATE_KEYS.INVALID);

    log('6. Trying to continue...');
    const continueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.CONTINUE_BUTTON);
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await continueBtn.click();

    // Should see an error or button should be disabled
    await page.waitForTimeout(1000);

    // Check if still on same page (not navigated) - input should still be visible
    const stillHasInput = await privateKeyInput.isVisible();
    expect(stillHasInput).toBe(true);
    log('✅ Invalid private key rejected - still on input page');

    await context.close();
  });

  test('should switch between multiple wallets', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    log('1. Creating first wallet...');
    await createWallet(page, extensionUrl, TEST_PASSWORDS.VALID);
    log(`✓ First wallet created`);

    await page.waitForTimeout(2000);

    log('2. Adding second wallet with private key...');

    // Click wallet switcher to open wallet management
    const walletSwitcher = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
    await expect(walletSwitcher).toBeVisible({ timeout: 10000 });
    await walletSwitcher.click();
    await page.waitForTimeout(2000);

    // Click add wallet button
    const addWalletBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADD_WALLET_BUTTON);
    await expect(addWalletBtn).toBeVisible({ timeout: 10000 });
    await addWalletBtn.click();
    await page.waitForTimeout(2000);

    // Select private key option
    const privateKeyOption = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.RESTORE_PRIVATE_KEY_OPTION);
    await expect(privateKeyOption).toBeVisible({ timeout: 10000 });
    await privateKeyOption.click();
    await page.waitForTimeout(2000);

    // Enter private key
    const privateKeyInput = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.PRIVATE_KEY_INPUT);
    await expect(privateKeyInput).toBeVisible({ timeout: 10000 });
    await privateKeyInput.fill(TEST_PRIVATE_KEYS.KEY_2);

    // Click continue
    const continueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.CONTINUE_BUTTON);
    await expect(continueBtn).toBeVisible({ timeout: 10000 });
    await continueBtn.click();
    await page.waitForTimeout(3000);

    // Click final continue to import
    const finalContinueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.STEP2_CONTINUE_BUTTON);
    await expect(finalContinueBtn).toBeVisible({ timeout: 10000 });
    await finalContinueBtn.click();

    // Wait for navigation to main page
    await page.waitForTimeout(5000);

    log('✓ Second wallet imported');

    // Now try to switch back to first wallet
    log('3. Switching back to first wallet...');

    // Open wallet switcher again
    const switcherAgain = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
    await expect(switcherAgain).toBeVisible({ timeout: 10000 });
    await switcherAgain.click();
    await page.waitForTimeout(2000);

    // Click on first wallet in the list
    const walletList = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.WALLET_LIST);
    await expect(walletList).toBeVisible({ timeout: 10000 });

    const firstWallet = walletList.locator('[data-testid="' + TestIds.ACCOUNT_MANAGEMENT.WALLET_ITEM + '"]').first();
    await expect(firstWallet).toBeVisible({ timeout: 10000 });
    await firstWallet.click();
    log('✅ Successfully switched between wallets');

    await context.close();
  });
});
