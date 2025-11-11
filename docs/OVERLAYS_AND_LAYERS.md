# Overlays and Z-Layers in Tsyne

## Overview

Overlays and z-layers allow widgets to appear above other content, similar to:
- CSS `z-index` and `position: absolute`
- HTML `<dialog>` and modal overlays
- Desktop UI floating windows and tooltips

## The Challenge

Web browsers use CSS for layering:
```css
.overlay {
  position: absolute;
  z-index: 1000;
  top: 0;
  left: 0;
}
```

Desktop UI frameworks (including Fyne) handle layering differently. Fyne uses:
- **Canvas layers** - Widgets are rendered in specific layers
- **Overlays** - Special widgets that appear above normal content
- **Popups** - Floating windows above main window

## Fyne's Layering System

Fyne has built-in layer ordering:

1. **Background** - Lowest layer (canvas background)
2. **Content** - Normal widget content
3. **Overlay** - Above content (menus, tooltips)
4. **Focus** - Focus indicators
5. **Foreground** - Highest layer

## Overlay Approaches in Tsyne

### Approach 1: Context Menus (Built-in)

Tsyne already supports context menus, which are overlays:

```typescript
const { label } = tsyne;

const myLabel = label('Right-click me');

myLabel.setContextMenu([
  {
    label: 'Action 1',
    onSelected: () => console.log('Action 1')
  },
  {
    label: 'Action 2',
    onSelected: () => console.log('Action 2')
  }
]);
```

When you right-click, a menu **overlays** the content.

### Approach 2: Modal Dialogs (Built-in)

Tsyne's dialog methods create overlays:

```typescript
// Information dialog overlays the window
await window.showInfo('Title', 'Message');

// Confirmation dialog overlays the window
const confirmed = await window.showConfirm('Confirm', 'Are you sure?');

// File picker overlays the window
const file = await window.showFileOpen();
```

These are **modal overlays** - they block interaction with content below.

### Approach 3: Custom Overlay Widget (Proposed)

For custom overlays, Tsyne could provide an `overlay()` function:

```typescript
const { vbox, label, button, overlay } = tsyne;

vbox(() => {
  label('Main content here');
  label('This is below the overlay');

  button('Click me', () => {
    console.log('Button clicked');
  });
});

// Overlay appears above main content
overlay(() => {
  vbox(() => {
    label('This is an overlay!');
    label('It appears above other content.');

    button('Close', () => {
      // Hide overlay
      hideOverlay();
    });
  });
});
```

### Approach 4: Floating Panels (Proposed)

Similar to web "position: fixed":

```typescript
const { vbox, label, floatingPanel } = tsyne;

vbox(() => {
  // Main scrollable content
  scroll(() => {
    // ... lots of content
  });

  // Floating panel stays in place while content scrolls
  floatingPanel({
    position: 'bottom-right',
    width: 200,
    height: 100
  }, () => {
    vbox(() => {
      label('Chat');
      label('Messages here...');
    });
  });
});
```

### Approach 5: Popup Windows (Alternative)

Instead of overlays on the same window, use separate popup windows:

```typescript
const { window, vbox, label, button } = tsyne;

// Main window
window({ title: 'Main' }, (mainWin) => {
  vbox(() => {
    button('Show Popup', () => {
      showPopup(mainWin);
    });
  });

  mainWin.show();
});

function showPopup(parent) {
  // Popup window appears above parent
  window({
    title: 'Popup',
    width: 300,
    height: 200,
    parent: parent,  // Links to parent window
    modal: true      // Blocks parent interaction
  }, (popup) => {
    vbox(() => {
      label('This is a popup window');

      button('Close', () => {
        popup.close();
      });
    });

    popup.show();
  });
}
```

## Layering Scenarios

### Scenario 1: Loading Overlay

Show loading spinner over content:

```typescript
const { vbox, label, overlay, progressbar } = tsyne;

let loadingOverlay;

vbox(() => {
  label('Main Content');

  // Show loading overlay
  loadingOverlay = overlay({
    visible: false,
    backgroundColor: 'rgba(0,0,0,0.5)'
  }, () => {
    center(() => {
      vbox(() => {
        label('Loading...');
        progressbar(0, true); // Indeterminate progress
      });
    });
  });

  button('Load Data', async () => {
    loadingOverlay.setVisible(true);

    await fetchData();

    loadingOverlay.setVisible(false);
  });
});
```

