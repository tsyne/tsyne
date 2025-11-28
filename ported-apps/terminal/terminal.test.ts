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
