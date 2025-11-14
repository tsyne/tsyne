# Root Cause Analysis: Toolbar Button Visibility in Tsyne Tests

## Issue Summary

Toolbar buttons cannot be found by TsyneTest framework while regular buttons work fine.

## Root Cause Found

The issue is in `bridge/main.go` in the `handleCreateToolbar` function (lines 2785-2835).

### The Problem

When a toolbar is created:

```go
func (b *Bridge) handleCreateToolbar(msg Message) {
    // ... create toolbar items ...
    for _, itemInterface := range itemsInterface {
        itemData := itemInterface.(map[string]interface{})
        itemType := itemData["type"].(string)

        switch itemType {
        case "action":
            label := itemData["label"].(string)  // ✅ Label IS extracted
            callbackID := itemData["callbackId"].(string)

            action := widget.NewToolbarAction(nil, func() { ... })

            _ = label  // ❌ BUT THEN DISCARDED! (line 2812)
            toolbarItems = append(toolbarItems, action)
        }
    }

    toolbar := widget.NewToolbar(toolbarItems...)

    b.widgets[id] = toolbar
    b.widgetMeta[id] = WidgetMetadata{
        Type: "toolbar",
        Text: "",  // ❌ EMPTY TEXT!
    }
}
```

### How Tests Search for Widgets

From `handleFindWidget` (line 3383):

```go
func (b *Bridge) handleFindWidget(msg Message) {
    selector := msg.Payload["selector"].(string)
    selectorType := msg.Payload["type"].(string)

    for widgetID, meta := range b.widgetMeta {
        switch selectorType {
        case "text":
            isMatch = strings.Contains(meta.Text, selector)  // Searches meta.Text
        case "exactText":
            isMatch = meta.Text == selector
        }
        // ...
    }
}
```

**The Problem**:
- Toolbar metadata has `Text: ""` (empty)
- Individual toolbar action labels are never stored
- Tests search `widgetMeta[id].Text` which is always empty for toolbars
- Therefore toolbar buttons are NEVER found

## Proof via Pure Go+Fyne Test

Run: `cd bridge && go run ../examples/toolbar-fyne-test.go`

Output shows:
```
✅ SUCCESS: Found both regular buttons
❌ ISSUE CONFIRMED: Toolbar buttons NOT found in widget tree
```

The test demonstrates that:
1. Regular button widgets have accessible Text fields
2. Fyne's `widget.ToolbarAction` doesn't expose text publicly
3. Toolbar items are stored in an internal slice, not traversable like regular widgets

## The Fix

Two approaches to fix this:

### Option 1: Store Toolbar Action Labels in Metadata (Recommended)

Modify `handleCreateToolbar` to store action labels:

```go
func (b *Bridge) handleCreateToolbar(msg Message) {
    id := msg.Payload["id"].(string)
    itemsInterface := msg.Payload["items"].([]interface{})

    var toolbarItems []widget.ToolbarItem
    var actionLabels []string  // NEW: Track labels

    for _, itemInterface := range itemsInterface {
        itemData := itemInterface.(map[string]interface{})
        itemType := itemData["type"].(string)

        switch itemType {
        case "action":
            label := itemData["label"].(string)
            callbackID := itemData["callbackId"].(string)

            action := widget.NewToolbarAction(nil, func() { ... })
            toolbarItems = append(toolbarItems, action)
            actionLabels = append(actionLabels, label)  // NEW: Store label
        // ... handle separator/spacer ...
        }
    }

    toolbar := widget.NewToolbar(toolbarItems...)

    b.widgets[id] = toolbar
    b.widgetMeta[id] = WidgetMetadata{
        Type: "toolbar",
        Text: strings.Join(actionLabels, " "),  // NEW: Store all labels
        ToolbarItems: actionLabels,             // NEW: Store individual labels
    }
}
```

Also extend `WidgetMetadata` struct:

```go
type WidgetMetadata struct {
    Type         string
    Text         string
    ToolbarItems []string  // NEW: For toolbar action labels
}
```

Then modify `handleFindWidget` to search toolbar items:

```go
func (b *Bridge) handleFindWidget(msg Message) {
    // ... existing code ...

    for widgetID, meta := range b.widgetMeta {
        var isMatch bool
        switch selectorType {
        case "text", "exactText":
            // Check main text
            isMatch = /* existing text match logic */

            // NEW: Also check toolbar items
            if !isMatch && meta.Type == "toolbar" {
                for _, toolbarLabel := range meta.ToolbarItems {
                    if selectorType == "text" {
                        isMatch = strings.Contains(toolbarLabel, selector)
                    } else {
                        isMatch = toolbarLabel == selector
                    }
                    if isMatch {
                        break
                    }
                }
            }
        }
        // ...
    }
}
```

### Option 2: Create Sub-widgets for Toolbar Actions

Create separate widget entries for each toolbar action:

```go
func (b *Bridge) handleCreateToolbar(msg Message) {
    id := msg.Payload["id"].(string)
    // ...

    for i, itemInterface := range itemsInterface {
        switch itemType {
        case "action":
            label := itemData["label"].(string)
            action := widget.NewToolbarAction(nil, func() { ... })
            toolbarItems = append(toolbarItems, action)

            // NEW: Register each action as a sub-widget
            actionID := fmt.Sprintf("%s-action-%d", id, i)
            b.widgets[actionID] = action
            b.widgetMeta[actionID] = WidgetMetadata{
                Type: "toolbar-action",
                Text: label,
            }
        }
    }
}
```

## Impact

This fix will resolve test failures in:
- **image-viewer**: 10/14 tests currently failing → would pass
- **pixeledit**: 10/10 tests currently failing → would pass
- **game-of-life**: Multiple tests failing → would pass
- Any other app using toolbars

## Testing the Fix

After implementing the fix, verify with:

```bash
# Isolated toolbar tests should pass
TSYNE_HEADED=0 xvfb-run -a npx jest examples/toolbar-isolation.test.ts
# Expected: 5/5 passing (currently 2/5)

# Image viewer tests should improve
TSYNE_HEADED=0 xvfb-run -a npx jest examples/image-viewer/image-viewer.test.ts
# Expected: 14/14 passing (currently 4/14)
```
