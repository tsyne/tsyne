# Overlays and Z-Layers in Tsyne - TODO

## Current State

Already implemented:
- Context menus (`widget.setContextMenu()`)
- Modal dialogs (`window.showInfo()`, `showConfirm()`)
- File pickers (`window.showFileOpen()`, etc.)
- Basic popup (`popup()` function)

This document tracks **proposed** overlay features not yet implemented.

---

## Proposed: Custom Overlay Widget

```typescript
const { vbox, label, button, overlay } = tsyne;

vbox(() => {
  label('Main content here');
});

// Overlay appears above main content
overlay(() => {
  vbox(() => {
    label('This is an overlay!');
    button('Close', () => hideOverlay());
  });
});
```

## Proposed: Floating Panels

Similar to web "position: fixed":

```typescript
const { vbox, label, floatingPanel } = tsyne;

vbox(() => {
  scroll(() => { /* content */ });

  floatingPanel({
    position: 'bottom-right',
    width: 200,
    height: 100
  }, () => {
    label('Chat widget');
  });
});
```

## Proposed: Toast Notifications

```typescript
toast('File saved successfully', {
  duration: 3000,
  position: 'bottom'
});
```

## Proposed: Drawer

Sliding sidebar overlay:

```typescript
const sidebar = drawer({
  side: 'left',
  width: 250
}, () => {
  vbox(() => {
    label('Menu');
    button('Close', () => sidebar.close());
  });
});

sidebar.open();
```

## Proposed: Canvas-Level Overlay API

Fyne supports this natively:

```go
canvas.SetContent(content)
canvas.SetOverlay(overlay)  // Overlay appears above content
```

Expose in Tsyne:

```typescript
window.setOverlay(overlayContent);
window.clearOverlay();
```

## Proposed: Z-Index / Layers

```typescript
// Option 1: zIndex property
label('Background', { zIndex: 1 });
label('Foreground', { zIndex: 100 });

// Option 2: Explicit layers
layers(() => {
  layer('background', () => { /* ... */ });
  layer('foreground', () => { /* ... */ });
});
```

---

## Implementation Roadmap

### Phase 2: Basic Overlay API
- [ ] `overlay()` - Custom overlay widget
- [ ] `window.setOverlay()` - Canvas-level overlay
- [ ] `window.clearOverlay()` - Remove overlay

### Phase 3: Advanced Overlays
- [ ] `toast()` - Toast notifications
- [ ] `drawer()` - Sliding drawers
- [ ] `floatingPanel()` - Fixed-position panels

### Phase 4: Full Layering System
- [ ] `layers()` - Explicit layer management
- [ ] `zIndex` - Widget z-ordering
- [ ] `layer()` - Named layers

---

## Use Cases

These features would enable:
- Loading overlays with spinners
- Lightbox image viewers
- Sidebar navigation drawers
- Toast/snackbar notifications
- Custom dropdown menus with icons
