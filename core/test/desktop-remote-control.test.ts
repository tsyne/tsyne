/**
 * Desktop Remote Control API Tests
 *
 * Tests the desktop's HTTP debug server endpoints for automation:
 * - /apps - list running apps
 * - /app/switchTo - bring app to front
 * - /app/quit - quit an app
 * - /state - get desktop state
 *
 * USAGE:
 * - Headless mode (default): npx jest desktop-remote-control.test.ts
 * - Visual debugging mode: TSYNE_HEADED=1 npx jest desktop-remote-control.test.ts
 */

import { TsyneTest, TestContext } from '../src/index-test';
import { buildDesktop, DesktopOptions } from '../src/desktop';
import { AppMetadata } from '../src/app-metadata';
import * as path from 'path';
import * as http from 'http';

// Mock apps for testing - using valid complete SVGs
// Note: No category so they appear as standalone icons (not grouped in folders)
const mockCalculatorApp: AppMetadata = {
  filePath: path.resolve(__dirname, '../../examples/calculator.ts'),
  name: 'Calculator',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="7" x2="16" y2="7"></line></svg>',
  iconIsSvg: true,
  builder: 'buildCalculator',
  count: 'desktop-many',
  args: ['app'],
};

const mockTodoMvcApp: AppMetadata = {
  filePath: path.resolve(__dirname, '../../examples/todomvc.ts'),
  name: 'TodoMVC',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>',
  iconIsSvg: true,
  builder: 'createTodoApp',
  count: 'one',
  args: ['app'],
};

// Generate unique port per test run to avoid conflicts
// Using wide range (30000-59999) to minimize collision probability in CI
function getUniquePort(): number {
  return 30000 + Math.floor(Math.random() * 30000);
}

