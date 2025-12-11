import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.label('Default');
        app.label('Leading', 'leading');
        app.label('Trailing', 'trailing');
        app.label('Center', 'center');
      });
    });
    win.show();
  });
};

describe('Label', () => {
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

  it('should create labels with different alignment settings', async () => {
    await ctx.expect(ctx.getByText('Default')).toBeVisible();
    await ctx.expect(ctx.getByText('Leading')).toBeVisible();
    await ctx.expect(ctx.getByText('Trailing')).toBeVisible();
    await ctx.expect(ctx.getByText('Center')).toBeVisible();
  });
});
