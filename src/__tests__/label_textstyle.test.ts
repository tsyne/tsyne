import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Default');
        //TODO: merge arbitration to query
        //app.label('Bold', undefined, undefined, 'word', { bold: true });
        //app.label('Italic', undefined, undefined, 'word', { italic: true });
        //app.label('Monospace', undefined, undefined, 'word', { monospace: true });
        app.label('Bold', undefined, 'leading', 'word', { bold: true });
        app.label('Italic', undefined, 'leading', 'word', { italic: true });
        app.label('Monospace', undefined, 'leading', 'word', { monospace: true });
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
