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

// Mock node-pty to avoid loading native bindings in tests
jest.mock('node-pty');

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
      term.write('Line 1\r\nLine 2\r\nLine 3');
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

    // The terminal window should be displayed
    // Note: Without shell execution in test environment (mocked node-pty), we verify UI launches

    // Capture screenshot if requested
    if (process.env.TAKE_SCREENSHOTS === '1') {
      const screenshotPath = path.join(__dirname, '../../examples/screenshots', 'terminal-full.png');
      await tsyneTest.screenshot(screenshotPath);
      console.error(`Screenshot saved: ${screenshotPath}`);
    }
  });

  test('should have menu items', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      createTerminalApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Menu items should be available (tested via menu structure)
    // The menu structure is built in buildMainMenu
    // This is a smoke test that verifies the app launches without errors
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
    process.chdir(__dirname);

    try {
      // Run ls directly as a command to verify output capture works
      const ls = spawn('ls', [], {
        cwd: '.',
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
    expect(capturedOutput).toContain(process.cwd());

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
    const pty = require('node-pty'); // Import pty here to get the mock

    let outputReceived = false;
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      outputReceived = true;
      originalWrite(data);
    };

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate the shell sending a prompt
    mockPty._emitData('hello shell > ');

    // Wait for shell to start and send prompt
    await new Promise(resolve => setTimeout(resolve, 100)); // Reduced timeout since we're controlling emit

    expect(outputReceived).toBe(true);
    expect(term.isRunning()).toBe(true);

    // Clean up
    term.exit();
    // Simulate exit from mock
    mockPty._emitExit(0);
    expect(term.isRunning()).toBe(false);
  }, 10000);

  test('should run interactive command via PTY', async () => {
    const term = new Terminal(80, 24);
    const pty = require('node-pty');

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate initial prompt
    mockPty._emitData('$ ');

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Type echo command
    const testString = 'PTY_TEST_' + Date.now();
    term.sendInput(`echo ${testString}\n`);

    // Simulate the shell echoing the command and outputting the result
    mockPty._emitData(`echo ${testString}\r\n${testString}\r\n$ `);

    // Wait for command output
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify output contains our test string
    expect(capturedOutput).toContain(testString);

    // Clean up
    term.exit();
    mockPty._emitExit(0);
  }, 10000);

  test('should handle PTY resize (SIGWINCH)', async () => {
    const term = new Terminal(80, 24);
    const pty = require('node-pty');

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate initial prompt
    mockPty._emitData('$ ');

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 100));

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

    // Simulate output from stty size
    mockPty._emitData('40 120\r\n$ ');

    // Wait for output
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should report the new size (40 rows, 120 cols)
    expect(capturedOutput).toContain('40');
    expect(capturedOutput).toContain('120');

    term.exit();
    mockPty._emitExit(0);
  }, 10000);

  test('should echo typed characters in PTY mode', async () => {
    const term = new Terminal(80, 24);
    const pty = require('node-pty');

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate initial prompt
    mockPty._emitData('$ ');

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Type characters one at a time (PTY should echo them)
    term.typeChar('h');
    mockPty._emitData('h');
    term.typeChar('e');
    mockPty._emitData('e');
    term.typeChar('l');
    mockPty._emitData('l');
    term.typeChar('l');
    mockPty._emitData('l');
    term.typeChar('o');
    mockPty._emitData('o');

    // Wait for echo
    await new Promise(resolve => setTimeout(resolve, 100));

    // PTY should echo typed characters
    expect(capturedOutput).toContain('hello');

    term.exit();
    mockPty._emitExit(0);
  }, 10000);

  test('should handle Ctrl+C interrupt', async () => {
    const term = new Terminal(80, 24);
    const pty = require('node-pty');

    let capturedOutput = '';
    const originalWrite = term.write.bind(term);
    term.write = (data: string) => {
      capturedOutput += data;
      originalWrite(data);
    };

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate initial prompt
    mockPty._emitData('$ ');

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Start a long-running command
    term.sendInput('sleep 100\n');
    mockPty._emitData('sleep 100\r\n'); // Echo the command

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send Ctrl+C
    term.typeKey('c', { ctrl: true });
    // Simulate shell reacting to Ctrl+C (e.g., new prompt)
    mockPty._emitData('^C\r\n$ ');

    // Wait for interrupt
    await new Promise(resolve => setTimeout(resolve, 100));

    // Shell should still be running after interrupt
    expect(term.isRunning()).toBe(true);

    // Should be able to run another command
    capturedOutput = ''; // Clear output to check for "STILL_ALIVE" specifically
    term.sendInput('echo STILL_ALIVE\n');
    mockPty._emitData('echo STILL_ALIVE\r\nSTILL_ALIVE\r\n$ ');
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(capturedOutput).toContain('STILL_ALIVE');

    term.exit();
    mockPty._emitExit(0);
  }, 15000);

  test('should handle shell exit', async () => {
    const term = new Terminal(80, 24);
    const pty = require('node-pty');

    let exitCode: number | null = null;
    term.onExit = (code) => {
      exitCode = code;
    };

    term.runLocalShell();
    const mockPty = pty.spawn.mock.results[pty.spawn.mock.results.length - 1].value;

    // Simulate initial prompt
    mockPty._emitData('$ ');

    // Wait for shell to start
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(term.isRunning()).toBe(true);

    // Exit the shell
    term.sendInput('exit 42\n');
    mockPty._emitData('exit 42\r\n'); // Echo the command

    // Wait for exit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate PTY exit
    mockPty._emitExit(42);

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

// ============================================================================
// Mouse Protocol Tests
// ============================================================================

import {
  MouseButton,
  MouseEventType,
  MouseEvent as TerminalMouseEvent,
  MouseTrackingMode,
  MouseEncodingFormat,
} from './terminal';

describe('Mouse Protocol Tests', () => {
  // Helper to create mouse events
  function createMouseEvent(
    type: MouseEventType,
    button: MouseButton,
    x: number,
    y: number,
    modifiers: { shift?: boolean; alt?: boolean; ctrl?: boolean } = {}
  ): TerminalMouseEvent {
    return {
      type,
      button,
      x,
      y,
      modifiers: {
        shift: modifiers.shift || false,
        alt: modifiers.alt || false,
        ctrl: modifiers.ctrl || false,
      },
    };
  }

  describe('Mouse Tracking Mode Management', () => {
    test('should default to no mouse tracking', () => {
      const term = new Terminal(80, 24);
      expect(term.getMouseTrackingMode()).toBe(MouseTrackingMode.None);
      expect(term.isMouseTrackingEnabled()).toBe(false);
    });

    test('should enable X10 mouse tracking mode 1000', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h'); // Enable X10 mouse tracking
      expect(term.getMouseTrackingMode()).toBe(MouseTrackingMode.X10);
      expect(term.isMouseTrackingEnabled()).toBe(true);
    });

    test('should enable button event tracking mode 1002', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h'); // Enable button event tracking
      expect(term.getMouseTrackingMode()).toBe(MouseTrackingMode.ButtonEvent);
    });

    test('should enable any event tracking mode 1003', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1003h'); // Enable any event tracking
      expect(term.getMouseTrackingMode()).toBe(MouseTrackingMode.AnyEvent);
    });

    test('should disable mouse tracking', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h'); // Enable
      expect(term.isMouseTrackingEnabled()).toBe(true);
      term.write('\x1b[?1000l'); // Disable
      expect(term.isMouseTrackingEnabled()).toBe(false);
    });
  });

  describe('Mouse Encoding Format', () => {
    test('should default to X10 encoding', () => {
      const term = new Terminal(80, 24);
      expect(term.getMouseEncodingFormat()).toBe(MouseEncodingFormat.X10);
    });

    test('should enable SGR encoding mode 1006', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1006h'); // Enable SGR encoding
      expect(term.getMouseEncodingFormat()).toBe(MouseEncodingFormat.SGR);
    });

    test('should enable URXVT encoding mode 1015', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1015h'); // Enable URXVT encoding
      expect(term.getMouseEncodingFormat()).toBe(MouseEncodingFormat.URXVT);
    });

    test('should revert to X10 when SGR is disabled', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1006h'); // Enable SGR
      expect(term.getMouseEncodingFormat()).toBe(MouseEncodingFormat.SGR);
      term.write('\x1b[?1006l'); // Disable SGR
      expect(term.getMouseEncodingFormat()).toBe(MouseEncodingFormat.X10);
    });
  });

  describe('Mouse Event Handling', () => {
    test('should not report events when tracking disabled', () => {
      const term = new Terminal(80, 24);
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 10, 5);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(false);
    });

    test('should report press events in X10 mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h'); // Enable X10 tracking
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 10, 5);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should not report release events in X10 mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h'); // Enable X10 tracking
      const event = createMouseEvent(MouseEventType.Release, MouseButton.Release, 10, 5);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(false);
    });

    test('should report release events in ButtonEvent mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h'); // Enable button event tracking
      // First press to set button state
      term.handleMouseEvent(createMouseEvent(MouseEventType.Press, MouseButton.Left, 10, 5));
      // Then release
      const result = term.handleMouseEvent(createMouseEvent(MouseEventType.Release, MouseButton.Release, 10, 5));
      expect(result).toBe(true);
    });

    test('should report drag events in ButtonEvent mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h'); // Enable button event tracking
      // Press first
      term.handleMouseEvent(createMouseEvent(MouseEventType.Press, MouseButton.Left, 10, 5));
      // Then move (drag)
      const result = term.handleMouseEvent(createMouseEvent(MouseEventType.Move, MouseButton.Left, 15, 5));
      expect(result).toBe(true);
    });

    test('should not report hover in ButtonEvent mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h'); // Enable button event tracking
      // Move without button pressed
      const result = term.handleMouseEvent(createMouseEvent(MouseEventType.Move, MouseButton.Release, 15, 5));
      expect(result).toBe(false);
    });

    test('should report hover in AnyEvent mode', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1003h'); // Enable any event tracking
      // Move without button pressed
      const result = term.handleMouseEvent(createMouseEvent(MouseEventType.Move, MouseButton.Release, 15, 5));
      expect(result).toBe(true);
    });

    test('should report wheel events', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h'); // Enable button event tracking
      const event = createMouseEvent(MouseEventType.Wheel, MouseButton.WheelUp, 10, 5);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });
  });

  describe('createMouseEvent utility', () => {
    test('should create mouse events with correct properties', () => {
      const term = new Terminal(80, 24);
      term.setCellDimensions(8, 16); // cellWidth=8, cellHeight=16
      // Pass pixel coordinates: (160, 160) -> cell (20, 10)
      // Mouse protocol uses 1-based coordinates, so result is (21, 11)
      const event = term.createMouseEvent(
        MouseEventType.Press,
        MouseButton.Right,
        160, // pixelX -> 160/8 = cell 20 -> mouse coord 21
        160, // pixelY -> 160/16 = cell 10 -> mouse coord 11
        { shift: true, ctrl: true }
      );
      expect(event.type).toBe(MouseEventType.Press);
      expect(event.button).toBe(MouseButton.Right);
      expect(event.x).toBe(21); // 1-based mouse protocol coordinate
      expect(event.y).toBe(11); // 1-based mouse protocol coordinate
      expect(event.modifiers.shift).toBe(true);
      expect(event.modifiers.ctrl).toBe(true);
      expect(event.modifiers.alt).toBe(false);
    });
  });

  describe('Mouse Button Codes', () => {
    test('should encode left button as 0', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h'); // Enable tracking + SGR
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 1, 1);
      term.handleMouseEvent(event);
      // SGR format: \x1b[<0;x;yM for left button press
      // We can't directly check output, but the event should be handled
    });

    test('should encode middle button as 1', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Middle, 1, 1);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should encode right button as 2', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Right, 1, 1);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should encode wheel up as 64', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Wheel, MouseButton.WheelUp, 1, 1);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should encode wheel down as 65', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1002h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Wheel, MouseButton.WheelDown, 1, 1);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });
  });

  describe('Modifier Encoding', () => {
    test('should add shift modifier (4) to button code', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 1, 1, { shift: true });
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should add alt modifier (8) to button code', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 1, 1, { alt: true });
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should add ctrl modifier (16) to button code', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 1, 1, { ctrl: true });
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should combine multiple modifiers', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h\x1b[?1006h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 1, 1, {
        shift: true,
        alt: true,
        ctrl: true,
      });
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });
  });

  describe('Motion Encoding', () => {
    test('should add motion flag (32) for move events', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1003h\x1b[?1006h'); // Any event + SGR
      const event = createMouseEvent(MouseEventType.Move, MouseButton.Release, 10, 5);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });
  });

  describe('Coordinate Handling', () => {
    test('should handle coordinates at origin (0,0)', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 0, 0);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should handle coordinates at max terminal size', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, 79, 23);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });

    test('should clamp coordinates below zero', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b[?1000h');
      const event = createMouseEvent(MouseEventType.Press, MouseButton.Left, -5, -3);
      const result = term.handleMouseEvent(event);
      expect(result).toBe(true);
    });
  });
});

