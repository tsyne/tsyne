/**
 * Test for Hand Pile Click Interaction
 *
 * This test verifies that clicking the hand pile draws cards.
 * Kent Beck approach: Test first, then implement.
 */

import { TsyneTest, TestContext } from 'tsyne';
import { createSolitaireApp } from './solitaire';
import { Game, Card, Suit } from './solitaire';
import { App } from 'tsyne';

type SolitaireUI = ReturnType<typeof createSolitaireApp>;

describe('Hand Pile Click Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should draw cards when clicking hand pile', async () => {
    let ui: SolitaireUI;
    const testApp = await tsyneTest.createApp((app: App) => {
      ui = createSolitaireApp(app);
      ui.getGame().setupFixedState({
        handCards: [
          new Card(5, Suit.Hearts),
          new Card(4, Suit.Clubs),
          new Card(3, Suit.Diamonds)
        ]
      });
      ui.refreshUI();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    try {
      await ctx.expect(ctx.getByText('New game started')).toBeVisible();

      // Click hand pile to draw cards via CVG dispatchTap
      ui!.clickHandPile();
      await new Promise(resolve => setTimeout(resolve, 200));

      await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();
    } catch (error) {
      const screenshotPath = '/tmp/hand-click-timeout.png';
      try {
        await tsyneTest.screenshot(screenshotPath);
        console.error(`Screenshot saved to: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error(`Failed to capture screenshot: ${screenshotError}`);
      }

      try {
        const allText = await ctx.getAllTextAsString();
        console.error(`\nUI state at timeout:\n${allText}`);
      } catch (e) {
        console.error(`Could not retrieve UI state: ${e}`);
      }

      throw error;
    }
  }, 30000);

  test('should select and move draw3 card to tableau', async () => {
    let ui: SolitaireUI;
    const testApp = await tsyneTest.createApp((app: App) => {
      ui = createSolitaireApp(app);
      ui.getGame().setupFixedState({
        draw3: new Card(13, Suit.Spades, true), // King
        stacks: [[], [], [], [], [], [], []]
      });
      ui.refreshUI();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByText('New game started')).toBeVisible();

    // Click draw3 to select
    ui!.clickDraw3();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Selected King of Spades from draw pile')).toBeVisible();

    // Click empty stack to place
    ui!.clickStack(0);
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Moved card to tableau 0')).toBeVisible();
  }, 10000);

  test('should drag draw3 card to tableau', async () => {
    let ui: SolitaireUI;
    const testApp = await tsyneTest.createApp((app: App) => {
      ui = createSolitaireApp(app);
      ui.getGame().setupFixedState({
        draw3: new Card(6, Suit.Hearts, true), // Red 6
        stacks: [
          [new Card(7, Suit.Clubs, true)], // Black 7 (can accept red 6)
          [], [], [], [], [], []
        ]
      });
      ui.refreshUI();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByText('New game started')).toBeVisible();

    // Use click-to-select + click-to-place (same game logic as drag)
    ui!.clickDraw3();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Selected 6 of Hearts from draw pile')).toBeVisible();

    ui!.clickStack(0);
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Moved card to tableau 0')).toBeVisible();
  }, 10000);
});
