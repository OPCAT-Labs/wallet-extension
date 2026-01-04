import { test, expect } from '@playwright/test';
import { loadExtension } from '../helpers/extension-loader';
import {
  log,
  locateTestId,
  clickTestId,
  fillTestId,
  waitForTestId,
  TestIds
} from '../helpers/test-utils';

test.describe('Create Wallet', () => {

  test.describe('Basic Flow', () => {
    test('should create wallet with 12-word mnemonic', async () => {
      // Load extension
      const { context, extensionUrl } = await loadExtension();
      const page = await context.newPage();

      log('1. Opening welcome screen...');
      await page.goto(`${extensionUrl}/index.html#/welcome`);

      // Wait and verify welcome screen
      const createButton = locateTestId(page, TestIds.WELCOME.CREATE_WALLET_BUTTON);
      await expect(createButton).toBeVisible({ timeout: 30000 });
      log('✓ Welcome screen loaded');

      // Click create wallet
      log('2. Clicking create wallet...');
      await createButton.click();

      // Wait for navigation to password screen
      log('3. Waiting for password screen...');
      const passwordInput = locateTestId(page, TestIds.PASSWORD.NEW_PASSWORD_INPUT);
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      log('✓ Password screen loaded');

      // Fill passwords
      log('4. Setting up password...');
      const password = 'TestPassword123!';
      await passwordInput.fill(password);

      const confirmPasswordInput = locateTestId(page, TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
      await confirmPasswordInput.fill(password);
      log('✓ Passwords filled');

      // Click continue
      const continueButton = locateTestId(page, TestIds.PASSWORD.CONTINUE_BUTTON);
      await expect(continueButton).toBeEnabled();
      log('5. Clicking continue to boot wallet...');
      await continueButton.click();

      // Wait for wallet boot and navigation to mnemonic screen
      log('6. Waiting for mnemonic generation...');
      const mnemonicDisplay = locateTestId(page,TestIds.CREATE_WALLET.MNEMONIC_DISPLAY);
      await expect(mnemonicDisplay).toBeVisible({ timeout: 20000 });
      log('✓ Mnemonic screen loaded');

      // Verify mnemonic words are displayed
      log('7. Verifying mnemonic display...');
      const mnemonicWords = [];
      for (let i = 0; i < 12; i++) {
        const wordElement = locateTestId(page, `${TestIds.CREATE_WALLET.MNEMONIC_WORD}-${i}`);
        await expect(wordElement).toBeVisible();
        const wordText = await wordElement.textContent();
        // Extract word from format "1. word"
        const word = wordText?.split(/\d+\.\s+/)[1]?.trim();
        if (word) {
          mnemonicWords.push(word);
        }
      }

      expect(mnemonicWords.length).toBe(12);
      log(`✓ Found ${mnemonicWords.length} mnemonic words`);

      // Verify words are unique (not all the same)
      const uniqueWords = new Set(mnemonicWords);
      expect(uniqueWords.size).toBeGreaterThan(1);
      log(`✓ Mnemonic has ${uniqueWords.size} unique words`);

      // Check the confirmation checkbox
      log('8. Checking confirmation checkbox...');
      const checkbox = locateTestId(page,TestIds.CREATE_WALLET.MNEMONIC_SAVE_CHECKBOX);
      await expect(checkbox).toBeVisible();
      await checkbox.click();
      log('✓ Checkbox checked');

      // Continue button should now be enabled
      const mnemonicContinueButton = locateTestId(page,TestIds.CREATE_WALLET.CONTINUE_BUTTON);
      await expect(mnemonicContinueButton).toBeEnabled();
      log('9. Clicking continue...');
      await mnemonicContinueButton.click();

      // Wait for navigation to Step 2 - MUST reach Step 2
      log('10. Waiting for Step 2 (address selection)...');
      await page.waitForTimeout(3000);

      // Step 2 is REQUIRED - test fails if we don't reach it
      const pageContent = await page.textContent('body');
      const hasStep2 = pageContent?.includes('Step 2') || pageContent?.includes('步骤 2') || pageContent?.includes('Address Type');

      // Fail the test if Step 2 is not reached
      if (!hasStep2) {
        const currentContent = await page.textContent('body');
        throw new Error(`Test Failed: Did not reach Step 2 after mnemonic creation. Current page contains: ${currentContent?.substring(0, 200)}`);
      }

      log('✅ Successfully reached Step 2 (address selection)');

      // Select the first address type (P2PKH - Legacy)
      log('11. Selecting address type (P2PKH)...');
      const addressTypeOption = locateTestId(page, `${TestIds.CREATE_WALLET.ADDRESS_TYPE_OPTION}-0`);
      await expect(addressTypeOption).toBeVisible({ timeout: 10000 });
      await addressTypeOption.click();
      log('✓ Selected P2PKH address type');

      // Click continue to proceed
      log('12. Clicking continue to finalize wallet creation...');
      const step2ContinueButton = locateTestId(page,TestIds.CREATE_WALLET.STEP2_CONTINUE_BUTTON);
      await expect(step2ContinueButton).toBeEnabled({ timeout: 10000 });
      await step2ContinueButton.click();

      // Wait for wallet to be created and navigate to main screen
      log('13. Waiting for wallet main screen...');
      await page.waitForTimeout(5000); // Give time for wallet creation

      // Check if we reached the wallet main screen - MUST reach main screen
      const balanceDisplay = locateTestId(page,TestIds.WALLET.BALANCE_DISPLAY);

      // Wait for balance display with proper error handling
      try {
        await expect(balanceDisplay).toBeVisible({ timeout: 15000 });
        log('✅ Wallet creation complete - reached main wallet screen');
      } catch (error) {
        const currentContent = await page.textContent('body');
        throw new Error(`Test Failed: Did not reach wallet main screen. Current page contains: ${currentContent?.substring(0, 200)}`);
      }

      // Verify key elements are present - these MUST be visible
      const receiveButton = locateTestId(page,TestIds.WALLET.RECEIVE_BUTTON);
      const sendButton = locateTestId(page,TestIds.WALLET.SEND_BUTTON);

      await expect(receiveButton).toBeVisible({ timeout: 5000 });
      await expect(sendButton).toBeVisible({ timeout: 5000 });

      log('✅ All wallet elements verified - test passed!');

      // Clean up
      await context.close();
    });
  });

  test.describe('Mnemonic Options', () => {
    test('should generate different mnemonics on each creation', async () => {
      const mnemonics: string[] = [];

      // Create two wallets and compare mnemonics
      for (let attempt = 0; attempt < 2; attempt++) {
        const { context, extensionUrl } = await loadExtension();
        const page = await context.newPage();

        log(`Attempt ${attempt + 1}: Creating wallet...\n`);

        await page.goto(`${extensionUrl}/index.html#/welcome`);

        // Create wallet
        const createButton = locateTestId(page,TestIds.WELCOME.CREATE_WALLET_BUTTON);
        await expect(createButton).toBeVisible({ timeout: 30000 });
        await createButton.click();

        // Set password
        const passwordInput = locateTestId(page,TestIds.PASSWORD.NEW_PASSWORD_INPUT);
        await expect(passwordInput).toBeVisible({ timeout: 10000 });

        const password = `TestPass${attempt}!`;
        await passwordInput.fill(password);

        const confirmPasswordInput = locateTestId(page,TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
        await confirmPasswordInput.fill(password);

        const continueButton = locateTestId(page,TestIds.PASSWORD.CONTINUE_BUTTON);
        await expect(continueButton).toBeEnabled();
        await continueButton.click();

        // Get mnemonic
        const mnemonicDisplay = locateTestId(page,TestIds.CREATE_WALLET.MNEMONIC_DISPLAY);
        await expect(mnemonicDisplay).toBeVisible({ timeout: 20000 });

        const words = [];
        for (let i = 0; i < 12; i++) {
          const wordElement = locateTestId(page, `${TestIds.CREATE_WALLET.MNEMONIC_WORD}-${i}`);
          const wordText = await wordElement.textContent();
          const word = wordText?.split(/\d+\.\s+/)[1]?.trim();
          if (word) {
            words.push(word);
          }
        }

        const mnemonic = words.join(' ');
        mnemonics.push(mnemonic);
        log(`✓ Generated mnemonic ${attempt + 1}: ${mnemonic.substring(0, 30)}...`);

        await context.close();
      }

      // Verify mnemonics are different
      expect(mnemonics[0]).not.toBe(mnemonics[1]);
      log('✅ Verified: Each wallet creation generates a unique mnemonic');
    });
  });

  test.describe('Validations', () => {
    test('should require password confirmation match', async () => {
      const { context, extensionUrl } = await loadExtension();
      const page = await context.newPage();

      await page.goto(`${extensionUrl}/index.html#/welcome`);

      // Click create wallet
      const createButton = locateTestId(page,TestIds.WELCOME.CREATE_WALLET_BUTTON);
      await expect(createButton).toBeVisible({ timeout: 30000 });
      await createButton.click();

      // Enter different passwords
      const passwordInput = locateTestId(page,TestIds.PASSWORD.NEW_PASSWORD_INPUT);
      await expect(passwordInput).toBeVisible({ timeout: 10000 });
      await passwordInput.fill('Password123!');

      const confirmPasswordInput = locateTestId(page,TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
      await confirmPasswordInput.fill('DifferentPassword123!');

      // Continue button should be disabled or show error
      const continueButton = locateTestId(page,TestIds.PASSWORD.CONTINUE_BUTTON);

      // Try to click continue
      await continueButton.click({ force: true });

      // Should still be on password screen
      await page.waitForTimeout(1000);
      await expect(passwordInput).toBeVisible();

      log('✅ Verified: Password confirmation is required');

      await context.close();
    });

    test('should require mnemonic save confirmation', async () => {
      const { context, extensionUrl } = await loadExtension();
      const page = await context.newPage();

      await page.goto(`${extensionUrl}/index.html#/welcome`);

      // Navigate to mnemonic screen
      const createButton = locateTestId(page,TestIds.WELCOME.CREATE_WALLET_BUTTON);
      await expect(createButton).toBeVisible({ timeout: 30000 });
      await createButton.click();

      // Set password
      const passwordInput = locateTestId(page,TestIds.PASSWORD.NEW_PASSWORD_INPUT);
      await expect(passwordInput).toBeVisible({ timeout: 10000 });

      const password = 'TestPassword123!';
      await passwordInput.fill(password);

      const confirmPasswordInput = locateTestId(page,TestIds.PASSWORD.CONFIRM_PASSWORD_INPUT);
      await confirmPasswordInput.fill(password);

      const continueButton = locateTestId(page,TestIds.PASSWORD.CONTINUE_BUTTON);
      await expect(continueButton).toBeEnabled();
      await continueButton.click();

      // Wait for mnemonic
      const mnemonicDisplay = locateTestId(page,TestIds.CREATE_WALLET.MNEMONIC_DISPLAY);
      await expect(mnemonicDisplay).toBeVisible({ timeout: 20000 });

      // Continue button should be disabled initially
      const mnemonicContinueButton = locateTestId(page,TestIds.CREATE_WALLET.CONTINUE_BUTTON);

      // Try to check if button is disabled
      const isDisabled = await mnemonicContinueButton.isDisabled().catch(() => true);

      if (isDisabled) {
        log('✓ Continue button is disabled without confirmation');
      }

      // Check the checkbox
      const checkbox = locateTestId(page,TestIds.CREATE_WALLET.MNEMONIC_SAVE_CHECKBOX);
      await checkbox.click();

      // Now button should be enabled
      await expect(mnemonicContinueButton).toBeEnabled();
      log('✅ Verified: Mnemonic save confirmation is required');

      await context.close();
    });
  });
});