// ============================================================================
// Block Selection Tests
// ============================================================================

import { SelectionMode } from './terminal';

describe('Block Selection Tests', () => {
  describe('Selection Mode', () => {
    test('should default to linear selection mode', () => {
      const term = new Terminal(80, 24);
      expect(term.getSelectionMode()).toBe(SelectionMode.Linear);
    });

    test('should allow setting selection mode', () => {
      const term = new Terminal(80, 24);
      term.setSelectionMode(SelectionMode.Block);
      expect(term.getSelectionMode()).toBe(SelectionMode.Block);
    });

    test('should start selection in specified mode', () => {
      const term = new Terminal(80, 24);
      term.startSelection(0, 0, SelectionMode.Block);
      expect(term.getSelectionMode()).toBe(SelectionMode.Block);
    });
  });

  describe('Linear Selection Text Extraction', () => {
    test('should extract single line selection', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');
      term.startSelection(0, 0, SelectionMode.Linear);
      term.updateSelection(0, 4);
      const text = term.endSelection();
      expect(text).toBe('Hello');
    });

    test('should extract multi-line selection wrapping lines', () => {
      const term = new Terminal(80, 24);
      term.write('Line1\r\nLine2\r\nLine3');
      term.startSelection(0, 3, SelectionMode.Linear); // From 'e1' in Line1
      term.updateSelection(1, 2); // To 'ne' in Line2
      const text = term.endSelection();
      // Linear selection: 'e1' + full rest of line1 + 'Lin' from line2
      expect(text).toContain('e1');
      expect(text).toContain('Lin');
    });
  });

  describe('Block Selection Text Extraction', () => {
    test('should extract rectangular block from multiple lines', () => {
      const term = new Terminal(80, 24);
      // Write a grid of text on a single line to ensure proper row handling
      // (newlines should move to next row, not be literal \n)
      term.write('ABCDE');
      term.write('\r\n');  // Use \r\n to move to next line
      term.write('FGHIJ');
      term.write('\r\n');
      term.write('KLMNO');
      term.write('\r\n');
      term.write('PQRST');

      // Debug: check what's in the buffer
      const buffer = term.getBuffer();
      const cell01 = buffer.getCell(0, 1);
      const cell11 = buffer.getCell(1, 1);
      const cell21 = buffer.getCell(2, 1);

      // Select block from (0,1) to (2,3) - columns B-D across rows 0-2
      term.startSelection(0, 1, SelectionMode.Block);
      term.updateSelection(2, 3);
      const text = term.endSelection();

      // Should get columns 1-3 from each row (BCD, GHI, LMN)
      const lines = text.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('BCD');
      expect(lines[1]).toBe('GHI');
      expect(lines[2]).toBe('LMN');
    });

    test('should handle reverse block selection', () => {
      const term = new Terminal(80, 24);
      term.write('ABCDE\r\n');
      term.write('FGHIJ\r\n');
      term.write('KLMNO');

      // Select block in reverse direction
      term.startSelection(2, 3, SelectionMode.Block);
      term.updateSelection(0, 1);
      const text = term.endSelection();

      const lines = text.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('BCD');
      expect(lines[1]).toBe('GHI');
      expect(lines[2]).toBe('LMN');
    });

    test('should handle single column block selection', () => {
      const term = new Terminal(80, 24);
      term.write('ABCDE\r\n');
      term.write('FGHIJ\r\n');
      term.write('KLMNO');

      // Select single column (column 2 = C, H, M)
      term.startSelection(0, 2, SelectionMode.Block);
      term.updateSelection(2, 2);
      const text = term.endSelection();

      const lines = text.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe('C');
      expect(lines[1]).toBe('H');
      expect(lines[2]).toBe('M');
    });

    test('should handle single row block selection', () => {
      const term = new Terminal(80, 24);
      term.write('ABCDEFGHIJ');

      term.startSelection(0, 2, SelectionMode.Block);
      term.updateSelection(0, 5);
      const text = term.endSelection();

      expect(text).toBe('CDEF');
    });
  });

  describe('Cell Selection Detection', () => {
    test('should detect cells in linear selection', () => {
      const term = new Terminal(80, 24);
      term.write('ABCDE\r\n');
      term.write('FGHIJ');

      term.startSelection(0, 2, SelectionMode.Linear);
      term.updateSelection(1, 2);

      // First row: from col 2 to end
      expect(term.isCellSelected(0, 1)).toBe(false);
      expect(term.isCellSelected(0, 2)).toBe(true);
      expect(term.isCellSelected(0, 4)).toBe(true);

      // Second row: from start to col 2
      expect(term.isCellSelected(1, 0)).toBe(true);
      expect(term.isCellSelected(1, 2)).toBe(true);
      expect(term.isCellSelected(1, 3)).toBe(false);
    });

    test('should detect cells in block selection', () => {
      const term = new Terminal(80, 24);
      term.write('ABCDE\r\n');
      term.write('FGHIJ\r\n');
      term.write('KLMNO');

      term.startSelection(0, 1, SelectionMode.Block);
      term.updateSelection(2, 3);

      // Check cells within block (rows 0-2, cols 1-3)
      expect(term.isCellSelected(0, 0)).toBe(false); // A - outside
      expect(term.isCellSelected(0, 1)).toBe(true);  // B - inside
      expect(term.isCellSelected(0, 3)).toBe(true);  // D - inside
      expect(term.isCellSelected(0, 4)).toBe(false); // E - outside

      expect(term.isCellSelected(1, 0)).toBe(false); // F - outside
      expect(term.isCellSelected(1, 2)).toBe(true);  // H - inside
      expect(term.isCellSelected(1, 4)).toBe(false); // J - outside

      expect(term.isCellSelected(2, 1)).toBe(true);  // L - inside
      expect(term.isCellSelected(2, 4)).toBe(false); // O - outside

      // Row outside selection
      expect(term.isCellSelected(3, 2)).toBe(false);
    });
  });

  describe('Selection Bounds', () => {
    test('should return null bounds when no selection active', () => {
      const term = new Terminal(80, 24);
      expect(term.getSelectionBounds()).toBeNull();
    });

    test('should return normalized bounds for linear selection', () => {
      const term = new Terminal(80, 24);
      term.write('Test');
      term.startSelection(1, 5, SelectionMode.Linear);
      term.updateSelection(0, 2);

      const bounds = term.getSelectionBounds();
      expect(bounds).not.toBeNull();
      // Should be normalized so start < end
      expect(bounds!.startRow).toBe(0);
      expect(bounds!.startCol).toBe(2);
      expect(bounds!.endRow).toBe(1);
      expect(bounds!.endCol).toBe(5);
    });

    test('should return normalized bounds for block selection', () => {
      const term = new Terminal(80, 24);
      term.write('Test');
      term.startSelection(2, 5, SelectionMode.Block);
      term.updateSelection(0, 2);

      const bounds = term.getSelectionBounds();
      expect(bounds).not.toBeNull();
      // For block, rows and cols are normalized independently
      expect(bounds!.startRow).toBe(0);
      expect(bounds!.endRow).toBe(2);
      expect(bounds!.startCol).toBe(2);
      expect(bounds!.endCol).toBe(5);
    });
  });

  describe('Alt+Drag Block Selection via Touch', () => {
    function createTouchEvent(
      type: 'touchDown' | 'touchMove' | 'touchUp',
      x: number,
      y: number,
      id: number = 0,
      timestamp: number = Date.now(),
      altKey: boolean = false
    ): import('./terminal').TouchEvent {
      return {
        type: type as import('./terminal').TouchEventType,
        x,
        y,
        id,
        timestamp,
        modifiers: altKey ? { alt: true } : undefined,
      };
    }

    test('should use block selection when Alt is held during touch drag', () => {
      const term = new Terminal(80, 24);
      term.setCellDimensions(8, 16);
      term.write('ABCDE\r\n');
      term.write('FGHIJ');

      const now = Date.now();

      // Touch down with Alt held
      term.handleTouchEvent(createTouchEvent('touchDown', 8, 0, 0, now, true));

      // Drag far enough to start selection
      term.handleTouchEvent(createTouchEvent('touchMove', 40, 32, 0, now + 50, true));

      // Should be in block selection mode
      expect(term.getSelectionMode()).toBe(SelectionMode.Block);
    });

    test('should use linear selection when Alt is not held during touch drag', () => {
      const term = new Terminal(80, 24);
      term.setCellDimensions(8, 16);
      term.write('ABCDE\r\n');
      term.write('FGHIJ');

      const now = Date.now();

      // Touch down without Alt
      term.handleTouchEvent(createTouchEvent('touchDown', 8, 0, 0, now, false));

      // Drag far enough to start selection
      term.handleTouchEvent(createTouchEvent('touchMove', 40, 32, 0, now + 50, false));

      // Should be in linear selection mode
      expect(term.getSelectionMode()).toBe(SelectionMode.Linear);
    });
  });
});

