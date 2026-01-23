import { Page, expect } from '@playwright/test';
import { locateTestId, log, TestIds } from './test-utils';

/**
 * Close version update popup if it appears
 * This popup may appear when first entering the main page after creating/restoring wallet
 * @param page - Playwright page object
 */
export async function closeVersionPopupIfExists(page: Page): Promise<void> {
  // Wait a bit for popup to potentially appear
  await page.waitForTimeout(500);

  // Check if version popup exists using testid
  const versionPopup = locateTestId(page, TestIds.VERSION_NOTICE.POPUP);
  const popupExists = await versionPopup.count() > 0;

  if (popupExists) {
    log('   Closing version update popup...');

    // Click "Got it" button using testid with force to bypass any overlay issues
    const gotItButton = locateTestId(page, TestIds.VERSION_NOTICE.GOT_IT_BUTTON);
    if (await gotItButton.count() > 0) {
      await gotItButton.click({ force: true });
      await page.waitForTimeout(1000);
      log('   ✓ Version popup closed');
    }
  }
}

/**
 * Create wallet result containing mnemonic and address
 */
export interface CreateWalletResult {
  mnemonic: string;
  address: string;
}

/**
 * Create a new wallet with the given password
 * @param page - Playwright page object
 * @param extensionUrl - Extension URL
 * @param password - Password for the wallet
 * @param mnemonicWords - Optional: number of mnemonic words (12 or 24), default is 12
 * @returns The generated mnemonic phrase and wallet address
 */
export async function createWallet(
  page: Page,
  extensionUrl: string,
  password: string,
  mnemonicWords: 12 | 24 = 12
): Promise<CreateWalletResult> {
  log('Starting wallet creation...');

  // 1. Navigate to welcome page
  await page.goto(`${extensionUrl}/index.html#/welcome`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Wait for extension to fully initialize

  // 2. Click create wallet button
  const createButton = locateTestId(page, TestIds.WELCOME.CREATE_WALLET_BUTTON);
  await expect(createButton).toBeVisible({ timeout: 30000 });
  await createButton.click();
  log('✓ Clicked create wallet');

  // 3. Set up password
  const passwordInput = locateTestId(page, TestIds.PASSWORD.NEW_PASSWORD_INPUT);
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  const confirmPasswordInput = locateTestId(page, TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
  await confirmPasswordInput.fill(password);

  const continueButton = locateTestId(page, TestIds.PASSWORD.CONTINUE_BUTTON);
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
  log('✓ Password set up');

  // 4. Wait for mnemonic generation
  const mnemonicDisplay = locateTestId(page, TestIds.CREATE_WALLET.MNEMONIC_DISPLAY);
  await expect(mnemonicDisplay).toBeVisible({ timeout: 20000 });

  // 5. Collect mnemonic words
  const words = [];
  for (let i = 0; i < mnemonicWords; i++) {
    const wordElement = locateTestId(page, `${TestIds.CREATE_WALLET.MNEMONIC_WORD}-${i}`);
    await expect(wordElement).toBeVisible();
    const wordText = await wordElement.textContent();
    // Extract word from format "1. word"
    const word = wordText?.split(/\d+\.\s+/)[1]?.trim();
    if (word) {
      words.push(word);
    }
  }

  const mnemonic = words.join(' ');
  log(`✓ Generated ${mnemonicWords}-word mnemonic`);

  // 6. Check the confirmation checkbox
  const checkbox = locateTestId(page, TestIds.CREATE_WALLET.MNEMONIC_SAVE_CHECKBOX);
  await checkbox.click();

  // 7. Continue to Step 2 (address type selection)
  const mnemonicContinueButton = locateTestId(page, TestIds.CREATE_WALLET.CONTINUE_BUTTON);
  await expect(mnemonicContinueButton).toBeEnabled();
  await mnemonicContinueButton.click();
  log('✓ Proceeding to address selection');

  // 8. Wait for Step 2 and select first address type (P2PKH)
  await page.waitForTimeout(3000);
  const addressTypeOption = locateTestId(page, `${TestIds.CREATE_WALLET.ADDRESS_TYPE_OPTION}-0`);
  await expect(addressTypeOption).toBeVisible({ timeout: 10000 });
  await addressTypeOption.click();
  log('✓ Selected P2PKH address type');

  // 9. Click continue to finalize
  const step2ContinueButton = locateTestId(page, TestIds.CREATE_WALLET.STEP2_CONTINUE_BUTTON);
  await expect(step2ContinueButton).toBeEnabled({ timeout: 10000 });
  await step2ContinueButton.click();
  log('✓ Finalizing wallet creation');

  // 10. Wait for main wallet screen
  await page.waitForTimeout(5000);
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 15000 });

  // Verify we're on main screen
  const receiveButton = locateTestId(page, TestIds.WALLET.RECEIVE_BUTTON);
  const sendButton = locateTestId(page, TestIds.WALLET.SEND_BUTTON);
  await expect(receiveButton).toBeVisible({ timeout: 5000 });
  await expect(sendButton).toBeVisible({ timeout: 5000 });

  // Close version popup if it appears
  await closeVersionPopupIfExists(page);

  // Wait a bit for popup to fully close
  await page.waitForTimeout(1000);

  // Get the wallet address from the ADDRESS_DISPLAY element's data-address attribute
  const addressDisplay = locateTestId(page, TestIds.ACCOUNT_SELECT.ADDRESS_DISPLAY);
  await expect(addressDisplay).toBeVisible({ timeout: 5000 });
  const address = await addressDisplay.getAttribute('data-address') || '';
  log(`✓ Wallet address: ${address}`);

  log('✅ Wallet created successfully');
  return { mnemonic, address };
}

