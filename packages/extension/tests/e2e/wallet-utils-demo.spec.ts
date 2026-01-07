import { test, expect } from '@playwright/test';
import { loadExtension } from './helpers/extension-loader';
import { createWallet, restoreWallet, TEST_MNEMONICS } from './helpers/wallet-utils';
import { log } from './helpers/test-utils';

test.describe('Wallet Utils Demo', () => {

  test('demo: create new wallet', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    // Simply create a wallet with password
    const password = 'TestPassword123!';
    const { mnemonic, address } = await createWallet(page, extensionUrl, password);

    log(`Created wallet with mnemonic: ${mnemonic.substring(0, 30)}...`);
    log(`Wallet address: ${address}`);

    // Now you're on the main wallet page!
    // You can continue with other operations...

    await context.close();
  });

  test('demo: restore existing wallet', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    // Simply restore a wallet with known mnemonic and password
    const password = 'TestPassword123!';
    const mnemonic = TEST_MNEMONICS.MNEMONIC_12;

    await restoreWallet(page, extensionUrl, password, mnemonic);

    log('Wallet restored successfully!');

    // Now you're on the main wallet page!
    // You can continue with other operations...

    await context.close();
  });

  test('demo: create wallet then do something', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    // Create wallet
    const password = 'SecurePass456!';
    await createWallet(page, extensionUrl, password);

    // Now on main page, can interact with wallet
    // For example, click receive button to get address
    await page.locator('[data-testid="wallet-receive-button"]').click();

    // ... continue with your test logic

    await context.close();
  });

  test('demo: restore wallet with custom mnemonic', async () => {
    const { context, extensionUrl } = await loadExtension();
    const page = await context.newPage();

    // Use your own mnemonic
    const myMnemonic = 'your twelve word mnemonic phrase goes here for testing wallet restoration process';
    const password = 'MyPassword789!';

    try {
      await restoreWallet(page, extensionUrl, password, myMnemonic);
      log('Custom wallet restored!');
    } catch (error) {
      log(`Failed to restore: ${error}`);
    }

    await context.close();
  });
});