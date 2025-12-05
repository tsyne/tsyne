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
- **Standalone Compatible**: Apps work both standalone AND in the desktop environment

## Making Apps Desktop-Ready

Add metadata comments at the top of your app file:

```typescript
// @tsyne-app:name Calculator
// @tsyne-app:icon <svg viewBox="0 0 24 24">...</svg>
// @tsyne-app:category utilities
// @tsyne-app:builder buildCalculator
// @tsyne-app:contentBuilder buildCalculatorContent
```

### Metadata Directives

| Directive | Required | Description |
|-----------|----------|-------------|
| `@tsyne-app:name` | Yes | Display name shown under the icon |
| `@tsyne-app:icon` | No | SVG string or theme icon name (defaults to generic app icon) |
| `@tsyne-app:category` | No | Category for grouping (utilities, games, etc.) |
| `@tsyne-app:builder` | No | Function that creates standalone window (auto-detected if not specified) |
| `@tsyne-app:contentBuilder` | No | Function that creates just content (for desktop inner windows) |

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

## Architecture

### Builder Functions

Apps should export two builder functions:

```typescript
// For standalone mode - creates its own window
export function buildCalculator(a: App) {
  a.window({ title: "Calculator" }, (win: Window) => {
    win.setContent(() => {
      buildCalculatorContent(a);
    });
  });
}

// For desktop mode - creates just the content
export function buildCalculatorContent(a: App) {
  a.vbox(() => {
    a.label("0");
    a.grid(4, () => {
      // Calculator buttons...
    });
  });
}
```

### State Management

For apps that need to support multiple instances (e.g., opening the same app twice), encapsulate state in a class:

```typescript
class CalculatorInstance {
  private currentValue = "0";

  buildContent(a: App) {
    // Each instance has its own state
  }
}

export function buildCalculatorContent(a: App) {
  const instance = new CalculatorInstance();
  instance.buildContent(a);
}
```

## Desktop Components

### Main Desktop (`desktop.ts`)

The main desktop environment that:
- Scans the examples directory for apps with `@tsyne-app:name` metadata
- Displays icons in a scrollable grid
- Manages app launching in inner windows via `MultipleWindows` container
- Provides a launch bar with running apps and quick actions

### Desktop Settings (`desktop-settings.ts`)

A settings panel showing:
- List of available apps
- App details (category, builder functions, desktop readiness)
- Display preferences (icon size, grid columns)

### Metadata Parser (`src/desktop-metadata.ts`)

Utilities for parsing and loading apps:

```typescript
import { scanForApps, loadContentBuilder, AppMetadata } from 'tsyne';

// Scan directory for desktop apps
const apps: AppMetadata[] = scanForApps('./examples');

// Load a specific app's content builder
const builder = await loadContentBuilder(apps[0]);
if (builder) {
  builder(app);  // Build the app's content
}
```

## API Reference

### `parseAppMetadata(filePath: string): AppMetadata | null`

Parse `@tsyne-app` metadata from a TypeScript source file.

### `scanForApps(directory: string): AppMetadata[]`

Scan a directory for all TypeScript files with `@tsyne-app:name` metadata.

### `loadAppBuilder(metadata: AppMetadata): Promise<Function | null>`

Load the builder function (creates window) from an app module.

### `loadContentBuilder(metadata: AppMetadata): Promise<Function | null>`

Load the content builder function (for inner windows) from an app module.
Falls back to builder if no content builder is specified.

### AppMetadata Interface

```typescript
interface AppMetadata {
  filePath: string;        // Path to the source file
  name: string;            // Display name
  icon: string;            // SVG or theme icon name
  iconIsSvg: boolean;      // Whether icon is SVG
  category?: string;       // Optional category
  builder: string;         // Builder function name
  contentBuilder?: string; // Content builder function name
}
```

## Examples

### Calculator (Desktop-Ready)

See `examples/calculator.ts` for a complete example of a desktop-ready app with:
- Metadata comments
- Class-based state management
- Both standalone and content builders

### Desktop Settings

See `examples/desktop-settings.ts` for an example of a settings panel that:
- Lists all available apps
- Shows app details
- Provides configuration options

## Best Practices

1. **Always export both builders**: This allows your app to work standalone or in the desktop
2. **Use class-based state**: Supports multiple instances of the same app
3. **Test standalone first**: Verify `./scripts/tsyne yourapp.ts` works before adding to desktop
4. **Use meaningful categories**: Helps users organize and find apps
5. **Provide custom icons**: Makes apps visually distinct on the desktop
