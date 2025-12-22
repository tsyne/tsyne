/**
 * TsyneTest Integration Tests for Full Calculator
 *
 * Tests multi-base arithmetic, bitwise operations, and memory functions.
 *
 * USAGE:
 * - Headless mode: npx jest examples/full-calculator.test.ts
 * - Visual debugging: TSYNE_HEADED=1 npx jest examples/full-calculator.test.ts
 * - With screenshots: TAKE_SCREENSHOTS=1 npx jest examples/full-calculator.test.ts
 */

import * as path from 'path';
import { TsyneTest, TestContext } from '../core/src/index-test';
import { buildFullCalculator } from './full-calculator';

describe('Full Calculator Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('Basic Arithmetic', () => {
    test('should display initial value of 0', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('calc-display').within(500).shouldBe('0');
    });

    test('should perform addition', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-5').click();
      await ctx.getById('btn-add').click();
      await ctx.getById('btn-3').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('8');
    });

    test('should perform subtraction', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-9').click();
      await ctx.getById('btn-sub').click();
      await ctx.getById('btn-4').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('5');
    });

    test('should perform multiplication', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-6').click();
      await ctx.getById('btn-mul').click();
      await ctx.getById('btn-7').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('42');
    });

    test('should perform division', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-8').click();
      await ctx.getById('btn-div').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('4');
    });

    test('should handle division by zero', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-5').click();
      await ctx.getById('btn-div').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('Error');
    });

    test('should perform modulo', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-1').click();
      await ctx.getById('btn-7').click();
      await ctx.getById('btn-mod').click();
      await ctx.getById('btn-5').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('2');
    });
  });

  describe('Clear Functions', () => {
    test('should clear entry with CE', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-1').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-3').click();
      await ctx.getById('btn-ce').click();

      await ctx.getById('calc-display').within(500).shouldBe('0');
    });

    test('should all clear with AC', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-5').click();
      await ctx.getById('btn-add').click();
      await ctx.getById('btn-3').click();
      await ctx.getById('btn-ac').click();

      await ctx.getById('calc-display').within(500).shouldBe('0');

      // Verify operator was cleared by pressing = (should not compute)
      await ctx.getById('btn-eq').click();
      await ctx.getById('calc-display').within(500).shouldBe('0');
    });
  });

  describe('Unary Operations', () => {
    test('should negate with NEG', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-5').click();
      await ctx.getById('btn-neg').click();

      await ctx.getById('calc-display').within(500).shouldBe('-5');
    });

    test('should perform bitwise NOT', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getById('btn-0').click();
      await ctx.getById('btn-not').click();

      // NOT 0 = -1 (all bits set in two's complement)
      await ctx.getById('calc-display').within(500).shouldBe('-1');
    });
  });

  describe('Bitwise Operations', () => {
    test('should perform AND', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 12 AND 10 = 8 (1100 & 1010 = 1000)
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-and').click();
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('8');
    });

    test('should perform OR', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 12 OR 10 = 14 (1100 | 1010 = 1110)
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-or').click();
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('14');
    });

    test('should perform XOR', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 12 XOR 10 = 6 (1100 ^ 1010 = 0110)
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-xor').click();
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('6');
    });

    test('should perform left shift', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 5 << 2 = 20
      await ctx.getById('btn-5').click();
      await ctx.getById('btn-shl').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('20');
    });

    test('should perform right shift', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 20 >> 2 = 5
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-shr').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-eq').click();

      await ctx.getById('calc-display').within(500).shouldBe('5');
    });
  });

  describe('Memory Functions', () => {
    test('should store and recall memory', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Store 42 in memory
      await ctx.getById('btn-4').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-madd').click();

      // Memory indicator should show 'M'
      await ctx.getById('memory-indicator').within(500).shouldBe('M');

      // Clear and recall
      await ctx.getById('btn-ac').click();
      await ctx.getById('btn-mr').click();

      await ctx.getById('calc-display').within(500).shouldBe('42');
    });

    test('should add to memory with M+', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Add 10 to memory
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-madd').click();

      // Add 5 more to memory
      await ctx.getById('btn-5').click();
      await ctx.getById('btn-madd').click();

      // Recall should be 15
      await ctx.getById('btn-mr').click();
      await ctx.getById('calc-display').within(500).shouldBe('15');
    });

    test('should subtract from memory with M-', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Add 10 to memory
      await ctx.getById('btn-1').click();
      await ctx.getById('btn-0').click();
      await ctx.getById('btn-madd').click();

      // Subtract 3 from memory
      await ctx.getById('btn-3').click();
      await ctx.getById('btn-msub').click();

      // Recall should be 7
      await ctx.getById('btn-mr').click();
      await ctx.getById('calc-display').within(500).shouldBe('7');
    });

    test('should clear memory with MC', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Add 42 to memory
      await ctx.getById('btn-4').click();
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-madd').click();
      await ctx.getById('memory-indicator').within(500).shouldBe('M');

      // Clear memory
      await ctx.getById('btn-mc').click();
      await ctx.getById('memory-indicator').within(500).shouldBe(' ');

      // Recall should be 0
      await ctx.getById('btn-mr').click();
      await ctx.getById('calc-display').within(500).shouldBe('0');
    });
  });

  describe('Base Conversion', () => {
    test('should switch to hex and display correctly', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Enter 255 in decimal
      await ctx.getById('btn-2').click();
      await ctx.getById('btn-5').click();
      await ctx.getById('btn-5').click();

      // Switch to hex
      await ctx.getById('btn-hex').click();

      await ctx.getById('base-label').within(500).shouldBe('HEX');
      await ctx.getById('calc-display').within(500).shouldBe('FF');
    });

    test('should switch to binary and display correctly', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Enter 5 in decimal
      await ctx.getById('btn-5').click();

      // Switch to binary
      await ctx.getById('btn-bin').click();

      await ctx.getById('base-label').within(500).shouldBe('BIN');
      await ctx.getById('calc-display').within(500).shouldBe('101');
    });

    test('should switch to octal and display correctly', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Enter 64 in decimal
      await ctx.getById('btn-6').click();
      await ctx.getById('btn-4').click();

      // Switch to octal
      await ctx.getById('btn-oct').click();

      await ctx.getById('base-label').within(500).shouldBe('OCT');
      await ctx.getById('calc-display').within(500).shouldBe('100');
    });

    test('should use hex digits A-F in hex mode', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Switch to hex
      await ctx.getById('btn-hex').click();

      // Enter CAFE
      await ctx.getById('btn-C').click();
      await ctx.getById('btn-A').click();
      await ctx.getById('btn-F').click();
      await ctx.getById('btn-E').click();

      await ctx.getById('calc-display').within(500).shouldBe('CAFE');

      // Switch to decimal to verify value
      await ctx.getById('btn-dec').click();
      await ctx.getById('calc-display').within(500).shouldBe('51966');
    });
  });

  describe('Chained Operations', () => {
    test('should chain multiple operations', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // 5 + 3 * 2 = (5+3)*2 = 16 (left-to-right, no precedence)
      await ctx.getById('btn-5').click();
      await ctx.getById('btn-add').click();
      await ctx.getById('btn-3').click();
      await ctx.getById('btn-mul').click();
      // After pressing *, the 5+3 should evaluate to 8
      await ctx.getById('calc-display').within(500).shouldBe('8');

      await ctx.getById('btn-2').click();
      await ctx.getById('btn-eq').click();
      await ctx.getById('calc-display').within(500).shouldBe('16');
    });
  });

  describe('Screenshot', () => {
    test('should capture calculator UI', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        buildFullCalculator(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Enter some value for visual interest
      await ctx.getById('btn-hex').click();
      await ctx.getById('btn-D').click();
      await ctx.getById('btn-E').click();
      await ctx.getById('btn-A').click();
      await ctx.getById('btn-D').click();

      if (process.env.TAKE_SCREENSHOTS === '1') {
        const screenshotPath = path.join(__dirname, 'screenshots', 'full-calculator.png');
        await tsyneTest.screenshot(screenshotPath);
        console.error(`Screenshot saved: ${screenshotPath}`);
      }
    });
  });
});
