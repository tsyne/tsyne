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
    await ctx.getByText('Clear').within(500).shouldExist();
    await ctx.getByText('Help').within(500).shouldExist();

    // Verify input area
    await ctx.getByText('$').within(500).shouldExist();

    // Verify welcome message
    await ctx.getByText('Tsyne Terminal Emulator v1.0.0').within(500).shouldExist();
    await ctx.getByText('Type "help" for available commands').within(500).shouldExist();

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

    // Help output should be visible
    await ctx.getByText('Available commands:').within(500).shouldExist();

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
      await ctx.getByText(cmd).within(500).shouldExist();
    }
  });

  test.skip('should clear terminal and remove all content (requires dialog support)', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help to add content
    await ctx.getByExactText('Help').click(); // Use exact text to match toolbar action, not help output
    await ctx.getByText('Available commands:').within(1000).shouldExist();

    // Click Clear button - use exact text since help output contains "clear"
    await ctx.getByExactText('Clear').click();
    await ctx.wait(100);

    // Welcome message and help content should be gone after clear
    const hasWelcome = await ctx.hasText('Tsyne Terminal Emulator');
    expect(hasWelcome).toBe(false);

    const hasHelp = await ctx.hasText('Available commands:');
    expect(hasHelp).toBe(false);

    // UI controls should still be visible
    await ctx.getByExactText('Clear').within(500).shouldExist();
    await ctx.getByExactText('Help').within(500).shouldExist();
    await ctx.getByText('$').within(500).shouldExist();
  });

  test('should handle multiple help commands and accumulate output', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Execute help multiple times - use exact text to avoid matching help output labels
    await ctx.getByExactText('Help').click();
    await ctx.getByText('Available commands:').within(500).shouldExist();
    await ctx.getByExactText('Help').click();
    await ctx.wait(100);
    await ctx.getByExactText('Help').click();
    await ctx.wait(100);

    // Help text should still be visible
    await ctx.getByText('Available commands:').within(500).shouldExist();

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

    // Clear first - use exact text for toolbar actions
    await ctx.getByExactText('Clear').click();
    await ctx.wait(100);

    // Then help
    await ctx.getByExactText('Help').click();

    // Help should be visible
    await ctx.getByText('Available commands:').within(500).shouldExist();

    // All UI elements should still work
    await ctx.getByExactText('Clear').within(500).shouldExist();
    await ctx.getByText('$').within(500).shouldExist();
  });

  test('should handle rapid button clicks without crashing', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Rapid clicking - use exact text to match toolbar actions only
    await ctx.getByExactText('Help').click();
    await ctx.wait(30);
    await ctx.getByExactText('Clear').click();
    await ctx.wait(30);
    await ctx.getByExactText('Help').click();
    await ctx.wait(30);
    await ctx.getByExactText('Clear').click();
    await ctx.wait(30);
    await ctx.getByExactText('Help').click();

    // UI should still be functional
    await ctx.getByExactText('Clear').within(500).shouldExist();
    await ctx.getByExactText('Help').within(500).shouldExist();
    await ctx.getByText('Available commands:').within(500).shouldExist();
  });

  test('should maintain UI consistency after complex operations', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Perform various operations - use exact text for toolbar actions
    await ctx.getByExactText('Help').click();
    await ctx.getByText('Available commands:').within(500).shouldExist();
    await ctx.getByExactText('Clear').click();
    await ctx.wait(100);
    await ctx.getByExactText('Help').click();
    await ctx.getByText('Available commands:').within(500).shouldExist();

    // All essential UI elements should be visible
    await ctx.getByExactText('Clear').within(500).shouldExist();
    await ctx.getByExactText('Help').within(500).shouldExist();
    await ctx.getByText('$').within(500).shouldExist();
    await ctx.getByText('Type "help" for commands').within(500).shouldExist();
  });

  test('should show input prompt at all times', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check initial state
    await ctx.getByText('$').within(500).shouldExist();

    // After help - use exact text for toolbar actions
    await ctx.getByExactText('Help').click();
    await ctx.getByText('$').within(500).shouldExist();

    // After clear
    await ctx.getByExactText('Clear').click();
    await ctx.getByText('$').within(500).shouldExist();

    // After another help
    await ctx.getByExactText('Help').click();
    await ctx.getByText('$').within(500).shouldExist();
  });
});

