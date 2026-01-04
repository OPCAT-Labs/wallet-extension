/**
 * Wallet Popup Handler for E2E Testing
 * Handles automatic approval/rejection of wallet extension popups
 */
import { Page, BrowserContext } from '@playwright/test';
import { TestIds } from '../../helpers/test-utils';

// Timeout configuration
const WALLET_TIMEOUTS = {
  POPUP_RENDER: 60000, // Long timeout to allow for service worker state initialization
  BUTTON_CLICK: 10000,
  POPUP_CLOSE: 15000,
  WELCOME_SCREEN_RELOAD_DELAY: 2000, // Delay before reloading if welcome screen is shown
};

/**
 * Wait for a condition to be true
 */
async function waitForCondition(
  fn: () => Promise<boolean>,
  options: { timeoutMs: number; intervalMs: number; taskName: string }
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < options.timeoutMs) {
    try {
      if (await fn()) {
        return;
      }
    } catch {
      // Continue polling
    }
    await new Promise(resolve => setTimeout(resolve, options.intervalMs));
  }
  throw new Error(`Timeout: ${options.taskName}`);
}

/**
 * Check if the page is showing the welcome screen (wallet not initialized)
 * This can happen when the service worker state hasn't fully loaded yet
 */
async function isWelcomeScreen(page: Page): Promise<boolean> {
  try {
    const createWalletButton = page.locator(`[data-testid="${TestIds.WELCOME.CREATE_WALLET_BUTTON}"]`);
    return await createWalletButton.count() > 0;
  } catch {
    return false;
  }
}

/**
 * Check if the page is an unlock wallet request
 */
