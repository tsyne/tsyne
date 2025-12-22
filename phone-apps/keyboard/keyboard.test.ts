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

      await ctx.getById('key-h').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-o').click();

      await ctx.getById('text-area').within(500).shouldBe('hello');
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

      await ctx.getById('key-shift').click();
      await ctx.getById('key-h').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-o').click();

      await ctx.getById('text-area').within(500).shouldBe('Hello');
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

      await ctx.getById('key-h').click();
      await ctx.getById('key-i').click();
      await ctx.getById('key-x').click();
      await ctx.getById('key-back').click();

      await ctx.getById('text-area').within(500).shouldBe('hi');
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

      await ctx.getById('key-h').click();
      await ctx.getById('key-i').click();
      await ctx.getById('key-space').click();
      await ctx.getById('key-h').click();
      await ctx.getById('key-i').click();

      await ctx.getById('text-area').within(500).shouldBe('hi hi');
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
      await ctx.getById('key-shift').click();
      await ctx.getById('key-h').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-space').click();
      // World
      await ctx.getById('key-shift').click();
      await ctx.getById('key-w').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-r').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-d').click();
      await ctx.getById('key-dot').click();

      await ctx.getById('text-area').within(500).shouldBe('Hello World.');

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

      await ctx.getById('key-h').click();
      await ctx.getById('key-i').click();

      await ctx.getById('text-area').within(500).shouldBe('hi');
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

      await ctx.getById('key-pound').click();
      await ctx.getById('key-pound').click();
      await ctx.getById('key-pound').click();

      await ctx.getById('text-area').within(500).shouldBe('£££');
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

      await ctx.getById('key-a').click();
      await ctx.getById('key-z').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-r').click();
      await ctx.getById('key-t').click();
      await ctx.getById('key-y').click();

      await ctx.getById('text-area').within(500).shouldBe('azerty');
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

      await ctx.getById('key-e-acute').click();

      await ctx.getById('text-area').within(500).shouldBe('é');
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

      await ctx.getById('key-c').click();
      await ctx.getById('key-a').click();
      await ctx.getById('key-f').click();
      await ctx.getById('key-e-acute').click();

      await ctx.getById('text-area').within(500).shouldBe('café');
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

      await ctx.getById('key-shift').click();
      await ctx.getById('key-b').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-n').click();
      await ctx.getById('key-j').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-u').click();
      await ctx.getById('key-r').click();

      await ctx.getById('text-area').within(500).shouldBe('Bonjour');

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

      await ctx.getById('key-h').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-a').click();

      await ctx.getById('text-area').within(500).shouldBe('hola');
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

      await ctx.getById('key-ñ').click();

      await ctx.getById('text-area').within(500).shouldBe('ñ');
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

      await ctx.getById('key-quest-inv').click();
      await ctx.getById('key-excl-inv').click();

      await ctx.getById('text-area').within(500).shouldBe('¿¡');
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
      await ctx.getById('key-shift').click();
      await ctx.getById('key-h').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-a').click();
      await ctx.getById('key-space').click();
      // España
      await ctx.getById('key-shift').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-s').click();
      await ctx.getById('key-p').click();
      await ctx.getById('key-a').click();
      await ctx.getById('key-ñ').click();
      await ctx.getById('key-a').click();

      await ctx.getById('text-area').within(500).shouldBe('Hola España');

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
      await ctx.getById('key-h').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-l').click();
      await ctx.getById('key-o').click();

      await ctx.getById('text-area').within(500).shouldBe('hello');
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

      await ctx.getById('key-a').click();
      await ctx.getById('key-o').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-u').click();
      await ctx.getById('key-i').click();

      await ctx.getById('text-area').within(500).shouldBe('aoeui');
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
      await ctx.getById('key-shift').click();
      await ctx.getById('key-t').click();
      await ctx.getById('key-h').click();
      await ctx.getById('key-e').click();
      await ctx.getById('key-space').click();
      // quick
      await ctx.getById('key-q').click();
      await ctx.getById('key-u').click();
      await ctx.getById('key-i').click();
      await ctx.getById('key-c').click();
      await ctx.getById('key-k').click();

      await ctx.getById('text-area').within(500).shouldBe('The quick');

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

      await ctx.getById('key-f1').click();

      await ctx.getById('text-area').within(500).shouldBe('[F1]');
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

      await ctx.getById('key-f5').click();
      await ctx.getById('key-f12').click();

      await ctx.getById('text-area').within(500).shouldBe('[F5][F12]');
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

      await ctx.getById('key-up').click();
      await ctx.getById('key-left').click();
      await ctx.getById('key-down').click();
      await ctx.getById('key-right').click();

      await ctx.getById('text-area').within(500).shouldBe('[ArrowUp][ArrowLeft][ArrowDown][ArrowRight]');
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
      await ctx.getById('key-ctrl').click();
      await ctx.getById('key-c').click();

      // Ctrl+C is ASCII 3 (ETX)
      await ctx.getById('text-area').within(500).shouldBe('\x03');
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

      await ctx.getById('key-home').click();
      await ctx.getById('key-end').click();

      await ctx.getById('text-area').within(500).shouldBe('[Home][End]');
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

      await ctx.getById('key-esc').click();
      await ctx.getById('key-tab').click();

      // Tab shows as → in test harness, Escape as [Escape]
      await ctx.getById('text-area').within(500).shouldBe('[Escape]→');
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

      await ctx.getById('key-ctrl').click();
      await ctx.getById('key-right').click();

      await ctx.getById('text-area').within(500).shouldBe('[Ctrl+ArrowRight]');
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
      await ctx.getById('key-h').click();
      await ctx.getById('key-i').click();
      await ctx.getById('key-space').click();
      await ctx.getById('key-f1').click();
      await ctx.getById('key-up').click();

      await ctx.getById('text-area').within(500).shouldBe('hi [F1][ArrowUp]');

      if (process.env.TAKE_SCREENSHOTS === '1') {
        await tsyneTest.screenshot('/home/user/tsyne/phone-apps/keyboard/screenshot-fn-layer.png');
      }
    });
  });
});
