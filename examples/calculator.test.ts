/**
 * TsyneTest Integration Tests for Simple Calculator
 *
 * Since the simple calculator mixes UI and logic, ALL tests
 * must use TsyneTest (no Jest unit tests possible).
 *
 * PROS:
 * - Tests exactly what users see/do
 * - Catches integration bugs
 * - End-to-end validation
 *
 * CONS:
 * - Slower than unit tests (~3s vs ~100ms)
 * - Harder to debug failures
 * - Cannot test edge cases quickly
 * - Must spawn bridge for every test
 *
 * USAGE:
 * - Headless mode (default): npm run test:calculator
 * - Visual debugging mode: TSYNE_HEADED=1 npm run test:calculator
 */

import { app } from '../core/src';
import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildCalculator } from './calculator';

describe('Simple Calculator Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    // Support TSYNE_HEADED=1 environment variable for visual debugging
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial value of 0', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Use fluent-selenium style assertion
    await ctx.getByExactText("0").shouldBe("0");
  });

  test('should perform addition', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Use fluent-selenium style - clicks without manual waits
    await ctx.getByExactText("5").click();
    await ctx.getByExactText("+").click();
    await ctx.getByExactText("3").click();
    await ctx.getByExactText("=").click();

    // Fluent assertion waits for the expected value
    await ctx.getByType("label").shouldBe("8");

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const path = require('path');
      const screenshotPath = path.join(__dirname, 'screenshots', 'calculator.png');
      await ctx.getByType("label").within(500).shouldBe("8");
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should perform subtraction', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Clean fluent-selenium style - no manual waits
    await ctx.getByExactText("9").click();
    await ctx.getByExactText("-").click();
    await ctx.getByExactText("4").click();
    await ctx.getByExactText("=").click();

    // Assertion automatically waits for expected value
    await ctx.getByType("label").shouldBe("5");
  });

  test('should handle division by zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fluent clicks without delays
    await ctx.getByExactText("5").click();
    await ctx.getByExactText("÷").click();
    await ctx.getByExactText("0").click();
    await ctx.getByExactText("=").click();

    // Fluent assertion - waits for "Error" to appear
    await ctx.getByType("label").shouldBe("Error");
  });

  test('should clear display', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Fluent-selenium style - smooth sequence without delays
    await ctx.getByExactText("1").click();
    await ctx.getByExactText("2").click();
    await ctx.getByExactText("3").click();
    await ctx.getByExactText("Clr").click();

    // Fluent assertion ensures "0" appears
    await ctx.getByType("label").shouldBe("0");
  });
});
