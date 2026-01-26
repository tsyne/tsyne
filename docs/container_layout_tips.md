# Container Layout Tips

Layout principles for Fyne (Go) and Tsyne (TypeScript) - these apply equally to both.

## VBox Does Not Expand Children

**Key insight:** `VBox` lays out children at their minimum height, stacked vertically. It does NOT expand children to fill available space.

This means if you put a `Border` layout inside a `VBox`, the border will only be as tall as its minimum content height, and its `bottom` content won't appear at the screen bottom.

### Broken Pattern

```go
// Go+Fyne - WRONG: Back button won't be at screen bottom
container.NewMax(
    container.NewVBox(
        container.NewBorder(
            header,    // top
            backButton, // bottom - will NOT be at screen bottom!
            nil, nil,
            content,   // center
        ),
    ),
)
```

```typescript
// Tsyne - WRONG: Same problem
a.max(() => {
    a.vbox(() => {
        a.border({
            top: () => { /* header */ },
            bottom: () => { /* back button - NOT at screen bottom! */ },
            center: () => { /* content */ }
        });
    });
});
```

### Working Pattern

Put expandable content directly in `Max` or `Border.center`, without a `VBox` wrapper:

```go
// Go+Fyne - CORRECT: Border expands to fill Max
container.NewMax(
    container.NewBorder(
        header,     // top
        backButton, // bottom - will be at screen bottom
        nil, nil,
        content,    // center
    ),
)
```

```typescript
// Tsyne - CORRECT: Same pattern
a.max(() => {
    a.border({
        top: () => { /* header */ },
        bottom: () => { /* back button - at screen bottom */ },
        center: () => { /* content */ }
    });
});
```

## When to Use Each Container

| Container | Behavior | Use For |
|-----------|----------|---------|
| `VBox` | Stacks children vertically at minimum height | Multiple items in a column |
| `HBox` | Stacks children horizontally at minimum width | Multiple items in a row |
| `Max` | Expands single child to fill all available space | Making content fill its parent |
| `Border` | Edges at minimum size, center expands | Header/footer layouts, toolbars |
| `Stack` | Overlays children, each can expand | Layered views, show/hide switching |

## Border Layout Tips

### Nil Center Expands Properly

When you want edges (top/bottom) to push apart with space between:

```go
// Go+Fyne: nil center acts as spacer
container.NewBorder(
    topContent,    // top
    bottomContent, // bottom
    nil, nil,
    nil,           // center - nil lets top/bottom push apart
)
```

```typescript
// Tsyne: omit center entirely
a.border({
    top: () => { /* ... */ },
    bottom: () => { /* ... */ }
    // no center - same effect as nil
});
```

### Don't Use Spacer in Center

Using an explicit spacer widget in the center can prevent proper expansion:

```typescript
// WRONG - may prevent border from expanding
a.border({
    top: () => { /* ... */ },
    center: () => { a.spacer(); }, // Don't do this!
    bottom: () => { /* ... */ }
});

// CORRECT - omit center
a.border({
    top: () => { /* ... */ },
    bottom: () => { /* ... */ }
});
```

## Dynamic Content Without VBox

If you need `removeAll()`/`add()` for dynamic content but can't use VBox:

1. **Build structure once, update content:** Create the layout at startup with placeholder labels, then use `label.setText()` to update text when content changes.

2. **Rebuild inside Max:** If the container supports `removeAll()`/`add()`, rebuild directly inside Max.

3. **Use Stack for view switching:** For show/hide between different views, use Stack with Max-wrapped children:

```typescript
a.stack(() => {
    homeView = a.max(() => { buildHomeScreen(); });
    folderView = a.max(() => { buildFolderScreen(); });
    folderView.hide();
});
```

## Debugging Layout Issues

If content appears in the wrong position:

1. **Check for VBox wrappers** around expandable content
2. **Verify border center** is nil/omitted, not an explicit spacer
3. **Test with pure Go+Fyne** to isolate Fyne behavior vs bridge issues
4. **Use screenshots** at each container level to see where expansion stops