Web equivalent:
```html
<div class="overlay" style="display: none; position: fixed; z-index: 1000;">
  <div class="spinner">Loading...</div>
</div>
```

### Scenario 2: Toast Notifications

Temporary notification at bottom:

```typescript
const { vbox, label, toast } = tsyne;

vbox(() => {
  button('Save', () => {
    saveData();

    // Show toast notification
    toast('File saved successfully', {
      duration: 3000,  // 3 seconds
      position: 'bottom'
    });
  });
});
```

Toast appears as overlay, then auto-dismisses.

### Scenario 3: Dropdown Menu

Custom dropdown (like HTML `<select>` but richer):

```typescript
const { vbox, label, dropdown } = tsyne;

vbox(() => {
  label('Select an option:');

  dropdown({
    options: [
      { icon: '📄', text: 'New Document' },
      { icon: '📁', text: 'Open File' },
      { icon: '💾', text: 'Save' }
    ],
    onSelected: (option) => {
      console.log('Selected:', option.text);
    }
  });
});
```

When opened, dropdown menu overlays content below.

### Scenario 4: Modal Lightbox

Image viewer overlay:

```typescript
const { vbox, image, overlay } = tsyne;

let lightbox;

vbox(() => {
  // Thumbnail images
  button('View Image', () => {
    lightbox.setVisible(true);
  });

  // Lightbox overlay
  lightbox = overlay({
    visible: false,
    onClick: () => lightbox.setVisible(false)  // Click to close
  }, () => {
    center(() => {
      image('/path/to/large-image.png', 'contain');
    });
  });
});
```

Web equivalent:
```html
<div class="lightbox" style="position: fixed; z-index: 9999;">
  <img src="large-image.png" onclick="closeLightbox()">
</div>
```

### Scenario 5: Sidebar Drawer

Sliding sidebar overlay:

```typescript
const { vbox, drawer, button, label } = tsyne;

let sidebarDrawer;

vbox(() => {
  button('☰ Menu', () => {
    sidebarDrawer.open();
  });

  label('Main content here');

  // Drawer overlays from left
  sidebarDrawer = drawer({
    side: 'left',
    width: 250
  }, () => {
    vbox(() => {
      label('Menu');
      button('Home', () => { /* ... */ });
      button('Settings', () => { /* ... */ });
      button('About', () => { /* ... */ });

      button('Close', () => {
        sidebarDrawer.close();
      });
    });
  });
});
```

## Z-Index Equivalent

In web CSS:
```css
.layer1 { z-index: 1; }
.layer2 { z-index: 10; }
.layer3 { z-index: 100; }
```

In Tsyne (proposed API):
```typescript
const { vbox, label } = tsyne;

vbox(() => {
  label('Background', { zIndex: 1 });
  label('Middle', { zIndex: 10 });
  label('Foreground', { zIndex: 100 });
});
```

Or using explicit layers:
```typescript
const { layers, layer, label } = tsyne;

layers(() => {
  layer('background', () => {
    label('Background content');
  });

  layer('foreground', () => {
    label('Foreground content');
  });
});
```

## Fyne Canvas Overlay API

Fyne already supports overlays at the canvas level:

```go
// In Fyne (Go)
content := widget.NewLabel("Main content")
overlay := widget.NewLabel("Overlay content")

canvas.SetContent(content)
canvas.SetOverlay(overlay)  // Overlay appears above content
```

Tsyne could expose this:

```typescript
// Proposed Tsyne API
const { vbox, label } = tsyne;

// Main content
const mainContent = vbox(() => {
  label('Main content here');
});

// Overlay
const overlayContent = vbox(() => {
  label('Overlay content here');
});

// Set overlay on window canvas
window.setOverlay(overlayContent);

// Remove overlay
window.clearOverlay();
```

## Comparison: Web vs Desktop UI

| Feature | Web (CSS) | Tsyne/Fyne | Notes |
|---------|-----------|------------|-------|
| **Absolute positioning** | `position: absolute` | Not native | Use overlays instead |
| **Z-index** | `z-index: 100` | Canvas layers | Limited control |
| **Modal dialogs** | `<dialog>` + CSS | `window.showConfirm()` | Native dialogs |
| **Tooltips** | CSS + JS | Built-in (Fyne) | Native tooltips |
| **Dropdown menus** | `<select>` | `select()` | Limited overlay control |
| **Custom overlays** | `<div>` + CSS | `overlay()` (proposed) | Not yet implemented |
| **Floating elements** | `position: fixed` | `floatingPanel()` (proposed) | Not yet implemented |
| **Popup windows** | `window.open()` | `window()` + parent | Separate windows |

