# Tsyne TODO

This document tracks future improvements, technical debt, and feature requests for the Tsyne project.

## Infrastructure & Architecture

### Custom ID Map Garbage Collection

**Priority**: Medium
**Status**: ✅ Complete
**Related**: `core/bridge/types.go`, `core/bridge/containers.go`, `core/bridge/interactions.go`

The bridge maintains a `customIds` map for test framework widget ID lookups (`.withId()` API). This map could grow indefinitely as widgets are created and destroyed during tests, especially with window content replacements.

**Implementation** (approaches #1 and #4):

1. **Reverse Mapping for O(1) Cleanup**: Added `widgetToCustomId map[string]string` to Bridge struct
   - Enables O(1) lookup when cleaning up destroyed widgets (vs O(n) iteration)
   - Both mappings maintained in `handleRegisterCustomId()`
   - Old mappings automatically removed when widget re-registered with new ID

2. **Automatic Purge on Widget Destruction**: `removeWidgetTree()` in `containers.go` now cleans up custom IDs:
   ```go
   if customID, exists := b.widgetToCustomId[widgetID]; exists {
       delete(b.customIds, customID)
       delete(b.widgetToCustomId, widgetID)
   }
   ```

3. **Explicit Cleanup APIs**: Added bridge handlers for test suites:
   - `clearAllCustomIds`: Bulk clear all mappings (returns count cleared)
   - `getCustomIdStats`: Get counts for debugging (customIdCount, reverseMapCount, widgetCount)

**Performance**: Benchmarks show **527x improvement** over linear search:
- Old O(n) method: 8,703 ns/op
- New O(1) method: 16.52 ns/op

**Tests**: `core/bridge/customid_gc_test.go` - 5 unit tests + 2 benchmarks

### Standalone tsyne Executable (tsyne.exe)

**Priority**: Medium
**Status**: Shell wrapper POC complete (`scripts/tsyne`)

Currently, running standalone Tsyne apps requires Node.js/npm installed on the system. The shell wrapper (`scripts/tsyne`) demonstrates the pattern but isn't a true standalone executable.

**Goal**: Create a self-contained `tsyne` / `tsyne.exe` that users can add to PATH for zero-friction single-file TypeScript GUI apps.

**Current state**:
- `scripts/tsyne` (shell wrapper): ~7 KB - requires system Node.js/npm
- `bin/tsyne-bridge` (Go/Fyne GUI binary): ~39 MB

**Production executable would bundle**:
- Node.js runtime (~40-80 MB)
- tsx + TypeScript compiler (~10-20 MB)
- tsyne npm package (JS sources) (~1 MB)
- tsyne-bridge binary (~39 MB)

**Actual size analysis** (measured):
- Node.js v22 binary: 189 MB
- Tsyne runtime + node_modules: 254 MB
- Total embedded: ~443 MB (impractical for single executable)

**Current solution** (`scripts/install.sh`):
- Install script: ~7 KB
- Installs to `~/.local/bin/tsyne` (or custom path)
- Runtime cached at `~/.tsyne/runtime/<version>/` (443 MB)
- This approach is more practical than embedding everything

**Implementation options**:
1. **Tauri**: Bundle Node.js + tsx + tsyne as a Tauri app
2. **pkg/nexe**: Package Node.js runtime with embedded modules
3. **Deno-style**: Custom TypeScript runtime (major undertaking)

**Module Resolution for tsyne.exe**:
When bundling Node.js, avoid NODE_PATH conflicts with system Node.js by using a custom ESM loader:

```rust
// In Tauri/Rust launcher
Command::new("bundled/node")
    .arg("--experimental-loader")
    .arg("file:///bundled/tsyne-esm-loader.mjs")
    .env("TSYNE_RUNTIME", bundled_runtime_path)
    .env("TSYNE_CACHE", cache_path)
    .env_remove("NODE_PATH")  // Don't interfere with system Node.js
    .arg("user-app.ts")
    .spawn()?;
```

The ESM loader (`tsyne-esm-loader.mjs`) would:
- Read `TSYNE_RUNTIME` and `TSYNE_CACHE` env vars
- Resolve `import 'tsyne'` to bundled runtime
- Resolve `@Grab` dependencies to cache directory
- No pollution of system NODE_PATH

**User experience goal**:
```bash
# Download single executable
curl -O https://releases.tsyne.dev/tsyne-linux-x64
chmod +x tsyne-linux-x64
sudo mv tsyne-linux-x64 /usr/local/bin/tsyne

# Run any .ts file with embedded dependencies
tsyne my-weather-app.ts
```

---

### Design Location for tsyne.exe-coupled Packages

**Priority**: Low
**Status**: Not started
**Related**: Standalone tsyne executable TODO above

When tsyne is distributed as a standalone executable (tsyne.exe), it needs to provide its own libraries (tsyne npm package) bundled within. This raises questions about package location design:

**Current state** (shell wrapper):
- tsyne libs: Used in-situ from PROJECT_ROOT via `.tsyne-modules/tsyne` symlink
- @Grab deps: Flat `~/.tsyne/packages/node_modules/`

**Questions to resolve for tsyne.exe**:
1. Where should bundled tsyne libs live within the executable?
2. Should they be extracted to a temp location at runtime, or accessed via virtual filesystem?
3. How to handle version conflicts if user has @Grab'd an older/newer version of a tsyne dependency?

**Potential approaches**:
- **Embedded virtual FS**: Keep tsyne libs inside executable, resolve via custom Node.js loader
- **Extract on first run**: Unpack to `~/.tsyne/runtime/<version>/`
- **pnpm-style content-addressable**: Store all packages (tsyne + @Grab) by content hash

---

### Content-Addressable Package Cache (pnpm-style)

**Priority**: Low
**Status**: Not started
**Related**: @Grab dependency management

Current @Grab cache (`~/.tsyne/packages/`) uses flat node_modules which can cause version conflicts. Consider migrating to pnpm-style content-addressable storage.

**Benefits**:
- No version conflicts between scripts with different @Grab versions
- Deduplication of shared dependencies
- Per-script virtual node_modules via symlinks

---

## Testing Improvements

### TsyneTest Dialog Support

**Priority**: Medium
**Status**: Not started

TsyneTest needs support for interacting with dialogs (showConfirm, showInfo, showError, etc.).

**Current limitation**: Tests cannot accept/dismiss dialogs, which prevents testing features that use confirmation dialogs (e.g., Clear button in terminal app).

**Potential approaches**:
1. Auto-accept/dismiss API: `ctx.autoAcceptDialogs()` / `ctx.autoDismissDialogs()`
2. Explicit dialog interaction: `ctx.acceptNextDialog()` / `ctx.dismissNextDialog()`
3. Dialog assertions: `ctx.expectDialog('title', 'message').accept()`

**Affected tests**:
- `ported-apps/terminal/terminal.test.ts` - "should clear terminal and remove all content" (currently skipped)

---

## Performance Optimizations

### Msgpack-UDS Transport Optimizations

**Priority**: Medium
**Status**: ✅ Complete (all 6 optimizations done)

The msgpack-uds transport has been optimized with buffer pooling, reduced syscalls, broadcast optimization, batching support, and encoder pooling.

#### #4: Broadcast Lock Contention Fix ✅

**Completed**: Pre-serialize events once before broadcast loop, collect connections first, then single lock for all writes.

**Implementation**: `msgpack_server.go:SendEvent()` - reduced lock/unlock cycles from N to 1.

**Measured gain**: Significant reduction in lock contention with multiple clients.

---

#### #5: Message Batching ✅

**Completed**: Added optional message batching with configurable window (default 2ms).

**Implementation**:
- `EnableBatching(window)` / `DisableBatching()` methods
- `SendEventBatched()` for queueable events
- `FlushBatch()` for immediate flush
- Auto-flush on timer expiry

**API**:
```go
server.EnableBatching(2 * time.Millisecond)
server.SendEventBatched(event)  // Queues for batch
server.FlushBatch()             // Immediate flush
```

---

#### #6: MessagePack Encoder Reuse ✅

**Completed**: Pooled encoder instances with buffer reuse via `sync.Pool`.

**Implementation**: `encoderPool` in `msgpack_server.go`, `encodeWithPool()` method.

**Measured gain**: 16% speed improvement, 35% memory reduction (750ns vs 890ns, 120B vs 184B per encode).

---

## Future Work

Add TODO items as needed for:
- Widget Library Expansion
- Documentation Updates
- Launchtop feature: clone of desktop.ts that launches apps as native OS windows instead of InnerWindow elements
