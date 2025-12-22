/**
 * Bridge custom ID support – stdio (green)
 */
import { TsyneTest, TestContext } from '../index-test';
import type { App } from '../app';

async function buildMinimalApp(a: App) {
  a.window({ title: 'ID Test', width: 300, height: 200 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.button('Hello').withId('testBtn');
      });
    });
  });
}

describe('Bridge custom ID support – stdio', () => {
  test('finds widget by custom ID', async () => {
    const t = new TsyneTest({ bridgeMode: 'stdio' });
    let ctx: TestContext;
    const app = await t.createApp((a) => { buildMinimalApp(a); });
    ctx = t.getContext();
    await app.run();

    await ctx.getById('testBtn').within(500).shouldExist();
    await t.cleanup();
  }, 10000);
});

