# Tsyne TODO

This document tracks future improvements, technical debt, and feature requests for the Tsyne project.

## Infrastructure & Architecture

### Custom ID Map Garbage Collection

**Priority**: Medium
**Status**: Not started
**Related**: `bridge/main.go` - `customIds map[string]string`

The bridge maintains a `customIds` map for test framework widget ID lookups (`.withId()` API). This map could grow indefinitely as widgets are created and destroyed during tests, especially with window content replacements.

**Potential Solutions:**

1. **Purge on Widget Destruction**: Clear custom ID mappings when widgets are removed from `b.widgets` map
   - Pro: Automatic cleanup aligned with widget lifecycle
   - Con: Need to track reverse mapping (widgetID → customID) or iterate map on each deletion

2. **Mark as Stale**: Add metadata to track stale IDs and warn on lookup
   - Pro: Helps debug test issues with deleted widgets
   - Con: Doesn't actually reclaim memory

3. **Correlate with Original Locator**: Track which test/locator registered each ID
   - Pro: Better diagnostics and scoping
   - Con: More complex bookkeeping

4. **Per-Test Cleanup**: Add bridge API for tests to clear their custom IDs
   - Pro: Explicit control, aligns with test lifecycle
   - Con: Requires test framework integration

**Recommendation**: Start with approach #1 (purge on destruction) as it's simplest and aligns with existing widget lifecycle management. Consider adding #4 as explicit cleanup API for test suites.

### Migrate to Unix Domain Sockets

**Priority**: Low (v0.2.0+)
**Status**: Not started

Migrate IPC from stdin/stdout to Unix Domain Sockets (Linux/macOS) with fallback to TCP localhost (Windows). This would allow unrestricted logging and debugging.

---

## Future Work

Add TODO items as needed for:
- Widget Library Expansion
- Testing Improvements
- Documentation Updates
- Performance Optimizations
