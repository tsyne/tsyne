import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tsyne Designer UI tests
 *
 * Run with: npx playwright test
 * Run headed: npx playwright test --headed
 * Debug: npx playwright test --debug
 */
export default defineConfig({
  testDir: './__tests__/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',

  // Respect TSYNE_HEADED environment variable
  use: {
    // Base URL for tests - designer server should be running
    baseURL: 'http://localhost:3000',

    // Run in headed mode if TSYNE_HEADED=1
    headless: process.env.TSYNE_HEADED !== '1',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration - starts the designer server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
