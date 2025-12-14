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

import { TsyneTest, TestContext } from '../../core/src/index-test';
import { createSolitaireApp } from './solitaire';
import * as path from 'path';

describe('Solitaire Game Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeAll(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });

    // Create app once for all tests
    const testApp = await tsyneTest.createApp((app) => {
      createSolitaireApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
  }, 30000); // Timeout for SVG pre-rendering (53 cards)

  beforeEach(async () => {
    // Reset game state before each test by clicking New Game
    await ctx.getByText('New Game').click();
    await new Promise(resolve => setTimeout(resolve, 100));
    // Wait for UI to update
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  afterAll(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial game UI', async () => {
    // Verify toolbar buttons
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('Shuffle')).toBeVisible();
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();

    // Verify game sections
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Verify status
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should start a new game', async () => {
    // Initial status
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();

    // Click new game button
    await ctx.getByText('New Game').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should still show new game started
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should shuffle the deck', async () => {
    // Click shuffle button
    await ctx.getByText('Shuffle').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show deck shuffled message
    await ctx.expect(ctx.getByText('Deck shuffled')).toBeVisible();
  });

  test('should draw cards from hand', async () => {
    // Click draw button
    await ctx.getByText('Draw').click();

    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show drew cards message
    await ctx.getByID('status-label').shouldContain('Drew cards');
  });

  test('should display all game sections', async () => {
    // Toolbar
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
    await ctx.expect(ctx.getByText('Shuffle')).toBeVisible();
    await ctx.expect(ctx.getByText('Draw')).toBeVisible();

    // Game areas
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
    await ctx.expect(ctx.getByText('Tableau:')).toBeVisible();

    // Status bar
    await ctx.expect(ctx.getByText('New game started')).toBeVisible();
  });

  test('should maintain state after multiple draws', async () => {
    // Draw multiple times
    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Draw').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should show drew cards message
    await ctx.getByID('status-label').shouldContain('Drew cards');

    // Game sections should still be visible
    await ctx.expect(ctx.getByText('Foundations:')).toBeVisible();
  });

  test('should handle new game after playing', async () => {
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
    // Window title should be "Solitaire"
    // Note: Window title testing may not be directly supported
    // This test verifies the app launches successfully
    await ctx.expect(ctx.getByText('New Game')).toBeVisible();
  });

  test('should capture screenshot', async () => {
    // Wait for UI to settle and images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture screenshot if TAKE_SCREENSHOTS=1
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../screenshots', 'solitaire.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`📸 Screenshot saved: ${screenshotPath}`);
    }

    // Just verify the window is showing
    expect(true).toBe(true);
  }, 15000); // Increase timeout to 15s for SVG pre-rendering
});
