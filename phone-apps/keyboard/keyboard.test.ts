/**
 * TsyneTest UI tests for Virtual Keyboard
 * See LICENSE for copyright information.
 *
 * Key index reference (QWERTY):
 * Row 1: q=0 w=1 e=2 r=3 t=4 y=5 u=6 i=7 o=8 p=9
 * Row 2: a=0 s=1 d=2 f=3 g=4 h=5 j=6 k=7 l=8
 * Row 3: z=0 x=1 c=2 v=3 b=4 n=5 m=6
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { VirtualKeyboard, createKeyboardApp } from './keyboard';

describe('Virtual Keyboard', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  describe('Basic Input', () => {
    test('should display empty initially', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Display should be empty (or space placeholder)
      await ctx.getByID('keyboard-display').within(500).shouldExist();
    });

    test('should type single letter', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r1-0').click(); // 'q'
      await ctx.getByID('keyboard-display').within(500).shouldBe('q');
    });

    test('should type multiple letters', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // t-y-o-p-e
      await ctx.getByID('key-r1-4').click(); // 't'
      await ctx.getByID('key-r1-5').click(); // 'y'
      await ctx.getByID('key-r1-8').click(); // 'o'
      await ctx.getByID('key-r1-9').click(); // 'p'
      await ctx.getByID('key-r1-2').click(); // 'e'

      await ctx.getByID('keyboard-display').within(500).shouldBe('tyope');
    });

    test('should type word "hello"', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // h-e-l-l-o (h=r2-5, e=r1-2, l=r2-8, o=r1-8)
      await ctx.getByID('key-r2-5').click(); // 'h'
      await ctx.getByID('key-r1-2').click(); // 'e'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r1-8').click(); // 'o'

      await ctx.getByID('keyboard-display').within(500).shouldBe('hello');
    });
  });

  describe('Shift Functionality', () => {
    test('should type uppercase with shift', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-shift').click(); // Enable shift
      await ctx.getByID('key-r1-0').click();  // 'Q' (uppercase)

      await ctx.getByID('keyboard-display').within(500).shouldBe('Q');
    });

    test('should auto-disable shift after letter', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-shift').click(); // Enable shift
      await ctx.getByID('key-r2-5').click();  // 'H' (uppercase, h=r2-5)
      await ctx.getByID('key-r1-2').click();  // 'e' (lowercase after auto-disable)

      await ctx.getByID('keyboard-display').within(500).shouldBe('He');
    });

    test('should type "Hello" with capital H', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // H (shifted) e-l-l-o
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r2-5').click(); // 'H'
      await ctx.getByID('key-r1-2').click(); // 'e'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r1-8').click(); // 'o'

      await ctx.getByID('keyboard-display').within(500).shouldBe('Hello');
    });
  });

  describe('Symbol Mode', () => {
    test('should switch to symbols mode', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // Switch to symbols
      await ctx.getByID('key-r1-0').click();  // '1'

      await ctx.getByID('keyboard-display').within(500).shouldBe('1');
    });

    test('should type number sequence', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // Switch to symbols
      await ctx.getByID('key-r1-0').click();  // '1'
      await ctx.getByID('key-r1-1').click();  // '2'
      await ctx.getByID('key-r1-2').click();  // '3'

      await ctx.getByID('keyboard-display').within(500).shouldBe('123');
    });

    test('should switch back to letters', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // To symbols
      await ctx.getByID('key-r1-0').click();  // '1'
      await ctx.getByID('key-mode').click(); // Back to letters
      await ctx.getByID('key-r1-0').click();  // 'q'

      await ctx.getByID('keyboard-display').within(500).shouldBe('1q');
    });
  });

  describe('Special Keys', () => {
    test('should handle backspace', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r1-0').click(); // 'q'
      await ctx.getByID('key-r1-1').click(); // 'w'
      await ctx.getByID('key-r1-2').click(); // 'e'
      await ctx.getByID('key-backspace').click(); // delete 'e'

      await ctx.getByID('keyboard-display').within(500).shouldBe('qw');
    });

    test('should handle space', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // h-i space h-i (h=r2-5, i=r1-7)
      await ctx.getByID('key-r2-5').click(); // 'h'
      await ctx.getByID('key-r1-7').click(); // 'i'
      await ctx.getByID('key-space').click(); // ' '
      await ctx.getByID('key-r2-5').click(); // 'h'
      await ctx.getByID('key-r1-7').click(); // 'i'

      await ctx.getByID('keyboard-display').within(500).shouldBe('hi hi');
    });

    test('should handle comma and period', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // h-i, space o-k. (h=r2-5, i=r1-7, o=r1-8, k=r2-7)
      await ctx.getByID('key-r2-5').click();  // 'h'
      await ctx.getByID('key-r1-7').click();  // 'i'
      await ctx.getByID('key-comma').click(); // ','
      await ctx.getByID('key-space').click(); // ' '
      await ctx.getByID('key-r1-8').click();  // 'o'
      await ctx.getByID('key-r2-7').click();  // 'k'
      await ctx.getByID('key-period').click(); // '.'

      await ctx.getByID('keyboard-display').within(500).shouldBe('hi, ok.');
    });

    test('should clear with multiple backspaces', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r1-0').click(); // 'q'
      await ctx.getByID('key-r1-1').click(); // 'w'
      await ctx.getByID('key-backspace').click();
      await ctx.getByID('key-backspace').click();

      // Should show empty or space placeholder
      await ctx.getByID('keyboard-display').within(500).shouldBe(' ');
    });
  });

  describe('Complex Input', () => {
    test('should type email-like string', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "hi" (h=r2-5, i=r1-7)
      await ctx.getByID('key-r2-5').click(); // 'h'
      await ctx.getByID('key-r1-7').click(); // 'i'

      // Switch to symbols for '@' (row 2, index 1)
      await ctx.getByID('key-mode').click();
      await ctx.getByID('key-r2-1').click(); // '@'

      // Back to letters
      await ctx.getByID('key-mode').click();
      await ctx.getByID('key-r1-2').click(); // 'e'
      await ctx.getByID('key-r1-3').click(); // 'r'

      await ctx.getByID('keyboard-display').within(500).shouldBe('hi@er');
    });
  });

  describe('Screenshot Test', () => {
    test('should render keyboard layout', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "Hello World." (H=shift+r2-5, e=r1-2, l=r2-8, o=r1-8, W=shift+r1-1, r=r1-3, d=r2-2)
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r2-5').click(); // 'H'
      await ctx.getByID('key-r1-2').click(); // 'e'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r1-8').click(); // 'o'
      await ctx.getByID('key-space').click();
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r1-1').click(); // 'W'
      await ctx.getByID('key-r1-8').click(); // 'o'
      await ctx.getByID('key-r1-3').click(); // 'r'
      await ctx.getByID('key-r2-8').click(); // 'l'
      await ctx.getByID('key-r2-2').click(); // 'd'
      await ctx.getByID('key-period').click();

      await ctx.getByID('keyboard-display').within(500).shouldBe('Hello World.');

      // Take screenshot if env var set
      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-letters.png');
      }
    });

    test('should render symbol mode', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        createKeyboardApp(app);
      });

      ctx = tsyneTest.getContext();
      await testApp.run();

      // Switch to symbol mode and type "123!"
      await ctx.getByID('key-mode').click();
      await ctx.getByID('key-r1-0').click(); // '1'
      await ctx.getByID('key-r1-1').click(); // '2'
      await ctx.getByID('key-r1-2').click(); // '3'
      await ctx.getByID('key-r2-0').click(); // '!'

      await ctx.getByID('keyboard-display').within(500).shouldBe('123!');

      // Take screenshot if env var set
      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-symbols.png');
      }
    });
  });
});
