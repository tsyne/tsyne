# Window Adaptation

Tsyne apps can run in multiple hosting contexts without code changes. This document explains how apps adapt to different window environments.

## The Three Hosting Contexts

| Context | Window Type | Use Case |
|---------|-------------|----------|
| **Standalone** | Real OS window (`Window`) | Desktop app launched directly |
| **Desktop** | Inner window (`InnerWindowAdapter`) | MDI environment with multiple apps |
| **Phone** | Stack pane (`StackPaneAdapter`) | PhoneTop launcher on mobile |

Apps don't need to know which context they're running in - the framework handles the adaptation automatically.

## How It Works

### The ITsyneWindow Interface

All window types implement `ITsyneWindow`, providing a common API:

```typescript
interface ITsyneWindow {
  setContent(builder: () => void): Promise<void>;
  setTitle(title: string): void;
  show(): Promise<void>;
  close(): Promise<void>;

  // Context-specific (graceful degradation)
  resize(width: number, height: number): Promise<void>;
  onResize(callback: (w: number, h: number) => void): void;
  // ... dialogs, menus, etc.
}
```

### Automatic Context Detection

When you call `a.window()`, the framework creates the appropriate window type:

```typescript
// This single call works in all three contexts
a.window({ title: 'My App', width: 800, height: 600 }, (win) => {
  win.setContent(() => {
    a.vbox(() => {
      a.label('Hello');
    });
  });
  win.show();
});
```

- **Standalone**: Creates a real OS window
- **Desktop**: Creates an `InnerWindowAdapter` (after `enableDesktopMode()`)
- **Phone**: Creates a `StackPaneAdapter` (after `enablePhoneMode()`)

### Graceful Degradation

Window methods that don't apply to all contexts become no-ops:

| Method | Standalone | Desktop | Phone |
|--------|------------|---------|-------|
| `resize()` | Works | Works | No-op (fixed size) |
| `centerOnScreen()` | Works | No-op | No-op |
| `setFullScreen()` | Works | No-op | No-op |
| `setIcon()` | Works | No-op | No-op |
| `onResize()` | Works | Works | No-op |

Apps don't need conditional logic - methods return gracefully in all contexts.

## PhoneTop Embedding Pattern

For apps that need to adapt their **content** (not just window behavior) to the available space, use the `windowWidth, windowHeight` parameter pattern.

### App Metadata

Declare that your app accepts window dimensions:

```typescript
/**
 * @tsyne-app:name My Game
 * @tsyne-app:icon <svg>...</svg>
 * @tsyne-app:category games
 * @tsyne-app:builder buildMyGameApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */
```

### Builder Function

Accept optional dimensions and branch accordingly:

```typescript
export function buildMyGameApp(a: App, windowWidth?: number, windowHeight?: number): void {
  const isEmbedded = windowWidth !== undefined && windowHeight !== undefined;

  if (isEmbedded) {
    // PhoneTop mode: build content directly (no window wrapper)
    buildEmbeddedContent(a, windowWidth, windowHeight);
  } else {
    // Standalone mode: create a window
    buildStandaloneWindow(a);
  }
}
```

### Standalone Mode

Create a normal window with resize handling:

```typescript
function buildStandaloneWindow(a: App): void {
  let canvasWidth = 400;
  let canvasHeight = 300;

  a.window({ title: 'My Game', width: 480, height: 400 }, (win) => {
    win.setContent(() => {
      // Full UI with menus, toolbars, etc.
      a.border({
        top: () => a.label('My Game'),
        center: () => {
          canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, { ... });
        },
        bottom: () => a.label('Controls: Arrow keys'),
      });
    });

    win.onResize(async (w, h) => {
      // Adapt canvas to new window size
      canvasWidth = Math.max(200, w - 20);
      canvasHeight = Math.max(150, h - 100);
      game.resize(canvasWidth, canvasHeight);
      await canvas.resize(canvasWidth, canvasHeight);
    });

    win.show();
  });
}
```

### Embedded Mode (PhoneTop)

Build content directly without creating a window:

