import { App } from './app';
import { TestContext } from './test';

export interface TestOptions {
  headed?: boolean;
  timeout?: number;
}

/**
 * JyneTest provides a testing framework for Jyne applications
 * Uses proper IoC/DI - app instance is injected into builder
 */
export class JyneTest {
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
}

/**
 * Helper function to create a test
 */
export async function test(
  name: string,
  testFn: (context: TestContext) => Promise<void>,
  options: TestOptions = {}
): Promise<void> {
  const jyneTest = new JyneTest(options);

  console.log(`Running test: ${name}`);

  try {
    await testFn(jyneTest.getContext());
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    await jyneTest.cleanup();
  }
}

/**
 * Helper to describe a test suite
 */
export function describe(name: string, suiteFn: () => void): void {
  console.log(`\n${name}`);
  suiteFn();
}
