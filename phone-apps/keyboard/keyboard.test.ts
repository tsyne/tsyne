/**
 * TsyneTest UI tests for Virtual Keyboard
 * Tests use text area harness - keyboard input goes to text area, assertions on text area content
 * See LICENSE for copyright information.
 *
 * Key index reference (QWERTY - EnUS/EnGB/ItIT/EsES):
 * Row 1: q=0 w=1 e=2 r=3 t=4 y=5 u=6 i=7 o=8 p=9
 * Row 2: a=0 s=1 d=2 f=3 g=4 h=5 j=6 k=7 l=8
 * Row 3: z=0 x=1 c=2 v=3 b=4 n=5 m=6
 *
 * Key index reference (AZERTY - FrFR):
 * Row 1: a=0 z=1 e=2 r=3 t=4 y=5 u=6 i=7 o=8 p=9
 * Row 2: q=0 s=1 d=2 f=3 g=4 h=5 j=6 k=7 l=8 m=9
 * Row 3: w=0 x=1 c=2 v=3 b=4 n=5
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createKeyboardTestHarness, KeyboardLayout } from './keyboard';
import { EnUS } from './locales/en-us';
import { EnGB } from './locales/en-gb';
import { FrFR } from './locales/fr-fr';
import { ItIT } from './locales/it-it';
import { EsES } from './locales/es-es';

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

  // Helper to create test app with harness
  const createTestWithLayout = (layout: KeyboardLayout) => {
    return tsyneTest.createApp((app) => {
      app.window({ title: `Test - ${layout.name}`, width: 400, height: 450 }, (win) => {
        win.setContent(() => {
          createKeyboardTestHarness(app, layout);
        });
        win.show();
      });
    });
  };

  describe('English US Layout', () => {
    test('should show text area receiving keyboard input', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "hello" and verify it appears in text area
      await ctx.getByID('key-r2-5').click(); // h
      await ctx.getByID('key-r1-2').click(); // e
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r1-8').click(); // o

      await ctx.getByID('text-area').within(500).shouldBe('hello');
    });

    test('should type "Hello World" with shift', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // H (shifted)
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r2-5').click(); // H
      // ello
      await ctx.getByID('key-r1-2').click(); // e
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r1-8').click(); // o
      // space
      await ctx.getByID('key-space').click();
      // W (shifted)
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r1-1').click(); // W
      // orld
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r1-3').click(); // r
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-2').click(); // d

      await ctx.getByID('text-area').within(500).shouldBe('Hello World');
    });

    test('should type numbers in symbol mode', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // Switch to symbols
      await ctx.getByID('key-r1-0').click(); // 1
      await ctx.getByID('key-r1-1').click(); // 2
      await ctx.getByID('key-r1-2').click(); // 3

      await ctx.getByID('text-area').within(500).shouldBe('123');
    });

    test('should type @ symbol (US position)', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // symbols
      await ctx.getByID('key-r2-1').click(); // @ (US: row 2, index 1)

      await ctx.getByID('text-area').within(500).shouldBe('@');
    });

    test('should handle backspace', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r1-0').click(); // q
      await ctx.getByID('key-r1-1').click(); // w
      await ctx.getByID('key-r1-2').click(); // e
      await ctx.getByID('key-backspace').click();

      await ctx.getByID('text-area').within(500).shouldBe('qw');
    });
  });

  describe('English UK Layout', () => {
    test('should type with UK layout', async () => {
      const testApp = await createTestWithLayout(EnGB);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r2-5').click(); // h
      await ctx.getByID('key-r1-7').click(); // i

      await ctx.getByID('text-area').within(500).shouldBe('hi');
    });

    test('should type £ symbol (UK specific)', async () => {
      const testApp = await createTestWithLayout(EnGB);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // symbols
      await ctx.getByID('key-r2-2').click(); // £ (UK: row 2, index 2)

      await ctx.getByID('text-area').within(500).shouldBe('£');
    });
  });

  describe('French AZERTY Layout', () => {
    test('should type with AZERTY layout', async () => {
      const testApp = await createTestWithLayout(FrFR);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // "azerty" on French keyboard
      await ctx.getByID('key-r1-0').click(); // a
      await ctx.getByID('key-r1-1').click(); // z
      await ctx.getByID('key-r1-2').click(); // e
      await ctx.getByID('key-r1-3').click(); // r
      await ctx.getByID('key-r1-4').click(); // t
      await ctx.getByID('key-r1-5').click(); // y

      await ctx.getByID('text-area').within(500).shouldBe('azerty');
    });

    test('should type French accented é', async () => {
      const testApp = await createTestWithLayout(FrFR);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // symbols (accents)
      await ctx.getByID('key-r2-0').click(); // é

      await ctx.getByID('text-area').within(500).shouldBe('é');
    });

    test('should type "café"', async () => {
      const testApp = await createTestWithLayout(FrFR);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r3-2').click(); // c
      await ctx.getByID('key-r1-0').click(); // a
      await ctx.getByID('key-r2-3').click(); // f
      await ctx.getByID('key-mode').click(); // symbols
      await ctx.getByID('key-r2-0').click(); // é

      await ctx.getByID('text-area').within(500).shouldBe('café');
    });
  });

  describe('Italian Layout', () => {
    test('should type with Italian layout (QWERTY)', async () => {
      const testApp = await createTestWithLayout(ItIT);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r3-2').click(); // c
      await ctx.getByID('key-r1-7').click(); // i
      await ctx.getByID('key-r2-0').click(); // a
      await ctx.getByID('key-r1-8').click(); // o

      await ctx.getByID('text-area').within(500).shouldBe('ciao');
    });

    test('should type Italian accented à', async () => {
      const testApp = await createTestWithLayout(ItIT);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // symbols
      await ctx.getByID('key-r2-0').click(); // à

      await ctx.getByID('text-area').within(500).shouldBe('à');
    });
  });

  describe('Spanish Layout', () => {
    test('should type with Spanish layout (includes ñ)', async () => {
      const testApp = await createTestWithLayout(EsES);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r2-5').click(); // h
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-0').click(); // a

      await ctx.getByID('text-area').within(500).shouldBe('hola');
    });

    test('should type ñ (Spanish specific)', async () => {
      const testApp = await createTestWithLayout(EsES);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-r2-9').click(); // ñ (Spanish: row 2, last position)

      await ctx.getByID('text-area').within(500).shouldBe('ñ');
    });

    test('should type "España"', async () => {
      const testApp = await createTestWithLayout(EsES);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r1-2').click(); // E
      await ctx.getByID('key-r2-1').click(); // s (shift auto-off) - s is r2-1 not r1-1
      await ctx.getByID('key-r1-9').click(); // p
      await ctx.getByID('key-r2-0').click(); // a
      await ctx.getByID('key-r2-9').click(); // ñ
      await ctx.getByID('key-r2-0').click(); // a

      await ctx.getByID('text-area').within(500).shouldBe('España');
    });

    test('should type ¿ and ¡ (Spanish punctuation)', async () => {
      const testApp = await createTestWithLayout(EsES);
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-mode').click(); // symbols
      await ctx.getByID('key-r2-6').click(); // ¿
      await ctx.getByID('key-r2-7').click(); // ¡

      await ctx.getByID('text-area').within(500).shouldBe('¿¡');
    });
  });

  describe('Screenshot Tests', () => {
    test('English US - Hello World', async () => {
      const testApp = await createTestWithLayout(EnUS);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "Hello World."
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r2-5').click(); // H
      await ctx.getByID('key-r1-2').click(); // e
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-space').click();
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r1-1').click(); // W
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r1-3').click(); // r
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-2').click(); // d
      await ctx.getByID('key-period').click();

      await ctx.getByID('text-area').within(500).shouldBe('Hello World.');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-en-us.png');
      }
    });

    test('French AZERTY - Bonjour', async () => {
      const testApp = await createTestWithLayout(FrFR);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "Bonjour" on AZERTY
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r3-4').click(); // B
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r3-5').click(); // n
      await ctx.getByID('key-r2-6').click(); // j
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r1-6').click(); // u
      await ctx.getByID('key-r1-3').click(); // r

      await ctx.getByID('text-area').within(500).shouldBe('Bonjour');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-fr-fr.png');
      }
    });

    test('Spanish - Hola España', async () => {
      const testApp = await createTestWithLayout(EsES);
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type "Hola España"
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r2-5').click(); // H
      await ctx.getByID('key-r1-8').click(); // o
      await ctx.getByID('key-r2-8').click(); // l
      await ctx.getByID('key-r2-0').click(); // a
      await ctx.getByID('key-space').click();
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-r1-2').click(); // E
      await ctx.getByID('key-r2-1').click(); // s (r2-1 not r1-1)
      await ctx.getByID('key-r1-9').click(); // p
      await ctx.getByID('key-r2-0').click(); // a
      await ctx.getByID('key-r2-9').click(); // ñ
      await ctx.getByID('key-r2-0').click(); // a

      await ctx.getByID('text-area').within(500).shouldBe('Hola España');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-es-es.png');
      }
    });
  });
});
