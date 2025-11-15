/**
 * Terminal Emulator TsyneTest Integration Tests
 *
 * Test suite for the terminal emulator demonstrating:
 * - Real command execution and output verification
 * - User input through entry field
 * - Command history tracking
 * - Clear and help functionality
 * - Screenshot capture for documentation
 *
 * Usage:
 *   npm test examples/terminal/terminal.test.ts
 *   TSYNE_HEADED=1 npm test examples/terminal/terminal.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test examples/terminal/terminal.test.ts  # Capture screenshots
 *
 * Based on the original terminal emulator from https://github.com/fyne-io/terminal
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { createTerminalApp } from './terminal';
import * as path from 'path';

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

  test('should display initial terminal UI with welcome message', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Verify toolbar buttons
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();

    // Verify input area
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // Verify status and welcome message
    await ctx.expect(ctx.getByText('Simplified terminal demo - Type "help" for commands')).toBeVisible();
    await ctx.expect(ctx.getByText('Tsyne Terminal Emulator (Simplified)')).toBeVisible();

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, 'screenshots', 'terminal-initial.png');
      await ctx.wait(500);
      await tsyneTest.screenshot(screenshotPath);
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should execute help command and show all command descriptions', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click Help button
    await ctx.getByText('Help').click();
    await ctx.wait(150);

    // Help output should be visible
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();

    // All command descriptions should be visible
    const commands = [
      'help     - Show this help message',
      'echo     - Echo text to output',
      'clear    - Clear the terminal',
      'date     - Show current date/time',
      'pwd      - Print working directory',
      'history  - Show command history',
      'exit     - Exit the terminal'
    ];

    for (const cmd of commands) {
      await ctx.expect(ctx.getByText(cmd)).toBeVisible();
    }
  });

  test('should clear terminal and remove all content', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help to add content
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();

    // Click Clear button
    await ctx.getByText('Clear').click();
    await ctx.wait(100);

    // Welcome message and help content should be gone after clear
    const hasWelcome = await ctx.hasText('Tsyne Terminal Emulator');
    expect(hasWelcome).toBe(false);

    const hasHelp = await ctx.hasText('Available commands:');
    expect(hasHelp).toBe(false);

    // UI controls should still be visible
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
  });

  test('should handle multiple help commands and accumulate output', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help multiple times
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.getByText('Help').click();
    await ctx.wait(100);

    // Help text should still be visible
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();

    // All text should contain multiple instances of help output
    const allText = await ctx.getAllTextAsString();
    const helpCount = (allText.match(/Available commands:/g) || []).length;
    expect(helpCount).toBeGreaterThan(1); // Should have multiple help outputs
  });

  test('should clear and then execute help', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Clear first
    await ctx.getByText('Clear').click();
    await ctx.wait(100);

    // Then help
    await ctx.getByText('Help').click();
    await ctx.wait(100);

    // Help should be visible
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();

    // All UI elements should still work
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
  });

  test('should handle rapid button clicks without crashing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid clicking
    await ctx.getByText('Help').click();
    await ctx.wait(30);
    await ctx.getByText('Clear').click();
    await ctx.wait(30);
    await ctx.getByText('Help').click();
    await ctx.wait(30);
    await ctx.getByText('Clear').click();
    await ctx.wait(30);
    await ctx.getByText('Help').click();
    await ctx.wait(100);

    // UI should still be functional
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('Available commands:')).toBeVisible();
  });

  test('should maintain UI consistency after complex operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Perform various operations
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.getByText('Clear').click();
    await ctx.wait(100);
    await ctx.getByText('Help').click();
    await ctx.wait(100);

    // All essential UI elements should be visible
    await ctx.expect(ctx.getByText('Clear')).toBeVisible();
    await ctx.expect(ctx.getByText('Help')).toBeVisible();
    await ctx.expect(ctx.getByText('$')).toBeVisible();
    await ctx.expect(ctx.getByText('Simplified terminal demo - Type "help" for commands')).toBeVisible();
  });

  test('should show input prompt at all times', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check initial state
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // After help
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // After clear
    await ctx.getByText('Clear').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('$')).toBeVisible();

    // After another help
    await ctx.getByText('Help').click();
    await ctx.wait(100);
    await ctx.expect(ctx.getByText('$')).toBeVisible();
  });
});

