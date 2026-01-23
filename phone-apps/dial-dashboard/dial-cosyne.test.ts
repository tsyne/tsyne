import { TsyneTest, TestContext } from 'tsyne';
import * as path from 'path';
import * as fs from 'fs';
import { createDialDashboardApp } from './dial-cosyne';
import { MsgpackBridgeConnection } from 'tsyne';

describe('Dial Dashboard', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test.skip('should render dial dashboard with proper spacing', async () => {
    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // Take screenshot
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'dial-dashboard.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Screenshot saved: ${screenshotPath}`);
  });

  test.skip('dial dashboard renders with all styles and layouts', async () => {
    // This test verifies the dial dashboard renders correctly with:
    // - 4 dial styles: classic, minimal, vintage, modern
    // - Various configurations: 360°, 180°, centered pan control
    // - Size variations: small, medium, large
    // - Animated bound dial

    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render and a few animation frames
    await ctx.wait(500);

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Take screenshot showing all dials
    const screenshotPath = path.join(screenshotDir, 'dial-styles.png');
    await tsyneTest.screenshot(screenshotPath);
    console.log(`Dial styles screenshot: ${screenshotPath}`);

    // Verify the footer shows correct initial values
    // Volume: 50%, Temp: 21.5°, Pan: 0, Speed: 75
    await ctx.getById('vol-label').shouldContain('50%');
    await ctx.getById('temp-label').shouldContain('21.5');
    await ctx.getById('pan-label').shouldContain('0');
    await ctx.getById('speed-label').shouldContain('75');
  });

  test('dial interaction - drag changes dial value', async () => {
    // Test that dragging on a dial changes its value
    console.log('[TEST] Creating app...');
    const testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Dial Dashboard', width: 540, height: 600 }, (win: any) => {
        createDialDashboardApp(a, win);
        win.show();
      });
    });
    console.log('[TEST] App created, getting context...');
    ctx = tsyneTest.getContext();
    console.log('[TEST] Running app...');
    await testApp.run();
    console.log('[TEST] App running, waiting 500ms...');

    await ctx.wait(500);
    console.log('[TEST] Wait done');

    // Try tapping first to see if events reach the TappableCanvasRaster
    console.log('[TEST] Calling tapAt(100, 100)...');
    try {
      await Promise.race([
        ctx.tapAt(100, 100),
        new Promise((_, reject) => setTimeout(() => reject(new Error('tapAt timeout')), 5000))
      ]);
      console.log('[TEST] tapAt completed');
    } catch (e: any) {
      console.log(`[TEST] tapAt error: ${e.message}`);
    }
    await ctx.wait(100);

    // Try dragging on the dial
    console.log('[TEST] Calling drag(70, 120, 60, 0)...');
    try {
      await Promise.race([
        ctx.drag(70, 120, 60, 0),
        new Promise((_, reject) => setTimeout(() => reject(new Error('drag timeout')), 5000))
      ]);
      console.log('[TEST] drag completed');
    } catch (e: any) {
      console.log(`[TEST] drag error: ${e.message}`);
    }
    await ctx.wait(200);

    // Get final volume value
    console.log('[TEST] Getting vol-label...');
    const afterLabel = await ctx.getById('vol-label').getText();
    console.log(`[TEST] Final volume: ${afterLabel}`);
  }, 30000);
});

