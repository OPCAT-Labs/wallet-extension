import { chromium, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export interface ExtensionInfo {
  id: string;
  context: BrowserContext;
  extensionUrl: string;
}

/**
 * Load Chrome extension and return extension info
 */
export async function loadExtension(): Promise<ExtensionInfo> {
  // Path to the unpacked extension
  const extensionPath = path.resolve(__dirname, '../../../dist/chrome');

  if (!fs.existsSync(extensionPath)) {
    throw new Error(`Extension not found at: ${extensionPath}. Please build the extension first.`);
  }

  // Create a temporary user data directory
  const userDataDir = path.resolve(__dirname, '../test-user-data/test-user-data-' + Date.now());

  // Launch Chrome with the extension
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  // Wait for extension to initialize
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Wait for background script to be ready by checking service worker
  // console.log('Waiting for background script to initialize...');

  // Find extension ID from service workers
  let extensionId: string | undefined;
  const serviceWorkers = context.serviceWorkers();

  // Listen to service worker console
  for (const worker of serviceWorkers) {
    // console.log('Service Worker found:', worker.url());
    worker.on('console', msg => {
      // console.log(`[Service Worker Log] ${msg.type()}: ${msg.text()}`);
    });
  }

  for (const worker of serviceWorkers) {
    if (worker.url().includes('chrome-extension://')) {
      extensionId = worker.url().split('/')[2];
      break;
    }
  }

  if (!extensionId) {
    throw new Error('Failed to find extension ID');
  }

  const extensionUrl = `chrome-extension://${extensionId}`;

  return {
    id: extensionId,
    context,
    extensionUrl
  };
}

/**
 * Wait for extension page to auto-open
 */
export async function waitForExtensionPage(context: BrowserContext, maxWaitTime: number = 30000): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const pages = context.pages();

    for (const page of pages) {
      if (page.url().includes('chrome-extension://')) {
        return page;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Extension page did not auto-open within timeout');
}

/**
 * Navigate to extension page
 */
export async function openExtensionPage(context: BrowserContext, extensionId: string, path: string = 'index.html') {
  const page = await context.newPage();
  const url = `chrome-extension://${extensionId}/${path}`;
  await page.goto(url, { waitUntil: 'networkidle' });
  return page;
}

/**
 * Setup wallet with test mnemonic
 * This creates a new extension context with an already imported wallet
 */
export async function setupWallet(testMnemonic: string = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'): Promise<ExtensionInfo> {
  // Load the extension
  const extensionInfo = await loadExtension();
  const { context, extensionUrl } = extensionInfo;

  // Create a new page
  const page = await context.newPage();

  // Navigate to welcome screen
  await page.goto(`${extensionUrl}/index.html#/welcome`);

  // Wait for welcome screen
  await page.waitForSelector('[data-testid="welcome-import-wallet-button"]', { timeout: 30000 });

  // Click import wallet
  await page.click('[data-testid="welcome-import-wallet-button"]');

  // Wait for import screen
  await page.waitForTimeout(2000);

  // Enter mnemonic
  const mnemonicInput = await page.locator('[data-testid="import-wallet-mnemonic-input"], textarea');
  await mnemonicInput.fill(testMnemonic);

  // Click import
  const importButton = await page.locator('[data-testid="import-wallet-import-button"], button:has-text("Import")');
  await importButton.click();

  // Handle password setup
  const passwordInput = await page.locator('[data-testid="password-new-input"], input[type="password"]');
  if (await passwordInput.count() > 0) {
    await passwordInput.fill('TestPassword123!');
    const confirmInput = await page.locator('[data-testid="password-confirm-input"], input[type="password"]:nth-of-type(2)');
    await confirmInput.fill('TestPassword123!');
    const createButton = await page.locator('[data-testid="password-create-button"], button:has-text("Create")');
    await createButton.click();
  }

  // Wait for wallet to load
  await page.waitForSelector('[data-testid="wallet-balance-display"]', { timeout: 30000 });

  // Close the setup page
  await page.close();

  return extensionInfo;
}