# Terminal Port Roadmap

This document tracks the gaps between the Tsyne terminal port and the original [fyne-io/terminal](https://github.com/fyne-io/terminal), along with planned improvements.

## Status Legend

- [ ] Not implemented
- [x] Implemented
- [~] Partial/placeholder implementation

---

## Priority 1: Critical (Compatibility Issues)

### PTY Support
- [x] Integrate `node-pty` for proper pseudo-terminal support
- [x] Implement SIGWINCH handling for terminal resize signals
- [x] Proper shell window size synchronization
- [x] Platform-specific PTY handling (Unix vs Windows via node-pty)

**Status:** ✅ Complete. Uses `node-pty` for proper PTY with SIGWINCH support. Interactive apps like `vim`, `htop`, `less` now work correctly.

### Character Sets
- [x] DEC Special Graphics charset (box drawing: ┌─┐│└┘)
- [x] G0/G1 charset switching (SO/SI: 0x0e, 0x0f)
- [x] Full Unicode box drawing character mapping

**Status:** ✅ Complete. DEC Special Graphics charset fully implemented with all box drawing, math symbols, and special characters. TUI apps now render borders correctly.

### Device Control Sequences
- [x] DCS (Device Control String) handler dispatch
- [x] DCS query/response mechanism
- [x] APC (Application Program Command) handler system
- [x] Extensible handler registration (`registerDCSHandler()`, `registerAPCHandler()`)

**Status:** ✅ Complete. Full DCS/APC parsing with DECRQSS support for terminal queries. Extensible handler registration for custom sequences.

### Mouse Protocol
- [x] X10 mouse encoding (mode 1000)
- [x] SGR mouse encoding (mode 1006)
- [x] URXVT mouse encoding (mode 1015)
- [x] Button event tracking (mode 1002)
- [x] Any event tracking (mode 1003)
- [x] Mouse modifier encoding (Shift, Alt, Ctrl)
- [x] `encodeMouseEvent()` implementation (X10, SGR, URXVT formats)
- [x] Wheel event support (WheelUp, WheelDown, WheelLeft, WheelRight)

**Status:** ✅ Complete. Full mouse protocol support with X10, SGR, and URXVT encoding formats. Mouse-aware TUI apps (vim, htop, etc.) now work correctly.

---

## Priority 2: Major (Feature Parity)

### Input Handling
- [x] Basic character input
- [x] Special keys (F1-F12, arrows, Home, End, etc.)
- [x] Basic Ctrl modifiers
- [x] Shift+Function key sequences (with xterm modifier encoding)
- [x] Full key state tracking (KeyDown/KeyUp)
- [x] Platform-specific shortcuts (macOS Cmd vs Ctrl detection)
- [x] Buffer mode cursor keys (ESC O vs ESC [)
- [x] Application keypad mode (DECPAM/DECPNM)
- [x] New line mode (LNM)
- [x] Alt+key ESC prefix
- [x] Shift+Tab backtab

**Status:** ✅ Complete. Full xterm-compatible key encoding with modifier support.

### Mouse/Touch Support
- [x] Basic click handling
- [x] Text selection (linear)
- [x] Block/rectangular selection (Alt+drag)
- [x] Cell selection detection for rendering
- [x] Double-click word selection
- [x] Right-click context menu (Copy, Paste, Select All, Clear)
- [x] Touch events (TouchDown, TouchMove, TouchUp, TouchCancel)
- [x] Mobile device support (tap, long press, drag)
- [x] Touch-based text selection
- [x] Pixel-to-cell coordinate conversion

**Status:** ✅ Complete. Full mouse/touch support with word selection and context menus.

### Terminal Modes
- [x] Application cursor keys (DECCKM)
- [x] Auto-wrap mode (DECAWM)
- [x] Origin mode (DECOM)
- [x] Cursor visibility (DECTCEM)
- [x] Alternate screen buffer (modes 47, 1047, 1049)
- [x] Bracketed paste mode (2004)
- [x] New line mode vs line feed mode
- [x] Printer mode (ESC[5i / ESC[4i)

### Selection & Clipboard
- [x] Linear text selection
- [x] Copy to clipboard
- [x] Paste with bracketed paste mode
- [x] Block mode selection (Alt+drag)
- [x] Word boundary detection for double-click
- [~] X11-style primary selection buffer (platform-specific, deferred)
- [x] Selection highlighting with proper masking

**Status:** ✅ Terminal modes complete. X11 primary selection deferred (platform-specific feature, requires X11-only clipboard API).

---

## Priority 3: Polish

### Rendering
- [x] 256 color palette
- [x] True color (24-bit RGB)
- [x] Bold, italic, underline attributes
- [x] Inverse video
- [x] Dim attribute (reduces brightness to 50%)
- [x] Cursor blinking animation
- [~] Strikethrough rendering (requires custom canvas - Fyne TextStyle limitation)
- [~] Double underline distinction (requires custom canvas - Fyne TextStyle limitation)

### Configuration
- [x] Basic terminal dimensions
- [x] Working directory (cwd)
- [x] Shell selection
- [ ] Config change listeners/notification
- [ ] Dynamic config updates
- [ ] Theme integration

### OSC Sequences
- [x] OSC 0 - Set window title and icon name
- [x] OSC 1 - Set icon name
- [x] OSC 2 - Set window title
- [x] OSC 7 - Set working directory (file:// URI)
- [x] Robust file:// URI parsing (URL decoding, localhost prefix)

### Error Handling
- [x] Basic shell error handling
- [x] UTF-8 validation and error recovery (sanitizeUtf8, replacement with U+FFFD)
- [x] Partial UTF-8 sequence buffering (writeBuffer, flushUtf8Buffer)
- [x] PTY EOF/broken pipe handling (safePtyWrite, onError callback)
- [ ] Resize race condition handling
- [x] Proper shell exit code tracking (getExitCode(), isRunning())

---

## Architecture Improvements

### Current Architecture
```
Terminal (class)
├── AnsiParser (state machine)
├── TerminalBuffer (cell grid)
└── TerminalUI (Tsyne widget wrapper)
```

### Planned Improvements
- [ ] Event emitter pattern for state changes
- [ ] Proper TypeScript interfaces for extensibility
- [x] Handler registration system for DCS/APC (registerDCSHandler, registerAPCHandler)
- [ ] Separation of concerns (parser vs terminal vs UI)

---

## Test Coverage

### Current Tests (218 total)
- 56 pure Jest unit tests
- 4 TsyneTest UI integration tests (require tsyne-bridge)
- 5 Shell integration tests
- 6 PTY integration tests
- 10 DEC Special Graphics charset tests
- 12 Touch event tests
- 31 Mouse protocol tests
- 16 Block selection tests
- 31 Input handling, word selection, and context menu tests
- 20 DCS/APC handler tests
- 3 Terminal mode tests (LNM output side, printer mode)
- 5 File URI parsing tests
- 10 UTF-8 validation tests
- 5 PTY error handling tests

### Needed Tests
- [x] DEC Special Graphics rendering
- [x] Mouse protocol encoding
- [x] Block/rectangular selection
- [x] Complex key sequences with modifiers
- [x] PTY integration tests
- [x] Mobile/touch event tests
- [x] DCS/APC handler tests
- [x] Error recovery tests (UTF-8 validation, PTY errors)

---

## Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `node-pty` | Proper PTY support | ✅ Installed and integrated |
| `xterm` | Reference implementation | Could compare escape sequence handling |

---

## Original fyne-io/terminal Files Reference

| Original File | Tsyne Equivalent | Status |
|---------------|------------------|--------|
| `term.go` | `Terminal` class | ✅ Core implemented with PTY |
| `term_unix.go` | `node-pty` | ✅ Handled by node-pty |
| `term_windows.go` | `node-pty` | ✅ Handled by node-pty |
| `escape.go` | `AnsiParser` class | Mostly complete |
| `input.go` | `typeChar()`, `typeKey()` | Basic implementation |
| `output.go` | `write()`, parser handlers | Complete |
| `color.go` | Color palette constants | Complete |
| `config.go` | Constructor options | Simplified |

---

## Contributing

When implementing features from this roadmap:

1. Reference the original Go implementation in fyne-io/terminal
2. Add corresponding tests in `terminal.test.ts`
3. Update this ROADMAP.md to mark items complete
4. Update README.md if adding user-facing features
