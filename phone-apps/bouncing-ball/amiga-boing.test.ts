import { TsyneTest, TestContext } from '../../core/src/index-test';
import { buildAmigaBoingApp } from './amiga-boing';

describe('Amiga Boing Ball', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(() => {
    tsyneTest = new TsyneTest({ headed: process.env.TSYNE_HEADED === '1' });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  it('should render checkered ball', async () => {
    const testApp = await tsyneTest.createApp((a) => {
      a.window({ title: 'Boing Test', width: 500, height: 450 }, (win) => {
        win.setContent(() => {
          buildAmigaBoingApp(a);
        });
        win.show();
      });
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for render
    await ctx.wait(300);

    // Take screenshot
    await tsyneTest.screenshot('/tmp/amiga-boing.png');
    console.log('Screenshot saved to /tmp/amiga-boing.png');
  }, 15000);
});