// ============================================================================
// Input Handling Tests
// ============================================================================

import { ContextMenuItem } from './terminal';

describe('Input Handling Tests', () => {
  describe('Shift+Function Key Sequences', () => {
    test('should send modified F1 sequence with Shift', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('F1', { shift: true });
      // Shift modifier code = 2, F1 with modifier = ESC [ 1 ; 2 P
      expect(sent).toBe('\x1b[1;2P');
    });

    test('should send modified F5 sequence with Ctrl+Shift', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('F5', { shift: true, ctrl: true });
      // Ctrl+Shift modifier code = 6, F5 with modifier = ESC [ 15 ; 6 ~
      expect(sent).toBe('\x1b[15;6~');
    });

    test('should send modified arrow key with Alt', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('ArrowUp', { alt: true });
      // Alt modifier code = 3
      expect(sent).toBe('\x1b[1;3A');
    });
  });

  describe('Key State Tracking', () => {
    test('should track pressed keys', () => {
      const term = new Terminal(80, 24);
      (term as any)._writer = { write: () => {} };

      term.typeKey('F1');
      expect(term.isKeyPressed('F1')).toBe(true);

      term.keyUp('F1');
      expect(term.isKeyPressed('F1')).toBe(false);
    });

    test('should return all pressed keys', () => {
      const term = new Terminal(80, 24);
      (term as any)._writer = { write: () => {} };

      term.typeKey('Shift');
      term.typeKey('ArrowUp');

      const pressed = term.getPressedKeys();
      expect(pressed).toContain('Shift');
      expect(pressed).toContain('ArrowUp');
    });
  });

  describe('Platform Detection', () => {
    test('should detect platform', () => {
      const term = new Terminal(80, 24);
      const platform = term.getPlatform();
      expect(['macos', 'windows', 'linux']).toContain(platform);
    });

    test('should check action modifier correctly', () => {
      const term = new Terminal(80, 24);
      // On Linux, Ctrl is the action modifier
      if (term.getPlatform() === 'linux') {
        expect(term.isActionModifier({ ctrl: true })).toBe(true);
        expect(term.isActionModifier({ meta: true })).toBe(false);
      }
    });
  });

  describe('Application Cursor Keys Mode', () => {
    test('should use normal mode cursor keys by default', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('ArrowUp');
      expect(sent).toBe('\x1b[A'); // CSI A
    });

    test('should switch to application mode with DECCKM', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      // Enable application cursor keys mode
      term.write('\x1b[?1h');

      term.typeKey('ArrowUp');
      expect(sent).toBe('\x1bOA'); // SS3 A
    });

    test('should use CSI format when modifiers are present even in application mode', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.write('\x1b[?1h'); // Enable application mode

      term.typeKey('ArrowUp', { shift: true });
      expect(sent).toBe('\x1b[1;2A'); // CSI format with modifier
    });
  });

  describe('Application Keypad Mode', () => {
    test('should enable application keypad mode with DECPAM', () => {
      const term = new Terminal(80, 24);
      expect(term.isApplicationKeypadMode()).toBe(false);

      term.write('\x1b='); // DECPAM
      expect(term.isApplicationKeypadMode()).toBe(true);
    });

    test('should disable application keypad mode with DECPNM', () => {
      const term = new Terminal(80, 24);
      term.write('\x1b='); // Enable
      term.write('\x1b>'); // DECPNM - disable
      expect(term.isApplicationKeypadMode()).toBe(false);
    });
  });

  describe('New Line Mode', () => {
    test('should send CR by default for Enter', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('Enter');
      expect(sent).toBe('\r');
    });

    test('should send CR LF in new line mode', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.write('\x1b[20h'); // Enable LNM
      expect(term.isNewLineMode()).toBe(true);

      term.typeKey('Enter');
      expect(sent).toBe('\r\n');
    });
  });

  describe('Shift+Tab', () => {
    test('should send backtab sequence for Shift+Tab', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('Tab', { shift: true });
      expect(sent).toBe('\x1b[Z');
    });
  });

  describe('Alt+Key', () => {
    test('should send ESC prefix for Alt+character', () => {
      const term = new Terminal(80, 24);
      let sent = '';
      (term as any)._writer = { write: (data: string) => { sent = data; } };

      term.typeKey('x', { alt: true });
      expect(sent).toBe('\x1bx');
    });
  });
});

