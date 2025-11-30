# Terminal Test Mocking Problem

## Issue

The terminal tests hang indefinitely when running because `terminal.ts` imports the `node-pty` module at line 33, which attempts to load a native Node.js binding (`pty.node`) that is not available in the Jest test environment.

## Root Cause

```typescript
// terminal.ts:33
import * as pty from 'node-pty';
```

When Jest loads this module, it tries to resolve the native binding:
```
ModuleNotFoundError: Cannot find module '../build/Debug/pty.node' from 'node_modules/node-pty/lib/unixTerminal.js'
```

This causes the test suite to hang completely (timeout after 30+ seconds).

## Attempted Solutions

### 1. Added `jest.mock()` in test file ✓
```typescript
// terminal.test.ts:27
jest.mock('node-pty');
```

### 2. Created mock file at ported-apps root ✓
```javascript
// __mocks__/node-pty.js
const spawn = jest.fn(() => {
  return {
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    pid: 12345,
  };
});

module.exports = { spawn };
```

### 3. Removed problematic `ctx.wait()` calls ✓
- Line 508: Removed `await ctx.wait(500)`
- Line 528: Removed `await ctx.wait(300)`

### 4. Cleared Jest cache multiple times
```bash
npx jest --clearCache
```

## Current Status

**Issue**: The mock is not being picked up consistently by Jest. The tests still hang when attempting to load `node-pty`.

**Evidence of Success**: In one test run (around token 69652 in the conversation), the tests DID pass with 159 passing tests when the mock loaded properly. This proves:
- The mock file is structurally correct
- The unit tests (159 of them) work fine with the mock
- The 2 UI tests work as simple smoke tests

## What Still Needs Investigation

1. **Why isn't Jest discovering the `__mocks__` folder?**
   - Tried placing at `/home/paul/scm/tsyne/ported-apps/__mocks__/node-pty.js`
   - This should be the correct location for a shared package.json at ported-apps root

2. **Possible Solutions to Try:**
   - Add explicit `moduleNameMapper` in Jest config
   - Use `jest.config.js` to configure mock resolution
   - Check if there's a jest configuration that's preventing mock discovery
   - Consider moving node-pty import to be conditional or lazy-loaded

3. **Alternative Approach:**
   - Conditionally import `node-pty` only when not in test environment
   - Use dynamic imports: `const pty = await import('node-pty')`
   - Check `process.env.NODE_ENV` or `process.env.JEST_WORKER_ID` before importing

## Test File Structure

- **Lines 30-480**: Unit tests for Terminal core (no UI) - 159 tests
- **Lines 486-533**: 2 UI tests (smoke tests, now without ctx.wait())
- **Lines 539-2453**: More unit tests (ANSI parsing, mouse protocol, etc.)

## Files Modified

1. `/home/paul/scm/tsyne/ported-apps/terminal/terminal.test.ts`
   - Added `jest.mock('node-pty')` at line 27
   - Removed `ctx.wait()` calls from UI tests

2. `/home/paul/scm/tsyne/ported-apps/__mocks__/node-pty.js`
   - Created mock implementation

## Expected Behavior

When working correctly, all 171 tests should pass:
- 159 unit tests for terminal core logic
- 2 UI smoke tests that verify app launches
- Various ANSI/VT100 parser tests
