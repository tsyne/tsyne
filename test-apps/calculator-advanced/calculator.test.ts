import { app } from '../../../../../../core/src';
import { TsyneTest, TestContext } from '../../src/index-test';
import { Calculator } from './calculator';

/**
 * Comprehensive test suite for the Calculator application
 *
 * Demonstrates TsyneTest features:
 * - Headless and headed testing modes
 * - Widget locators and selectors
 * - Assertions and expectations
 * - UI interaction simulation
 * - State verification
 *
 * USAGE:
 * - Headless mode (default): npm test
 * - Visual debugging mode: TSYNE_HEADED=1 npm test
 */

describe('Calculator Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    // Support TSYNE_HEADED=1 environment variable for visual debugging
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial value of 0', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Find display label and verify it shows 0
    const display = ctx.getByExactText("0");
    await ctx.expect(display).toHaveText("0");
  });

  test('should handle single digit input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click button "5"
    await ctx.getByExactText("5").click();

    // Display should show "5"
    await ctx.wait(50); // Small wait for state update
    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("5");
  });

  test('should handle multiple digit input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click 1, 2, 3
    await ctx.getByExactText("1").click();
    await ctx.wait(50);
    await ctx.getByExactText("2").click();
    await ctx.wait(50);
    await ctx.getByExactText("3").click();
    await ctx.wait(50);

    // Display should show "123"
    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("123");
  });

  test('should perform addition', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 5 + 3 = 8
    await ctx.getByExactText("5").click();
    await ctx.wait(50);
    await ctx.getByExactText("+").click();
    await ctx.wait(50);
    await ctx.getByExactText("3").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    // Display should show "8"
    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("8");
  });

  test('should perform subtraction', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 9 - 4 = 5
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

  test('should perform multiplication', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 6 × 7 = 42
    await ctx.getByExactText("6").click();
    await ctx.wait(50);
    await ctx.getByExactText("×").click();
    await ctx.wait(50);
    await ctx.getByExactText("7").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("42");
  });

  test('should perform division', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 8 ÷ 2 = 4
    await ctx.getByExactText("8").click();
    await ctx.wait(50);
    await ctx.getByExactText("÷").click();
    await ctx.wait(50);
    await ctx.getByExactText("2").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("4");
  });

  test('should handle division by zero', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 5 ÷ 0 = Error
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

  test('should handle decimal numbers', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter: 3.14
    await ctx.getByExactText("3").click();
    await ctx.wait(50);
    await ctx.getByExactText(".").click();
    await ctx.wait(50);
    await ctx.getByExactText("1").click();
    await ctx.wait(50);
    await ctx.getByExactText("4").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("3.14");
  });

  test('should clear display', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Enter 123, then clear
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

  test('should handle chain operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Calculate: 2 + 3 + 4 = 9
    await ctx.getByExactText("2").click();
    await ctx.wait(50);
    await ctx.getByExactText("+").click();
    await ctx.wait(50);
    await ctx.getByExactText("3").click();
    await ctx.wait(50);
    await ctx.getByExactText("+").click();
    await ctx.wait(50);
    await ctx.getByExactText("4").click();
    await ctx.wait(50);
    await ctx.getByExactText("=").click();
    await ctx.wait(50);

    const display = ctx.getByType("label");
    await ctx.expect(display).toHaveText("9");
  });

  test('should have all buttons visible', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      const calc = new Calculator(app);
      calc.build();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify all digit buttons exist
    for (let i = 0; i <= 9; i++) {
      const btn = ctx.getByExactText(i.toString());
      await ctx.expect(btn).toBeVisible();
    }

    // Verify operator buttons exist
    await ctx.expect(ctx.getByExactText("+")).toBeVisible();
    await ctx.expect(ctx.getByExactText("-")).toBeVisible();
    await ctx.expect(ctx.getByExactText("×")).toBeVisible();
    await ctx.expect(ctx.getByExactText("÷")).toBeVisible();
    await ctx.expect(ctx.getByExactText("=")).toBeVisible();
    await ctx.expect(ctx.getByExactText(".")).toBeVisible();
    await ctx.expect(ctx.getByExactText("Clr")).toBeVisible();
  });
});
