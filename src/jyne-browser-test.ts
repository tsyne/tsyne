import { Browser } from './browser';
import { TestContext } from './test';
import http from 'http';
import { AddressInfo } from 'net';

export interface BrowserTestOptions {
  headed?: boolean;
  timeout?: number;
  port?: number;
}

export interface TestPage {
  path: string;
  code: string;
}

/**
 * JyneBrowserTest provides a testing framework for Jyne Browser pages
 *
 * Similar to JyneTest but for testing browser pages loaded from HTTP server
 */
export class JyneBrowserTest {
  private browser: Browser | null = null;
  private testContext: TestContext | null = null;
  private server: http.Server | null = null;
  private serverPort: number = 0;
  private pages: Map<string, string> = new Map();
  private options: BrowserTestOptions;

  constructor(options: BrowserTestOptions = {}) {
    this.options = {
      headed: options.headed ?? false,
      timeout: options.timeout ?? 30000,
      port: options.port ?? 0  // 0 = random available port
    };
  }

  /**
   * Add test pages to be served by the test server
   */
  addPages(pages: TestPage[]): void {
    for (const page of pages) {
      this.pages.set(page.path, page.code);
    }
  }

  /**
   * Start the test HTTP server
   */
  private async startServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = req.url || '/';
        const pageCode = this.pages.get(url);

        if (pageCode) {
          res.writeHead(200, { 'Content-Type': 'text/typescript' });
          res.end(pageCode);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/typescript' });
          res.end(`
const { vbox, label } = jyne;
vbox(() => {
  label('404 - Page Not Found');
  label('URL: ' + browserContext.currentUrl);
});
          `);
        }
      });

      this.server.listen(this.options.port, () => {
        const address = this.server!.address() as AddressInfo;
        this.serverPort = address.port;
        resolve(this.serverPort);
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Create a browser in test mode and start test server
   */
  async createBrowser(initialUrl?: string): Promise<Browser> {
    // Start test server
    await this.startServer();

    // Create browser instance in test mode (headless if not headed mode)
    const testMode = !this.options.headed;
    this.browser = new Browser({
      title: 'Jyne Browser Test',
      width: 800,
      height: 600,
      testMode
    });

    // Get app and wait for bridge to be ready (like JyneTest does)
    const app = this.browser.getApp();
    await app.getBridge().waitUntilReady();

    // Create test context
    this.testContext = new TestContext(app.getBridge());

    // Navigate to initial URL if provided
    if (initialUrl) {
      const fullUrl = this.getTestUrl(initialUrl);
      await this.browser.changePage(fullUrl);

      // Wait for page to load
      await this.waitForPageLoad();
    }

    return this.browser;
  }

  /**
   * Get full URL for a test page path
   */
  getTestUrl(path: string): string {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return `http://localhost:${this.serverPort}${path}`;
  }

  /**
   * Navigate to a test page
   */
  async navigate(path: string): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }

    const url = this.getTestUrl(path);
    await this.browser.changePage(url);
    await this.waitForPageLoad();
  }

  /**
   * Navigate back
   */
  async back(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }
    await this.browser.back();
    await this.waitForPageLoad();
  }

  /**
   * Navigate forward
   */
  async forward(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }
    await this.browser.forward();
    await this.waitForPageLoad();
  }

  /**
   * Reload current page
   */
  async reload(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }
    await this.browser.reload();
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to finish loading
   */
  private async waitForPageLoad(timeoutMs?: number): Promise<void> {
    const timeout = timeoutMs ?? this.options.timeout ?? 5000;
    const startTime = Date.now();

    // Wait for browser loading state to become false (polls every 50ms)
    while (Date.now() - startTime < timeout) {
      const isLoading = (this.browser as any).loading;

      if (!isLoading) {
        // Page finished loading, minimal wait for widgets to register (100ms is enough)
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Timeout - give widgets one more chance
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get the test context for interacting with widgets
   */
  getContext(): TestContext {
    if (!this.testContext) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }
    return this.testContext;
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }
    const url = (this.browser as any).currentUrl;

    // If it's a relative URL (starts with /), convert to full test URL
    if (url.startsWith('/')) {
      return this.getTestUrl(url);
    }

    return url;
  }

  /**
   * Assert current URL matches expected
   */
  assertUrl(expected: string): void {
    const current = this.getCurrentUrl();
    const expectedFull = this.getTestUrl(expected);

    if (current !== expectedFull) {
      throw new Error(`URL assertion failed: expected ${expectedFull}, got ${current}`);
    }
  }

  /**
   * Clean up: stop server and quit browser
   */
  async cleanup(): Promise<void> {
    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Quit browser
    if (this.browser) {
      const app = this.browser.getApp();
      app.getBridge().quit();
      await new Promise(resolve => setTimeout(resolve, 100));
      this.browser = null;
    }
  }
}

// Collected tests to run sequentially
const collectedTests: Array<{
  name: string;
  pages: TestPage[];
  testFn: (browserTest: JyneBrowserTest) => Promise<void>;
  options: BrowserTestOptions;
}> = [];

/**
 * Helper function to register a browser test (runs later)
 */
export function browserTest(
  name: string,
  pages: TestPage[],
  testFn: (browserTest: JyneBrowserTest) => Promise<void>,
  options: BrowserTestOptions = {}
): void {
  collectedTests.push({ name, pages, testFn, options });
}

/**
 * Helper to describe a browser test suite
 */
export function describeBrowser(name: string, suiteFn: () => void): void {
  console.log(`\n${name}`);
  suiteFn();
}

/**
 * Run all collected browser tests sequentially
 */
export async function runBrowserTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const test of collectedTests) {
    const jyneBrowserTest = new JyneBrowserTest(test.options);
    jyneBrowserTest.addPages(test.pages);

    console.log(`Running browser test: ${test.name}`);
    const startTime = Date.now();

    try {
      await test.testFn(jyneBrowserTest);
      const duration = Date.now() - startTime;
      console.log(`✓ ${test.name} (${duration}ms)`);
      passed++;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`✗ ${test.name} (${duration}ms)`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    } finally {
      await jyneBrowserTest.cleanup();
      // Wait a bit between tests to avoid global context conflicts
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\nTests: ${passed} passed, ${failed} failed, ${passed + failed} total`);

  if (failed > 0) {
    process.exit(1);
  }
}
