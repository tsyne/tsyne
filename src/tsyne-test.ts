import { App } from './app';
import { TestContext } from './test';

export interface TestOptions {
  headed?: boolean;
  timeout?: number;
}

/**
 * TsyneTest provides a testing framework for Tsyne applications
 * Uses proper IoC/DI - app instance is injected into builder
 */
export class TsyneTest {
  private app: App | null = null;
  private testContext: TestContext | null = null;
  private options: TestOptions;

  constructor(options: TestOptions = {}) {
    this.options = {
      headed: options.headed ?? false,
      timeout: options.timeout ?? 30000
    };
  }

  /**
   * Create an app in test mode
   * Builder receives the app instance (proper IoC/DI)
   * Returns a promise that resolves when the bridge is ready
   */
  async createApp(appBuilder: (app: App) => void): Promise<App> {
    const testMode = !this.options.headed;
    this.app = new App({}, testMode);

    // Wait for bridge to be ready before building
    await this.app.getBridge().waitUntilReady();

    // Create test context
    this.testContext = new TestContext(this.app.getBridge());

    // Build the app - inject app instance for scoped declarative API
    appBuilder(this.app);

    return this.app;
  }

  /**
   * Get the test context for interacting with the app
   */
  getContext(): TestContext {
    if (!this.testContext) {
      throw new Error('App not created. Call createApp() first.');
    }
    return this.testContext;
  }

  /**
   * Run the app (in headed mode, this shows the window)
   */
  async run(): Promise<void> {
    if (!this.app) {
      throw new Error('App not created. Call createApp() first.');
    }
    await this.app.run();
  }

  /**
   * Clean up and quit the app
   */
  async cleanup(): Promise<void> {
    if (this.app) {
      this.app.getBridge().quit();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Capture a screenshot of the application window
   * @param filePath - Path where the screenshot will be saved as PNG
   *
   * Note: Screenshots in headless mode (default) will be blank/grey because
   * Fyne's test mode doesn't render actual pixels. For meaningful screenshots,
   * run tests in headed mode: new TsyneTest({ headed: true })
   */
  async screenshot(filePath: string): Promise<void> {
    if (!this.app) {
      throw new Error('App not created. Call createApp() first.');
    }

    // Get the first window from the app
    const windows = this.app.getWindows();
    if (windows.length === 0) {
      throw new Error('No windows available to screenshot');
    }

    // Warn if in headless mode
    if (!this.options.headed) {
      console.warn('  ⚠️  Screenshot captured in headless mode - will be blank/grey');
      console.warn('     For visual screenshots, use headed mode: new TsyneTest({ headed: true })');
    }

    await windows[0].screenshot(filePath);
  }
}

/**
 * Helper function to create a test
 */
export async function test(
  name: string,
  testFn: (context: TestContext) => Promise<void>,
  options: TestOptions = {}
): Promise<void> {
  const tsyneTest = new TsyneTest(options);

  console.log(`Running test: ${name}`);

  try {
    await testFn(tsyneTest.getContext());
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);

    // Capture screenshot on test failure
    try {
      const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `./test-failures/${sanitizedName}_${timestamp}.png`;

      // Create test-failures directory if it doesn't exist
      const fs = require('fs');
      if (!fs.existsSync('./test-failures')) {
        fs.mkdirSync('./test-failures', { recursive: true });
      }

      await tsyneTest.screenshot(screenshotPath);
      console.error(`  Screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
      // Don't fail the test if screenshot fails, just log it
      console.error(`  Failed to capture screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`);
    }

    throw error;
  } finally {
    await tsyneTest.cleanup();
  }
}

/**
 * Helper to describe a test suite
 */
export function describe(name: string, suiteFn: () => void): void {
  console.log(`\n${name}`);
  suiteFn();
}
