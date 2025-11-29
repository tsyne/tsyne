# Terminal Emulator for Tsyne

A full-featured terminal emulator ported from [fyne-io/terminal](https://github.com/fyne-io/terminal) to Tsyne.

## Original Project

This application is based on the terminal emulator originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/terminal
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## Features

This Tsyne port provides a **fully-featured terminal emulator** including:

### Core Terminal Features
- **Real Shell Execution** - Spawns actual shell processes (bash, zsh, sh, cmd.exe)
- **Full ANSI/VT100 Escape Sequences** - Complete escape sequence parser
- **256 Color Support** - Full 8/16/256 color palette with true color conversion
- **Text Attributes** - Bold, italic, underline, blink, inverse, strikethrough
- **Cursor Management** - Full cursor positioning, visibility, save/restore
- **Scroll Regions** - DECSTBM scroll region support
- **Scrollback Buffer** - Up to 1000 lines of scrollback history
- **Alternate Screen Buffer** - For applications like vim, less, etc.
- **Text Selection** - Mouse-based text selection for copy/paste

### Input Handling
- **Full Keyboard Support** - All standard keys including function keys (F1-F12)
- **Control Sequences** - Ctrl+C, Ctrl+D, Ctrl+Z, etc.
- **Arrow Keys** - Normal and application cursor key modes
- **Bracketed Paste Mode** - Proper paste handling for modern shells

### Terminal Modes
- **Origin Mode** (DECOM)
- **Auto-Wrap Mode** (DECAWM)
- **Application Cursor Keys** (DECCKM)
- **Cursor Visibility** (DECTCEM)
- **Mouse Tracking** (modes 1000, 1002, 1003)

### OSC Commands
- **Window Title** - OSC 0 and OSC 2 for title changes
- **Working Directory** - OSC 7 for CWD updates

## Architecture

The port follows the original Fyne terminal structure:

```
Original (fyne-io/terminal):          Tsyne Port:
term.go                    →          Terminal class
escape.go                  →          AnsiParser class
color.go                   →          Color palette & conversion
input.go                   →          Keyboard input handling
output.go                  →          Output processing
select.go                  →          Text selection
render.go                  →          TextGrid rendering
cmd/fyneterm/main.go       →          TerminalUI class
```

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the terminal
npx ts-node ported-apps/terminal/terminal.ts
```

## Testing

```bash
# Run all tests (unit + UI)
npm test ported-apps/terminal/terminal.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test ported-apps/terminal/terminal.test.ts

# Run with screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/terminal/terminal.test.ts
```

### Test Coverage

The test suite includes **60+ tests** covering:

**Terminal Core Unit Tests:**
- Terminal buffer initialization and operations
- Character writing and cursor positioning
- Newline/carriage return handling
- Line wrapping

**ANSI Escape Sequences:**
- Cursor movement (CUU, CUD, CUF, CUB, CUP, CHA, VPA)
- Cursor save/restore
- Erase operations (ED, EL)
- SGR (colors and attributes)
- 256-color and true color modes
- Scrolling (SU, SD, DECSTBM)
- Modes (DECTCEM, alternate buffer, etc.)
- OSC commands (title changes)

**Text Selection:**
- Single-line selection
- Multi-line selection
- Reversed selection
- Selection clearing

**Keyboard Input:**
- Regular characters
- Special keys (Enter, Backspace, Tab)
- Arrow keys
- Ctrl+key combinations
- Function keys
- Bracketed paste mode

**Complex Scenarios:**
- Vim-like screen clearing
- Progress bar output
- Colored ls output
- ANSI art rendering
- Full-screen application layouts

## Implementation Details

### Terminal Class

The `Terminal` class is the core emulator implementing:

```typescript
class Terminal {
  // Shell management
  runLocalShell(): void           // Start local shell
  runWithConnection(): void       // Connect to remote shell
  sendInput(data: string): void   // Send to shell

  // Terminal operations
  write(data: string): void       // Process output
  resize(cols, rows): void        // Resize terminal
  reset(): void                   // Reset to initial state

  // Selection
  startSelection(row, col): void  // Begin selection
  updateSelection(row, col): void // Update selection
  endSelection(): string          // Get selected text

  // Input handling
  typeChar(char: string): void    // Type character
  typeKey(key, modifiers): void   // Special key
  paste(text: string): void       // Paste with bracketed mode

  // State
  getText(): string               // Get buffer content
  getConfig(): TerminalConfig     // Get configuration
  getCursorRow/Col(): number      // Cursor position
  isCursorVisible(): boolean      // Cursor visibility
}
```

### AnsiParser Class

State machine-based parser for ANSI/VT100 escape sequences:

```typescript
class AnsiParser {
  parse(data: string): void

  // Callbacks
  onPrint: (char) => void
  onExecute: (code) => void
  onCsiDispatch: (params, intermediates, final, privateMarker) => void
  onOscDispatch: (params) => void
  onEscDispatch: (intermediates, final) => void
}
```

### TerminalBuffer Class

Screen buffer management with cell-level attributes:

```typescript
class TerminalBuffer {
  clear(): void
  getCell(row, col): Cell
  setCell(row, col, char, attrs): void
  scrollUp/Down(top, bottom, count): void
  eraseLine(row, mode, col): void
  eraseDisplay(mode, row, col): void
  insertLines/deleteLines(): void
  resize(cols, rows): void
}
```

### TerminalUI Class

Tsyne UI integration using TextGrid widget:

```typescript
class TerminalUI {
  buildUI(win: Window): Promise<void>
  handleKeyDown(key, modifiers): void
  getTerminal(): Terminal
}
```

## Color Support

Full 256-color palette:
- Colors 0-7: Standard ANSI colors
- Colors 8-15: Bright ANSI colors
- Colors 16-231: 6x6x6 color cube
- Colors 232-255: Grayscale ramp

True color (24-bit) is converted to nearest 256-color value.

## Escape Sequence Support

### CSI Sequences (ESC [ ...)
- Cursor movement: A, B, C, D, E, F, G, H, d, f, `
- Cursor save/restore: s, u
- Erase: J, K
- Insert/delete: L, M, P, @, X
- Scroll: S, T
- Modes: h, l
- SGR: m
- Scroll region: r
- Device status: n, c

### OSC Sequences (ESC ] ...)
- 0: Set icon name and window title
- 2: Set window title
- 7: Set working directory

### Single Character Escapes
- 7: Save cursor (DECSC)
- 8: Restore cursor (DECRC)
- D: Index (IND)
- E: Next line (NEL)
- M: Reverse index (RI)
- c: Reset (RIS)

## Comparison with Original

| Feature | Original (fyne-io/terminal) | This Port |
|---------|----------------------------|-----------|
| Real shell execution | ✓ | ✓ |
| ANSI escape sequences | ✓ | ✓ |
| 256 color support | ✓ | ✓ |
| True color (24-bit) | ✓ | ✓ (converted to 256) |
| Text selection | ✓ | ✓ |
| Scrollback buffer | ✓ | ✓ |
| Alternate screen | ✓ | ✓ |
| Bracketed paste | ✓ | ✓ |
| SSH connections | ✓ | ✓ (via runWithConnection) |
| PTY support | ✓ (native) | Partial (child_process) |
| Mouse tracking | ✓ | ✓ (mode flags) |

## Limitations

- **PTY**: Uses Node.js `child_process.spawn` instead of true PTY. For full PTY support, `node-pty` could be added as an optional dependency.
- **SIGWINCH**: Terminal resize signals require `node-pty` for proper propagation.
- **Performance**: Per-cell rendering may be slower than native Fyne for very large terminals.

## Credits

- **Original Terminal Emulator**: Fyne.io contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team

## License

See the original [fyne-io/terminal](https://github.com/fyne-io/terminal) repository for licensing information.
