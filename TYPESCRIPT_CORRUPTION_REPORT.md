# TypeScript Corruption Report

**Date**: 2026-02-01
**Scope**: all_test.txt analysis of 126+ corrupted files
**Status**: Partially fixed

## Executive Summary

The test failures are primarily caused by **systematically corrupted import statements** across the entire codebase. This appears to be from an automated refactoring tool or merge conflict resolution that failed to properly handle import statements.

**Total affected files: 126+**

## Fixed Issues ✅

### 1. standaloneShutdownStrategyfrom (Missing Space)
- **Affected**: 126 files
- **Pattern**: `standaloneShutdownStrategyfrom 'tsyne'` → `standaloneShutdownStrategy } from 'tsyne'`
- **Fix Method**: Mass sed replacement
- **Status**: ✅ FIXED

### 2. Uninitialized Function Call
- **Affected**: 3 files
  - `ported-apps/alteredqualia-cars/index.ts`
  - `ported-apps/script-schmiede-fractals/index.ts`
  - `examples/cosyne3d-interactive-cubes.ts`
- **Pattern**: `appInstance.setOnLastWindowClose(standaloneShutdownStrategy)` → `appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance))`
- **Status**: ✅ FIXED

### 3. CosyneText.fill() Property Name
- **Affected**: 1 file (`cosyne/src/primitives/text.ts`)
- **Issue**: Used `color` instead of `fillColor` property
- **Impact**: 2 test failures in `cosyne/test/primitives.test.ts`
- **Status**: ✅ FIXED

## Remaining Issues ⚠️

### 1. Duplicate/Interleaved Import Blocks
- **Affected**: ~80-100 files (especially examples, ported-apps)
- **Pattern**: Metadata comments appear inline with import statements
- **Example**:
  ```typescript
  import { app, resolveTransport, TappableCanvasRaster } // @tsyne-app:name Pixel Editor
  // @tsyne-app:icon <svg...>
  // @tsyne-app:category graphics
  ```
- **Cause**: Likely from automated tool that split import statement at comment
- **Impact**: TS2300 (Duplicate identifier) errors across dozens of files
- **Difficulty**: HIGH - Requires intelligent parsing to separate imports from metadata

### 2. TypeScript Error Statistics
```
TS2300 (Duplicate identifier):  400+ instances
TS2304 (Cannot find name):      300+ instances
TS2345 (Type mismatch):          50+ instances
TS2552 (Cannot find / typo):     20+ instances
TOTAL:                           770+ errors
```

### 3. Worst Affected Files
| File | TS Errors | Primary Issue |
|------|-----------|---------------|
| pixeledit.ts | 60+ | Duplicate imports + metadata |
| waveform-visualizer/canvas.ts | 40+ | Same pattern |
| todomvc.ts | 30+ | Same pattern |
| Many examples/ files | 20+ each | Same pattern |

## Recommended Fix Strategy

### Phase 1 (Done ✅)
- [x] Fix missing space in "standaloneShutdownStrategyfrom"
- [x] Fix uninitialized function calls
- [x] Fix CosyneText fill property

### Phase 2 (Recommended)
**Option A: Automated Repair** (Risky)
```bash
# Remove metadata comments that appear inline with imports
find . -name "*.ts" -exec sed -E 's/ \/\/ @tsyne-app.*//' {} \;
```
- Risk: May remove legitimate inline comments
- Benefit: Fixes 80+ files at once

**Option B: Smart Parsing** (Safer)
- Parse each file to identify import statement boundaries
- Separate metadata from imports
- Preserve all content

**Option C: Manual Review** (Most Safe)
- Review worst 10 files manually
- Apply pattern-based fixes
- Test after each fix

## Test Impact

**Before fixes**:
- 10+ tests failing on assertions
- 80+ test suites failing to compile
- 770+ TypeScript errors

**After Phase 1 fixes**:
- Estimated 2-3 test suites now pass
- ~500+ TypeScript errors remain
- Duplicate import issue blocks remaining fixes

## Recommendations

1. **Immediate**: Run Phase 2 Option A (sed) on examples/ directory only
   - Lowest risk, highest concentration of issues
   - Can validate result before broader application

2. **Investigation**: Find root cause of corruption
   - When/how did the metadata get interleaved?
   - Which tool or command caused it?
   - Prevent recurrence

3. **Validation**: After each fix round
   - Run `npm test` on affected directories
   - Verify TypeScript compilation
   - Check that no new errors introduced

## Files Already Fixed

- ✅ /phone-apps/animated-spinner/animated-spinner-cosyne.ts
- ✅ /ported-apps/alteredqualia-cars/index.ts
- ✅ /ported-apps/script-schmiede-fractals/index.ts
- ✅ /examples/cosyne3d-interactive-cubes.ts
- ✅ /cosyne/src/primitives/text.ts
- ✅ (126 files with standaloneShutdownStrategyfrom)
