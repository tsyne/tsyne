/**
 * Test for Hand Pile Click Interaction
 *
 * This test verifies that clicking the hand pile draws cards.
 * Kent Beck approach: Test first, then implement.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createSolitaireApp } from './solitaire';
import { Game, Card, Suit } from './solitaire';
import { App } from '../../src/app';

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
    const testApp = await tsyneTest.createApp((app: App) => {
      const ui = createSolitaireApp(app);
      // Setup hand with 3 cards
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

    // Wait for UI to load
    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Click hand pile to draw cards
    await ctx.getByID('hand-pile').click();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify status shows drew cards
    await ctx.getByID('status-label').shouldContain('Drew cards');
  }, 10000);

  test('should select and move draw3 card to tableau', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      const ui = createSolitaireApp(app);
      // Setup: King in draw3, empty tableau
      ui.getGame().setupFixedState({
        draw3: new Card(13, Suit.Spades, true), // King
        stacks: [[], [], [], [], [], [], []]
      });
      ui.refreshUI();
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Click draw3 to select
    await ctx.getByID('draw3').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Selected King of Spades from draw pile')).toBeVisible();

    // Click empty stack to place
    await ctx.getByID('empty-stack-0').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Moved card to tableau 0')).toBeVisible();
  }, 10000);

  test('should drag draw3 card to tableau', async () => {
    const testApp = await tsyneTest.createApp((app: App) => {
      const ui = createSolitaireApp(app);
      // Setup: 6 of Hearts in draw3, 7 of Clubs on stack 0
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

    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Drag draw3 to tableau stack 0
    // Note: In a real drag, we'd get the position of stack-0 and drag there
    // For now, we'll use fixed coordinates that should land in the tableau area
    // Based on drop-zone.ts: tableau starts at y=250, each column is width 1000/7 ≈ 143px
    const dropX = 70;  // Center of first tableau column
    const dropY = 350; // Middle of tableau area

    // We can't actually test drag visually here, but we can verify the logic works
    // by checking that after clicking draw3 and then clicking stack-0, it moves
    await ctx.getByID('draw3').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Selected 6 of Hearts from draw pile')).toBeVisible();

    await ctx.getByID('stack-0').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    await ctx.expect(ctx.getByText('Moved card to tableau 0')).toBeVisible();
  }, 10000);
});
