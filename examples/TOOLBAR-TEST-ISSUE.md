# Toolbar Button Visibility Issue in TsyneTest

## Summary

Toolbar buttons created with `app.toolbar([...])` are **not visible** to the TsyneTest framework, while regular buttons work fine. This is demonstrated by isolated tests that show the contrast between working and broken widget types.

## Test Results

Run: `TSYNE_HEADED=0 xvfb-run -a npx jest examples/toolbar-isolation.test.ts`

### ✅ PASSING (2/5 tests)
- **CONTROL: Regular buttons in vbox are visible** - Regular `app.button()` works
- **CONTROL: Regular buttons in border.top ARE visible** - Regular buttons work even in border layouts

### ❌ FAILING (3/5 tests)
- **ISSUE: Toolbar buttons are NOT visible** - `app.toolbar([{ type: 'action', label: 'X' }])` buttons not found
- **ISSUE: Toolbar in border.top is NOT visible** - Toolbar buttons in `border.top` not found
- **MIXED: Toolbar + regular buttons to show contrast** - Shows toolbar buttons fail while regular buttons work

## Key Findings

1. **Regular buttons work everywhere**: `app.button('Label').onClick(() => {});` buttons are correctly found by `ctx.getByText('Label')`

2. **Toolbar buttons are invisible to tests**: `app.toolbar([{ type: 'action', label: 'Label', onAction: () => {} }])` buttons cannot be found by `ctx.getByText('Label')`

3. **The issue is toolbar-specific**: It's not related to:
   - Border layout (regular buttons work in border.top)
   - Widget nesting (regular buttons work in vbox/hbox)
   - Test framework setup (control tests pass)

4. **Affects multiple examples**:
   - image-viewer: 10/14 tests fail (toolbar buttons)
   - pixeledit: 10/10 tests fail (toolbar buttons)
   - game-of-life: Many tests fail (toolbar buttons)

## Technical Details

### Working Pattern (Regular Button)
```typescript
app.button('My Button').onClick(() => { console.log('clicked'); });
```
**Result**: ✅ `ctx.getByText('My Button')` finds the widget

### Broken Pattern (Toolbar Button)
```typescript
app.toolbar([
  { type: 'action', label: 'My Button', onAction: () => {
    console.log('clicked');
  }}
]);
```
**Result**: ❌ `ctx.getByText('My Button')` does not find the widget

## Hypothesis

The toolbar widget likely:
1. Creates a Fyne `widget.Toolbar` container
2. The toolbar items are sub-widgets not registered in the main widget tree
3. The test framework's `getWidgets` traversal doesn't descend into toolbar items
4. Need to either:
   - Add toolbar item traversal to `getWidgets` in bridge/main.go
   - Expose toolbar items differently to the widget tree
   - Add special handling for toolbar containers

## Reproduction

```bash
# Run isolated tests showing the issue
npm run build
TSYNE_HEADED=0 xvfb-run -a npx jest examples/toolbar-isolation.test.ts --verbose

# Expected: 2 passing (controls), 3 failing (toolbar issues)
```

## Impact

This issue blocks testing of any application that uses toolbars, including:
- File operations (Open, Save, Close)
- Zoom controls in toolbars
- Edit operations (Cut, Copy, Paste)
- Application-specific toolbar actions

All these apps have functional UI (toolbar buttons work when run manually), but tests cannot verify their behavior automatically.

## Next Steps

1. Investigate `bridge/main.go` `getWidgets` implementation
2. Check if Fyne toolbar items are properly traversable
3. Add toolbar-specific widget discovery logic if needed
4. Test fix against these isolated tests
5. Verify fix resolves image-viewer, pixeledit, and game-of-life test failures