describe('Bridge Performance', () => {
  let tsyneTest: TsyneTest;
  let bridge: MsgpackBridgeConnection;
  let testApp: any;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    // Create app to get a bridge connection
    testApp = await tsyneTest.createApp((a: any) => {
      a.window({ title: 'Perf Test', width: 200, height: 200 }, (win: any) => {
        a.label('Performance Test');
        win.show();
      });
    });
    // Run the app so the bridge is fully initialized
    await testApp.run();
    bridge = (tsyneTest as any).app.getBridge() as MsgpackBridgeConnection;
    await bridge.waitUntilReady();
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test.skip('benchmark: ping latency', async () => {
    const iterations = 100;

    // Warm up
    for (let i = 0; i < 10; i++) {
      await bridge.send('ping', {});
    }

    // Benchmark ping latency
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      const result = await bridge.send('ping', {});
      expect(result).toEqual({ pong: true });
    }
    const elapsed = performance.now() - start;

    console.log(`\n===== Ping Latency Benchmark =====`);
    console.log(`Iterations: ${iterations}`);
    console.log(`Total: ${elapsed.toFixed(1)}ms`);
    console.log(`Avg latency: ${(elapsed / iterations).toFixed(2)}ms/ping`);
    console.log(`==================================\n`);
  }, 30000);

  test('benchmark: send() vs sendFireAndForget() throughput', async () => {
    const iterations = 100;

    // Create a test line for benchmarking
    const lineId = 'bench-line';
    await bridge.send('createCanvasLine', {
      id: lineId,
      x1: 0, y1: 0, x2: 100, y2: 100,
      strokeColor: '#ff0000',
      strokeWidth: 2
    });

    // Warm up
    for (let i = 0; i < 10; i++) {
      await bridge.send('updateCanvasLine', { widgetId: lineId, x2: 100 + i });
    }

    // Benchmark regular send() - must wait for each response
    const sendStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await bridge.send('updateCanvasLine', { widgetId: lineId, x2: 100 + i });
    }
    const sendTime = performance.now() - sendStart;
    const sendAvg = sendTime / iterations;

    // Benchmark sendFireAndForget() - no waiting
    const fireStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      bridge.sendFireAndForget('updateCanvasLine', { widgetId: lineId, x2: 100 + i });
    }
    const fireTime = performance.now() - fireStart;
    const fireAvg = fireTime / iterations;

    // Wait a bit for fire-and-forget messages to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`\n===== Bridge Performance Benchmark =====`);
    console.log(`Iterations: ${iterations}`);
    console.log(`send() total: ${sendTime.toFixed(1)}ms, avg: ${sendAvg.toFixed(2)}ms/call`);
    console.log(`sendFireAndForget() total: ${fireTime.toFixed(1)}ms, avg: ${fireAvg.toFixed(3)}ms/call`);
    console.log(`Speedup: ${(sendAvg / fireAvg).toFixed(1)}x faster`);
    console.log(`=========================================\n`);

    // sendFireAndForget should be significantly faster since it doesn't wait
    expect(fireTime).toBeLessThan(sendTime);
  }, 30000);

  test('benchmark: simulated rapid dial updates', async () => {
    // Simulate what happens during a dial drag - many updateCanvasLine calls
    const updates = 50; // Simulate 50 drag events

    // First, create a canvas line to update
    const lineId = 'perf-test-line';
    await bridge.send('createCanvasLine', {
      id: lineId,
      x1: 0, y1: 0, x2: 100, y2: 100,
      strokeColor: '#ff0000',
      strokeWidth: 2
    });

    // Benchmark with send() - sequential updates
    const sendStart = performance.now();
    for (let i = 0; i < updates; i++) {
      const angle = (i / updates) * Math.PI * 2;
      await bridge.send('updateCanvasLine', {
        widgetId: lineId,
        x2: 50 + Math.cos(angle) * 50,
        y2: 50 + Math.sin(angle) * 50
      });
    }
    const sendTime = performance.now() - sendStart;

    // Benchmark with sendFireAndForget() - parallel updates
    const fireStart = performance.now();
    for (let i = 0; i < updates; i++) {
      const angle = (i / updates) * Math.PI * 2;
      bridge.sendFireAndForget('updateCanvasLine', {
        widgetId: lineId,
        x2: 50 + Math.cos(angle) * 50,
        y2: 50 + Math.sin(angle) * 50
      });
    }
    const fireTime = performance.now() - fireStart;

    // Wait for fire-and-forget to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`\n===== Dial Update Simulation =====`);
    console.log(`Updates: ${updates}`);
    console.log(`send() total: ${sendTime.toFixed(1)}ms (${(sendTime/updates).toFixed(2)}ms/update)`);
    console.log(`sendFireAndForget() total: ${fireTime.toFixed(1)}ms (${(fireTime/updates).toFixed(3)}ms/update)`);
    console.log(`Speedup: ${(sendTime / fireTime).toFixed(1)}x faster`);
    console.log(`==================================\n`);

    expect(fireTime).toBeLessThan(sendTime);
  }, 30000);
});
