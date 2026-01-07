import { Page, Locator } from '@playwright/test';
import { TestIds } from '../../../src/ui/utils/test-ids';

/**
 * Custom logging function with proper indentation for test output
 * @param message The message to log
 */
export const log = (message: string) => {
  console.log(`        ${message}`);
};

/**
 * Helper function to locate elements by test ID
 * @param page The Playwright page object
 * @param testId The test ID from TestIds constant
 * @returns A Playwright Locator
 */
export function locateTestId(page: Page, testId: string): Locator {
  return page.locator(`[data-testid="${testId}"]`);
}

/**
 * Wait for element with testid
 */
export async function waitForTestId(page: Page, testId: string, timeout: number = 5000) {
  return await page.waitForSelector(`[data-testid="${testId}"]`, { timeout });
}

/**
 * Click element with testid
 */
export async function clickTestId(page: Page, testId: string) {
  const element = await waitForTestId(page, testId);
  await element.click();
}

/**
 * Fill input with testid
 */
export async function fillTestId(page: Page, testId: string, value: string) {
  const element = await waitForTestId(page, testId);
  await element.fill(value);
}

/**
 * Get text from element with testid
 */
export async function getTextByTestId(page: Page, testId: string): Promise<string> {
  const element = await waitForTestId(page, testId);
  return await element.textContent() || '';
}

/**
 * Check if element with testid exists
 */
export async function hasTestId(page: Page, testId: string): Promise<boolean> {
  try {
    await waitForTestId(page, testId, 1000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for React to render
 */
export async function waitForReactRender(page: Page, timeout: number = 30000) {
  // Wait for React root element to have content
  await page.waitForFunction(
    () => {
      const root = document.getElementById('root');
      // Check that root has content and it's not the noscript message
      if (!root || root.children.length === 0) return false;
      const text = root.textContent || '';
      // Make sure React has rendered (not showing noscript message)
      return text.length > 0 && !text.includes('You need to enable JavaScript');
    },
    { timeout }
  );
}

/**
 * Generate test mnemonic phrase
 */
export function generateTestMnemonic(): string {
  // Use a fixed test mnemonic for consistency
  return 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
}

/**
 * Generate test password
 */
export function generateTestPassword(): string {
  return 'TestPassword123!';
}

// Re-export TestIds for convenience
export { TestIds };

// Re-export console logging functions from extension-loader
export { printConsoleErrors } from './extension-loader';