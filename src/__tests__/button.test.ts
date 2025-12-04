import { TsyneTest, TestContext } from '../index-test';
import { App } from '../app';

const createTestApp = (app: App) => {
  app.window({ title: 'Test' }, (win) => {
    win.setContent(() => {
      app.vbox(() => {
        app.button('Default');
        app.button('Low', 'low').onClick(() => {});
        app.button('Medium', 'medium').onClick(() => {});
        app.button('High', 'high').onClick(() => {});
        app.button('Warning', 'warning').onClick(() => {});
        app.button('Success', 'success').onClick(() => {});
      });
    });
    win.show();
  });
};

describe('Button', () => {
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

  it('should create buttons with different importance levels', async () => {
    await ctx.expect(ctx.getByText('Default')).toBeVisible();
    await ctx.expect(ctx.getByText('Low')).toBeVisible();
    await ctx.expect(ctx.getByText('Medium')).toBeVisible();
    await ctx.expect(ctx.getByText('High')).toBeVisible();
    await ctx.expect(ctx.getByText('Warning')).toBeVisible();
    await ctx.expect(ctx.getByText('Success')).toBeVisible();
  });
});
