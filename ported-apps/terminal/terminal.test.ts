/**
 * Terminal Emulator TsyneTest Integration Tests
 *
 * Comprehensive test suite for the full-featured terminal emulator covering:
 * - ANSI escape sequence parsing
 * - Terminal buffer operations
 * - Color handling (8/16/256 colors)
 * - Cursor movement and positioning
 * - Scrolling and scroll regions
 * - Text selection
 * - Keyboard input handling
 * - UI functionality
 *
 * Based on the original fyne-io/terminal test patterns
 *
 * Usage:
 *   npm test ported-apps/terminal/terminal.test.ts
 *   TSYNE_HEADED=1 npm test ported-apps/terminal/terminal.test.ts  # Visual debugging
 *   TAKE_SCREENSHOTS=1 npm test ported-apps/terminal/terminal.test.ts  # Capture screenshots
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { Terminal, TerminalUI, createTerminalApp } from './terminal';
import * as path from 'path';

// ============================================================================
// Unit Tests - Terminal Core (no UI)
// ============================================================================

describe('Terminal Core Unit Tests', () => {
  describe('Terminal Buffer', () => {
    test('should initialize with correct dimensions', () => {
      const term = new Terminal(80, 24);
      const config = term.getConfig();
      expect(config.cols).toBe(80);
      expect(config.rows).toBe(24);
    });

    test('should write characters at cursor position', () => {
      const term = new Terminal(80, 24);
      term.write('Hello');
      const text = term.getText();
      expect(text.startsWith('Hello')).toBe(true);
      expect(term.getCursorCol()).toBe(5);
    });

    test('should handle newlines correctly', () => {
      const term = new Terminal(80, 24);
      term.write('Line1\nLine2');
      expect(term.getCursorRow()).toBe(1);
      const text = term.getText();
      expect(text).toContain('Line1');
      expect(text).toContain('Line2');
    });

    test('should handle carriage return', () => {
      const term = new Terminal(80, 24);
      term.write('Hello\rWorld');
      const text = term.getText();
      // World should overwrite Hello starting from column 0
      expect(text.startsWith('World')).toBe(true);
    });

    test('should wrap lines when auto-wrap is enabled', () => {
      const term = new Terminal(10, 24); // Narrow terminal
      term.write('1234567890ABCDE');
      expect(term.getCursorRow()).toBe(1);
      expect(term.getCursorCol()).toBe(5);
    });
  });

  describe('ANSI Escape Sequences - Cursor Movement', () => {
    test('should handle CUU (cursor up)', () => {
      const term = new Terminal(80, 24);
      term.write('\n\n\n'); // Move cursor down 3 lines
      expect(term.getCursorRow()).toBe(3);
      term.write('\x1b[2A'); // Move up 2
      expect(term.getCursorRow()).toBe(1);
    });

    test('should handle CUD (cursor down)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[3B'); // Move down 3
      expect(term.getCursorRow()).toBe(3);
    });

    test('should handle CUF (cursor forward)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[5C'); // Move right 5
      expect(term.getCursorCol()).toBe(5);
    });

    test('should handle CUB (cursor back)', () => {
      const term = new Terminal(80, 24);
      term.write('Hello');
      term.write('\x1b[3D'); // Move left 3
      expect(term.getCursorCol()).toBe(2);
    });

    test('should handle CUP (cursor position)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[10;20H'); // Row 10, Col 20
      expect(term.getCursorRow()).toBe(9); // 0-indexed
      expect(term.getCursorCol()).toBe(19);
    });

    test('should handle CHA (cursor horizontal absolute)', () => {
      const term = new Terminal(80, 24);
      term.write('Hello');
      term.write('\x1b[15G'); // Column 15
      expect(term.getCursorCol()).toBe(14); // 0-indexed
    });

    test('should handle VPA (vertical position absolute)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[5d'); // Row 5
      expect(term.getCursorRow()).toBe(4); // 0-indexed
    });

    test('should handle cursor save and restore', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[5;10H'); // Move to 5,10
      term.write('\x1b[s'); // Save
      term.write('\x1b[20;30H'); // Move somewhere else
      term.write('\x1b[u'); // Restore
      expect(term.getCursorRow()).toBe(4);
      expect(term.getCursorCol()).toBe(9);
    });
  });

  describe('ANSI Escape Sequences - Erase Operations', () => {
    test('should handle ED 0 (erase below)', () => {
      const term = new Terminal(80, 24);
      term.write('Line 1\nLine 2\nLine 3');
      term.write('\x1b[2;1H'); // Go to line 2
      term.write('\x1b[0J'); // Erase below
      const text = term.getText();
      expect(text).toContain('Line 1');
    });

    test('should handle ED 2 (erase all)', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');
      term.write('\x1b[2J'); // Erase all
      const text = term.getText().trim();
      expect(text).toBe('');
    });

    test('should handle EL 0 (erase to end of line)', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');
      term.write('\x1b[1;6H'); // Position after "Hello"
      term.write('\x1b[0K'); // Erase to end
      const text = term.getText();
      expect(text.startsWith('Hello')).toBe(true);
      expect(text).not.toContain('World');
    });

    test('should handle EL 2 (erase entire line)', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World\n');
      term.write('\x1b[1;1H'); // Back to first line
      term.write('\x1b[2K'); // Erase entire line
      const text = term.getText().split('\n')[0].trim();
      expect(text).toBe('');
    });
  });

  describe('ANSI Escape Sequences - SGR (Colors/Attributes)', () => {
    test('should handle reset (SGR 0)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[1;31mRed Bold\x1b[0mNormal');
      // The text should be written; we're testing parsing doesn't crash
      const text = term.getText();
      expect(text).toContain('Red Bold');
      expect(text).toContain('Normal');
    });

    test('should handle foreground colors (30-37)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[31mRed\x1b[32mGreen\x1b[34mBlue\x1b[0m');
      const text = term.getText();
      expect(text).toContain('Red');
      expect(text).toContain('Green');
      expect(text).toContain('Blue');
    });

    test('should handle background colors (40-47)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[41mRedBG\x1b[42mGreenBG\x1b[44mBlueBG\x1b[0m');
      const text = term.getText();
      expect(text).toContain('RedBG');
    });

    test('should handle bright foreground colors (90-97)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[91mBrightRed\x1b[92mBrightGreen\x1b[0m');
      const text = term.getText();
      expect(text).toContain('BrightRed');
    });

    test('should handle 256 color mode (38;5;n)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[38;5;196mColor196\x1b[0m');
      const text = term.getText();
      expect(text).toContain('Color196');
    });

    test('should handle true color mode (38;2;r;g;b)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[38;2;255;128;64mTrueColor\x1b[0m');
      const text = term.getText();
      expect(text).toContain('TrueColor');
    });

    test('should handle text attributes (bold, italic, underline)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[1mBold\x1b[0m');
      term.write('\x1b[3mItalic\x1b[0m');
      term.write('\x1b[4mUnderline\x1b[0m');
      const text = term.getText();
      expect(text).toContain('Bold');
      expect(text).toContain('Italic');
      expect(text).toContain('Underline');
    });

    test('should handle inverse video (SGR 7)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[7mInverse\x1b[27mNormal');
      const text = term.getText();
      expect(text).toContain('Inverse');
    });
  });

  describe('ANSI Escape Sequences - Scrolling', () => {
    test('should handle scroll up (SU)', () => {
      const term = new Terminal(80, 10);
      // Fill screen with lines
      for (let i = 0; i < 10; i++) {
        term.write(`Line ${i}\n`);
      }
      term.write('\x1b[2S'); // Scroll up 2 lines
      // Content should have shifted
    });

    test('should handle scroll down (SD)', () => {
      const term = new Terminal(80, 10);
      term.write('Line 0\n');
      term.write('\x1b[2T'); // Scroll down 2 lines
      // Line 0 should have moved down
    });

    test('should handle scroll region (DECSTBM)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[5;20r'); // Set scroll region to lines 5-20
      // Cursor should be at origin
      expect(term.getCursorRow()).toBe(0);
      expect(term.getCursorCol()).toBe(0);
    });
  });

  describe('ANSI Escape Sequences - Modes', () => {
    test('should handle cursor visibility (DECTCEM)', () => {
      const term = new Terminal(80, 24);
      expect(term.isCursorVisible()).toBe(true);
      term.write('\x1b[?25l'); // Hide cursor
      expect(term.isCursorVisible()).toBe(false);
      term.write('\x1b[?25h'); // Show cursor
      expect(term.isCursorVisible()).toBe(true);
    });

    test('should handle alternate screen buffer', () => {
      const term = new Terminal(80, 24);
      term.write('Main buffer content');
      term.write('\x1b[?1049h'); // Switch to alternate
      term.write('Alt buffer content');
      const altText = term.getText();
      expect(altText).not.toContain('Main buffer content');
      term.write('\x1b[?1049l'); // Switch back
      const mainText = term.getText();
      expect(mainText).toContain('Main buffer content');
    });
  });

  describe('ANSI Escape Sequences - OSC (Operating System Commands)', () => {
    test('should handle title change (OSC 0)', () => {
      const term = new Terminal(80, 24);
      let capturedTitle = '';
      term.onTitleChange = (title) => {
        capturedTitle = title;
      };
      term.write('\x1b]0;New Title\x07');
      expect(capturedTitle).toBe('New Title');
    });

    test('should handle title change (OSC 2)', () => {
      const term = new Terminal(80, 24);
      let capturedTitle = '';
      term.onTitleChange = (title) => {
        capturedTitle = title;
      };
      term.write('\x1b]2;Another Title\x07');
      expect(capturedTitle).toBe('Another Title');
    });
  });

  describe('Text Selection', () => {
    test('should start and end selection', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');
      term.startSelection(0, 0);
      term.updateSelection(0, 4);
      const selected = term.endSelection();
      expect(selected).toBe('Hello');
    });

    test('should handle multi-line selection', () => {
      const term = new Terminal(80, 24);
      term.write('Line 1\nLine 2\nLine 3');
      term.startSelection(0, 0);
      term.updateSelection(1, 5);
      const selected = term.endSelection();
      expect(selected).toContain('Line 1');
      expect(selected).toContain('Line 2');
    });

    test('should handle reversed selection', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');
      term.startSelection(0, 10);
      term.updateSelection(0, 0);
      const selected = term.endSelection();
      expect(selected).toBe('Hello World');
    });

    test('should clear selection', () => {
      const term = new Terminal(80, 24);
      term.startSelection(0, 0);
      term.clearSelection();
      const selection = term.getSelection();
      expect(selection.active).toBe(false);
    });
  });

  describe('Keyboard Input', () => {
    test('should handle regular characters', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      // Mock shell by intercepting sendInput via runWithConnection
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      term.typeChar('a');
      expect(sentData).toBe('a');
    });

    test('should handle Enter key', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      term.typeKey('Enter');
      expect(sentData).toBe('\r');
    });

    test('should handle arrow keys', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      term.typeKey('ArrowUp');
      expect(sentData).toBe('\x1b[A');

      term.typeKey('ArrowDown');
      expect(sentData).toBe('\x1b[B');

      term.typeKey('ArrowRight');
      expect(sentData).toBe('\x1b[C');

      term.typeKey('ArrowLeft');
      expect(sentData).toBe('\x1b[D');
    });

    test('should handle Ctrl+C', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      term.typeKey('c', { ctrl: true });
      expect(sentData).toBe('\x03'); // ETX
    });

    test('should handle function keys', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      term.typeKey('F1');
      expect(sentData).toBe('\x1bOP');

      term.typeKey('F5');
      expect(sentData).toBe('\x1b[15~');
    });

    test('should handle bracketed paste mode', () => {
      const term = new Terminal(80, 24);
      let sentData = '';
      const mockWriter = {
        write: (data: string) => {
          sentData = data;
        },
      };
      (term as any)._writer = mockWriter;

      // Enable bracketed paste mode
      term.write('\x1b[?2004h');

      term.paste('pasted text');
      expect(sentData).toBe('\x1b[200~pasted text\x1b[201~');
    });
  });

  describe('Terminal Reset', () => {
    test('should reset terminal state', () => {
      const term = new Terminal(80, 24);
      term.write('Some content');
      term.write('\x1b[5;10H'); // Move cursor
      term.write('\x1b[?25l'); // Hide cursor

      term.reset();

      expect(term.getCursorRow()).toBe(0);
      expect(term.getCursorCol()).toBe(0);
      expect(term.isCursorVisible()).toBe(true);
      expect(term.getText().trim()).toBe('');
    });
  });

  describe('Terminal Resize', () => {
    test('should resize terminal', () => {
      const term = new Terminal(80, 24);
      term.resize(120, 40);
      const config = term.getConfig();
      expect(config.cols).toBe(120);
      expect(config.rows).toBe(40);
    });

    test('should preserve content when resizing larger', () => {
      const term = new Terminal(80, 24);
      term.write('Hello');
      term.resize(100, 30);
      const text = term.getText();
      expect(text).toContain('Hello');
    });
  });
});

// ============================================================================
// UI Tests - TsyneTest Integration
// ============================================================================

describe('Terminal UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    const headed = process.env.TSYNE_HEADED === '1';
    tsyneTest = new TsyneTest({ headed });
  });

  afterEach(async () => {
    await tsyneTest.cleanup();
  });

  test('should display terminal UI', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Wait for initial render
    await ctx.wait(500);

    // The terminal window should be displayed
    // Note: Without shell execution in test environment, we verify UI structure

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../../examples/screenshots', 'terminal-full.png');
      await tsyneTest.screenshot(screenshotPath);
      console.log(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should have menu items', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();
    await ctx.wait(300);

    // Menu items should be available (tested via menu structure)
    // The menu structure is built in buildMainMenu
  });
});

// ============================================================================
// ANSI Parser Edge Cases
// ============================================================================

describe('ANSI Parser Edge Cases', () => {
  test('should handle incomplete escape sequences', () => {
    const term = new Terminal(80, 24);
    // Incomplete sequence followed by complete one
    term.write('\x1bHello\x1b[1mBold\x1b[0m');
    const text = term.getText();
    expect(text).toContain('Hello');
    expect(text).toContain('Bold');
  });

  test('should handle multiple SGR parameters', () => {
    const term = new Terminal(80, 24);
    term.write('\x1b[1;4;31mBold Underline Red\x1b[0m');
    const text = term.getText();
    expect(text).toContain('Bold Underline Red');
  });

  test('should handle empty SGR (reset)', () => {
    const term = new Terminal(80, 24);
    term.write('\x1b[31mRed\x1b[mReset');
    const text = term.getText();
    expect(text).toContain('Red');
    expect(text).toContain('Reset');
  });

  test('should handle back-to-back escape sequences', () => {
    const term = new Terminal(80, 24);
    term.write('\x1b[1m\x1b[31m\x1b[4mStyled\x1b[0m');
    const text = term.getText();
    expect(text).toContain('Styled');
  });

  test('should handle escape in middle of text', () => {
    const term = new Terminal(80, 24);
    term.write('Start\x1b[31mMiddle\x1b[0mEnd');
    const text = term.getText();
    expect(text).toContain('Start');
    expect(text).toContain('Middle');
    expect(text).toContain('End');
  });

  test('should handle control characters', () => {
    const term = new Terminal(80, 24);
    term.write('Tab:\there');
    const text = term.getText();
    expect(text).toContain('Tab:');
    expect(text).toContain('here');
  });

  test('should handle bell character', () => {
    const term = new Terminal(80, 24);
    let bellCalled = false;
    term.onBell = () => {
      bellCalled = true;
    };
    term.write('\x07'); // BEL
    expect(bellCalled).toBe(true);
  });

  test('should handle backspace', () => {
    const term = new Terminal(80, 24);
    term.write('Hello\x08\x08\x08\x08\x08World');
    // Backspace moves cursor back, then "World" overwrites "Hello"
    const text = term.getText();
    expect(text).toContain('World');
  });
});

// ============================================================================
// Complex Terminal Scenarios
// ============================================================================

describe('Complex Terminal Scenarios', () => {
  test('should handle vim-like screen clearing', () => {
    const term = new Terminal(80, 24);
    // Vim typically: switches to alt buffer, clears, positions cursor
    term.write('\x1b[?1049h'); // Alt buffer
    term.write('\x1b[2J'); // Clear
    term.write('\x1b[H'); // Home
    term.write('~\n~\n~\n~\n~'); // Vim empty lines
    const text = term.getText();
    expect(text).toContain('~');
    term.write('\x1b[?1049l'); // Back to main
  });

  test('should handle progress bar output', () => {
    const term = new Terminal(80, 24);
    // Simulate progress bar with carriage returns
    term.write('Progress: [          ] 0%');
    term.write('\rProgress: [##        ] 20%');
    term.write('\rProgress: [####      ] 40%');
    term.write('\rProgress: [######    ] 60%');
    term.write('\rProgress: [########  ] 80%');
    term.write('\rProgress: [##########] 100%');
    const text = term.getText();
    expect(text).toContain('100%');
  });

  test('should handle colored ls output', () => {
    const term = new Terminal(80, 24);
    // Simulate colored ls output
    term.write('\x1b[0m\x1b[01;34mdir1\x1b[0m  ');
    term.write('\x1b[0m\x1b[01;34mdir2\x1b[0m  ');
    term.write('\x1b[0m\x1b[01;32mscript.sh\x1b[0m  ');
    term.write('\x1b[0mfile.txt\x1b[0m');
    const text = term.getText();
    expect(text).toContain('dir1');
    expect(text).toContain('dir2');
    expect(text).toContain('script.sh');
    expect(text).toContain('file.txt');
  });

  test('should handle ANSI art', () => {
    const term = new Terminal(80, 24);
    // Simple ANSI art box
    term.write('\x1b[31m+----+\x1b[0m\n');
    term.write('\x1b[31m|    |\x1b[0m\n');
    term.write('\x1b[31m+----+\x1b[0m');
    const text = term.getText();
    expect(text).toContain('+----+');
  });

  test('should handle full-screen application layout', () => {
    const term = new Terminal(40, 10);
    // Clear and position
    term.write('\x1b[2J\x1b[H');
    // Draw header
    term.write('\x1b[7m                                        \x1b[0m\n');
    // Draw content area
    for (let i = 0; i < 7; i++) {
      term.write('Content line ' + i + '\n');
    }
    // Draw footer at bottom
    term.write('\x1b[10;1H\x1b[7m                                        \x1b[0m');
    const text = term.getText();
    expect(text).toContain('Content line');
  });
});

// Shell Integration Tests
// Note: These tests use spawn() without a PTY, so behavior differs from a real terminal.
// They verify that shell commands execute and output is captured.
describe('Shell Integration Tests', () => {
  test('should run ls command and capture output', async () => {
    const { spawn } = require('child_process');

    const term = new Terminal(80, 24);

    // Track all data written to terminal
    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    // Change to terminal directory before running
    const originalCwd = process.cwd();

    try {
      process.chdir('/home/user/tsyne/ported-apps/terminal');

      // Run ls directly as a command to verify output capture works
      const ls = spawn('ls', [], {
        cwd: '/home/user/tsyne/ported-apps/terminal',
        env: { ...process.env, TERM: 'xterm-256color' },
      });

      ls.stdout.on('data', (data: Buffer) => {
        term.write(data.toString());
      });

      // Wait for command to complete
      await new Promise<void>((resolve) => {
        ls.on('close', () => resolve());
      });

      // Verify output contains expected files
      expect(capturedOutput).toContain('terminal.ts');
      expect(capturedOutput).toContain('terminal.test.ts');
      expect(capturedOutput).toContain('README.md');

      // Also verify it's in the terminal buffer
      const text = term.getText();
      expect(text).toContain('terminal.ts');
    } finally {
      process.chdir(originalCwd);
    }
  }, 10000);

  test('should run echo command and capture output', async () => {
    const { spawn } = require('child_process');

    const term = new Terminal(80, 24);

    // Track all data written to terminal
    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    const testString = 'TSYNE_TEST_' + Date.now();

    // Run echo command directly
    const echo = spawn('echo', [testString], {
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    echo.stdout.on('data', (data: Buffer) => {
      term.write(data.toString());
    });

    // Wait for command to complete
    await new Promise<void>((resolve) => {
      echo.on('close', () => resolve());
    });

    // Verify output contains our test string
    expect(capturedOutput).toContain(testString);

    // Also verify it's in the terminal buffer
    const text = term.getText();
    expect(text).toContain(testString);
  }, 10000);

  test('should run pwd command and capture path', async () => {
    const { spawn } = require('child_process');

    const term = new Terminal(80, 24);

    // Track all data written to terminal
    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    // Run pwd command directly
    const pwd = spawn('pwd', [], {
      cwd: '/home/user/tsyne/ported-apps/terminal',
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    pwd.stdout.on('data', (data: Buffer) => {
      term.write(data.toString());
    });

    // Wait for command to complete
    await new Promise<void>((resolve) => {
      pwd.on('close', () => resolve());
    });

    // Verify output contains expected path
    expect(capturedOutput).toContain('/home/user/tsyne/ported-apps/terminal');

    // Also verify path pattern is in terminal buffer
    const text = term.getText();
    expect(text).toMatch(/\/[a-zA-Z0-9_\-\/]+/);
  }, 10000);

  test('should handle ANSI colored output', async () => {
    const { spawn } = require('child_process');

    const term = new Terminal(80, 24);

    // Track all data written to terminal
    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    // Use printf to output ANSI colors (more reliable than ls --color)
    const printf = spawn('printf', [
      '\\033[31mRed\\033[0m \\033[32mGreen\\033[0m \\033[34mBlue\\033[0m\\n',
    ], {
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    printf.stdout.on('data', (data: Buffer) => {
      term.write(data.toString());
    });

    // Wait for command to complete
    await new Promise<void>((resolve) => {
      printf.on('close', () => resolve());
    });

    // Verify output contains ANSI escape sequences
    expect(capturedOutput).toMatch(/\x1b\[/);

    // Verify color text appears in terminal (after ANSI parsing strips codes)
    const text = term.getText();
    expect(text).toContain('Red');
    expect(text).toContain('Green');
    expect(text).toContain('Blue');
  }, 10000);

  test('should handle multi-line command output', async () => {
    const { spawn } = require('child_process');

    const term = new Terminal(80, 24);

    // Run a command that outputs multiple lines
    const seq = spawn('seq', ['1', '5'], {
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    seq.stdout.on('data', (data: Buffer) => {
      term.write(data.toString());
    });

    // Wait for command to complete
    await new Promise<void>((resolve) => {
      seq.on('close', () => resolve());
    });

    // Verify all numbers appear in terminal
    const text = term.getText();
    expect(text).toContain('1');
    expect(text).toContain('2');
    expect(text).toContain('3');
    expect(text).toContain('4');
    expect(text).toContain('5');
  }, 10000);
});

// PTY Integration Tests
// These tests verify proper PTY functionality with node-pty
describe('PTY Integration Tests', () => {
  test('should start PTY shell and receive prompt', async () => {
    const term = new Terminal(80, 24);

    let outputReceived = false;
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      outputReceived = true;
      originalWrite(data);
    };

    term.runLocalShell();

    // Wait for shell to start and send prompt
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(outputReceived).toBe(true);
    expect(term.isRunning()).toBe(true);

    // Clean up
    term.exit();
    expect(term.isRunning()).toBe(false);
  }, 10000);

  test('should run interactive command via PTY', async () => {
    const term = new Terminal(80, 24);

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Type echo command
    const testString = 'PTY_TEST_' + Date.now();
    term.sendInput(`echo ${testString}\n`);

    // Wait for command output
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify output contains our test string
    expect(capturedOutput).toContain(testString);

    // Clean up
    term.exit();
  }, 10000);

  test('should handle PTY resize (SIGWINCH)', async () => {
    const term = new Terminal(80, 24);

    term.runLocalShell();

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Resize the terminal
    term.resize(120, 40);

    // Query terminal size via stty
    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.sendInput('stty size\n');

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 500));

    // Should report the new size (40 rows, 120 cols)
    expect(capturedOutput).toContain('40');
    expect(capturedOutput).toContain('120');

    term.exit();
  }, 10000);

  test('should echo typed characters in PTY mode', async () => {
    const term = new Terminal(80, 24);

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Type characters one at a time (PTY should echo them)
    term.typeChar('h');
    term.typeChar('e');
    term.typeChar('l');
    term.typeChar('l');
    term.typeChar('o');

    // Wait for echo
    await new Promise(resolve => setTimeout(resolve, 200));

    // PTY should echo typed characters
    expect(capturedOutput).toContain('hello');

    term.exit();
  }, 10000);

  test('should handle Ctrl+C interrupt', async () => {
    const term = new Terminal(80, 24);

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 500));

    // Start a long-running command
    term.sendInput('sleep 100\n');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    // Send Ctrl+C
    term.typeKey('c', { ctrl: true });

    // Wait for interrupt
    await new Promise(resolve => setTimeout(resolve, 500));

    // Shell should still be running after interrupt
    expect(term.isRunning()).toBe(true);

    // Should be able to run another command
    term.sendInput('echo STILL_ALIVE\n');
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(capturedOutput).toContain('STILL_ALIVE');

    term.exit();
  }, 15000);

  test('should handle shell exit', async () => {
    const term = new Terminal(80, 24);

    let exitCode: number | null = null;
    term.onExit = (code) => {
      exitCode = code;
    };

    term.runLocalShell();

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(term.isRunning()).toBe(true);

    // Exit the shell
    term.sendInput('exit 42\n');

    // Wait for exit
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(term.isRunning()).toBe(false);
    expect(exitCode).toBe(42);
  }, 10000);
});

// DEC Special Graphics Charset Tests
describe('DEC Special Graphics Charset', () => {
  test('should render box drawing characters with DEC Special Graphics', () => {
    const term = new Terminal(80, 24);

    // ESC ( 0 - Set G0 to DEC Special Graphics
    // Then draw a box using the charset
    term.write('\x1b(0');  // Set G0 to DEC Special Graphics
    term.write('lqqqqk'); // Upper border: ┌────┐
    term.write('\n');
    term.write('x    x'); // Sides: │    │
    term.write('\n');
    term.write('mqqqqj'); // Lower border: └────┘
    term.write('\x1b(B');  // Reset G0 to ASCII

    const text = term.getText();
    // Should contain box drawing characters
    expect(text).toContain('┌');
    expect(text).toContain('─');
    expect(text).toContain('┐');
    expect(text).toContain('│');
    expect(text).toContain('└');
    expect(text).toContain('┘');
  });

  test('should render horizontal and vertical lines', () => {
    const term = new Terminal(80, 24);

    // ESC ( 0 - Set G0 to DEC Special Graphics
    term.write('\x1b(0');
    term.write('qqqqq'); // Horizontal line: ─────
    term.write('\n');
    term.write('x');     // Vertical line: │
    term.write('\x1b(B'); // Reset to ASCII

    const text = term.getText();
    expect(text).toContain('─');
    expect(text).toContain('│');
  });

  test('should render tee and cross characters', () => {
    const term = new Terminal(80, 24);

    term.write('\x1b(0');
    term.write('tuwvn'); // ├ ┤ ┬ ┴ ┼
    term.write('\x1b(B');

    const text = term.getText();
    expect(text).toContain('├');
    expect(text).toContain('┤');
    expect(text).toContain('┬');
    expect(text).toContain('┴');
    expect(text).toContain('┼');
  });

  test('should render special symbols', () => {
    const term = new Terminal(80, 24);

    term.write('\x1b(0');
    term.write('`afg'); // ◆ ▒ ° ±
    term.write('\x1b(B');

    const text = term.getText();
    expect(text).toContain('◆');
    expect(text).toContain('▒');
    expect(text).toContain('°');
    expect(text).toContain('±');
  });

  test('should handle SO/SI charset switching', () => {
    const term = new Terminal(80, 24);

    // Set G1 to DEC Special Graphics
    term.write('\x1b)0');
    // Write normal ASCII
    term.write('ABC');
    // SO (Shift Out) - switch to G1
    term.write('\x0e');
    // Now these should be box drawing
    term.write('lqk');
    // SI (Shift In) - back to G0 (ASCII)
    term.write('\x0f');
    // This should be normal ASCII again
    term.write('XYZ');

    const text = term.getText();
    expect(text).toContain('ABC');
    expect(text).toContain('┌');
    expect(text).toContain('─');
    expect(text).toContain('┐');
    expect(text).toContain('XYZ');
  });

  test('should leave non-mapped characters unchanged', () => {
    const term = new Terminal(80, 24);

    term.write('\x1b(0');
    // Characters outside the mapping range (0-9, A-Z) should be unchanged
    term.write('ABC123');
    term.write('\x1b(B');

    const text = term.getText();
    expect(text).toContain('ABC123');
  });

  test('should reset charset on terminal reset', () => {
    const term = new Terminal(80, 24);

    // Set G0 to DEC Special Graphics
    term.write('\x1b(0');
    term.write('lqk'); // Should produce ┌─┐

    // Reset terminal
    term.reset();

    // Now write same characters - should be ASCII
    term.write('lqk');

    const text = term.getText();
    // After reset, should be plain ASCII
    expect(text).toContain('lqk');
  });

  test('should render complete box with DEC Special Graphics', () => {
    const term = new Terminal(80, 24);

    // Draw a complete box
    term.write('\x1b(0'); // Enable DEC Special Graphics

    // Top border
    term.write('l');     // ┌
    term.write('qqqqqq'); // ──────
    term.write('k');     // ┐
    term.write('\r\n');

    // Middle rows
    for (let i = 0; i < 3; i++) {
      term.write('x');     // │
      term.write('      '); // spaces
      term.write('x');     // │
      term.write('\r\n');
    }

    // Bottom border
    term.write('m');     // └
    term.write('qqqqqq'); // ──────
    term.write('j');     // ┘

    term.write('\x1b(B'); // Reset to ASCII

    const text = term.getText();

    // Verify box corners
    expect(text).toContain('┌');
    expect(text).toContain('┐');
    expect(text).toContain('└');
    expect(text).toContain('┘');

    // Verify lines
    expect(text).toContain('─');
    expect(text).toContain('│');
  });

  test('should handle comparison operators', () => {
    const term = new Terminal(80, 24);

    term.write('\x1b(0');
    term.write('yz'); // ≤ ≥
    term.write('\x1b(B');

    const text = term.getText();
    expect(text).toContain('≤');
    expect(text).toContain('≥');
  });

  test('should handle pi and other math symbols', () => {
    const term = new Terminal(80, 24);

    term.write('\x1b(0');
    term.write('{|}'); // π ≠ £
    term.write('\x1b(B');

    const text = term.getText();
    expect(text).toContain('π');
    expect(text).toContain('≠');
    expect(text).toContain('£');
  });
});

// Touch Event Tests
describe('Touch Event Handling', () => {
  // Helper to create touch events
  const createTouchEvent = (
    type: 'touchDown' | 'touchMove' | 'touchUp' | 'touchCancel',
    x: number,
    y: number,
    id: number = 0,
    timestamp: number = Date.now()
  ) => ({
    type: type as any,
    x,
    y,
    id,
    timestamp,
  });

  test('should set cell dimensions', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(10, 20);

    // Cell at (50, 40) should map to col=5, row=2
    const cell = term.pixelToCell(50, 40);
    expect(cell.col).toBe(5);
    expect(cell.row).toBe(2);
  });

  test('should convert pixel to cell coordinates', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    // Test various positions
    expect(term.pixelToCell(0, 0)).toEqual({ row: 0, col: 0 });
    expect(term.pixelToCell(8, 16)).toEqual({ row: 1, col: 1 });
    expect(term.pixelToCell(79, 47)).toEqual({ row: 2, col: 9 });
  });

  test('should clamp coordinates to buffer bounds', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    // Negative coordinates should clamp to 0
    expect(term.pixelToCell(-10, -10)).toEqual({ row: 0, col: 0 });

    // Large coordinates should clamp to buffer bounds
    const large = term.pixelToCell(10000, 10000);
    expect(large.row).toBe(23);  // 24 rows, 0-indexed
    expect(large.col).toBe(79);  // 80 cols, 0-indexed
  });

  test('should handle tap gesture', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    let tapCalled = false;
    let tapRow = -1;
    let tapCol = -1;

    term.onTap = (row, col) => {
      tapCalled = true;
      tapRow = row;
      tapCol = col;
    };

    const now = Date.now();

    // Tap at pixel (40, 32) = cell (4, 5)
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, now));
    term.handleTouchEvent(createTouchEvent('touchUp', 40, 32, 0, now + 50));

    expect(tapCalled).toBe(true);
    expect(tapRow).toBe(2);  // 32 / 16 = 2
    expect(tapCol).toBe(5);  // 40 / 8 = 5
  });

  test('should handle long press gesture', async () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    let longPressCalled = false;
    let longPressRow = -1;
    let longPressCol = -1;

    term.onLongPress = (row, col) => {
      longPressCalled = true;
      longPressRow = row;
      longPressCol = col;
    };

    // Touch down and wait for long press
    term.handleTouchEvent(createTouchEvent('touchDown', 80, 48, 0, Date.now()));

    expect(longPressCalled).toBe(false);

    // Wait for long press timer (500ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(longPressCalled).toBe(true);
    expect(longPressRow).toBe(3);  // 48 / 16 = 3
    expect(longPressCol).toBe(10); // 80 / 8 = 10

    // Clean up
    term.handleTouchEvent(createTouchEvent('touchUp', 80, 48, 0, Date.now()));
  });

  test('should handle drag for text selection', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    // Write some text
    term.write('Hello World! This is a test line.');

    const now = Date.now();

    // Start drag at col 0
    term.handleTouchEvent(createTouchEvent('touchDown', 4, 8, 0, now));

    // Move to trigger drag (more than 10 pixels)
    term.handleTouchEvent(createTouchEvent('touchMove', 80, 8, 0, now + 50));

    // Check that touch state is dragging
    const touchState = term.getTouchState();
    expect(touchState.isDragging).toBe(true);

    // Check selection is active
    const selection = term.getSelection();
    expect(selection.active).toBe(true);

    // End drag
    term.handleTouchEvent(createTouchEvent('touchUp', 80, 8, 0, now + 100));

    // Get selected text
    // Note: Selection should be from col 0 to col 10
    const selectedText = term.endSelection();
    expect(selectedText.length).toBeGreaterThan(0);
  });

  test('should cancel long press when dragging', async () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    let longPressCalled = false;
    term.onLongPress = () => {
      longPressCalled = true;
    };

    const now = Date.now();

    // Touch down
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, now));

    // Drag before long press triggers
    term.handleTouchEvent(createTouchEvent('touchMove', 100, 32, 0, now + 100));

    // Wait for what would be long press time
    await new Promise(resolve => setTimeout(resolve, 600));

    // Long press should NOT have been called because we dragged
    expect(longPressCalled).toBe(false);

    // Verify we're in drag mode
    expect(term.getTouchState().isDragging).toBe(true);

    term.handleTouchEvent(createTouchEvent('touchUp', 100, 32, 0, now + 700));
  });

  test('should handle touch cancel', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    // Start a touch
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, Date.now()));
    expect(term.isTouchActive()).toBe(true);

    // Cancel the touch
    term.handleTouchEvent(createTouchEvent('touchCancel', 40, 32, 0, Date.now()));

    // Should no longer be active
    expect(term.isTouchActive()).toBe(false);
  });

  test('should ignore touch events from different touch IDs', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    let tapCalled = false;
    term.onTap = () => {
      tapCalled = true;
    };

    const now = Date.now();

    // Touch down with ID 0
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, now));

    // Touch up with different ID should be ignored
    term.handleTouchEvent(createTouchEvent('touchUp', 40, 32, 1, now + 50));

    // Tap should not have been called
    expect(tapCalled).toBe(false);

    // Touch up with correct ID should work
    term.handleTouchEvent(createTouchEvent('touchUp', 40, 32, 0, now + 100));
    expect(tapCalled).toBe(true);
  });

  test('should not trigger tap if touch duration exceeds threshold', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    let tapCalled = false;
    term.onTap = () => {
      tapCalled = true;
    };

    const now = Date.now();

    // Touch down
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, now));

    // Touch up after too long (> 200ms)
    term.handleTouchEvent(createTouchEvent('touchUp', 40, 32, 0, now + 300));

    // Tap should not have been called
    expect(tapCalled).toBe(false);
  });

  test('should track touch state correctly', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);

    // Initially no touch active
    expect(term.isTouchActive()).toBe(false);

    const now = Date.now();

    // Touch down
    term.handleTouchEvent(createTouchEvent('touchDown', 100, 50, 5, now));

    // Check touch state
    const state = term.getTouchState();
    expect(state.active).toBe(true);
    expect(state.startX).toBe(100);
    expect(state.startY).toBe(50);
    expect(state.touchId).toBe(5);
    expect(state.isDragging).toBe(false);
    expect(state.isLongPress).toBe(false);

    // Touch up
    term.handleTouchEvent(createTouchEvent('touchUp', 100, 50, 5, now + 50));

    // Touch should be inactive
    expect(term.isTouchActive()).toBe(false);
  });

  test('should clear selection on new touch down', () => {
    const term = new Terminal(80, 24);
    term.setCellDimensions(8, 16);
    term.write('Hello World');

    // Create a selection
    term.startSelection(0, 0);
    term.updateSelection(0, 5);
    expect(term.getSelection().active).toBe(true);

    // Touch down should clear selection
    term.handleTouchEvent(createTouchEvent('touchDown', 40, 32, 0, Date.now()));

    // Selection should be cleared
    expect(term.getSelection().active).toBe(false);
  });
});
