# Test Failures Summary

Extracted from `all_test.txt`. Most failures are "Test suite failed to run" (import/setup errors) rather than assertion failures.

**Overall: 10 tests failed across multiple suites**

## Fixes Applied

### Fixed TypeScript Errors
1. **126 files**: Fixed `standaloneShutdownStrategyfrom` (missing space) → `standaloneShutdownStrategy } from`
2. **3 files**: Fixed `standaloneShutdownStrategy` not being called with app instance
   - `ported-apps/alteredqualia-cars/index.ts`
   - `ported-apps/script-schmiede-fractals/index.ts`
   - `examples/cosyne3d-interactive-cubes.ts`
3. **1 file**: Fixed `CosyneText.applyFill()` to use `fillColor` property name
   - `cosyne/src/primitives/text.ts`
4. **1 file**: Fixed corrupted imports in `phone-apps/animated-spinner/animated-spinner-cosyne.ts`

---

## Cosyne Tests (2 failures)

| Test File | Status |
|-----------|--------|
| `cosyne/test/primitives.test.ts` | 2 tests failed |
| `cosyne/test/interactive-cubes.tsyne.test.ts` | Suite failed to run |

---

## Examples Tests (17 suites failed to run)

| Test File | Status |
|-----------|--------|
| `canvas-sphere.test.ts` | Suite failed to run |
| `waveform-visualizer/widget.test.ts` | Suite failed to run |
| `waveform-visualizer/canvas.test.ts` | Suite failed to run |
| `waveform-visualizer/index.test.ts` | Suite failed to run |
| `waveform-visualizer/screenshots.test.ts` | Suite failed to run |
| `todomvc.test.ts` | Suite failed to run |
| `todomvc-when.test.ts` | Suite failed to run |
| `full-calculator.test.ts` | Suite failed to run |
| `registration-form.test.ts` | Suite failed to run |
| `tictactoe.test.ts` | Suite failed to run |
| `tictactoe-accessible.test.ts` | Suite failed to run |
| `tictactoe-high-contrast.test.ts` | Suite failed to run |
| `tictactoe-mespeak.test.ts` | Suite failed to run |
| `daily-checklist.test.ts` | Suite failed to run |
| `daily-checklist-mvc.test.ts` | Suite failed to run |
| `animation-demo.test.ts` | Suite failed to run |
| `calculator.test.ts` | Suite failed to run |

---

## Ported Apps Tests (42 suites failed to run)

### 3d-cube
- `3d-cube.logic.test.ts`
- `cube-rotation.test.ts`
- `3d-cube.test.ts`

### calcudoku
- `calcudoku.logic.test.ts`
- `calcudoku.test.ts`

### chess
- `chess-integration.test.ts`
- `chess-e2e.test.ts`

### falling-blocks
- `falling-blocks.logic.test.ts`

### falling-letters
- `falling-letters.logic.test.ts`

### find-pairs
- `find-pairs.logic.test.ts`
- `find-pairs.test.ts`

### fyles
- `fyles.test.ts`
- `fyles-navigation.test.ts`
- `fyles-multipanel.test.ts`

### game-of-life
- `game-of-life.test.ts`
- `game-of-life-debug.test.ts`
- `screenshot-on-failure.test.ts`

### image-viewer
- `image-viewer.test.ts`

### mahjongg
- `mahjongg.logic.test.ts`
- `mahjongg.test.ts`

### peg-solitaire
- `peg-solitaire.logic.test.ts`
- `peg-solitaire.test.ts`

### pixeledit (5 failures)
- `pixeledit.test.ts`
- `pixeledit-advanced-features.test.ts`
- `pixeledit-layers-selection.test.ts`
- `pixeledit-effects.test.ts`
- `pixeledit-pencil.test.ts`

### prime-grid-visualizer
- `prime-grid-visualizer.test.ts`

### slydes
- `slydes.test.ts`

### solitaire (7 failures)
- `solitaire.logic.test.ts`
- `solitaire.ui.test.ts`
- `card-image-provider.test.ts`
- `solitaire.integration.test.ts`
- `hand-click.test.ts`
- `draw-regression.test.ts`
- `draw-test-no-status.test.ts`

### slider-puzzle
- `slider-puzzle.logic.test.ts`
- `slider-puzzle.test.ts`

### sudoku
- `sudoku.logic.test.ts`
- `sudoku.test.ts`

### tango-puzzle
- `tango-puzzle.logic.test.ts`
- `tango-puzzle.test.ts`

