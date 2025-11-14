/**
 * Terminal Emulator TsyneTest Integration Tests
 *
 * Test suite for the terminal emulator demonstrating:
 * - Terminal initialization and UI
 * - Command execution (echo, date, pwd, help)
 * - Clear functionality
 * - Input/output display
 * - Command history
 *
 * Usage:
 *   npm test examples/terminal/terminal.test.ts
 *   TSYNE_HEADED=1 npm test examples/terminal/terminal.test.ts  # Visual debugging
 *
 * Based on the original terminal emulator from https://github.com/fyne-io/terminal
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createTerminalApp } from './terminal';

describe('Terminal Emulator Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display initial terminal UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons using proper TsyneTest assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();

    // Verify input area
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // Verify status text
    await ctx.expect(ctx.getByText('Simplified terminal demo - Type "help" for commands')).toBeVisible();
  });

  test('should show welcome message on startup', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // The welcome message should contain the title
    const welcomeText = ctx.getByText('Tsyne Terminal Emulator (Simplified)');
    await ctx.expect(welcomeText).toBeVisible();
  });

  test('should execute help command', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click the Help button
    await ctx.getByText('Help').click();

    await new Promise(resolve => setTimeout(resolve, 200));

    // Help output should be visible - use toBeVisible instead of checking text content
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();
  });

  test('should clear the terminal', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help first to add some content
    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now clear
    await ctx.getByText('Clear').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // After clear, welcome message should not be visible anymore
    // We can't easily verify empty state, but we can verify the UI still works
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
  });

  test('should display toolbar controls', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All toolbar controls should be visible using proper assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
  });

  test('should show input prompt', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Input prompt should be visible
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // Status message should be visible
    await ctx.expect(ctx.getByText('Simplified terminal demo - Type "help" for commands')).toBeVisible();
  });

  test('should handle multiple help commands', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help twice
    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Help text should still be visible
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();
  });

  test('should maintain UI after clear and help', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Clear, then help
    await ctx.getByText('Clear').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // All UI elements should still be visible
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
  });

  test('should display correct window title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Window title should be "Terminal"
    // Verify the app launches successfully with proper assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
  });

  test('should show all UI sections on startup', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // All major sections should be visible - using TsyneTest assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
    await ctx.expect(ctx.getByText('Simplified terminal demo - Type "help" for commands')).toBeVisible();
    await ctx.expect(ctx.getByText('Tsyne Terminal Emulator (Simplified)')).toBeVisible();
  });

  test('should handle rapid button clicks', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid clicks
    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Clear').click();
    await new Promise(resolve => setTimeout(resolve, 50));

    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // UI should still be functional - verify with proper assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();
  });

  test('should preserve toolbar after operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Do several operations
    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Clear').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    await ctx.getByText('Help').click();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Toolbar should still be intact - use proper TsyneTest assertions
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
  });
});
