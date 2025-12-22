# Transport Unification: Remaining Work

**Status:** Nearly Complete
**Last Updated:** 2025-12-22

## Summary

The major refactoring work is done. All 240+ handlers now return `Response` directly instead of calling `sendResponse()` internally. The synchronous pattern is fully implemented.

## Remaining Task: Remove stdio Fallback

`runStdioMode()` still exists in `core/bridge/main.go` as the default fallback (line 867):

```go
default:
    runStdioMode(testMode)
```

**To complete the unification:**

1. Delete `runStdioMode()` function from `main.go`
2. Delete `sendResponse()` method from `types.go` (only used by stdio)
3. Change default to `grpc` or `msgpack-uds`
4. Update TypeScript side to remove stdio from `BridgeMode` type
5. Test both remaining transports pass all tests

**Why it was kept:** Backwards compatibility / safe fallback during transition.

**Risk:** Low - both grpc and msgpack-uds are stable and pass all tests.
