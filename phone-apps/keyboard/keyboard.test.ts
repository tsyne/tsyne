/**
 * TsyneTest UI tests for Virtual Keyboard
 * Tests use text area harness - keyboard input → text area → assertion
 * See LICENSE for copyright information.
 */

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createTestHarness } from './controller';
import { buildKeyboard as buildEnUS } from './en-us/keyboard';
import { buildKeyboard as buildEnGB } from './en-gb/keyboard';
import { buildKeyboard as buildFrFR } from './fr-fr/keyboard';
import { buildKeyboard as buildEsES } from './es-es/keyboard';
import { buildKeyboard as buildEnDvorak } from './en-dvorak/keyboard';

// Create locale-specific test harness factories (return void for setContent compatibility)
const createEnUSTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEnUS); };
const createEnGBTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEnGB); };
const createFrFRTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildFrFR); };
const createEsESTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEsES); };
const createEnDvorakTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEnDvorak); };

describe('Virtual Keyboard', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGLISH US (QWERTY)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('English US (en-US)', () => {
    test('type "hello" → text area shows "hello"', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-h').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-o').click();

      await ctx.getByID('text-area').within(500).shouldBe('hello');
    });

    test('shift + h → "H", then "ello" → "Hello"', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-o').click();

      await ctx.getByID('text-area').within(500).shouldBe('Hello');
    });

    test('backspace removes last character', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-h').click();
      await ctx.getByID('key-i').click();
      await ctx.getByID('key-x').click();
      await ctx.getByID('key-back').click();

      await ctx.getByID('text-area').within(500).shouldBe('hi');
    });

    test('space between words', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-h').click();
      await ctx.getByID('key-i').click();
      await ctx.getByID('key-space').click();
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-i').click();

      await ctx.getByID('text-area').within(500).shouldBe('hi hi');
    });

    test('screenshot: Hello World.', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Hello
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-space').click();
      // World
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-w').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-r').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-d').click();
      await ctx.getByID('key-dot').click();

      await ctx.getByID('text-area').within(500).shouldBe('Hello World.');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-en-us.png');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGLISH UK (QWERTY with £)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('English UK (en-GB)', () => {
    test('type "hi" → text area shows "hi"', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnGBTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-h').click();
      await ctx.getByID('key-i').click();

      await ctx.getByID('text-area').within(500).shouldBe('hi');
    });

    test('£ symbol (UK specific)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnGBTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-pound').click();
      await ctx.getByID('key-pound').click();
      await ctx.getByID('key-pound').click();

      await ctx.getByID('text-area').within(500).shouldBe('£££');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FRENCH (AZERTY)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('French AZERTY (fr-FR)', () => {
    test('type "azerty" (AZERTY top row)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createFrFRTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-a').click();
      await ctx.getByID('key-z').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-r').click();
      await ctx.getByID('key-t').click();
      await ctx.getByID('key-y').click();

      await ctx.getByID('text-area').within(500).shouldBe('azerty');
    });

    test('French accented é', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createFrFRTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-e-acute').click();

      await ctx.getByID('text-area').within(500).shouldBe('é');
    });

    test('type "café" with accent', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createFrFRTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-c').click();
      await ctx.getByID('key-a').click();
      await ctx.getByID('key-f').click();
      await ctx.getByID('key-e-acute').click();

      await ctx.getByID('text-area').within(500).shouldBe('café');
    });

    test('screenshot: Bonjour', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createFrFRTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-b').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-n').click();
      await ctx.getByID('key-j').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-u').click();
      await ctx.getByID('key-r').click();

      await ctx.getByID('text-area').within(500).shouldBe('Bonjour');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-fr-fr.png');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SPANISH (QWERTY with ñ)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Spanish (es-ES)', () => {
    test('type "hola"', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEsESTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-h').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-a').click();

      await ctx.getByID('text-area').within(500).shouldBe('hola');
    });

    test('ñ character (Spanish specific)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEsESTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-ñ').click();

      await ctx.getByID('text-area').within(500).shouldBe('ñ');
    });

    test('¿ and ¡ (Spanish punctuation)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEsESTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-quest-inv').click();
      await ctx.getByID('key-excl-inv').click();

      await ctx.getByID('text-area').within(500).shouldBe('¿¡');
    });

    test('screenshot: Hola España', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEsESTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Hola
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-a').click();
      await ctx.getByID('key-space').click();
      // España
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-s').click();
      await ctx.getByID('key-p').click();
      await ctx.getByID('key-a').click();
      await ctx.getByID('key-ñ').click();
      await ctx.getByID('key-a').click();

      await ctx.getByID('text-area').within(500).shouldBe('Hola España');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-es-es.png');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGLISH DVORAK
  // ═══════════════════════════════════════════════════════════════════════════
  describe('English Dvorak (en-dvorak)', () => {
    test('type "hello" using Dvorak layout', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnDvorakTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // In Dvorak: h=d row2, e=row2, l=row1, l=row1, o=row2
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-l').click();
      await ctx.getByID('key-o').click();

      await ctx.getByID('text-area').within(500).shouldBe('hello');
    });

    test('type "aoeui" (Dvorak home row vowels)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnDvorakTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-a').click();
      await ctx.getByID('key-o').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-u').click();
      await ctx.getByID('key-i').click();

      await ctx.getByID('text-area').within(500).shouldBe('aoeui');
    });

    test('screenshot: The quick', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 400 }, (win) => {
          win.setContent(() => createEnDvorakTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // The
      await ctx.getByID('key-shift').click();
      await ctx.getByID('key-t').click();
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-e').click();
      await ctx.getByID('key-space').click();
      // quick
      await ctx.getByID('key-q').click();
      await ctx.getByID('key-u').click();
      await ctx.getByID('key-i').click();
      await ctx.getByID('key-c').click();
      await ctx.getByID('key-k').click();

      await ctx.getByID('text-area').within(500).shouldBe('The quick');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-en-dvorak.png');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FN LAYER (Function keys, cursor keys, Ctrl)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Fn Layer', () => {
    test('F1 key produces [F1]', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-f1').click();

      await ctx.getByID('text-area').within(500).shouldBe('[F1]');
    });

    test('F5 and F12 keys', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-f5').click();
      await ctx.getByID('key-f12').click();

      await ctx.getByID('text-area').within(500).shouldBe('[F5][F12]');
    });

    test('cursor keys (inverted T)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-up').click();
      await ctx.getByID('key-left').click();
      await ctx.getByID('key-down').click();
      await ctx.getByID('key-right').click();

      await ctx.getByID('text-area').within(500).shouldBe('[ArrowUp][ArrowLeft][ArrowDown][ArrowRight]');
    });

    test('Ctrl+C produces control character', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Press Ctrl then C
      await ctx.getByID('key-ctrl').click();
      await ctx.getByID('key-c').click();

      // Ctrl+C is ASCII 3 (ETX)
      await ctx.getByID('text-area').within(500).shouldBe('\x03');
    });

    test('navigation keys: Home, End', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-home').click();
      await ctx.getByID('key-end').click();

      await ctx.getByID('text-area').within(500).shouldBe('[Home][End]');
    });

    test('Escape and Tab', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-esc').click();
      await ctx.getByID('key-tab').click();

      // Tab shows as → in test harness, Escape as [Escape]
      await ctx.getByID('text-area').within(500).shouldBe('[Escape]→');
    });

    test('Ctrl+ArrowRight (word navigation)', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      await ctx.getByID('key-ctrl').click();
      await ctx.getByID('key-right').click();

      await ctx.getByID('text-area').within(500).shouldBe('[Ctrl+ArrowRight]');
    });

    test('screenshot: Fn layer with cursor keys', async () => {
      const testApp = await tsyneTest.createApp((app) => {
        app.window({ title: 'Test', width: 400, height: 600 }, (win) => {
          win.setContent(() => createEnUSTestHarness(app));
          win.show();
        });
      });
      ctx = tsyneTest.getContext();
      await testApp.run();

      // Type some text, then navigate
      await ctx.getByID('key-h').click();
      await ctx.getByID('key-i').click();
      await ctx.getByID('key-space').click();
      await ctx.getByID('key-f1').click();
      await ctx.getByID('key-up').click();

      await ctx.getByID('text-area').within(500).shouldBe('hi [F1][ArrowUp]');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-fn-layer.png');
      }
    });
  });
});
