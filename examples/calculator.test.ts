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
 */

import { app } from '../src';
import { TsyneTest, TestContext } from '../src/index-test';
import { buildCalculator } from './calculator';

describe('Simple Calculator Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: false });
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
