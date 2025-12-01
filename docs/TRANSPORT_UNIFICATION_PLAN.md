# Transport Unification Plan: Removing stdio, Achieving Full Equivalence

**Status:** In Progress
**Date:** 2025-12-01
**Goal:** Remove stdio transport, unify to synchronous request/response pattern across all transports

---

## Executive Summary

Currently, Tsyne has three transport implementations with architectural inconsistencies:
- **stdio**: Async handlers using `sendResponse()` to stdout
- **grpc**: Synchronous RPC with return values
- **msgpack-uds**: Partially synchronous (only 5 operations complete)

**Proposal:** Delete stdio, make both grpc and msgpack-uds fully synchronous with identical capabilities.

---

## Current State (Before Refactoring)

### Architecture Issues

1. **Two Handler Paths in Go:**
   - `handleMessage()` - Async, uses `sendResponse()`, 240+ message types
   - `handleMessageReturn()` - Sync, returns Response, only 5 message types

2. **Transport Mixing:**
   - msgpack-uds calls `handleMessage()` for unsupported operations
   - Those responses go to stdout (nowhere useful)
   - Result: 16 test failures in msgpack-uds mode

3. **Test Results:**
   - stdio: 134/134 tests pass ✅
   - grpc: 134/134 tests pass ✅
   - msgpack-uds: 118/134 tests pass ❌ (16 failures)

### Why stdio Must Go

1. **Architectural Complexity**: Requires separate async handler path
2. **stdout Pollution Risk**: JSON protocol on stdout is fragile
3. **Windows Compatibility**: Unix sockets don't work on Windows anyway
4. **Both Alternatives Exist**: grpc and msgpack-uds are better

---

## Completed Work

✅ **Phase 1: Transport Abstraction (Go side)**
- Created `Transport` interface
- Three implementations: `StdioTransport`, `GrpcTransport`, `MsgpackTransport`
- Removed mode flags (`grpcMode`, `msgpackMode`)
- Clean delegation: `bridge.transport.SendEvent()`

✅ **Phase 2: TypeScript Factory Pattern**
- Created `createBridge()` factory function
- Clean separation of concerns
- No mode-checking in implementations

✅ **Phase 3: stdio Removal (Partial)**
- Deleted `StdioTransport` from `transport.go`
- Deleted `runStdioMode()` from `main.go`
- Updated `main()` to only support grpc and msgpack-uds
- Updated `Transport` interface to only have `SendEvent()` (no `SendResponse()`)

---

## Remaining Work

### Critical Issue: 517 `sendResponse()` Calls

All handler functions still use the async pattern:
```go
func (b *Bridge) handleCreateButton(msg Message) {
    // ... create button
    b.sendResponse(Response{ID: msg.ID, Success: true})
}
```

Needs to become:
```go
func (b *Bridge) handleCreateButton(msg Message) Response {
    // ... create button
    return Response{ID: msg.ID, Success: true}
}
```

**Scope:**
- 517 `sendResponse()` calls across 24 files
- 240+ handler functions to modify
- Pattern variations (multi-line, nested structures, error cases)

---

## Refactoring Options

### Option A: Full Synchronous Refactoring ⭐ RECOMMENDED

**What:** Transform all 240+ handlers to return `Response` directly

**Pros:**
- Complete architectural clarity
- True transport equivalence
- Eliminates async complexity entirely
- All 134 tests pass on both transports

**Cons:**
- 2-4 hours of careful work
- High risk of syntax errors
- Needs thorough testing

**Approach:**
1. Manually transform handlers file-by-file (automated sed is too fragile)
2. Change signatures: `handleXxx(msg Message)` → `handleXxx(msg Message) Response`
3. Replace `b.sendResponse(Response{...})` with `return Response{...}`
4. Remove orphaned `return` statements
5. Update `handleMessage` switch to expect return values
6. Test incrementally after each file

**Estimated Time:** 3-4 hours

---

### Option B: Hybrid Response Map (Quick Fix)

**What:** Keep async handlers, but make them work with sync transports

**Implementation:**
```go
type Bridge struct {
    // ... existing fields
    responseMap sync.Map  // map[messageID]Response
}

func (b *Bridge) sendResponse(resp Response) {
    // Store in map instead of sending to stdout
    b.responseMap.Store(resp.ID, resp)
}

func (b *Bridge) handleMessage(msg Message) Response {
    // Call async handler
    b.handleCreateButton(msg)  // This calls sendResponse internally

    // Retrieve the response from map
    if resp, ok := b.responseMap.LoadAndDelete(msg.ID); ok {
        return resp.(Response)
    }
    return Response{ID: msg.ID, Success: false, Error: "No response stored"}
}
```

**Pros:**
- Minimal code changes (< 1 hour)
- Gets tests passing quickly
- Can migrate handlers gradually

**Cons:**
- Technical debt (two patterns coexist)
- Slight performance overhead (map operations)
- Not architecturally clean

**Estimated Time:** 30-45 minutes

---

### Option C: Gradual Migration (Long-term)

**What:** Use Option B as bridge, migrate handlers over time

