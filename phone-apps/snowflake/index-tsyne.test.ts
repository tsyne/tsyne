import { TsyneTest, TestContext } from '../../core/src/index-test';
import { buildSnowflakeApp } from './index';
import type { App } from '../../core/src/app';
import type { Window } from '../../core/src/window';

describe('Snowflake App UI', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false });
    testApp = await tsyneTest.createApp((app: App) => {
      app.window({ title: 'Snowflake', width: 600, height: 800 }, (win: Window) => {
        buildSnowflakeApp(app, win);
      });
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000);

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should render title', async () => {
    const title = await ctx.getByID('snowflakeTitle').getText();
    expect(title).toContain('Snowflake');
  }, 30000);

  test('should show snowflake count', async () => {
    await ctx.getByID('snowflakeCount').within(500).shouldExist();
  }, 30000);

  test('should have animation toggle', async () => {
    await ctx.getByID('snowflakeAnimToggle').within(500).shouldExist();
  }, 30000);

  test('should have controls', async () => {
    await ctx.getByID('snowflakeDensityLabel').within(500).shouldExist();
    await ctx.getByID('snowflakeSpeedLabel').within(500).shouldExist();
  }, 30000);
});
