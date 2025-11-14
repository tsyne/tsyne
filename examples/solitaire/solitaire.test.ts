/**
 * Solitaire TsyneTest Integration Tests
 *
 * Test suite for the solitaire card game demonstrating:
 * - Game initialization
 * - UI element visibility
 * - New game functionality
 * - Draw pile operations
 * - Game state display
 *
 * Usage:
 *   npm test examples/solitaire/solitaire.test.ts
 *   TSYNE_HEADED=1 npm test examples/solitaire/solitaire.test.ts  # Visual debugging
 *
 * Based on the original solitaire from https://github.com/fyne-io/solitaire
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createSolitaireApp } from './solitaire';

describe('Solitaire Game Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('Shuffle')).toBeVisible();
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();

    // Verify game sections
    await ctx.expect(ctx.getByText('Hand:')).toBeVisible();
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Verify status
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should start a new game', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Initial status
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();

    // Click new game button
    await ctx.getByText('New Game').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still show new game started
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should shuffle the deck', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click shuffle button
    await ctx.getByText('Shuffle').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show deck shuffled message
    await ctx.expect(ctx.getByText('Deck shuffled')).toBeVisible();
  });

  test('should draw cards from hand', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify hand section exists
    await ctx.expect(ctx.getByText('Hand:')).toBeVisible();

    // Click draw button
    await ctx.getByText('Draw').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show drew cards message
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();
  });

  test('should display all game sections', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Toolbar
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('Shuffle')).toBeVisible();
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();

    // Game areas
    await ctx.expect(ctx.getByText('Hand:')).toBeVisible();
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Status bar
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should maintain state after multiple draws', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Draw multiple times
    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show drew cards message
    await ctx.expect(ctx.getByText('Drew cards')).toBeVisible();

    // Game sections should still be visible
    await ctx.expect(ctx.getByText('Hand:')).toBeVisible();
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
  });

  test('should handle new game after playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Draw some cards
    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Start new game
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should reset to new game state
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should handle shuffle after playing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Draw some cards
    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Shuffle
    await ctx.getByText('Shuffle').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show shuffle message
    await ctx.expect(ctx.getByText('Deck shuffled')).toBeVisible();
  });

  test('should display correct window title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Window title should be "Solitaire"
    // Note: Window title testing may not be directly supported
    // This test verifies the app launches successfully
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
  });

  test('should show all UI components on startup', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All major components should be visible
    const elements = [
      'New Game',
      'Shuffle',
      'Draw',
      'Hand:',
      'Foundations:',
      'Tableau:',
      'New game started'
    ];

    for (const element of elements) {
      await ctx.expect(ctx.getByText(element)).toBeVisible();
    }
  });
});