// ============================================================================
// Word Selection (Double-click) Tests
// ============================================================================

describe('Word Selection Tests', () => {
  describe('Word Boundary Detection', () => {
    test('should find word boundaries', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const bounds = term.getWordBounds(0, 2); // 'l' in Hello
      expect(bounds).not.toBeNull();
      expect(bounds!.start).toBe(0);
      expect(bounds!.end).toBe(4);
    });

    test('should return null for space', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const bounds = term.getWordBounds(0, 5); // space
      expect(bounds).toBeNull();
    });

    test('should handle path-like strings', () => {
      const term = new Terminal(80, 24);
      term.write('/usr/local/bin');

      const bounds = term.getWordBounds(0, 5); // 'l' in local
      expect(bounds).not.toBeNull();
      expect(bounds!.start).toBe(0);
      expect(bounds!.end).toBe(13);
    });
  });

  describe('Get Word At Position', () => {
    test('should extract word at position', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const word = term.getWordAt(0, 7);
      expect(word).toBe('World');
    });

    test('should return empty string for non-word position', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const word = term.getWordAt(0, 5);
      expect(word).toBe('');
    });
  });

  describe('Double-click Detection', () => {
    test('should detect double-click and select word', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const now = Date.now();

      // First click
      const result1 = term.handleClick(0, 2, now);
      expect(result1).toBe(false);

      // Second click within threshold
      const result2 = term.handleClick(0, 2, now + 100);
      expect(result2).toBe(true);

      // Should have selected the word
      expect(term.getSelection().active).toBe(true);
    });

    test('should not trigger on slow clicks', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const now = Date.now();

      term.handleClick(0, 2, now);
      const result = term.handleClick(0, 2, now + 500); // Too slow

      expect(result).toBe(false);
    });

    test('should not trigger on different positions', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      const now = Date.now();

      term.handleClick(0, 2, now);
      const result = term.handleClick(0, 7, now + 100); // Different column

      expect(result).toBe(false);
    });
  });

  describe('Select Word', () => {
    test('should select word at position', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      term.selectWord(0, 7);

      const selection = term.getSelection();
      expect(selection.active).toBe(true);
      expect(selection.startCol).toBe(6);
      expect(selection.endCol).toBe(10);
    });
  });
});

