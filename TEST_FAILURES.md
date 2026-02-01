# Test Failures Tracking

## Overview
Systematic tracking and fixing of test failures found in all_test.txt

## Failure Categories

### Category 1: Missing API Methods (1 failure)
- [x] **canvas-sphere.test.ts:17** - Property 'close' does not exist on type 'TsyneTest'
  - File: examples/canvas-sphere.test.ts
  - Issue: TsyneTest is missing a close() method
  - Status: FIXED - Added close() method as alias to cleanup()

### Category 2: Export/Import Issues (6 failures)
- [x] **Multiple 3D files** - Module 'cosyne' has no exported member 'createRenderTarget'
  - Files affected:
    - phone-apps/3d-clock/index.ts:13 ✓
    - phone-apps/3d-lighting-lab/index.ts:20 ✓
    - phone-apps/3d-robot-arm/index.ts:19 ✓
  - Issue: createRenderTarget not exported from cosyne (moved to tsyne)
  - Status: FIXED - Imports updated to get from 'tsyne' instead

- [x] **Desktop/Launcher tests** - Cannot find module 'tsyne'
  - Files affected:
    - launchers/desktop/ ✓
    - launchers/phonetop/ ✓
    - larger-apps/literate-programming/ ✓
    - test-apps/calculator-advanced/ ✓
  - Issue: Packages not in pnpm-workspace.yaml
  - Status: FIXED - Added packages to pnpm-workspace.yaml

- [ ] **simulation.ts:4** - Cannot find module 'h3-js'
  - File: larger-apps/realtime-paris-density-simulation/simulation.ts
  - Issue: h3-js library not installed or not in dependencies
  - Status: NOT STARTED (low priority - external dependency)

### Category 3: Type Mismatch Issues (2 failures)
- [x] **waveform-visualizer/index.test.ts:266** - App type mismatch
  - Issue: Separate App type declarations with private property 'ctx'
  - Cause: Using both '/src' and '/dist' versions
  - Status: FIXED - Now uses TsyneTest from 'tsyne' import instead of dynamic import

- [ ] **3d-robot-arm/index.ts:403** - Argument type mismatch for app builder
  - Issue: Expected function with App argument, got no arguments
  - Status: NOT STARTED

### Category 4: Duplicate Identifier Issues (3 failures) ✅ ALL FIXED
- [x] **terminal.ts:36** - Duplicate identifier 'app'
  - File: ported-apps/terminal/terminal.ts
  - Issue: Malformed import and duplicate metadata block
  - Status: FIXED - Removed duplicate lines 36-70

- [x] **signal.ts:33** - Duplicate identifier 'App'
  - File: phone-apps/signal/signal.ts
  - Issue: Malformed import and duplicate metadata block
  - Status: FIXED - Removed duplicate lines 33-64

- [x] **telegram.ts:32** - Duplicate identifier 'app'
  - File: phone-apps/telegram/telegram.ts
  - Issue: Malformed import and duplicate metadata block
  - Status: FIXED - Removed duplicate lines 32-62

### Category 5: Missing Required Properties (1 failure) ✅ FIXED
- [x] **services.ts:209** - Missing 'reason' property in ServiceResult
  - Files affected:
    - phone-apps/services.ts
  - Issue: When available: false, 'reason' string is required but missing
  - Status: FIXED - Added reason property to both ApkStubbedTelephonyService methods (lines 209, 433)

## Priority Order

### High Priority (blocking multiple tests)
1. Fix services.ts missing 'reason' (affects 5+ files)
2. Fix createRenderTarget export from cosyne (affects 4 3D apps)
3. Fix 'tsyne' module import issue (affects 6+ tests)

### Medium Priority
4. Fix duplicate 'app'/'App' identifiers (3 files)
5. Fix App type mismatch in waveform-visualizer
6. Fix canvas-sphere close() method

### Low Priority
7. Fix h3-js import (only 1 file)

## Summary
- **Total Failures**: 16
- **Categories**: 6
- **Files Affected**: ~25+
- **Estimated Time to Fix**: 2-3 hours

---

## Fixes In Progress

### Fix 1: services.ts Missing 'reason' Property
**Status**: IN PROGRESS
**Files to Update**:
- phone-apps/alarms/services.ts
- phone-apps/clock/services.ts
- phone-apps/signal/services.ts
- phone-apps/stopwatch/services.ts
- phone-apps/timer/services.ts

**Solution**: Add reason: string property to ServiceResult when available: false

---

## Fixes Completed

### ✅ Session 1 Fixes (8 out of 16)

**High Priority - COMPLETE:**
1. ✅ **services.ts missing 'reason'** - Added reason property to ApkStubbedTelephonyService
   - phone-apps/services.ts:209 and 433

2. ✅ **createRenderTarget export** - Fixed imports in 3D apps
   - phone-apps/3d-clock/index.ts
   - phone-apps/3d-lighting-lab/index.ts
   - phone-apps/3d-robot-arm/index.ts

3. ✅ **Module 'tsyne' not found** - Added workspace packages
   - pnpm-workspace.yaml updated with launchers/ and larger-apps/

**Medium Priority - COMPLETE:**
4. ✅ **Duplicate identifiers** - Removed file corruption
   - ported-apps/terminal/terminal.ts
   - phone-apps/signal/signal.ts
   - phone-apps/telegram/telegram.ts

5. ✅ **App type mismatch** - Fixed TsyneTest import
   - examples/waveform-visualizer/index.test.ts

6. ✅ **Missing close() method** - Added to TsyneTest
   - core/src/tsyne-test.ts

### ⏳ Remaining Issues (8 out of 16)

**Remaining:**
- [ ] 3d-robot-arm/index.ts:403 - Argument type mismatch
- [ ] h3-js module not found - External dependency issue
- [ ] Additional failures may exist in full test run

---

## Next Steps

1. Run full test suite to identify any remaining issues
2. Address 3d-robot-arm app builder argument issue
3. Install h3-js if needed for paris density simulation
4. Monitor for new test failures