```typescript
function buildEmbeddedContent(a: App, windowWidth: number, windowHeight: number): void {
  // Calculate canvas size based on available space
  const hudHeight = 60;
  const keyboardHeight = 120;  // Touch controls
  const padding = 10;

  const canvasWidth = Math.max(200, windowWidth - padding * 2);
  const canvasHeight = Math.max(150, windowHeight - hudHeight - keyboardHeight - padding * 2);

  // Build compact UI for mobile
  a.vbox(() => {
    // Compact HUD
    a.hbox(() => {
      a.label('Score: 0');
      a.spacer();
      a.label('HP: 100');
    });

    // Game canvas (sized to fit)
    a.center(() => {
      canvas = a.tappableCanvasRaster(canvasWidth, canvasHeight, { ... });
    });

    // Touch controls for mobile
    buildGameKeyboard(a, keyboardController);
  });
}
```

## Touch Controls for Mobile

When running on PhoneTop, apps should provide touch-friendly controls since there's no physical keyboard.

### Game Keyboard Pattern

Create a controller that translates button taps to key events:

```typescript
// game-keyboard.ts
export type OnKeyCallback = (key: string, pressed: boolean) => void;

export class GameKeyboardController {
  private onKey: OnKeyCallback;

  constructor(onKey: OnKeyCallback) {
    this.onKey = onKey;
  }

  tap(key: string, btn: Button): void {
    this.onKey(key, true);
    btn.withStyle({ importance: 'warning' });
    setTimeout(() => {
      this.onKey(key, false);
      btn.withStyle({ importance: 'medium' });
    }, 80);
  }
}

export function buildGameKeyboard(a: App, k: GameKeyboardController): void {
  a.vbox(() => {
    a.hbox(() => {
      a.label('');
      a.button('^').onClick((b) => k.tap('w', b));  // Forward
      a.label('');
      a.button('FIRE').onClick((b) => k.tap('Space', b));
    });
    a.hbox(() => {
      a.button('<').onClick((b) => k.tap('a', b));  // Left
      a.button('v').onClick((b) => k.tap('s', b));  // Back
      a.button('>').onClick((b) => k.tap('d', b));  // Right
      a.button('<<').onClick((b) => k.tap('Left', b));  // Turn
      a.button('>>').onClick((b) => k.tap('Right', b));
    });
  });
}
```

### Connecting to Game Logic

Wire the keyboard controller to your game's input handling:

```typescript
const keyboardController = new GameKeyboardController((key, pressed) => {
  game.setKey(key, pressed);
});
```

## Canvas Size Adaptation

When adapting canvas-based apps to different window sizes:

### Maintain Aspect Ratio

```typescript
let canvasWidth = windowWidth - padding;
let canvasHeight = windowHeight - uiHeight;

const aspectRatio = canvasWidth / canvasHeight;
if (aspectRatio > 2) {
  // Too wide - constrain width
  canvasWidth = Math.floor(canvasHeight * 1.6);
} else if (aspectRatio < 1) {
  // Too tall - constrain height
  canvasHeight = Math.floor(canvasWidth * 0.75);
}
```

### Resize Game/Renderer

```typescript
// Update game logic to new dimensions
game.resize(canvasWidth, canvasHeight);

// Update canvas widget
await canvas.resize(canvasWidth, canvasHeight);
```

## Complete Example

Here's the Doom clone adapted for all three contexts:

```typescript
/**
 * @tsyne-app:name Yet Another Doom Clone
 * @tsyne-app:category games
 * @tsyne-app:builder buildYetAnotherDoomCloneApp
 * @tsyne-app:args app,windowWidth,windowHeight
 */

export function buildYetAnotherDoomCloneApp(
  a: App,
  windowWidth?: number,
  windowHeight?: number
): void {
  const isPhoneTopMode = windowWidth !== undefined && windowHeight !== undefined;

  if (isPhoneTopMode) {
    // Phone: compact UI with touch controls
    buildDoomContent(a, windowWidth, windowHeight, true);
  } else {
    // Standalone/Desktop: full window with keyboard controls
    buildDoomStandalone(a);
  }
}
```

## Best Practices

1. **Always provide both modes** - Apps should work standalone and embedded
2. **Compact labels for mobile** - Use shorter text ("HP" vs "Health Points")
3. **Include touch controls** - Mobile users can't use keyboard
4. **Test both contexts** - Run standalone and via PhoneTop
5. **Respect available space** - Don't assume fixed dimensions
6. **Graceful aspect ratios** - Constrain canvas to reasonable proportions

## Related Documentation

- [DESKTOP.md](DESKTOP.md) - Desktop mode and InnerWindowAdapter
- [phone-apps/README.md](../phone-apps/README.md) - PhoneTop launcher details
- [API_REFERENCE.md](API_REFERENCE.md) - Widget API reference
