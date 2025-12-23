/**
 * Terminal Emulator Demo
 *
 * Demonstrates the TextGrid widget for building terminal-like displays.
 * Shows:
 * - Monospace text grid display
 * - Per-cell styling (colors, bold, etc.)
 * - Command input and output
 * - ANSI-style color support
 */

import { App, TextGrid, TextGridStyle, resolveTransport } from '../core/src/index';

// Terminal state
const COLS = 80;
const ROWS = 24;
let cursorRow = 0;
let cursorCol = 0;
let commandBuffer = '';
let outputLines: { text: string; style?: TextGridStyle }[] = [];

// Terminal colors
const colors = {
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  yellow: '#ffff00',
  blue: '#0066ff',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  white: '#ffffff',
  gray: '#888888',
  brightGreen: '#00ff88',
  brightYellow: '#ffff88',
};

// Create the application
const app = new App(resolveTransport(), { title: 'Terminal Emulator' });

app.window({ title: 'Terminal Emulator', width: 900, height: 600 }, (win) => {
  let terminalGrid: TextGrid;
  let inputEntry: any;

  win.setContent(() => {
    app.vbox(() => {
      // Terminal output area
      app.scroll(() => {
        terminalGrid = app.textgrid({
          text: '',
          showLineNumbers: false,
          showWhitespace: false,
        });
      });

      app.separator();

      // Command input area
      app.hbox(() => {
        app.label('$ ', undefined, undefined, undefined, { monospace: true, bold: true });
        inputEntry = app.entry('Enter command...', async (text: string) => {
          await processCommand(text);
          await inputEntry.setText('');
        }, 700);
      });
    });
  });

  // Initialize terminal with welcome message
  async function initTerminal() {
    const welcomeLines = [
      { text: '╔════════════════════════════════════════════════════════════════════════════╗', style: { fgColor: colors.cyan } },
      { text: '║                     Welcome to Tsyne Terminal Emulator                     ║', style: { fgColor: colors.brightGreen, bold: true } },
      { text: '║                                                                            ║', style: { fgColor: colors.cyan } },
      { text: '║  This demo showcases the TextGrid widget capabilities:                     ║', style: { fgColor: colors.cyan } },
      { text: '║    - Monospace character grid                                              ║', style: { fgColor: colors.cyan } },
      { text: '║    - Per-cell styling (colors, bold, italic)                               ║', style: { fgColor: colors.cyan } },
      { text: '║    - Terminal-like scrolling output                                        ║', style: { fgColor: colors.cyan } },
      { text: '║                                                                            ║', style: { fgColor: colors.cyan } },
      { text: '║  Try these commands:                                                       ║', style: { fgColor: colors.cyan } },
      { text: '║    help     - Show available commands                                      ║', style: { fgColor: colors.yellow } },
      { text: '║    colors   - Display color palette                                        ║', style: { fgColor: colors.yellow } },
      { text: '║    matrix   - Show Matrix-style animation                                  ║', style: { fgColor: colors.yellow } },
      { text: '║    echo     - Echo text back                                               ║', style: { fgColor: colors.yellow } },
      { text: '║    clear    - Clear the terminal                                           ║', style: { fgColor: colors.yellow } },
      { text: '║    time     - Show current time                                            ║', style: { fgColor: colors.yellow } },
      { text: '║    box      - Draw a box                                                   ║', style: { fgColor: colors.yellow } },
      { text: '║    rainbow  - Show rainbow text                                            ║', style: { fgColor: colors.yellow } },
      { text: '╚════════════════════════════════════════════════════════════════════════════╝', style: { fgColor: colors.cyan } },
      { text: '', style: {} },
    ];

    outputLines = welcomeLines;
    await updateDisplay();
  }

  // Process a command
  async function processCommand(cmd: string) {
    const trimmed = cmd.trim().toLowerCase();
    const args = trimmed.split(' ');
    const command = args[0];

    // Add command to output
    outputLines.push({ text: `$ ${cmd}`, style: { fgColor: colors.green, bold: true } });

    switch (command) {
      case 'help':
        outputLines.push({ text: 'Available commands:', style: { fgColor: colors.white, bold: true } });
        outputLines.push({ text: '  help     - Show this help message', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  colors   - Display color palette', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  matrix   - Show Matrix-style effect', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  echo     - Echo text (e.g., echo Hello World)', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  clear    - Clear the terminal', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  time     - Show current time', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  box      - Draw a decorative box', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  rainbow  - Show rainbow colored text', style: { fgColor: colors.gray } });
        outputLines.push({ text: '  error    - Show an error message', style: { fgColor: colors.gray } });
        break;

      case 'colors':
        outputLines.push({ text: 'Color Palette:', style: { fgColor: colors.white, bold: true } });
        outputLines.push({ text: '  Black   ', style: { fgColor: colors.black, bgColor: colors.white } });
        outputLines.push({ text: '  Red     ', style: { fgColor: colors.red } });
        outputLines.push({ text: '  Green   ', style: { fgColor: colors.green } });
        outputLines.push({ text: '  Yellow  ', style: { fgColor: colors.yellow } });
        outputLines.push({ text: '  Blue    ', style: { fgColor: colors.blue } });
        outputLines.push({ text: '  Magenta ', style: { fgColor: colors.magenta } });
        outputLines.push({ text: '  Cyan    ', style: { fgColor: colors.cyan } });
        outputLines.push({ text: '  White   ', style: { fgColor: colors.white } });
        outputLines.push({ text: '  Gray    ', style: { fgColor: colors.gray } });
        break;

      case 'matrix':
        outputLines.push({ text: 'The Matrix has you...', style: { fgColor: colors.brightGreen, bold: true } });
        outputLines.push({ text: '  01001000 01100101 01101100 01101100 01101111', style: { fgColor: colors.green } });
        outputLines.push({ text: '  01010111 01101111 01110010 01101100 01100100', style: { fgColor: colors.brightGreen } });
        outputLines.push({ text: '  ░▒▓█▓▒░ ░▒▓█▓▒░ ░▒▓█▓▒░ ░▒▓█▓▒░ ░▒▓█▓▒░', style: { fgColor: colors.green } });
        break;

      case 'echo':
        const message = cmd.substring(5).trim() || '(empty)';
        outputLines.push({ text: message, style: { fgColor: colors.white } });
        break;

      case 'clear':
        outputLines = [];
        break;

      case 'time':
        const now = new Date();
        outputLines.push({ text: `Current time: ${now.toLocaleTimeString()}`, style: { fgColor: colors.cyan } });
        outputLines.push({ text: `Current date: ${now.toLocaleDateString()}`, style: { fgColor: colors.cyan } });
        break;

      case 'box':
        outputLines.push({ text: '┌──────────────────────┐', style: { fgColor: colors.yellow } });
        outputLines.push({ text: '│  TextGrid Demo Box   │', style: { fgColor: colors.yellow } });
        outputLines.push({ text: '│                      │', style: { fgColor: colors.yellow } });
        outputLines.push({ text: '│  ★ Styled Text ★     │', style: { fgColor: colors.magenta } });
        outputLines.push({ text: '│                      │', style: { fgColor: colors.yellow } });
        outputLines.push({ text: '└──────────────────────┘', style: { fgColor: colors.yellow } });
        break;

      case 'rainbow':
        const rainbowColors = [colors.red, colors.yellow, colors.green, colors.cyan, colors.blue, colors.magenta];
        const rainbowText = 'RAINBOW TEXT!';
        for (let i = 0; i < rainbowText.length; i++) {
          // We'll simulate rainbow by showing each character
        }
        outputLines.push({ text: 'R', style: { fgColor: colors.red, bold: true } });
        outputLines.push({ text: 'A', style: { fgColor: colors.yellow, bold: true } });
        outputLines.push({ text: 'I', style: { fgColor: colors.green, bold: true } });
        outputLines.push({ text: 'N', style: { fgColor: colors.cyan, bold: true } });
        outputLines.push({ text: 'B', style: { fgColor: colors.blue, bold: true } });
        outputLines.push({ text: 'O', style: { fgColor: colors.magenta, bold: true } });
        outputLines.push({ text: 'W', style: { fgColor: colors.red, bold: true } });
        outputLines.push({ text: '!', style: { fgColor: colors.yellow, bold: true } });
        // Show full rainbow line
        outputLines.push({ text: '🌈 Rainbow colors demonstrated above! 🌈', style: { fgColor: colors.brightGreen } });
        break;

      case 'error':
        outputLines.push({ text: 'ERROR: This is a simulated error message!', style: { fgColor: colors.red, bold: true } });
        outputLines.push({ text: '       Something went wrong (not really)', style: { fgColor: colors.red } });
        break;

      case '':
        // Empty command, do nothing
        outputLines.pop(); // Remove the empty command line
        break;

      default:
        outputLines.push({ text: `Command not found: ${command}`, style: { fgColor: colors.red } });
        outputLines.push({ text: 'Type "help" for available commands.', style: { fgColor: colors.gray } });
        break;
    }

    outputLines.push({ text: '', style: {} }); // Add blank line
    await updateDisplay();
  }

  // Update the terminal display
  async function updateDisplay() {
    // Build the display text
    const displayText = outputLines.map(line => line.text).join('\n');
    await terminalGrid.setText(displayText);

    // Apply styles row by row
    for (let i = 0; i < outputLines.length; i++) {
      const line = outputLines[i];
      if (line.style && (line.style.fgColor || line.style.bgColor || line.style.bold)) {
        // Apply style to the entire row
        await terminalGrid.setRow(i, line.text, line.style);
      }
    }
  }

  win.show();

  // Initialize after a short delay to ensure widget is ready
  setTimeout(initTerminal, 100);
});

app.run();
