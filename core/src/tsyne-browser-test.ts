import { Browser } from './browser';
import { TestContext } from './test';
import { recordHeadlessScreenshot } from './headless-screenshot-tracker';
import http from 'http';
import { AddressInfo } from 'net';
import * as fs from 'fs';
import * as path from 'path';

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
 * TsyneBrowserTest provides a testing framework for Tsyne Browser pages
 *
 * Similar to TsyneTest but for testing browser pages loaded from HTTP server
 */
export class TsyneBrowserTest {
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
   * Serves both TypeScript pages and static assets (images, etc.)
   */
  private async startServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = req.url || '/';

        // First, check if it's a registered page
        const pageCode = this.pages.get(url);
        if (pageCode) {
          res.writeHead(200, { 'Content-Type': 'text/typescript' });
          res.end(pageCode);
          return;
        }

        // Try to serve as static file from examples directory
        // URLs like /assets/test-image.svg map to examples/assets/test-image.svg
        const filePath = path.join(process.cwd(), 'examples', url);

        // Check if file exists
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          // Determine MIME type based on file extension
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.webp': 'image/webp',
            '.ico': 'image/x-icon'
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';

          // Read and serve the file
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Error reading file');
            } else {
              res.writeHead(200, { 'Content-Type': contentType });
              res.end(data);
            }
          });
          return;
        }

        // Neither page nor file found - return 404
        res.writeHead(404, { 'Content-Type': 'text/typescript' });
        res.end(`
const { vbox, label } = tsyne;
vbox(() => {
  label('404 - Page Not Found');
  label('URL: ' + browserContext.currentUrl);
});
        `);
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
      title: 'Tsyne Browser Test',
      width: 800,
      height: 600,
      testMode
    });

    // Get app and wait for bridge to be ready (like TsyneTest does)
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
   * Wait for navigation to complete (like Selenium's waitForNavigation)
   * Useful after clicking links or buttons that trigger page navigation
   *
   * @param timeoutMs - Maximum time to wait for navigation (default: test timeout)
   * @example
   * await ctx.getByText("Submit").click();
   * await browserTest.waitForNavigation();
   * await ctx.expect(ctx.getByText("Success")).toBeVisible();
   */
  async waitForNavigation(timeoutMs?: number): Promise<void> {
    await this.waitForPageLoad(timeoutMs);
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
   * Capture a screenshot of the browser window
   * @param filePath - Path where the screenshot will be saved as PNG
   *
   * Note: Screenshots in headless mode (default) will be blank/grey because
   * Fyne's test mode doesn't render actual pixels. For meaningful screenshots,
   * run tests in headed mode: new TsyneBrowserTest({ headed: true })
   */
  async screenshot(filePath: string): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not created. Call createBrowser() first.');
    }

    // Track headless screenshots for end-of-run summary
    if (!this.options.headed) {
      recordHeadlessScreenshot();
    }

    const window = this.browser.getWindow();
    await window.screenshot(filePath);
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
  testFn: (browserTest: TsyneBrowserTest) => Promise<void>;
  options: BrowserTestOptions;
  only?: boolean;
}> = [];

/**
 * Helper function to register a browser test (runs later)
 */
export function browserTest(
  name: string,
  pages: TestPage[],
  testFn: (browserTest: TsyneBrowserTest) => Promise<void>,
  options: BrowserTestOptions = {}
): void {
  collectedTests.push({ name, pages, testFn, options, only: false });
}

/**
 * Register a browser test to run exclusively (skips other tests)
 * Use this like browserTest.only() to run a single test during development
 */
browserTest.only = function(
  name: string,
  pages: TestPage[],
  testFn: (browserTest: TsyneBrowserTest) => Promise<void>,
  options: BrowserTestOptions = {}
): void {
  collectedTests.push({ name, pages, testFn, options, only: true });
};

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

  // Check for TSYNE_HEADED environment variable
  const headed = process.env.TSYNE_HEADED === '1';

  if (headed) {
    console.log('Running in HEADED mode - browser windows will be visible\n');
  }

  // Filter tests based on .only() or TSYNE_TEST_FILTER environment variable
  let testsToRun = collectedTests;

  // Check if any tests have .only flag - if so, only run those
  const onlyTests = collectedTests.filter(t => t.only);
  if (onlyTests.length > 0) {
    testsToRun = onlyTests;
    console.log(`Running ${onlyTests.length} test(s) marked with .only()\n`);
  } else {
    // Check for TSYNE_TEST_FILTER environment variable
    const testFilter = process.env.TSYNE_TEST_FILTER;
    if (testFilter) {
      testsToRun = collectedTests.filter(t => {
        // Support both substring match and regex
        try {
          const regex = new RegExp(testFilter, 'i');
          return regex.test(t.name);
        } catch {
          // If not a valid regex, do substring match
          return t.name.toLowerCase().includes(testFilter.toLowerCase());
        }
      });

      if (testsToRun.length === 0) {
        console.error(`No tests match filter: "${testFilter}"`);
        process.exit(1);
      }

      console.log(`Running ${testsToRun.length} test(s) matching filter: "${testFilter}"\n`);
      testsToRun.forEach(t => console.log(`  - ${t.name}`));
      console.log('');
    }
  }

  const skipped = collectedTests.length - testsToRun.length;

  // Save original global tsyne object if it exists
  const originalTsyne = (global as any).tsyne;

  for (const test of testsToRun) {
    // Merge environment variable with test options (env var takes precedence)
    const options: BrowserTestOptions = {
      ...test.options,
      headed: headed || test.options.headed
    };
    const tsyneBrowserTest = new TsyneBrowserTest(options);
    tsyneBrowserTest.addPages(test.pages);

    console.log(`Running browser test: ${test.name}`);
    const startTime = Date.now();

    try {
      await test.testFn(tsyneBrowserTest);
      const duration = Date.now() - startTime;
      console.log(`✓ ${test.name} (${duration}ms)`);
      passed++;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`✗ ${test.name} (${duration}ms)`);
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      failed++;

      // Capture screenshot on test failure
      try {
        const sanitizedName = test.name.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = `./test-failures/${sanitizedName}_${timestamp}.png`;

        // Create test-failures directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync('./test-failures')) {
          fs.mkdirSync('./test-failures', { recursive: true });
        }

        await tsyneBrowserTest.screenshot(screenshotPath);
        console.error(`  Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        // Don't fail the test if screenshot fails, just log it
        console.error(`  Failed to capture screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`);
      }
    } finally {
      // In headed mode, wait before cleanup so user can see the result
      if (options.headed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await tsyneBrowserTest.cleanup();
      // Wait a bit between tests to avoid global context conflicts
      await new Promise(resolve => setTimeout(resolve, 200));

      // Restore original global tsyne object
      if (originalTsyne) {
        (global as any).tsyne = originalTsyne;
      } else {
        delete (global as any).tsyne;
      }
    }
  }

  const total = passed + failed;
  const summary = [`${passed} passed`, `${failed} failed`];
  if (skipped > 0) {
    summary.push(`${skipped} skipped`);
  }
  summary.push(`${total} run`);

  console.log(`\nTests: ${summary.join(', ')}`);

  if (failed > 0) {
    process.exit(1);
  }
}
