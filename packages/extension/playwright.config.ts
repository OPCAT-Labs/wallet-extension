import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright configuration for OPCAT Wallet E2E tests
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test timeout (5 minutes for complex wallet operations)
  timeout: 5 * 60 * 1000,

  // Global timeout for the whole test run
  globalTimeout: 60 * 60 * 1000,

  // Assertion timeout
  expect: {
    timeout: 30 * 1000,
  },

  // Run tests in parallel
  fullyParallel: false, // Chrome extension tests should run serially

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 1 : 0,

  // Number of workers
  workers: 1, // Chrome extension tests need single worker

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', {
      outputFolder: './test-results/html',
      open: 'on-failure'
    }]
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'chrome-extension://localhost',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: process.env.CI ? 'retain-on-failure' : 'off',

    // Browser options
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    },

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Permissions
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension specific options will be added in test setup
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: './test-results/artifacts',

  // Web server for dApp tests
  webServer: {
    command: 'node ../../node_modules/serve/build/main.js tests/e2e/dapp -l 3939 --no-clipboard',
    url: 'http://localhost:3939',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});