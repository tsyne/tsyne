# Known Bugs in Solitaire

## Layout Shift Bug (Intermittent)

**Frequency**: ~1 in 10 presses of [Draw] button
**Symptom**: The view within the window shifts upward by approximately 1cm, causing the Draw button to become unclickable

### Root Cause Analysis

The bug is caused by complete UI rebuilds on every Draw press. When `draw()` is called, it triggers `rebuildUI()` which calls `window.setContent()`, destroying and recreating the entire widget tree with new IDs.

**Evidence from logs**:
- Initial load: `vbox_1` with single `handleSetContent` call
- After first Draw: NEW widget tree `vbox_70`, then `removeWidgetTree` deletes all old widgets (vbox_1 and children)
- Each subsequent Draw creates a completely new widget tree (vbox_141, vbox_214, etc.)

### Investigation Timeline

1. Initially thought status label presence/absence was causal - proved false
2. Investigated triple `setContent` calls on initial load vs single on rebuild
3. Fixed duplicate setContent calls by adding `contentSent` flag to Window class
4. Tests passed but bug still manifests intermittently in actual usage

### Current State

Despite ensuring consistent setContent behavior (1 call on init, 1 call on rebuild), the layout shift still occurs intermittently. The inconsistency suggests a race condition or timing issue in Fyne's layout engine when widget trees are completely destroyed and recreated.

**Key smoking gun**: `solitaire.ts:1125-1128`
```typescript
private draw(): void {
  this.game.drawThree();
  this.rebuildUI();  // ← COMPLETE UI REBUILD - destroys/recreates entire widget tree
  this.updateStatus('Drew cards');
}
```

User is not sure that is the smoking gun.

### Potential Solutions (Not Yet Implemented)

1. **Incremental updates instead of full rebuild**: Update only changed card images rather than destroying/recreating entire UI
2. **Investigate Fyne layout timing**: May need explicit layout refresh calls or delays
3. **Pin widget IDs**: Reuse widget IDs across rebuilds instead of generating new ones each time
4. **Observable pattern with ngShow**: Use declarative visibility instead of rebuilding (similar to todomvc-ngshow.ts)

### Related Files

- `examples/solitaire/solitaire.ts:1125-1128` - draw() method that triggers full rebuild
- `examples/solitaire/solitaire.ts:990-996` - rebuildUI() implementation
- `src/window.ts:73-86, 88-110` - setContent deduplication fix
- `examples/solitaire/draw-regression.test.ts` - Regression test (passes but doesn't catch intermittent case)
- `bridge/main.go:573-621` - handleSetContent implementation