**Phases:**
1. Implement response map (Option B) - Week 1
2. Migrate high-traffic handlers (queries, widget creation) - Week 2
3. Migrate medium-traffic handlers - Week 3
4. Complete migration, remove response map - Week 4

**Pros:**
- Lower risk (incremental changes)
- Tests stay green throughout
- Can prioritize critical paths

**Cons:**
- Takes longest overall
- Codebase inconsistency during migration
- Two patterns to maintain

---

## Recommendation

**Choose Option A** (Full Synchronous Refactoring)

**Reasoning:**
1. Clean architecture is worth the upfront investment
2. Only 3-4 hours to complete (manageable)
3. Eliminates all technical debt
4. Makes future development easier
5. No ongoing maintenance of hybrid solutions

**If timeline is critical:** Use Option B as temporary measure, but commit to Option A within 2 weeks.

---

## Implementation Steps (Option A)

### Step 1: Prepare
- [ ] Create backup branch: `git checkout -b backup-before-sync-refactor`
- [ ] Document current test baseline
- [ ] Create test script for continuous validation

### Step 2: Transform Core Files (High Priority)
Files to modify (in order):
1. `main.go` - Core message routing
2. `widget_creators_containers.go` - Most used (89 sendResponse calls)
3. `widget_properties.go` - Critical (112 calls)
4. `interactions.go` - Test-heavy (61 calls)
5. `widget_creators_display.go` - (35 calls)

### Step 3: Transform Supporting Files
6. `widget_creators_canvas.go` (40 calls)
7. `widget_creators_complex.go` (24 calls)
8. `widget_creators_inputs.go` (18 calls)
9. `dialogs.go` (35 calls)
10. `misc.go` (27 calls)
11. `window.go` (23 calls)
12. `widget_state.go` (16 calls)
13. `platform.go` (15 calls)
14. `containers.go` (14 calls)
15. `resources.go` (6 calls)
16. `sync_handlers.go` (1 call)

### Step 4: Delete Old Code
- [ ] Remove `sendResponse()` method from Bridge
- [ ] Remove `handleMessageReturn` (merged into handleMessage)
- [ ] Clean up unused imports

### Step 5: Test Validation
```bash
# Must pass with both transports
TSYNE_BRIDGE_MODE=grpc npm test
TSYNE_BRIDGE_MODE=msgpack-uds npm test
```

### Step 6: TypeScript Side
- [ ] Remove `stdio` from `BridgeMode` type
- [ ] Remove `BridgeConnection` (stdio implementation)
- [ ] Update `createBridge()` factory to only support grpc/msgpack-uds
- [ ] Update default mode to `msgpack-uds`
- [ ] Update documentation

---

## Windows Support Strategy

Since stdio is removed and msgpack-uds requires Unix sockets:

**Options for Windows:**
1. **Use gRPC** (already cross-platform) ✅ Recommended
2. **msgpack over TCP localhost** (future enhancement)
3. **msgpack over Named Pipes** (Windows equivalent of UDS)

**Recommendation:** Document that Windows users should use gRPC mode until named pipes support is added.

---

## Testing Strategy

### Continuous Validation
```bash
# Run after each file transformation
./test-both-transports.sh

# Contents:
#!/bin/bash
echo "Testing gRPC..."
TSYNE_BRIDGE_MODE=grpc npm test || exit 1
echo "Testing msgpack-uds..."
TSYNE_BRIDGE_MODE=msgpack-uds npm test || exit 1
echo "✅ Both transports pass!"
```

### Critical Tests
- game-of-life (11 tests) - Complex app
- components.test.ts (50+ tests) - Widget coverage
- accessibility.test.ts - Event handling
- canvas.test.ts - Graphics operations

---

## Risk Mitigation

1. **Syntax Errors:** Transform one file at a time, compile after each
2. **Semantic Errors:** Run full test suite after each file
3. **Regression:** Keep backup branch until stable
4. **Performance:** Benchmark before/after (shouldn't change)

---

## Success Criteria

✅ **Complete when:**
1. All 24 handler files transformed
2. `sendResponse()` method deleted
3. Both transports pass 134/134 tests
4. No performance regression
5. Documentation updated
6. TypeScript side cleaned up

---

## Timeline

### Fast Track (Option A)
- **Day 1 (3-4 hours):** Transform all handler files
- **Day 1 (1 hour):** Test validation and fixes
- **Day 2 (1 hour):** TypeScript cleanup and documentation
- **Total:** 5-6 hours

### Safe Track (Option B → A)
- **Week 1:** Implement response map (Option B), all tests green
- **Week 2-3:** Gradual migration of handlers
- **Week 4:** Remove response map, complete cleanup
- **Total:** 4 weeks (but can ship at week 1)

---

## Next Steps

**Immediate:**
1. Decide: Option A (fast, clean) or Option B (safe, incremental)
2. If Option A: Start with `main.go` and top 5 files
3. If Option B: Implement response map pattern
4. Create `test-both-transports.sh` validation script

**Questions to resolve:**
- Do we need to maintain backward compatibility during transition?
- Is 3-4 hour downtime acceptable for Option A?
- Should we add Windows named pipe support before removing stdio?

---

## Document History

- 2025-12-01: Initial plan created during refactoring
- Status: stdio partially removed, awaiting handler transformation decision
