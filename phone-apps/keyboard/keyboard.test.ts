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

// Create locale-specific test harness factories (return void for setContent compatibility)
const createEnUSTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEnUS); };
const createEnGBTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEnGB); };
const createFrFRTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildFrFR); };
const createEsESTestHarness = (app: import('../../core/src/app').App): void => { createTestHarness(app, buildEsES); };

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
});
