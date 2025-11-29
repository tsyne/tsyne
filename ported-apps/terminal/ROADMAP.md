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
- [ ] DEC Special Graphics charset (box drawing: ╔═╗║╚╝)
- [ ] G0/G1 charset switching (SO/SI: 0x0e, 0x0f)
- [ ] Full Unicode box drawing character mapping

**Current:** `handleCharSet()` has "ignore for simplicity" comment. TUI apps will show garbage for borders.

### Device Control Sequences
- [ ] DCS (Device Control String) handler dispatch
- [ ] DCS query/response mechanism
- [ ] APC (Application Program Command) handler system
- [ ] Extensible handler registration (`RegisterAPCHandler()`)

**Current:** Parser states exist but handlers are placeholder. Apps sending DCS will hang.

### Mouse Protocol
- [ ] X10 mouse encoding (mode 1000)
- [ ] V200 mouse encoding (modes 1002, 1003)
- [ ] Mouse modifier encoding (Shift, Alt, Ctrl)
- [ ] `encodeMouse()` implementation

**Current:** Modes are stored but encoding not implemented. Mouse-aware apps won't work.

---

## Priority 2: Major (Feature Parity)

### Input Handling
- [x] Basic character input
- [x] Special keys (F1-F12, arrows, Home, End, etc.)
- [x] Basic Ctrl modifiers
- [ ] Shift+Function key sequences
- [ ] Full key state tracking (KeyDown/KeyUp)
- [ ] Platform-specific shortcuts (macOS vs others)
- [ ] Buffer mode cursor keys (ESC O vs ESC [)

### Mouse/Touch Support
- [x] Basic click handling
- [x] Text selection (linear)
- [ ] Block/rectangular selection
- [ ] Double-click word selection
- [ ] Right-click context menu (paste)
- [ ] Touch events (TouchDown, TouchUp, TouchCancel)
- [ ] Mobile device support

### Terminal Modes
- [x] Application cursor keys (DECCKM)
- [x] Auto-wrap mode (DECAWM)
- [x] Origin mode (DECOM)
- [x] Cursor visibility (DECTCEM)
- [x] Alternate screen buffer (modes 47, 1047, 1049)
- [x] Bracketed paste mode (2004)
- [ ] New line mode vs line feed mode
- [ ] Printer mode (ESC[5i / ESC[4i)

### Selection & Clipboard
- [x] Linear text selection
- [x] Copy to clipboard
- [x] Paste with bracketed paste mode
- [ ] Block mode selection
- [ ] Word boundary detection for double-click
- [ ] X11-style primary selection buffer
- [ ] Selection highlighting with proper masking

---

## Priority 3: Polish

### Rendering
- [x] 256 color palette
- [x] True color (24-bit RGB)
- [x] Bold, italic, underline attributes
- [x] Inverse video
- [~] Dim attribute (parsed, not rendered)
- [ ] Cursor blinking animation
- [ ] Strikethrough rendering
- [ ] Double underline distinction

### Configuration
- [x] Basic terminal dimensions
- [x] Working directory (cwd)
- [x] Shell selection
- [ ] Config change listeners/notification
- [ ] Dynamic config updates
- [ ] Theme integration

### OSC Sequences
- [x] OSC 0 - Set window title
- [x] OSC 2 - Set window title
- [x] OSC 7 - Set working directory (file:// URI)
- [ ] OSC 1 - Set icon name
- [ ] Robust file:// URI parsing

### Error Handling
- [x] Basic shell error handling
- [ ] UTF-8 validation and error recovery
- [ ] Partial UTF-8 sequence buffering
- [ ] PTY EOF/broken pipe handling
- [ ] Resize race condition handling
- [ ] Proper shell exit code tracking

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
- [ ] Handler registration system for DCS/APC
- [ ] Separation of concerns (parser vs terminal vs UI)

---

## Test Coverage

### Current Tests (71 total)
- 56 pure Jest unit tests
- 4 TsyneTest UI integration tests (require tsyne-bridge)
- 5 Shell integration tests
- 6 PTY integration tests

### Needed Tests
- [ ] DEC Special Graphics rendering
- [ ] Mouse protocol encoding
- [ ] Complex key sequences with modifiers
- [x] PTY integration tests
- [ ] Mobile/touch event tests
- [ ] Error recovery tests

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
