import { TsyneTest, TestContext } from 'tsyne';
import { buildSnowflakeApp } from './index';
import type { App } from 'tsyne';
import type { Window } from 'tsyne';

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
    const title = await ctx.getById('snowflakeTitle').getText();
    expect(title).toContain('Snowflake');
  }, 30000);

  test('should show snowflake count', async () => {
    await ctx.getById('snowflakeCount').within(500).shouldExist();
  }, 30000);

  test('should have animation toggle', async () => {
    await ctx.getById('snowflakeAnimToggle').within(500).shouldExist();
  }, 30000);

  test('should have controls', async () => {
    await ctx.getById('snowflakeDensityLabel').within(500).shouldExist();
    await ctx.getById('snowflakeSpeedLabel').within(500).shouldExist();
  }, 30000);
});
