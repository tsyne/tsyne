import { TsyneTest } from '../src/index-test';
import { buildElegantDemo, demoTabs } from './animation-elegant';

describe('Elegant Animations Demo', () => {
  let tsyneTest: TsyneTest;
  let ctx: any;
  let testApp: any;

  beforeAll(async () => {
    tsyneTest = new TsyneTest({ headed: false }); // headless for CI
    testApp = await tsyneTest.createApp(async (a: any) => {
      buildElegantDemo(a);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should display the main title', async () => {
    await ctx.getByID('title').within(500).shouldExist();
    await ctx.getByID('title').shouldBe('Elegant Animation API');
  });

  test('should have all tabs visible', async () => {
    const expectedTabs = ['Spring', 'Fluent', 'Parallel', 'Reactive', 'Timeline', 'Bezier', 'Bezier Path', 'API'];
    for (const tabTitle of expectedTabs) {
      await ctx.getByText(tabTitle).shouldExist();
    }
  });

  describe('Bezier Path Tab', () => {
    beforeEach(async () => {
      // Navigate to the Bezier Path tab using the tab select API
      // Index 6 is "Bezier Path" (0:Spring, 1:Fluent, 2:Parallel, 3:Reactive, 4:Timeline, 5:Bezier, 6:Bezier Path, 7:API)
      await demoTabs.select(6);
      await ctx.getByID('bezier-path-tab-header').within(500).shouldExist();
      await ctx.getByID('bezier-path-tab-header').shouldBe('Animation along a Bezier Path');
    });

    test('should animate on Linear path click', async () => {
      await ctx.getByID('bezier-linear-btn').within(500).shouldExist();
      await ctx.getByID('bezier-linear-btn').click();
      // Animation runs for 1500ms - just verify the click doesn't error
      await ctx.wait(100);
    });

    test('should animate on Quadratic path click', async () => {
      await ctx.getByID('bezier-quadratic-btn').within(500).shouldExist();
      await ctx.getByID('bezier-quadratic-btn').click();
      await ctx.wait(100);
    });

    test('should animate on Cubic path click', async () => {
      await ctx.getByID('bezier-cubic-btn').within(500).shouldExist();
      await ctx.getByID('bezier-cubic-btn').click();
      await ctx.wait(100);
    });

    test('should animate on Quartic path click', async () => {
      await ctx.getByID('bezier-quartic-btn').within(500).shouldExist();
      await ctx.getByID('bezier-quartic-btn').click();
      await ctx.wait(100);
    });
  });
});