## Implementation Roadmap

### Phase 1: Built-in Overlays (Already Exist)
- ✅ Context menus
- ✅ Dialog boxes
- ✅ File pickers

### Phase 2: Basic Overlay API
- `overlay()` - Custom overlay widget
- `window.setOverlay()` - Canvas-level overlay
- `window.clearOverlay()` - Remove overlay

### Phase 3: Advanced Overlays
- `toast()` - Toast notifications
- `drawer()` - Sliding drawers
- `floatingPanel()` - Fixed-position panels

### Phase 4: Full Layering System
- `layers()` - Explicit layer management
- `zIndex` - Widget z-ordering
- `layer()` - Named layers

## Workarounds (Current)

Until full overlay support exists, use these patterns:

### 1. Dialog-based Overlays

Instead of overlay, navigate to a dedicated page:

```typescript
// Instead of showing overlay
button('Show Details', () => {
  browserContext.changePage('/details-overlay');
});
```

`details-overlay.ts`:
```typescript
const { vbox, label, button } = tsyne;

vbox(() => {
  label('Details');
  label('This simulates an overlay as a full page');

  button('Close', () => {
    browserContext.back();
  });
});
```

### 2. Conditional Rendering

Show/hide content based on state:

```typescript
let showOverlay = false;

vbox(() => {
  if (!showOverlay) {
    // Main content
    label('Main content');
    button('Show Overlay', () => {
      showOverlay = true;
      browserContext.reload();  // Reload to re-render
    });

  } else {
    // Overlay content
    label('Overlay content');
    button('Close', () => {
      showOverlay = false;
      browserContext.reload();
    });
  }
});
```

### 3. Split Panels

Use split panes as a layer alternative:

```typescript
const { hsplit, vbox, label } = tsyne;

hsplit(
  // Main content (left, 70%)
  () => {
    vbox(() => {
      label('Main content here');
    });
  },

  // "Overlay" panel (right, 30%)
  () => {
    vbox(() => {
      label('Side panel');
      label('Acts like a layer');
    });
  },

  0.7  // 70/30 split
);
```

### 4. Separate Windows

Use popup windows as overlays:

```typescript
// Main window
button('Show Info', () => {
  // Open popup window
  showInfoWindow();
});

function showInfoWindow() {
  window({
    title: 'Information',
    width: 400,
    height: 300,
    modal: true
  }, (win) => {
    vbox(() => {
      label('Information goes here');
      button('Close', () => win.close());
    });
    win.show();
  });
}
```

## Best Practices

1. **Use native dialogs** - Prefer `window.showInfo()`, `showConfirm()` for simple overlays
2. **Avoid excessive layering** - Keep UI simple, don't stack many overlays
3. **Provide close mechanisms** - Always offer a way to dismiss overlays
4. **Consider navigation** - Sometimes a new page is clearer than an overlay
5. **Test interaction** - Ensure overlays don't block critical UI
6. **Use sparingly** - Desktop users expect fewer overlays than web users

## Future Vision

Ideal Tsyne overlay API:

```typescript
import { app, window, vbox, label, button, overlay, toast, drawer } from 'tsyne';

app(() => {
  window({ title: 'Overlay Demo' }, (win) => {
    vbox(() => {
      // Main content
      label('Main Application');

      button('Show Overlay', () => {
        // Create overlay
        const myOverlay = overlay({
          modal: true,
          backgroundColor: 'rgba(0,0,0,0.5)'
        }, () => {
          center(() => {
            vbox(() => {
              label('Overlay Content');
              button('Close', () => myOverlay.close());
            });
          });
        });

        myOverlay.show();
      });

      button('Show Toast', () => {
        toast('Operation successful!', {
          duration: 3000,
          position: 'bottom-right'
        });
      });

      button('Open Drawer', () => {
        const sidebar = drawer({ side: 'left' }, () => {
          vbox(() => {
            label('Sidebar');
            button('Close', () => sidebar.close());
          });
        });

        sidebar.open();
      });
    });

    win.show();
  });
});
```

Clean, intuitive, and powerful - just like the web, but native.