### terminal
- `terminal.test.ts`

### zip-puzzle
- `zip-puzzle.logic.test.ts`
- `zip-puzzle.test.ts`

---

## Phone Apps Tests (19 suites failed)

| Test File | Status |
|-----------|--------|
| `animated-spinner-cosyne.test.ts` | 4 tests failed |
| `gauge-cosyne.test.ts` | 2 tests failed |
| `heatmap-cosyne.test.ts` | 2 tests failed |
| `alarms.test.ts` | Suite failed to run |
| `burning-ship.test.ts` | Suite failed to run |
| `clock.test.ts` | Suite failed to run |
| `eliza.test.ts` | Suite failed to run |
| `eyes.test.ts` | Suite failed to run |
| `hexview.test.ts` | Suite failed to run |
| `julia-set.test.ts` | Suite failed to run |
| `mandelbrot.test.ts` | Suite failed to run |
| `minefield.test.ts` | Suite failed to run |
| `newton-fractal.test.ts` | Suite failed to run |
| `signal-tsyne.test.ts` | Suite failed to run |
| `stopwatch.test.ts` | Suite failed to run |
| `telegram.test.ts` | Suite failed to run |
| `timer.test.ts` | Suite failed to run |
| `tricorn.test.ts` | Suite failed to run |

---

## Launcher Tests (6 suites failed)

| Test File | Status |
|-----------|--------|
| `desktop-remote-control.test.ts` | Suite failed to run |
| `desktop.test.ts` | Suite failed to run |
| `phonetop-tsyne.test.ts` | Suite failed to run |
| `phonetop-folder-debug.test.ts` | Suite failed to run |
| `litprog.test.ts` | Suite failed to run |

---

## Larger Apps Tests (2 suites failed)

| Test File | Location |
|-----------|----------|
| `simulation.test.ts` | realtime-paris-density-simulation |
| `app.test.ts` | realtime-paris-density-simulation |

---

## Test Apps (1 suite failed)

| Test File | Status |
|-----------|--------|
| `test-apps/calculator-advanced/calculator.test.ts` | Suite failed to run |

---

## Common Issues

1. **"Test suite failed to run"** - Usually import errors or missing dependencies
2. **"Worker process failed to exit gracefully"** - Test teardown issues, timers not cleaned up
3. **Android build failed** - Go bridge ARM build issue (non-fatal)

---

## Priority Fixes

### High Priority (actual test failures)
1. `cosyne/test/primitives.test.ts` - 2 test failures
2. `animated-spinner-cosyne.test.ts` - 4 test failures
3. `gauge-cosyne.test.ts` - 2 test failures
4. `heatmap-cosyne.test.ts` - 2 test failures

### Medium Priority (suite setup issues)
- Fix import/setup issues causing "suite failed to run"
- Likely a common root cause (import path, missing export, etc.)

---

---

## Root Cause Analysis: TypeScript Corruption

### Systematic Issues Identified

Multiple files (126+) have corrupted import statements with consistent patterns:

1. **Missing space in "standaloneShutdownStrategyfrom"**
   - Pattern: `standaloneShutdownStrategyfrom 'tsyne'`
   - Should be: `standaloneShutdownStrategy } from 'tsyne'`
   - Status: ✅ Mass-fixed via sed script

2. **Duplicate import blocks**
   - Pattern: Import statements appear twice with mixed/broken syntax
   - Examples: `examples/calculator.ts`, `examples/todomvc.ts`, `examples/animation-elegant.ts`
   - Status: ⚠️ Requires deeper investigation - appears to be from botched refactoring

3. **standaloneShutdownStrategy not being called**
   - Pattern: `appInstance.setOnLastWindowClose(standaloneShutdownStrategy)`
   - Should be: `appInstance.setOnLastWindowClose(standaloneShutdownStrategy(appInstance))`
   - Status: ✅ Fixed in 3 files

### TypeScript Error Summary
- **TS2300** (Duplicate identifier) - 400+ instances in cosyne tests and example files
- **TS2304** (Cannot find name) - 300+ instances (broken imports)
- **TS2345** (Type mismatch) - 50+ instances (wrong function signature)
- **TS2552** (Cannot find / Did you mean) - 20+ instances (typos)

### Files with Worst Corruption
- `pixeledit.ts` - 60+ TS errors (duplicate imports)
- `waveform-visualizer/canvas.ts` - 40+ TS errors
- `todomvc.ts` - 30+ TS errors

*Last updated: 2026-02-01*
