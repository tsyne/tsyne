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

    const display = ctx.getByExactText("0");
    await ctx.expect(display).toHaveText("0");
  });

  test('should perform addition', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByExactText("5").click();
    await ctx.wait(50);
    await ctx.getByExactText("+").click();
    await ctx.wait(50);
    await ctx.getByExactText("3").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("8");
  });

  test('should perform subtraction', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByExactText("9").click();
    await ctx.wait(50);
    await ctx.getByExactText("-").click();
    await ctx.wait(50);
    await ctx.getByExactText("4").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("5");
  });

  test('should handle division by zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByExactText("5").click();
    await ctx.wait(50);
    await ctx.getByExactText("÷").click();
    await ctx.wait(50);
    await ctx.getByExactText("0").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("Error");
  });

  test('should clear display', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildCalculator(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByExactText("1").click();
    await ctx.wait(50);
    await ctx.getByExactText("2").click();
    await ctx.wait(50);
    await ctx.getByExactText("3").click();
    await ctx.wait(50);
    await ctx.getByExactText("Clr").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("0");
  });
});