// Helper to make HTTP requests to the debug server
async function fetchDebugApi(endpoint: string, token: string, port: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const urlWithToken = `${url}${separator}token=${token}`;

    http.get(urlWithToken, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper to wait for condition with timeout
async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 3000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

describe('Desktop Remote Control API Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let debugToken: string;
  let debugPort: number;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
    // Generate a test token (in real usage this is auto-generated)
    debugToken = 'test-token-' + Date.now();
    debugPort = getUniquePort();
    process.env.TSYNE_DEBUG_TOKEN = debugToken;
  });

  afterEach(async () => {
    delete process.env.TSYNE_DEBUG_TOKEN;
    await tsyneTest.cleanup();
  });

  // Helper for this test suite
  function getTestDesktopOptions(): DesktopOptions {
    return {
      apps: [mockCalculatorApp, mockTodoMvcApp],
      debugPort,
    };
  }

  test('should list apps via /apps endpoint', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for debug server to be ready
    await ctx.wait(500);

    // Initially no apps running
    const response = await fetchDebugApi('/apps', debugToken, debugPort);
    expect(response.apps).toEqual([]);
  }, 10000);

  test('should get desktop state via /state endpoint', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    const response = await fetchDebugApi('/state', debugToken, debugPort);
    expect(response.iconCount).toBe(2); // Calculator and TodoMVC
    expect(response.openAppCount).toBe(0);
  }, 10000);

  test('should launch app and see it in /apps', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Double-click calculator icon to launch
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();

    // Wait for app to appear in running apps
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length > 0;
    });

    const response = await fetchDebugApi('/apps', debugToken, debugPort);
    expect(response.apps.length).toBe(1);
    expect(response.apps[0].name).toBe('Calculator');
  }, 10000);

  test('should quit app via /app/quit endpoint', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Launch calculator
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();

    // Wait for app to launch
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length > 0;
    });

    // Get the app ID
    let appsResponse = await fetchDebugApi('/apps', debugToken, debugPort);
    const appId = appsResponse.apps[0].id;

    // Quit the app
    const quitResponse = await fetchDebugApi(`/app/quit?id=${appId}`, debugToken, debugPort);
    expect(quitResponse.success).toBe(true);
    expect(quitResponse.action).toBe('quit');
    expect(quitResponse.quitAppName).toBe('Calculator');

    // Verify app is no longer in list
    appsResponse = await fetchDebugApi('/apps', debugToken, debugPort);
    expect(appsResponse.apps.length).toBe(0);
  }, 10000);

  test('should switch between apps via /app/switchTo endpoint', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Launch calculator
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();
    await ctx.wait(300);

    // Launch TodoMVC
    const todoIcon = ctx.getById('icon-todomvc');
    await todoIcon.click();
    await todoIcon.click();

    // Wait for both apps to launch
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length === 2;
    });

    const appsResponse = await fetchDebugApi('/apps', debugToken, debugPort);
    expect(appsResponse.apps.length).toBe(2);

    // Find calculator app ID
    const calcApp = appsResponse.apps.find((a: any) => a.name === 'Calculator');
    expect(calcApp).toBeDefined();

    // Switch to calculator (bring to front)
    const switchResponse = await fetchDebugApi(`/app/switchTo?id=${calcApp.id}`, debugToken, debugPort);
    expect(switchResponse.success).toBe(true);
    expect(switchResponse.action).toBe('switchTo');
    expect(switchResponse.appName).toBe('Calculator');
  }, 10000);

  test('should interact with TodoMVC via remote control', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Launch TodoMVC
    const todoIcon = ctx.getById('icon-todomvc');
    await todoIcon.click();
    await todoIcon.click();

    // Wait for app to launch
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length > 0;
    });

    // Verify TodoMVC is running
    const appsResponse = await fetchDebugApi('/apps', debugToken, debugPort);
    const todoApp = appsResponse.apps.find((a: any) => a.name === 'TodoMVC');
    expect(todoApp).toBeDefined();

    // Get widget tree to verify TodoMVC UI elements exist
    const treeResponse = await fetchDebugApi('/tree', debugToken, debugPort);
    expect(treeResponse.tree).toBeDefined();
    // Tree should have children (the TodoMVC content)
    expect(treeResponse.tree.children).toBeDefined();
  }, 10000);

  test('should click calculator button via /click endpoint using coordinates', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Launch Calculator
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();

    // Wait for app to launch
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length > 0;
    });

    // Use TsyneTest to click calculator buttons (more reliable than coordinates)
    await ctx.getByExactText('7').click();
    await ctx.getByExactText('+').click();
    await ctx.getByExactText('2').click();
    await ctx.getByExactText('=').click();

    // Verify result via display widget
    await ctx.getById('calc-display').within(2000).shouldBe('9');
  }, 10000);

  test('should click widget via /click endpoint', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Launch calculator
    const calcIcon = ctx.getById('icon-calculator');
    await calcIcon.click();
    await calcIcon.click();

    // Wait for app to launch
    await waitFor(async () => {
      const response = await fetchDebugApi('/apps', debugToken, debugPort);
      return response.apps.length > 0;
    });

    // Get the tree and find button positions
    // For calculator, we can find by looking for exact text matches
    // Use TsyneTest to click buttons since calculator uses text for IDs
    await ctx.getByExactText('5').click();
    await ctx.getByExactText('+').click();
    await ctx.getByExactText('3').click();
    await ctx.getByExactText('=').click();

    // Verify result
    await ctx.getById('calc-display').within(2000).shouldBe('8');
  }, 10000);

  test('should return 404 for non-existent app in /app/switchTo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    // Try to switch to non-existent app
    const response = await fetchDebugApi('/app/switchTo?id=nonexistent', debugToken, debugPort);
    expect(response.error).toBe('App not found');
  }, 10000);

  test('should return 400 for missing id in /app/switchTo', async () => {
    const testApp = await tsyneTest.createApp(async (app) => {
      await buildDesktop(app, getTestDesktopOptions());
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(500);

    const response = await fetchDebugApi('/app/switchTo', debugToken, debugPort);
    expect(response.error).toBe('Missing id= param');
  }, 10000);
});
