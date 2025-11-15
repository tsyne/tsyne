import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Default');
        app.label('Off', 'leading', 'off');
        app.label('Break', 'leading', 'break');
        app.label('Word', 'leading', 'word');
      });
    });
    win.show();
  });
};

describe('Label Wrapping', () => {
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

  it('should create labels with different wrapping settings', async () => {
    await ctx.expect(ctx.getByText('Default')).toBeVisible();
    await ctx.expect(ctx.getByText('Off')).toBeVisible();
    await ctx.expect(ctx.getByText('Break')).toBeVisible();
    await ctx.expect(ctx.getByText('Word')).toBeVisible();
  });
});