/**
 * Restore a wallet using an existing mnemonic
 * @param page - Playwright page object
 * @param extensionUrl - Extension URL
 * @param password - Password for the wallet
 * @param mnemonic - The mnemonic phrase to restore (12 or 24 words)
 * @returns The wallet address
 */
export async function restoreWallet(
  page: Page,
  extensionUrl: string,
  password: string,
  mnemonic: string
): Promise<string> {
  log('Starting wallet restoration...');

  const words = mnemonic.split(' ');
  if (words.length !== 12 && words.length !== 24) {
    throw new Error('Mnemonic must be 12 or 24 words');
  }

  // 1. Navigate to welcome page
  await page.goto(`${extensionUrl}/index.html#/welcome`);

  // 2. Click "I already have a wallet" button
  const importButton = locateTestId(page, TestIds.WELCOME.IMPORT_WALLET_BUTTON);
  await expect(importButton).toBeVisible({ timeout: 60000 });
  await importButton.click();
  log('✓ Clicked restore wallet');

  // 3. Set up password
  await page.waitForTimeout(2000);
  const passwordInput = locateTestId(page, TestIds.PASSWORD.NEW_PASSWORD_INPUT);
  await expect(passwordInput).toBeVisible({ timeout: 10000 });
  await passwordInput.fill(password);

  const confirmPasswordInput = locateTestId(page, TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
  await confirmPasswordInput.fill(password);

  const passwordContinueBtn = locateTestId(page, TestIds.PASSWORD.CONTINUE_BUTTON);
  await expect(passwordContinueBtn).toBeEnabled();
  await passwordContinueBtn.click();
  log('✓ Password set up');

  // 4. Step 1: Select wallet type (CATENA Wallet - first option)
  await page.waitForTimeout(2000);
  const firstWalletOption = locateTestId(page, `${TestIds.IMPORT_WALLET.RESTORE_WALLET_OPTION}-0`);
  await expect(firstWalletOption).toBeVisible({ timeout: 10000 });
  await firstWalletOption.click();
  log('✓ Selected CATENA Wallet');

  // 5. Step 2: Enter the mnemonic
  await page.waitForTimeout(2000);
  const firstWordInput = locateTestId(page, `${TestIds.IMPORT_WALLET.MNEMONIC_WORD}-0`);
  await expect(firstWordInput).toBeVisible({ timeout: 10000 });

  // Fill each word
  for (let i = 0; i < words.length; i++) {
    const wordInput = locateTestId(page, `${TestIds.IMPORT_WALLET.MNEMONIC_WORD}-${i}`);
    await wordInput.click();
    await wordInput.fill(words[i]);
  }
  log(`✓ Entered ${words.length} mnemonic words`);

  // 6. Continue to Step 3
  const continueBtn = locateTestId(page, TestIds.IMPORT_WALLET.CONTINUE_BUTTON);
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  log('✓ Proceeding to address display');

  // 7. Step 3: Address type display - click final continue
  await page.waitForTimeout(3000);
  const finalContinueBtn = locateTestId(page, TestIds.CREATE_WALLET.STEP2_CONTINUE_BUTTON);
  await expect(finalContinueBtn).toBeVisible({ timeout: 10000 });
  await finalContinueBtn.click();
  log('✓ Finalizing wallet restoration');

  // 8. Wait for main wallet screen
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 30000 });

  // Verify we're on main screen
  const sendButton = locateTestId(page, TestIds.WALLET.SEND_BUTTON);
  const receiveButton = locateTestId(page, TestIds.WALLET.RECEIVE_BUTTON);
  await expect(sendButton).toBeVisible();
  await expect(receiveButton).toBeVisible();

  // Close version popup if it appears (must be done before clicking address copy button)
  await closeVersionPopupIfExists(page);

  // Wait a bit for popup to fully close
  await page.waitForTimeout(1000);

  // Get the wallet address from the ADDRESS_DISPLAY element's data-address attribute
  const addressDisplay = locateTestId(page, TestIds.ACCOUNT_SELECT.ADDRESS_DISPLAY);
  await expect(addressDisplay).toBeVisible({ timeout: 5000 });
  const address = await addressDisplay.getAttribute('data-address') || '';
  log(`✓ Wallet address: ${address}`);

  log('✅ Wallet restored successfully');
  return address;
}

