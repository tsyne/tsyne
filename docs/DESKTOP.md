# Tsyne Desktop Environment

A desktop-like environment for launching and managing multiple Tsyne apps within a single window.

## Quick Start

```bash
./scripts/tsyne examples/desktop.ts
```

## Features

- **App Icons**: Desktop shows icons for all apps with `@tsyne-app` metadata
- **Double-click Launch**: Double-click an icon to launch the app in an inner window
- **Multiple Windows**: Run multiple apps simultaneously, each in its own draggable window
- **Shared Runtime**: All apps share the same Node.js instance for efficiency
- **Launch Bar**: Quick access to running apps and system functions
- **Zero Code Changes**: Apps work both standalone AND in desktop - no special exports needed!

## How It Works: TsyneWindow Abstraction

The key innovation is the `TsyneWindow` abstraction layer. When you write:

```typescript
a.window({ title: "My App" }, (win) => {
  win.setContent(() => {
    a.vbox(() => { ... });
  });
});
```

- **Standalone mode**: Creates a real OS window (`fyne.Window`)
- **Desktop mode**: Creates an inner window (`container.InnerWindow`)

The desktop calls `enableDesktopMode()` before launching an app, and `disableDesktopMode()` after. The `a.window()` call automatically creates the right type.

### No Special Exports Required!

Unlike earlier approaches that required separate `buildContent` functions, apps now work unchanged:

```typescript
// This app works both standalone AND in the desktop!
export function buildCalculator(a: App) {
  a.window({ title: "Calculator" }, (win) => {
    win.setContent(() => {
      a.vbox(() => { ... });
    });
  });
}
```

## Making Apps Desktop-Visible

Add metadata comments at the top of your app file to make it appear on the desktop:

```typescript
// @tsyne-app:name Calculator
// @tsyne-app:icon <svg viewBox="0 0 24 24">...</svg>
// @tsyne-app:category utilities
```

### Metadata Directives

| Directive | Required | Description |
|-----------|----------|-------------|
| `@tsyne-app:name` | Yes | Display name shown under the icon |
| `@tsyne-app:icon` | No | SVG string or theme icon name (defaults to generic app icon) |
| `@tsyne-app:category` | No | Category for grouping (utilities, games, etc.) |
| `@tsyne-app:builder` | No | Builder function name (auto-detected if not specified) |

### Icon Options

Icons can be specified as:
1. **Inline SVG**: Full SVG markup in a single line
2. **Theme icon name**: Fyne theme icon (confirm, delete, home, settings, etc.)

```typescript
// Inline SVG
// @tsyne-app:icon <svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20"/></svg>

// Theme icon name
// @tsyne-app:icon settings
```

## ITsyneWindow Interface

Both `Window` and the desktop's `InnerWindowAdapter` implement `ITsyneWindow`:

```typescript
interface ITsyneWindow {
  setContent(builder: () => void): Promise<void>;
  setTitle(title: string): void;
  show(): Promise<void>;
  hide(): Promise<void>;
  close(): Promise<void>;

  // Window-specific (no-op in InnerWindow mode)
  resize(width: number, height: number): Promise<void>;
  centerOnScreen(): Promise<void>;
  setFullScreen(fullscreen: boolean): Promise<void>;
  setIcon(resourceName: string): Promise<void>;
  setCloseIntercept(callback: () => Promise<boolean> | boolean): void;

  // Menus (limited support in InnerWindow)
  setMainMenu(menuDefinition: Array<{...}>): Promise<void>;

  // Dialogs (delegate to parent window in desktop mode)
  showInfo(title: string, message: string): Promise<void>;
  showError(title: string, message: string): Promise<void>;
  showConfirm(title: string, message: string): Promise<boolean>;
  // ... etc
}
```

### Window-Only Methods Behavior

In desktop mode (InnerWindow), these methods become no-ops:
- `resize()` - InnerWindow sizing managed by MDI container
- `centerOnScreen()` - Not applicable
- `setFullScreen()` - Not applicable
- `setIcon()` - InnerWindow has no icon

### Dialogs in Desktop Mode

Dialog methods (`showInfo`, `showConfirm`, etc.) delegate to the parent window, so dialogs appear correctly.

### Menus in Desktop Mode

`setMainMenu()` currently logs a warning - InnerWindow doesn't support menus. Future enhancement could render menus as a toolbar.

## Desktop Mode API

```typescript
import { enableDesktopMode, disableDesktopMode, isDesktopMode } from 'tsyne';

// Enable desktop mode before launching an app
enableDesktopMode({
  mdiContainer: myMdiContainer,
  parentWindow: myMainWindow
});

// Now any a.window() calls create InnerWindows
builder(app);

// Disable after app is launched
disableDesktopMode();
```

## Examples

### Calculator (Works in Both Modes)

```typescript
// @tsyne-app:name Calculator
// @tsyne-app:category utilities

import { app, App, Window, Label } from 'tsyne';

export function buildCalculator(a: App) {
  // This window() call creates either:
  // - A real Window (standalone mode)
  // - An InnerWindow (desktop mode)
  a.window({ title: "Calculator" }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label("0");
        a.grid(4, () => { /* buttons */ });
      });
    });
  });
}

// Standalone entry point
app({ title: "Calculator" }, buildCalculator);
```

Run standalone:
```bash
./scripts/tsyne examples/calculator.ts
```

Or launch from desktop - same code, different context!

## Best Practices

1. **Just add metadata**: No code changes needed - add `@tsyne-app:name` and your app appears on the desktop
2. **Test standalone first**: Verify `./scripts/tsyne yourapp.ts` works
3. **Use meaningful names**: The `@tsyne-app:name` is what users see
4. **Provide custom icons**: Makes apps visually distinct
5. **Handle missing features gracefully**: If your app uses `setMainMenu()`, it will log a warning but continue working

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Desktop Window                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Stack Container                       │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │              Icon Grid (Scroll)                   │  │ │
│  │  │  [App1] [App2] [App3] [App4] ...                 │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │            MultipleWindows (MDI)                  │  │ │
│  │  │  ┌─────────────┐  ┌─────────────┐                │  │ │
│  │  │  │ InnerWindow │  │ InnerWindow │                │  │ │
│  │  │  │ (App1)      │  │ (App2)      │                │  │ │
│  │  │  └─────────────┘  └─────────────┘                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Launch Bar                           │ │
│  │  [Desktop] | Running: App1, App2 |          [Calc]     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Files

- **`src/tsyne-window.ts`** - ITsyneWindow interface and InnerWindowAdapter
- **`examples/desktop.ts`** - Main desktop environment
- **`src/desktop-metadata.ts`** - Parser for `@tsyne-app` metadata