async function isUnlockWallet(page: Page): Promise<boolean> {
  try {
    const unlockButtons = await page.locator('span:has-text("Unlock")').all();
    return unlockButtons.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if the page is a connection approval request
 */
async function isConnectionApproval(page: Page): Promise<boolean> {
  try {
    const approveButton = page.locator(`[data-testid="${TestIds.APPROVAL.APPROVE_BUTTON}"]`);
    return await approveButton.count() > 0;
  } catch {
    return false;
  }
}

/**
 * Check if the page is a connection rejection available (Cancel button)
 */
async function isConnectionRejectable(page: Page): Promise<boolean> {
  try {
    const rejectButton = page.locator(`[data-testid="${TestIds.APPROVAL.REJECT_BUTTON}"]`);
    return await rejectButton.count() > 0;
  } catch {
    return false;
  }
}

/**
 * Check if the page is a signature request
 */
async function isSignatureRequest(page: Page): Promise<boolean> {
  try {
    const signButton = page.locator(`[data-testid="${TestIds.SEND.SIGN_AND_PAY_BUTTON}"]`);
    return await signButton.count() > 0;
  } catch {
    return false;
  }
}

/**
 * Unlock wallet by entering password
 */
async function unlockWallet(page: Page, password: string): Promise<void> {
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  const unlockButton = page.locator('span:has-text("Unlock")').first();
  await unlockButton.click({ timeout: WALLET_TIMEOUTS.BUTTON_CLICK });

  // Wait for popup to close or navigate away
  await page.waitForEvent('close', { timeout: WALLET_TIMEOUTS.POPUP_CLOSE }).catch(() => {});
}

/**
 * Approve connection request
 */
async function approveConnection(page: Page): Promise<void> {
  const approveButton = page.locator(`[data-testid="${TestIds.APPROVAL.APPROVE_BUTTON}"]`);
  await approveButton.click({ timeout: WALLET_TIMEOUTS.BUTTON_CLICK });
}

/**
 * Reject connection request (by clicking Cancel/Reject)
 */
async function rejectConnection(page: Page): Promise<void> {
  const rejectButton = page.locator(`[data-testid="${TestIds.APPROVAL.REJECT_BUTTON}"]`);
  await rejectButton.click({ timeout: WALLET_TIMEOUTS.BUTTON_CLICK });
}

/**
 * Approve signature request
 */
async function approveSignature(page: Page): Promise<void> {
  const signButton = page.locator(`[data-testid="${TestIds.SEND.SIGN_AND_PAY_BUTTON}"]`);
  await signButton.click({ timeout: WALLET_TIMEOUTS.BUTTON_CLICK });

  // Wait for popup to close
  await page.waitForEvent('close', { timeout: WALLET_TIMEOUTS.POPUP_CLOSE }).catch(() => {});
}

export type PopupAction = 'approve' | 'reject';

interface PopupHandlerOptions {
  password: string;
  action?: PopupAction;
  onPopup?: (type: string) => void;
}

// Store active handler for cleanup
let activeHandler: ((page: Page) => Promise<void>) | null = null;

/**
 * Remove any existing popup handler
 */
export function removeWalletPopupHandler(context: BrowserContext): void {
  if (activeHandler) {
    context.off('page', activeHandler);
    activeHandler = null;
  }
}

/**
 * Setup automatic wallet popup handling for a browser context
 *
 * @param context - Browser context
 * @param options - Handler options
 * @returns Cleanup function to remove the handler
 */
export function setupWalletPopupHandler(
  context: BrowserContext,
  options: PopupHandlerOptions
): () => void {
  const { password, action = 'approve', onPopup } = options;

  // Remove any existing handler first
  removeWalletPopupHandler(context);

  const handler = async (newPage: Page) => {
    const url = newPage.url();

    // Check if it's a wallet extension popup
    if (!url.includes('chrome-extension://')) {
      return;
    }

    console.log('[WalletPopupHandler] Detected extension popup:', url);

    try {
      // Wait for popup to render - may show welcome screen first if service worker is still initializing
      let reloadAttempts = 0;
      const maxReloads = 3;

      await waitForCondition(
        async () => {
          const isWelcome = await isWelcomeScreen(newPage);
          const isUnlock = await isUnlockWallet(newPage);
          const isConnection = await isConnectionApproval(newPage);
          const isRejectable = await isConnectionRejectable(newPage);
          const isSignature = await isSignatureRequest(newPage);
          console.log(`[WalletPopupHandler] Checking popup state: welcome=${isWelcome}, unlock=${isUnlock}, connection=${isConnection}, rejectable=${isRejectable}, signature=${isSignature}`);

          // If showing welcome screen, service worker state not ready
          // Try reloading the page to trigger fresh state check
          if (isWelcome && reloadAttempts < maxReloads) {
            reloadAttempts++;
            console.log(`[WalletPopupHandler] Welcome screen detected, reloading page (attempt ${reloadAttempts}/${maxReloads})...`);
            await newPage.waitForTimeout(WALLET_TIMEOUTS.WELCOME_SCREEN_RELOAD_DELAY);
            if (!newPage.isClosed()) {
              await newPage.reload();
            }
            return false;
          }
          if (isWelcome) {
            return false;
          }
          return isUnlock || isConnection || isRejectable || isSignature;
        },
        { timeoutMs: WALLET_TIMEOUTS.POPUP_RENDER, intervalMs: 1000, taskName: 'Wallet popup render' }
      );

      await newPage.waitForTimeout(500); // Brief wait for stability

      if (newPage.isClosed()) return;

      // Handle unlock wallet
      if (await isUnlockWallet(newPage)) {
        onPopup?.('unlock');
        await unlockWallet(newPage, password);
        return;
      }

      if (newPage.isClosed()) return;

      // Handle connection approval/rejection
      if (await isConnectionApproval(newPage) || await isConnectionRejectable(newPage)) {
        onPopup?.('connection');
        if (action === 'reject') {
          await rejectConnection(newPage);
        } else {
          await approveConnection(newPage);
        }
        return;
      }

      if (newPage.isClosed()) return;

      // Handle signature request
      if (await isSignatureRequest(newPage)) {
        onPopup?.('signature');
        if (action === 'approve') {
          await approveSignature(newPage);
        }
        // For reject, just close the popup without signing
        return;
      }
    } catch (error) {
      if (String(error).includes('Target page, context or browser has been closed')) {
        return;
      }
      console.error('Error handling wallet popup:', error);
    }
  };

  // Store and register handler
  activeHandler = handler;
  context.on('page', handler);

  // Return cleanup function
  return () => removeWalletPopupHandler(context);
}

/**
 * Wait for next wallet popup and handle it with specific action
 *
 * @param context - Browser context
 * @param options - Handler options
 * @returns Promise that resolves when popup is handled
 */
export async function handleNextWalletPopup(
  context: BrowserContext,
  options: PopupHandlerOptions
): Promise<void> {
  const { password, action = 'approve' } = options;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout waiting for wallet popup'));
    }, 90000); // Long timeout to allow for service worker initialization and reloads

    const handler = async (newPage: Page) => {
      const url = newPage.url();

      if (!url.includes('chrome-extension://')) {
        return;
      }

      console.log('[handleNextWalletPopup] Detected extension popup:', url);

      try {
        // Wait for popup to render - may show welcome screen first if service worker is still initializing
        let reloadAttempts = 0;
        const maxReloads = 3;

        await waitForCondition(
          async () => {
            const isWelcome = await isWelcomeScreen(newPage);
            const isUnlock = await isUnlockWallet(newPage);
            const isConnection = await isConnectionApproval(newPage);
            const isRejectable = await isConnectionRejectable(newPage);
            const isSignature = await isSignatureRequest(newPage);
            console.log(`[handleNextWalletPopup] Checking: welcome=${isWelcome}, unlock=${isUnlock}, connection=${isConnection}, rejectable=${isRejectable}, signature=${isSignature}`);

            // If showing welcome screen, service worker state not ready
            // Try reloading the page to trigger fresh state check
            if (isWelcome && reloadAttempts < maxReloads) {
              reloadAttempts++;
              console.log(`[handleNextWalletPopup] Welcome screen detected, reloading page (attempt ${reloadAttempts}/${maxReloads})...`);
              await newPage.waitForTimeout(WALLET_TIMEOUTS.WELCOME_SCREEN_RELOAD_DELAY);
              if (!newPage.isClosed()) {
                await newPage.reload();
              }
              return false;
            }
            if (isWelcome) {
              return false;
            }
            return isUnlock || isConnection || isRejectable || isSignature;
          },
          { timeoutMs: WALLET_TIMEOUTS.POPUP_RENDER, intervalMs: 1000, taskName: 'Wallet popup render' }
        );

        await newPage.waitForTimeout(500);

        if (newPage.isClosed()) return;

        // Handle unlock wallet first
        if (await isUnlockWallet(newPage)) {
          await unlockWallet(newPage, password);
          // Don't resolve yet, wait for actual approval popup
          return;
        }

        if (newPage.isClosed()) return;

        // Handle connection
        if (await isConnectionApproval(newPage) || await isConnectionRejectable(newPage)) {
          if (action === 'reject') {
            await rejectConnection(newPage);
          } else {
            await approveConnection(newPage);
          }
          clearTimeout(timeout);
          context.off('page', handler);
          resolve();
          return;
        }

        if (newPage.isClosed()) return;

        // Handle signature
        if (await isSignatureRequest(newPage)) {
          if (action === 'approve') {
            await approveSignature(newPage);
          }
          clearTimeout(timeout);
          context.off('page', handler);
          resolve();
          return;
        }
      } catch (error) {
        if (String(error).includes('Target page, context or browser has been closed')) {
          return;
        }
        clearTimeout(timeout);
        context.off('page', handler);
        reject(error);
      }
    };

    context.on('page', handler);
  });
}