/**
 * Import a wallet using private key from the main page
 * Assumes the wallet is already unlocked and on the main page
 * @param page - Playwright page object
 * @param privateKey - The private key (WIF format) to import
 * @returns The generated address for the imported wallet
 */
export async function createNewPrivateKeyWallet(
  page: Page,
  privateKey: string
): Promise<string> {
  log('Starting private key wallet import...');

  // Verify we're on main page by checking balance display
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 10000 });
  log('✓ Confirmed on main page');

  // Close version popup if it appears (it may block wallet switcher)
  await closeVersionPopupIfExists(page);

  // 1. Click wallet switcher button
  const walletSwitcher = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
  await expect(walletSwitcher).toBeVisible({ timeout: 10000 });
  await walletSwitcher.click();
  await page.waitForTimeout(2000);
  log('✓ Opened wallet switcher');

  // 2. Click add wallet button
  const addWalletBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADD_WALLET_BUTTON);
  await expect(addWalletBtn).toBeVisible({ timeout: 10000 });
  await addWalletBtn.click();
  await page.waitForTimeout(2000);
  log('✓ Clicked add wallet button');

  // 3. Select "Restore from single private key" option
  const privateKeyOption = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.RESTORE_PRIVATE_KEY_OPTION);
  await expect(privateKeyOption).toBeVisible({ timeout: 10000 });
  await privateKeyOption.click();
  await page.waitForTimeout(2000);
  log('✓ Selected private key import option');

  // 4. Step 1: Enter private key
  const privateKeyInput = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.PRIVATE_KEY_INPUT);
  await expect(privateKeyInput).toBeVisible({ timeout: 10000 });
  await privateKeyInput.fill(privateKey);
  log('✓ Private key entered');

  // 5. Click continue button
  const continueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.CONTINUE_BUTTON);
  await expect(continueBtn).toBeVisible({ timeout: 10000 });
  await continueBtn.click();
  await page.waitForTimeout(3000);
  log('✓ Proceeding to Step 2');

  // 6. Step 2: Wait for address to load and get it from data-address attribute
  // The address is loaded asynchronously, so we need to wait for it to appear
  const addressCopyBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.ADDRESS_COPY_BUTTON);
  await expect(addressCopyBtn).toBeVisible({ timeout: 10000 });

  // Wait for the address to be populated (data-address attribute is not empty)
  await page.waitForFunction(
    (testId) => {
      const copyBtn = document.querySelector(`[data-testid="${testId}"]`);
      if (!copyBtn) return false;
      const address = copyBtn.getAttribute('data-address') || '';
      // Address should not be empty
      return address.length > 0;
    },
    TestIds.ACCOUNT_MANAGEMENT.ADDRESS_COPY_BUTTON,
    { timeout: 15000 }
  );
  log('✓ Address loaded in UI');

  // Get address from data-address attribute
  const address = await addressCopyBtn.getAttribute('data-address') || '';
  log(`✓ Address copied: ${address}`);

  // 7. Click final continue button to complete import
  const finalContinueBtn = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.STEP2_CONTINUE_BUTTON);
  await expect(finalContinueBtn).toBeVisible({ timeout: 10000 });
  await finalContinueBtn.click();
  log('✓ Wallet import initiated');

  // 8. Wait for navigation back to main page
  await page.waitForTimeout(5000);
  await expect(balanceDisplay).toBeVisible({ timeout: 15000 });

  log('✅ Private key wallet imported successfully');
  return address;
}

