# Terminal Emulator for Tsyne

A simplified terminal emulator demonstration ported from [fyne-io/terminal](https://github.com/fyne-io/terminal) to Tsyne.

## Original Project

This application is based on the terminal emulator originally created by the Fyne.io team:
- **Original Repository**: https://github.com/fyne-io/terminal
- **Original Authors**: Fyne.io contributors
- **Original License**: See the original repository for licensing information

## ⚠️ Important Note

**This is a SIMPLIFIED DEMONSTRATION, not a full terminal emulator.**

The original fyne-io/terminal is a complete terminal emulator supporting:
- Full PTY (pseudo-terminal) support
- Real shell execution (bash, zsh, etc.)
- SSH connections
- ANSI escape sequences
- Text selection and clipboard
- Mouse input
- Full terminal capabilities (colors, cursor control, etc.)
- Cross-platform support (Linux, macOS, Windows, BSD)

**This Tsyne port is a simplified UI demonstration showing:**
- Terminal-like interface
- Basic command interaction
- Simple command processor (echo, help, clear, etc.)
- No real shell execution
- No PTY management
- No ANSI escape sequences

## About This Port

This is a Tsyne port demonstrating terminal-like UI interaction, adapted to work with Tsyne's TypeScript-to-Fyne bridge architecture. The original application requires deep OS integration for PTY management and shell execution, which is beyond the scope of a simplified demonstration.

### Purpose

This port demonstrates:
- Terminal UI layout patterns
- Command input/output interaction
- Scroll area for terminal output
- Basic command processing

### Not Included

Full terminal emulation would require:
- PTY/shell integration in the Go bridge
- ANSI escape sequence parsing
- Terminal state management (cursor, colors, attributes)
- Advanced input handling (control sequences, alt keys)
- SSH client integration

## Available Commands

The simplified terminal includes these demo commands:

- `help` - Show available commands
- `echo [text]` - Echo text to output
- `date` - Show current date/time
- `pwd` - Print working directory (simulated)
- `history` - Show command history
- `clear` - Clear the terminal
- `exit` - Exit message

## Usage

```bash
# Build the Tsyne bridge if not already built
cd bridge && go build -o ../bin/tsyne-bridge && cd ..

# Build the TypeScript code
npm run build

# Run the terminal demo
node dist/examples/terminal/terminal.js
```

## UI Controls

- **Clear Button**: Clear all terminal output
- **Help Button**: Show available commands
- **Input Field**: Enter commands (press Enter to execute)

## Testing

```bash
# Run tests
npm test examples/terminal/terminal.test.ts

# Run with visual debugging
TSYNE_HEADED=1 npm test examples/terminal/terminal.test.ts
```

**Test Coverage (12 tests):**
- Initial UI display
- Welcome message visibility
- Help command execution
- Clear functionality
- Toolbar controls visibility
- Input prompt display
- Multiple command handling
- UI state persistence
- Rapid button click handling
- All UI sections verification

## Implementation Details

### Terminal Class
- Line-based output storage
- Command processor for basic commands
- Maximum line limit (500 lines)
- Update callbacks for UI refresh

### CommandProcessor Class
- Simple command parsing
- Built-in commands (help, echo, date, pwd, history, clear, exit)
- Command history tracking
- Error handling for unknown commands

### TerminalUI Class
- Toolbar with Clear and Help buttons
- Scrollable output area
- Input field with command prompt ($)
- Status bar with instructions
- Real-time output updates

## Architecture

The port follows similar patterns to the original:

```
Original (fyne-io/terminal):
term.go              → Terminal struct (PTY, I/O, rendering)
cmd/fyneterm/main.go → Main entry point
render.go            → Terminal rendering
input.go/output.go   → I/O processing
escape.go            → ANSI escape sequences

Tsyne Port:
terminal.ts          → Simplified Terminal + CommandProcessor
                       TerminalUI (no PTY, basic commands only)
```

## Attribution

Original work by the Fyne.io team. Please visit the [original repository](https://github.com/fyne-io/terminal) for the full-featured terminal emulator with real shell execution, PTY support, and complete terminal capabilities.

This Tsyne port is provided **solely as a UI demonstration** of terminal-like interaction patterns in Tsyne applications.

## Future Enhancements

To create a real terminal emulator in Tsyne would require:

1. **PTY Integration**:
   - Add PTY support to the Go bridge
   - Shell execution (bash, zsh, etc.)
   - Proper input/output buffering
   - Signal handling

2. **ANSI Escape Sequences**:
   - Parser for escape codes
   - Color/attribute support
   - Cursor positioning
   - Screen manipulation

3. **Advanced Features**:
   - Text selection with mouse
   - Clipboard operations
   - SSH client integration
   - Tab completion
   - Scrollback buffer
   - Font/size customization

4. **Cross-Platform Support**:
   - Platform-specific PTY implementations
   - Windows ConPTY support
   - Unix PTY support

## Why This is Simplified

Creating a full terminal emulator requires:

- **Operating System Integration**: PTY (pseudo-terminal) management is OS-specific and requires native code
- **Process Management**: Spawning and managing shell processes
- **Complex I/O**: Bidirectional communication with shells, signal handling
- **ANSI Standards**: Full VT100/xterm escape sequence parsing
- **Performance**: Efficient rendering of potentially thousands of characters
- **State Management**: Cursor position, scrollback, screen buffers

These features would require significant Go bridge enhancements and are beyond the scope of a demonstration port.

## Comparison

| Feature | Original (fyne-io/terminal) | This Port |
|---------|----------------------------|-----------|
| Real shell execution | ✓ | ✗ |
| PTY support | ✓ | ✗ |
| ANSI escape sequences | ✓ | ✗ |
| SSH connections | ✓ | ✗ |
| Mouse selection | ✓ | ✗ |
| Command history | ✓ | ✓ (simplified) |
| UI layout | ✓ | ✓ |
| Scrollback | ✓ | ✓ (limited) |
| Basic commands | N/A | ✓ (demo only) |

## Credits

- **Original Terminal Emulator**: Fyne.io contributors
- **Tsyne Framework**: Paul Hammant and contributors
- **Fyne GUI Toolkit**: fyne.io team

## Disclaimer

This is a **demonstration port** showing terminal-like UI patterns. It is **NOT** a replacement for the original terminal emulator. For actual terminal emulation, shell execution, or SSH connections, please use the original [fyne-io/terminal](https://github.com/fyne-io/terminal) project.
