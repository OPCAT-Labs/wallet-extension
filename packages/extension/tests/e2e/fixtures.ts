import { test as base, expect } from '@playwright/test';
import { printConsoleErrors, clearConsoleMessages } from './helpers/extension-loader';

/**
 * Extended test fixture that automatically prints console errors when a test fails
 */
export const test = base.extend({
  // Auto-print console errors on test failure
  _autoConsoleErrors: [async ({}, use, testInfo) => {
    // Clear previous console messages before test
    clearConsoleMessages();

    await use(undefined);

    // Print console errors if test failed
    if (testInfo.status !== 'passed') {
      printConsoleErrors();
    }
  }, { auto: true }],
});

export { expect };