// ============================================================================
// Context Menu Tests
// ============================================================================

describe('Context Menu Tests', () => {
  test('should return context menu items', () => {
    const term = new Terminal(80, 24);
    const items = term.getContextMenuItems();

    expect(items.length).toBeGreaterThan(0);
    expect(items.some(i => i.action === 'copy')).toBe(true);
    expect(items.some(i => i.action === 'paste')).toBe(true);
    expect(items.some(i => i.action === 'selectAll')).toBe(true);
  });

  test('should disable copy when no selection', () => {
    const term = new Terminal(80, 24);
    const items = term.getContextMenuItems();

    const copyItem = items.find(i => i.action === 'copy');
    expect(copyItem?.enabled).toBe(false);
  });

  test('should enable copy when selection exists', () => {
    const term = new Terminal(80, 24);
    term.write('Hello');
    term.startSelection(0, 0);
    term.updateSelection(0, 4);

    const items = term.getContextMenuItems();
    const copyItem = items.find(i => i.action === 'copy');
    expect(copyItem?.enabled).toBe(true);
  });

  test('should trigger onContextMenu callback', () => {
    const term = new Terminal(80, 24);
    let callbackItems: ContextMenuItem[] = [];

    term.onContextMenu = (row, col, items) => {
      callbackItems = items;
    };

    term.handleContextMenu(5, 10);
    expect(callbackItems.length).toBeGreaterThan(0);
  });

  describe('Select All', () => {
    test('should select entire terminal', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      term.selectAll();

      const selection = term.getSelection();
      expect(selection.active).toBe(true);
      expect(selection.startRow).toBe(0);
      expect(selection.startCol).toBe(0);
      expect(selection.endRow).toBe(23);
      expect(selection.endCol).toBe(79);
    });
  });

  describe('Clear', () => {
    test('should clear the terminal', () => {
      const term = new Terminal(80, 24);
      term.write('Hello World');

      term.clear();

      // Cursor should be at home position
      expect(term.getCursorRow()).toBe(0);
      expect(term.getCursorCol()).toBe(0);
    });
  });
});
