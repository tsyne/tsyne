import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Default');
        app.label('Bold', 'leading', 'word', { bold: true });
        app.label('Italic', 'leading', 'word', { italic: true });
        app.label('Monospace', 'leading', 'word', { monospace: true });
      });
    });
    win.show();
  });
};

describe('Label TextStyle', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    const testApp = await tsyneTest.createApp(createTestApp);
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterEach(() => {
    tsyneTest.cleanup();
  });

  it('should create labels with different text styles', async () => {
    await ctx.expect(ctx.getByText('Default')).toBeVisible();
    await ctx.expect(ctx.getByText('Bold')).toBeVisible();
    await ctx.expect(ctx.getByText('Italic')).toBeVisible();
    await ctx.expect(ctx.getByText('Monospace')).toBeVisible();
  });
});