/**
 * Get total BTC balance from the main wallet screen
 * Assumes we're already on the main page
 * @param page - Playwright page object
 * @returns The total BTC balance as a number
 */
export async function getTotalBTCBalance(page: Page): Promise<number> {
  log('Getting total BTC balance...');

  // Verify we're on main page
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 10000 });

  // Get the balance text content
  const balanceText = await balanceDisplay.textContent();
  if (!balanceText) {
    throw new Error('Could not get balance text');
  }

  // Parse the balance - format is like "0.00123456 tBTC" or "1.23456789 BTC"
  // Remove the unit suffix and parse as float
  const balanceMatch = balanceText.match(/^([\d.]+)/);
  if (!balanceMatch) {
    throw new Error(`Could not parse balance from: ${balanceText}`);
  }

  const balance = parseFloat(balanceMatch[1]);
  log(`✓ Total BTC balance: ${balance}`);
  return balance;
}

/**
 * Switch to a wallet (keyring) by matching its address
 * Assumes we're on the main page
 * @param page - Playwright page object
 * @param targetAddress - The address of the wallet to switch to
 */
export async function switchToWalletByAddress(page: Page, targetAddress: string): Promise<void> {
  log(`Switching to wallet with address: ${targetAddress}...`);

  // 1. Click the wallet switcher button (top left on main page)
  const walletSwitcher = locateTestId(page, TestIds.WALLET.WALLET_SWITCHER);
  await expect(walletSwitcher).toBeVisible({ timeout: 10000 });
  await walletSwitcher.click();
  await page.waitForTimeout(2000);
  log('✓ Opened wallet switcher');

  // 2. Find the wallet list
  const walletList = locateTestId(page, TestIds.ACCOUNT_MANAGEMENT.WALLET_LIST);
  await expect(walletList).toBeVisible({ timeout: 10000 });

  // 3. Find all wallet items and click the one matching the address
  const walletItems = walletList.locator(`[data-testid="${TestIds.ACCOUNT_MANAGEMENT.WALLET_ITEM}"]`);
  const count = await walletItems.count();
  log(`   Found ${count} wallet items`);

  let found = false;
  for (let i = 0; i < count; i++) {
    const item = walletItems.nth(i);
    const itemText = await item.textContent();
    log(`   Wallet ${i}: ${itemText}`);

    // Check if this wallet item contains the target address (short format)
    // UI uses shortAddress(address, 5) which produces "XXXXX...XXXXX" format
    const shortAddr = targetAddress.slice(0, 5) + '...' + targetAddress.slice(-5);
    if (itemText?.includes(shortAddr) || itemText?.includes(targetAddress)) {
      await item.click();
      found = true;
      log(`✓ Found and clicked wallet with address: ${targetAddress}`);
      break;
    }
  }

  if (!found) {
    throw new Error(`Could not find wallet with address: ${targetAddress}`);
  }

  // 4. Wait for navigation back to main page
  await page.waitForTimeout(3000);
  const balanceDisplay = locateTestId(page, TestIds.WALLET.BALANCE_DISPLAY);
  await expect(balanceDisplay).toBeVisible({ timeout: 15000 });

  log('✅ Successfully switched wallet');
}

/**
 * Common test mnemonic phrases for testing
 */
export const TEST_MNEMONICS = {
  MNEMONIC_12: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  MNEMONIC_24: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
};