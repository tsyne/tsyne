# Tsyne TODO

This document tracks future improvements, technical debt, and feature requests for the Tsyne project.

## Infrastructure & Architecture

### Add stdin/stdout IPC Safeguards

**Priority**: Medium
**Status**: Not started

The current IPC mechanism between Node.js and the Go bridge uses stdin/stdout for JSON-RPC communication. While this works, it's fragile and risky.

**Risks:**
- Any accidental stdout writes in Go code (debug prints, panics, third-party libraries) corrupt the JSON stream
- Fyne or other dependencies might unexpectedly write to stdout
- Hard to add logging/debugging without breaking the protocol
- One stray `fmt.Println()` can crash the entire application

**Proposed safeguards for v0.1.x:**
1. Add `log.SetOutput(os.Stderr)` to redirect all Go logging to stderr
2. Wrap all stdout writes with mutex protection
3. Add framing protocol (length-prefix or magic markers) for better recovery
4. Document IPC risks and best practices in ARCHITECTURE.md
5. Add validation/checksums to JSON messages

**Long-term migration (v0.2.0+):**
- Migrate to Unix Domain Sockets (Linux/macOS) with fallback to TCP localhost (Windows)
- Completely isolates IPC from stdout, allowing free logging and debugging
- Industry standard approach used by Chrome DevTools Protocol, Language Server Protocol

**Related Files:**
- `bridge/main.go` - Go bridge process
- `src/bridge.ts` - Node.js IPC client
- `ARCHITECTURE.md` - Architecture documentation

---

## Future Sections

Add additional TODO categories as needed:
- Widget Library Expansion
- Testing Improvements
- Documentation Updates
- Performance Optimizations
