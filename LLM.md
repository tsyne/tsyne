# LLM Quick Reference

## What is Tsyne?

TypeScript → Go bridge → Fyne.io native GUI toolkit. Pseudo-declarative MVC inspired by AngularJS 1.0.

There's a **regular app mode** for standalone desktop applications, and a **browser mode** that loads Tsyne TypeScript pages from HTTP servers (similar to how web browsers load HTML pages). See [docs/BROWSER_MODE.md](docs/BROWSER_MODE.md) for full documentation and `src/browser.ts` for the Swiby-inspired browser implementation


## Architecture

```
TypeScript (src/) ←→ IPC Protocol ←→ Go Bridge (bridge/) ←→ Fyne widgets
```

**Bridge Protocols:**
- `stdio` (default): JSON over stdio, compatible everywhere
- `grpc`: Binary protocol over TCP, faster serialization
- `msgpack-uds` (fastest): MessagePack over Unix Domain Sockets, ~10x faster than JSON

Set via `TSYNE_BRIDGE_MODE` env var or `bridgeMode` option in `app()`

**Bridge Performance Features:**
- `ping` message type: Minimal round-trip for latency benchmarking (~0.5-1ms)
- `sendFireAndForget()`: Non-blocking send for high-frequency updates (3-30x faster than `send()`)
  - Used for canvas updates during drag operations where response isn't needed
  - Bypasses message queue, doesn't wait for response
  - Available on all bridge implementations

**Key files:**
- `src/app.ts` - App class, factory methods for all widgets
- `src/widgets/` - Widget classes organized by category (base, containers, inputs, display, canvas)
- `src/context.ts` - Declarative builder context (tracks parent containers)
- `src/fynebridge.ts` - IPC to Go process
- `src/window.ts` - Window class and all dialog methods
- `src/browser.ts` - Browser/page mode
- `bridge/main.go` - Go bridge message routing
- `bridge/widget_creators_*.go` - Widget creation handlers (canvas, complex, containers, display, inputs)
- `bridge/dialogs.go` - Dialog handlers

## @Grab: Inline npm Dependencies (Groovy-style)

Single-file apps can declare npm dependencies inline—no `package.json` needed:

```typescript
#!/usr/bin/env tsyne

// @Grab('axios@^1.6.0')
// @Grab('date-fns@^3.0.0')

import axios from 'axios';
import { format } from 'date-fns';
```

**How it works:**
- `tsyne myapp.ts` parses `@Grab` directives, installs to `~/.tsyne/packages/`, runs with `NODE_PATH`
- Inspired by Groovy's Grape annotations
- See `docs/INLINE_DEPENDENCY_DECLARATIONS.md` for details

## Cosyne: Declarative Canvas Library (200+ Tests, ~6000 Lines)

**Pseudo-declarative canvas grammar** with data binding, reactive updates, and interactive events. Use within `a.canvasStack()`.

**Quick API:**
```typescript
cosyne(a, (c) => {
  // Primitives: circle, rect, line, text, path, arc, wedge, polygon, star, grid, heatmap, gauge, dial
  c.circle(100, 100, 20).fill('#ff0000').withId('c1')
    .onClick((e) => {...})
    .onDrag((e) => {...});

  // Collections: circles(), rects(), lines()
  c.circles().bindTo(items, { trackBy: (item) => item.id });

  // Bindings: position, fill, stroke, alpha, visible, rotation, value
  c.rect(x, y, w, h).bindPosition(() => ({ x: state.x, y: state.y }));

  // Transforms: nested coordinate systems
  c.transform({ translate: [50, 50] }, (inner) => {
    inner.circle(0, 0, 10);
  });

  // Projections: 3D → 2D (spherical, isometric)
  const proj = new SphericalProjection();

  // Foreign objects: embed Tsyne widgets
  c.foreign(100, 100, (app) => app.label('Text'));

  // Interactive dial/knob control
  c.dial(100, 200, {
    minValue: 0, maxValue: 100, value: 50,
    style: 'classic',  // 'classic' | 'minimal' | 'vintage' | 'modern'
    radius: 40,
    valueSuffix: '%',
    onValueChange: (v) => console.log('Value:', v),
  }).withId('volume-dial');
});

// After state changes, refresh bindings
refreshAllCosyneContexts();

// Enable interactive events
enableEventHandling(cosyneCtx, a, { width: 500, height: 500 });
```

**Event handlers** (fluent, all return `this`):
- `.onClick(e => {...})` - Click/tap with `{x, y}`
- `.onMouseMove(e => {...})` - Continuous tracking
- `.onMouseEnter(e => {...})` / `.onMouseLeave(() => {...})` - Hover tracking
- `.onDragStart(e => {...})` / `.onDrag(e => {...})` / `.onDragEnd(() => {...})`
- `.passthrough()` - Mark primitive as passthrough for hit testing (events pass to primitives below)

**Performance optimizations:**
- Distance-based drag throttling: Only processes drag events when mouse moves ≥4 pixels
- Change detection in `refreshBindings()`: Only updates primitives when values actually change
- `hasAnyBinding()` check: Skips primitives without bindings during refresh cycle

**Hit testing** (automatic):
- All primitives implement `getHitTester()`
- Shapes: circle (distance), rect (bbox), line (distance-to-segment), polygon (ray casting), arc/wedge (radial+angle)
- Router: `EventRouter` class routes canvas events to primitives via hit detection

**Animations** (Phase 9):
- `.animate('property', { from, to, duration, easing, loop, yoyo })` - Direct animation with control
- `.animateFluent('property', from, to).duration(ms).easing(fn).loop(true).start()` - Fluent builder API
- 30+ easing functions: `linear`, `easeIn/Out/InOutQuad`, `easeInOutCubic`, `easeInOutSine`, `easeInOutExpo`, `easeInOutCirc`, `easeInElastic`, `easeInBack`, `easeOutBounce`, etc.
- Color interpolation: `interpolateColor('#FF0000', '#0000FF', 0.5, easing)`
- AnimationManager: Global singleton for coordinating animations via `requestAnimationFrame`
- Fluent animation example:
  ```typescript
  c.circle(100, 100, 20)
    .animateFluent('alpha', 0, 1)
    .duration(1000)
    .easing('easeInOutCubic')
    .loop(true)
    .yoyo(true)
    .start();
  ```

**Architecture:**
- `cosyne/src/primitives/` - 12 shape types, all extend `Primitive<T>`
- `cosyne/src/binding.ts` - Lazy-evaluated binding system with diffing
- `cosyne/src/events.ts` - Hit testers & event routing
- `cosyne/src/easing.ts` - 30+ parameterized easing functions, interpolation helpers
- `cosyne/src/animation.ts` - Generic `Animation<T>` class with keyframe support
- `cosyne/src/animation-manager.ts` - Global animation coordinator with requestAnimationFrame
- `cosyne/src/context.ts` - Builder context, global registry
- `cosyne/test/` - 200+ Jest tests covering all features (phase 9: 75+ animation tests)

**Key design:**
- ✅ Fluent API (all methods return `this`)
- ✅ Lazy bindings (evaluated on-demand via `refreshBindings()`)
- ✅ Efficient collections (O(n) diffing via trackBy)
- ✅ Z-order aware event routing
- ✅ Mockable hit testers (inject custom logic for tests)
- ✅ No backward compatibility concerns (free to refactor)

## Cosyne 3D: Declarative Scene Graphs (~300 Tests, ~4000 Lines)

**3D extension** of Cosyne with the same fluent API patterns. Includes primitives, materials, lighting, camera, ray casting, and reactive bindings.

**Quick API:**
```typescript
import { cosyne3d, refreshAllCosyne3dContexts } from '../cosyne/src/index3d';

cosyne3d(a, (ctx) => {
  // Camera
  ctx.setCamera({ fov: 60, position: [0, 5, 10], lookAt: [0, 0, 0] });

  // Lighting
  ctx.light({ type: 'ambient', intensity: 0.3 });
  ctx.light({ type: 'directional', direction: [0, -1, -1] });

  // Primitives: sphere, box, plane, cylinder
  ctx.sphere({ radius: 1, position: [0, 1, 0] })
    .setMaterial({ color: '#ff0000', shininess: 50 })
    .onClick((hit) => console.log('Clicked', hit.point));

  ctx.box({ size: 2 }).setMaterial(Materials.gold());

  // Bindings (same pattern as 2D Cosyne)
  ctx.sphere({ id: 'orbiter' })
    .bindPosition(() => [Math.cos(angle) * 5, 0, Math.sin(angle) * 5]);

  // Collections
  ctx.spheres<Planet>().bindTo({
    items: () => planets,
    render: (p) => ({ radius: p.radius, position: [p.distance, 0, 0] }),
    trackBy: (p) => p.name,
  });

  // Transforms (nested coordinate systems)
  ctx.transform({ translate: [10, 0, 0], rotate: [0, Math.PI/4, 0] }, (c) => {
    c.sphere({ position: [0, 0, 0] });  // Inherits parent transform
  });
});

// Animation loop
setInterval(() => { angle += 0.01; refreshAllCosyne3dContexts(); }, 16);
```

**Architecture:**
- `cosyne/src/context3d.ts` - Builder context, primitive registry, ray casting
- `cosyne/src/primitives3d/` - Sphere3D, Box3D, Plane3D, Cylinder3D (all extend Primitive3D)
- `cosyne/src/math3d.ts` - Vector3, Matrix4, Quaternion, Ray, Box3
- `cosyne/src/camera.ts` - Perspective/orthographic cameras with view/projection matrices
- `cosyne/src/light.ts` - Ambient, directional, point, spot lights with LightManager
- `cosyne/src/material.ts` - Material properties + preset factory (gold, silver, glass, etc.)
- `cosyne/src/binding.ts` - Shared binding system (same as 2D Cosyne)
- `cosyne/test/cosyne3d/` - 300+ tests for math, primitives, camera, materials, lights

**Key features:**
- ✅ Ray casting for hit detection (onClick, onHover)
- ✅ Material presets: `Materials.gold()`, `Materials.silver()`, `Materials.glass()`
- ✅ Quaternion-based rotation composition in nested transforms
- ✅ Efficient inverse matrix caching for camera ray casting
- ✅ Same fluent API as 2D Cosyne (bindPosition, bindMaterial, bindScale, etc.)

**Current limitation:** Scene graph only - no renderer yet. Demos need a software renderer using Tsyne's canvas primitives (`canvasSphere`, `canvasLine`, `canvasRect`) to actually display 3D scenes.

**See:** `cosyne/README-3D.md` and `docs/COSYNE_3D.md` for full API reference.

## Intended End-User Code Style

**Pseudo-declarative builder pattern:**
```typescript
app({ title: 'My App' }, (a) => {
  a.window({ title: 'Window', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      a.vbox(() => {
        a.label('Hello');
        a.button('Click').onClick(() => console.log('clicked'));
        a.hbox(() => {
          a.entry('placeholder', onSubmit, 300);
        });
      });
    });
    win.show();
  });
});
```

**Key conventions:**
- Use `a` for app instance (terse)
  - we could do without that if we made the markup grammar global but we'd be violating IoC
- Builders use arrow functions: `() => { ... }`
- Context tracks parent container automatically
- Async operations return promises

## Builder Lifecycle: Reentrant & Idempotent

**Critical:** Tsyne operates under an OS-wide **Inversion of Control (IoC)** environment. The framework controls lifecycle, not the app. Builders must follow these rules:

### Builders Must Be Reentrant
Builders can be called **multiple times** during the app's lifetime:
- Content rebuilds (`win.setContent()` called again)
- Visibility updates (`widget.refresh()`)
- Tab switches, navigation changes, responsive layout updates

```typescript
// ❌ WRONG - Accumulates side effects on each rebuild
let animationId: NodeJS.Timeout;
win.setContent(() => {
  // This runs on EVERY rebuild - animations pile up!
  animationId = setInterval(() => updateAnimation(), 16);
  a.label('Animated');
});

// ✅ CORRECT - Clean up previous state, idempotent
let animationId: NodeJS.Timeout | undefined;
win.setContent(() => {
  // Clear any existing animation first
  if (animationId) clearInterval(animationId);
  animationId = setInterval(() => updateAnimation(), 16);
  a.label('Animated');
});
```

### Builders Must Be Idempotent
Calling a builder N times should produce the **same result** as calling it once (modulo current state):
- No accumulated side effects
- No duplicate event listeners
- No leaked resources (timers, subscriptions, file handles)

```typescript
// ❌ WRONG - Accumulates listeners
store.subscribe(() => rebuildUI());  // Called inside builder = duplicates!

// ✅ CORRECT - Subscribe once outside builder, or track subscription
const unsubscribe = store.subscribe(() => rebuildUI());
app.onCleanup(() => unsubscribe());  // Clean up on app exit
```

### Common Mistakes (Especially from LLM-Generated Code)

1. **Animation loops inside builders** - `setInterval`/`setTimeout` that persist across rebuilds
2. **Event subscriptions inside builders** - Store subscriptions that duplicate on rebuild
3. **Resource allocation inside builders** - Opening files, connections, or creating expensive objects repeatedly
4. **Assuming single execution** - Treating builders like `main()` that runs once

### Framework Lifecycle Events

The framework manages process lifecycle:
- **Desktop mode**: Multiple apps in one process; app window close ≠ process exit
- **Phone mode (PhoneTop)**: Apps run as stack panes; close goes back to home
- **Standalone mode**: `app()` registers exit handler; window close → process exit

Apps should **never** call `process.exit()` directly except in standalone `main()`. The framework handles shutdown through the IoC pattern.

```typescript
// In index.ts, app() registers the exit handler:
appInstance.getBridge().setOnExit(async () => {
  await appInstance.runCleanupCallbacks();
  process.exit(0);  // Only the framework calls this
});
```

## Ported Apps Patterns (7 Complete Apps: 314 Tests, 3,963 Lines)

**Quick Reference for App Ports**

✅ **Observable Store Pattern** (all apps):
```typescript
class Store {
  private changeListeners: ChangeListener[] = [];
  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => { this.changeListeners = this.changeListeners.filter(l => l !== listener); };
  }
  private notifyChange() { this.changeListeners.forEach(l => l()); }
}
// Usage: store.subscribe(async () => { await updateUI(); await viewStack.refresh(); });
```

**Critical Patterns:**
- ❌ Don't import App type: `import { App }` → TypeScript errors
- ✅ Use `app: any` parameter + inject store classes only
- ✅ Defensive copies: `[...array]`, `{...object}` (tests verify immutability)
- ✅ ID generation: counter pattern `id: 'entity-${String(this.nextId++).padStart(3, '0')}'` (not Date.now())
- ✅ UI updates: `.when()` + `await viewStack.refresh()` for tabs
- ✅ Lists: `.bindTo()` with `trackBy: (item) => item.id`
- ❌ Don't use `prompt()` (returns Promise) → generate default values instead

**Test Template:**
- Aim for 40-50 Jest tests covering: CRUD (10), relationships (5-7), edge cases (5-7), observable (5), immutability (5)
- Copy test to `core/src/__tests__/ported-apps/[app]/index.test.ts` with updated import path
- Run: `pnpm test -- core/src/__tests__/ported-apps/[app]/index.test.ts`

**Files to Create:**
1. `ported-apps/[app]/index.ts` (single file, 400-730 lines)
2. `ported-apps/[app]/index.test.ts` (Jest tests)
3. `ported-apps/[app]/index.tsyne.test.ts` (tab navigation + screenshot)
4. `ported-apps/[app]/README.md` (ASCII diagrams)
5. `ported-apps/[app]/LICENSE` (MIT/Apache)
6. `core/src/__tests__/ported-apps/[app]/index.test.ts` (copy with updated import)

**See Also:** `/docs/pseudo-declarative-ui-composition.md` → "Lessons from Ported Apps" for detailed patterns

## Widget Categories

**Containers:** vbox, hbox, stack, scroll, grid, center, max, border, gridwrap, adaptivegrid, padded, split, tabs, doctabs, card, accordion, form, themeoverride, clip, innerwindow, navigation, popup, multiplewindows
**Inputs:** button, entry, multilineentry, passwordentry, checkbox, select, selectentry, radiogroup, checkgroup, slider, dateentry, calendar
**Display:** label, hyperlink, separator, spacer, progressbar, progressbarInfinite, activity, image, richtext, table, list, tree, toolbar, menu, textgrid, icon, fileicon
**Canvas:** canvasLine, canvasCircle, canvasRectangle, canvasText, canvasRaster, canvasLinearGradient, canvasArc, canvasPolygon, canvasRadialGradient

**TappableCanvasRaster (pixel-based rendering):**
```typescript
// Create tappable canvas with callbacks
const canvas = a.tappableCanvasRaster(width, height, {
  onTap: (x, y) => handleClick(x, y),
  onKeyDown: (key) => handleKey(key),  // Requires focus
});

// ✅ CORRECT: Use setPixelBuffer() with Uint8Array for full-canvas rendering
const buffer = new Uint8Array(width * height * 4);  // RGBA
for (let i = 0; i < width * height; i++) {
  const offset = i * 4;
  buffer[offset] = r;      // Red
  buffer[offset + 1] = g;  // Green
  buffer[offset + 2] = b;  // Blue
  buffer[offset + 3] = 255; // Alpha
}
await canvas.setPixelBuffer(buffer);  // Single efficient call

// ❌ WRONG: Never use setPixels() with object arrays for full canvas
// This creates 80,000+ objects and crashes the bridge!
const pixels = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    pixels.push({ x, y, r, g, b, a: 255 });  // BAD - massive array
  }
}
await canvas.setPixels(pixels);  // CRASHES with large canvases

// Request keyboard focus (required for onKeyDown to work)
await canvas.requestFocus();
```

**All widgets support:**
- `hide()` / `show()` - Imperative visibility control
- `when(() => boolean)` - Declarative visibility (returns `this` for chaining)
- `refresh()` - Re-evaluate visibility conditions

**VBox/HBox containers also support:**
- `model<T>(items: T[])` - Create ModelBoundList for smart list rendering
- `refreshVisibility()` - Update visibility of all children

## Testing

**Widget mode (TsyneTest):**
```typescript
import { TsyneTest, TestContext } from '../src/index-test';

const tsyneTest = new TsyneTest({ headed: false });
const testApp = await tsyneTest.createApp((app) => {
  createMyApp(app);
});
const ctx = tsyneTest.getContext();
await testApp.run();

await ctx.getById('helloBtn').click(); // Always prefer getById
await ctx.getById('resultLabel').within(500).shouldBe('Result');
```

**Browser mode (TsyneBrowserTest):**
```typescript
import { TsyneBrowserTest } from '../src/index-test';

const test = new TsyneBrowserTest({ headed: false });
// test.page methods like Playwright
```

**Run:** `pnpm test` or `TSYNE_HEADED=1 pnpm test examples/todomvc.test.ts`

### Adding Tests to New Demo Apps (phone-apps/)

Each demo app with tests needs its own `package.json` and `jest.config.js` so that `pnpm -r test` discovers them. CI runs `pnpm test:phone-apps` which recursively runs tests in all phone-apps workspaces.

**Required files for a new testable demo:**

1. `phone-apps/my-demo/package.json`:
```json
{
  "name": "tsyne-my-demo",
  "version": "0.1.0",
  "description": "My demo description",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.4.6",
    "typescript": "^5.0.0"
  }
}
```

2. `phone-apps/my-demo/jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testTimeout: 30000,
};
```

3. `phone-apps/my-demo/my-demo.test.ts` - Your actual test file

### TsyneTest Do's and Don'ts

**✅ DO:**
- **ALWAYS use `ctx.getById()` as your primary selector** - it's unique, stable, and reliable
- Use `.withId('elementId')` to register custom IDs on all widgets that tests interact with
- Use `.within(timeout).shouldBe(value)` pattern for assertions with polling
- Use `.getText()` to retrieve text values directly

**❌ DON'T:**
- Don't use `ctx.wait()` to fix timing issues - use proper locators instead
- Don't increase Jest timeouts - find the root cause instead - lengthening timeouts almost never works
- Don't use `.getValue()` - use `.getText()` or `.within().shouldBe()`

**❌ AVOID getByText() - Use getById() instead**

Why `getById()` is strongly preferred:
- **Uniqueness**: IDs are guaranteed unique. Text can be duplicated (e.g., multiple "Reset" buttons)
- **Stability**: IDs don't change. Text changes with UI updates, i18n, or localization
- **Reliability**: Text-based selectors can randomly find the wrong widget when labels overlap
- **Performance**: ID lookups are faster than text searches
- **Bridge safety**: `getByText()` with dynamic content can cause bridge crashes

Only use `getByText()` in rare cases where adding an ID is impossible:
- Don't use `className` parameter as an ID - it's only for styling

**Internal IDs vs Custom IDs:**

Widgets have two kinds of IDs:
- **Internal IDs** (e.g., `_label_k7m2z9`) - Auto-generated for bridge communication, NOT for testing
- **Custom IDs** (e.g., `resetBtn`) - Set via `.withId()`, stable and reliable for testing

Internal IDs use the format `_${type}_${random}` (underscore prefix, widget type, 6-char base36 random).
The underscore prefix signals "internal - don't use in tests". Like HTML's DOM, only explicit IDs are queryable.

```typescript
// Internal ID (auto-generated, don't use in tests)
const label = a.label('Hello');  // Gets ID like "_label_k7m2z9"

// Custom ID (explicit, use this in tests)
const label = a.label('Hello').withId('greeting');  // Queryable as 'greeting'
await ctx.getById('greeting').shouldBe('Hello');  // ✅ Stable
```

**Examples:**
```typescript
// ❌ WRONG - using getByText can find the wrong widget
await ctx.getByText('Reset').click();  // Multiple "Reset" buttons? Random behavior!

// ✅ CORRECT - using getById is unique and reliable
this.resetBtn = this.a.button('Reset').onClick(() => this.reset()).withId('resetBtn');
await ctx.getById('resetBtn').click();

// ❌ WRONG - using getByText for dynamic content
await ctx.getByText('Generation: 0').shouldExist();

// ✅ CORRECT - using withId and getById
this.generationLabel = this.a.label('0').withId('generationNum');
await ctx.getById('generationNum').within(100).shouldBe('0');

// ❌ WRONG - trying to use className as ID
this.label = this.a.label('text', 'myId');  // Second param is className, not ID!
await ctx.getById('myId').shouldBe('text');  // Won't work

// ✅ CORRECT - using withId for custom ID
this.label = this.a.label('text').withId('myId');
await ctx.getById('myId').within(100).shouldBe('text');

// ❌ WRONG - using wait() for timing
await ctx.wait(1000);
await ctx.getByText('Loaded').shouldExist();

// ✅ CORRECT - using within() for polling with getById
await ctx.getById('statusLabel').within(500).shouldBe('Loaded');
```

**Remote Control:** Tsyne environments (PhoneTop, Desktop, TabletTop) can expose an HTTP debug server for remote testing via `curl`. See [docs/remote_control.md](docs/remote_control.md).

## MVC Pattern

**Model:** Observable store with change listeners
**View:** Widget references (don't rebuild, just update)
**Controller:** Event handlers that update model only

**Example (TodoMVC with when()):**
```typescript
class TodoStore {
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener) { /* ... */ }
  private notifyChange() { /* triggers view updates */ }

  addTodo(text: string) {
    this.todos.push({ id: this.nextId++, text, completed: false });
    this.notifyChange(); // ← View auto-updates
  }
}

// Declarative visibility with when()
todoHBox.when(() => {
  const filter = store.getFilter();
  if (filter === 'all') return true;
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;
  return true;
});

// Store subscription triggers view updates
store.subscribe(() => {
  rebuildTodoList();  // Can be optimized with ModelBoundList
  updateStatusLabel();
  updateFilterButtons();
});
```

**Declarative APIs:**
- `widget.when(() => boolean)` - Declarative visibility control
- `container.model(items).trackBy(fn).each(builder)` - Smart list binding
- `widget.refresh()` - Re-evaluate visibility conditions
- `container.refreshVisibility()` - Update visibility without rebuild

## Current Capabilities & Limitations

**✅ Implemented:**
1. **when() method** - Declarative visibility control
2. **ModelBoundList** - Smart list binding with diffing
3. **Observable pattern** - Store with change listeners for reactive updates

**⏳ Current Limitations:**
1. **Still rebuilds on change** - TodoMVC rebuilds entire list (ModelBoundList.update() ready to use)
2. **No two-way binding** - Manual setText/getText
3. **No computed properties** - Manual label updates instead of reactive expressions
4. **when() optimization** - Infrastructure in place, not yet used for filter changes

See `more_mvc_like_for_todomvc_app.md` for implementation status and next steps.

## Declarative Patterns

**when() for conditional visibility:**
```typescript
// Single condition
checkbox.when(() => !isEditing);
textEntry.when(() => isEditing);

// Complex condition with store lookup
todoHBox.when(() => {
  const currentTodo = store.getAllTodos().find(t => t.id === todo.id);
  if (!currentTodo) return false;
  const filter = store.getFilter();
  return filter === 'all' ||
         (filter === 'active' && !currentTodo.completed) ||
         (filter === 'completed' && currentTodo.completed);
});
```

**ModelBoundList for smart lists (ng-repeat):**
```typescript
// Future: Smart list with incremental updates
const listBinding = todoContainer
  .model(store.getAllTodos())
  .trackBy((todo) => todo.id)
  .each((todo) => {
    a.hbox(() => {
      a.checkbox(todo.text, () => store.toggleTodo(todo.id));
      a.button('Delete').onClick(() => store.deleteTodo(todo.id));
    });
  });

// Update with smart diffing
store.subscribe(() => {
  listBinding.update(store.getAllTodos());
});
```

## Additional Display Widgets

**Icon** - Display theme icons:
```typescript
a.icon('confirm');  // Theme icon by name
a.icon('delete');   // 50+ icons: cancel, confirm, delete, search, home, settings, etc.
icon.setIconResource('search');  // Update icon
```

**FileIcon** - Display file type icons:
```typescript
a.fileicon('/path/to/document.pdf');  // Shows PDF icon
fileIcon.setURI('/new/path.jpg');     // Update path
fileIcon.setSelected(true);           // Selection state
```

**Calendar** - Standalone calendar picker:
```typescript
a.calendar(new Date(), (date) => console.log('Selected:', date));
// Full calendar UI, different from dateentry inline picker
```

## Dialog System

All dialogs are methods on `Window` objects:

**Information Dialogs:**
```typescript
await win.showInfo('Title', 'Information message');
await win.showError('Error', 'Something went wrong');
await win.showConfirm('Confirm', 'Are you sure?');  // Returns boolean
```

**File Dialogs:**
```typescript
const filePath = await win.showFileOpen();      // Returns path or null
const savePath = await win.showFileSave('default.txt');  // Returns path or null
const folder = await win.showFolderOpen();      // Returns folder path or null
```

**Input Dialogs:**
```typescript
// Quick text input
const text = await win.showEntryDialog('Name', 'Enter your name:');

// Complex form with multiple fields
const result = await win.showForm('User Details', [
  { type: 'entry', label: 'Name', key: 'name' },
  { type: 'password', label: 'Password', key: 'pass' },
  { type: 'multiline', label: 'Bio', key: 'bio' },
  { type: 'select', label: 'Country', key: 'country', options: ['US', 'UK', 'CA'] },
  { type: 'check', label: 'Subscribe', key: 'subscribe' }
]);
// Returns: { submitted: boolean, values: { name: string, pass: string, ... } }
```

**Color Picker:**
```typescript
const color = await win.showColorPicker('Choose Color', '#ff0000');
// Returns: { hex: '#ff0000', r: 255, g: 0, b: 0, a: 255 }
```

**Custom Content Dialogs:**
```typescript
// Custom dialog with arbitrary content
await win.showCustom('Custom', () => {
  a.vbox(() => {
    a.label('Any widgets here');
    a.button('Action').onClick(() => {});
  });
}, { dismissText: 'Close' });

// Custom confirm dialog
const confirmed = await win.showCustomConfirm('Confirm', () => {
  a.label('Custom content with confirm/cancel');
}, { confirmText: 'Yes', dismissText: 'No' });
```

**Progress Dialog:**
```typescript
const progress = await win.showProgress('Loading', 'Please wait...', {
  infinite: false,  // or true for spinner
  onCancelled: () => console.log('User cancelled')
});
progress.setValue(0.5);  // 50% (only for non-infinite)
progress.hide();         // Close dialog
```

## Window Methods

**Window Control:**
```typescript
win.resize(1024, 768);         // Resize window
win.setTitle('New Title');     // Change title
win.centerOnScreen();          // Center on display
win.setFullScreen(true);       // Enter fullscreen
win.setIcon('icon-resource');  // Set window icon
win.close();                   // Close window
```

**Close Intercept:**
```typescript
win.setCloseIntercept(async () => {
  const confirmed = await win.showConfirm('Quit', 'Save changes?');
  return confirmed;  // Return true to allow close, false to prevent
});
```

**Application Menu:**
```typescript
win.setMainMenu([
  {
    label: 'File',
    items: [
      { label: 'New', onClick: () => newFile() },
      { isSeparator: true },
      { label: 'Quit', onClick: () => app.quit() }
    ]
  },
  {
    label: 'Edit',
    items: [
      { label: 'Copy', onClick: () => copy() },
      { label: 'Paste', onClick: () => paste() }
    ]
  }
]);
```

**Clipboard Access:**
```typescript
const content = await win.getClipboard();  // Get clipboard text
await win.setClipboard('Hello');           // Set clipboard text
```

**Screenshot:**
```typescript
await win.screenshot('/path/to/screenshot.png');  // Capture window to PNG
```

## App-Level Features

**Theme Management (Hot-Swappable):**
```typescript
// Built-in themes
app.setTheme('dark');   // or 'light'
const theme = app.getTheme();  // Returns current theme

// Themes apply immediately - no reload needed
// Perfect for user preferences in settings panels
a.button('Dark Mode', async () => {
  app.setTheme('dark');
  // UI updates instantly with new theme
});
```

**Custom Theming (Hot-Swappable):**
```typescript
const customDarkTheme = {
  background: '#1a1a1a',
  foreground: '#ffffff',
  primary: '#0066cc',
  error: '#ff0000',
  success: '#00cc00',
  // 20+ color keys available
};

// Apply custom theme instantly
app.setCustomTheme(customDarkTheme);

// Switch back to default theme
app.clearCustomTheme();

// Or return to built-in theme
app.setTheme('light');
```

**Pattern for Persistent Theme Preferences:**
```typescript
// Store theme choice in app preferences
class Store {
  getTheme(): 'light' | 'dark' {
    return app.getPreference('theme', 'light');
  }

  setTheme(theme: 'light' | 'dark'): void {
    app.setPreference('theme', theme);
    app.setTheme(theme);  // Apply immediately
    this.notifyChange();  // Trigger UI update
  }
}

// On app startup, restore saved theme
const savedTheme = store.getTheme();
app.setTheme(savedTheme);

// In settings panel
a.button('Light', async () => {
  store.setTheme('light');
  // Theme applies instantly
});
a.button('Dark', async () => {
  store.setTheme('dark');
  // Theme applies instantly
});
```

**Real-World Example (Notes App):**
The Notes app demonstrates hot-swappable themes with:
- Light, dark, and custom color palettes
- Theme buttons that apply instantly
- Observable store that persists theme preference
- No page reload or restart needed

**Custom Fonts:**
```typescript
app.setCustomFont('/path/to/font.ttf', 'regular');  // regular, bold, italic, boldItalic, monospace, symbol
app.clearCustomFont('regular');  // or 'all' to clear all
app.setFontScale(1.2);           // Global font scaling (0.75-1.5)
const fonts = app.getAvailableFonts();  // Get font info
```

**System Tray:**
```typescript
app.setSystemTray({
  iconPath: '/path/to/icon.png',
  menuItems: [
    { label: 'Show Window', onClick: () => win.show() },
    { isSeparator: true },
    { label: 'Quit', onClick: () => app.quit() }
  ]
});
```

**Desktop Notifications:**
```typescript
app.sendNotification('Title', 'Notification message content');
```

**Persistent Preferences:**
```typescript
// Store and retrieve preferences (persists across sessions)
app.setPreference('username', 'john');
const username = app.getPreference('username', 'default');

// Type-specific getters
const count = app.getPreferenceInt('count', 0);
const ratio = app.getPreferenceFloat('ratio', 1.0);
const enabled = app.getPreferenceBool('enabled', true);

app.removePreference('username');
```

**Show Source Code:**
```typescript
app.showSource();              // Show current app source
app.showSource('/path/to/file.ts');  // Show specific file
```

## Container Widget Methods

**DocTabs (dynamic tab management):**
```typescript
const tabs = a.doctabs((tab) => { /* initial tabs */ });
tabs.append('New Tab', () => a.label('Content'), true);  // Add tab, select it
tabs.remove(0);    // Remove tab by index
tabs.select(1);    // Select tab by index
```

**Navigation (stack-based navigation):**
```typescript
const nav = a.navigation('Home', () => a.label('Home page'));
nav.push(() => a.label('Detail page'), 'Details');  // Push new view
nav.back();       // Pop to previous
nav.forward();    // Go forward in history
nav.setTitle('New Title');  // Update current title
```

**InnerWindow:**
```typescript
const inner = a.innerwindow('Title', () => { /* content */ });
inner.setTitle('New Title');
inner.close();
```

**Popup:**
```typescript
const popup = a.popup(() => { /* content */ });
popup.show(100, 200);  // Show at x, y coordinates
popup.move(150, 250);  // Move to new position
popup.hide();          // Hide popup
```

## Interaction Features

**Drag & Drop:**
```typescript
widget.setDraggable(true);   // Enable dragging
widget.setDroppable(true);   // Accept drops
// Handle via callbacks configured at creation
```

**Context Menus:**
```typescript
widget.setContextMenu([
  { label: 'Copy', onClick: () => copy() },
  { label: 'Paste', onClick: () => paste() }
]);
```

**Focus Management:**
```typescript
widget.focus();      // Set focus to widget
widget.focusNext();  // Move to next focusable
widget.focusPrevious();  // Move to previous focusable
```

**Widget Registration (for testing):**
```typescript
widget.registerTestId('my-button');    // Register for automated testing
widget.registerCustomId('unique-id');  // Custom ID for lookup
```

## Accessibility

```typescript
// Set accessibility metadata
widget.setAccessibility({
  label: 'Submit button',
  description: 'Submits the form',
  role: 'button'
});

// Screen reader announcements
app.announce('Form submitted successfully');

// Enable/disable accessibility
app.enableAccessibility();
app.disableAccessibility();
```

## TextGrid Advanced Features

```typescript
const grid = a.textgrid(80, 24);  // columns, rows

// Set content
grid.setText('Full grid content');
grid.setCell(0, 0, 'A', { fgColor: '#ff0000', bold: true });
grid.setRow(1, 'Entire row text', { bgColor: '#333333' });

// Styling
grid.setStyle(0, 0, { fgColor: '#00ff00', italic: true });
grid.setStyleRange(0, 0, 5, 10, { bgColor: '#0000ff' });

// Read content
const text = grid.getText();
```

## Resource Management

```typescript
// Register binary resources (for images, fonts, etc.)
app.resources.register('my-image', imageBuffer);
app.resources.unregister('my-image');

// Use registered resources
a.image({ resource: 'my-image' });
```

## Adding Features

**New widget (TypeScript):**
```typescript
export class MyWidget extends Widget {
  constructor(ctx: Context, options: any) {
    const id = ctx.generateId('mywidget');
    super(ctx, id);
    ctx.bridge.send('createMyWidget', { id, ...options });
    ctx.addToCurrentContainer(id);
  }
}
```

**New widget (Go bridge):**
```go
func (b *Bridge) handleCreateMyWidget(msg Message) {
  widgetID := msg.Payload["id"].(string)
  widget := widget.NewMyWidget()
  b.widgets[widgetID] = widget
  b.sendResponse(Response{ID: msg.ID, Success: true})
}
```

## Philosophy

- **Terse**: Use single letters where clear (`a` for app)
- **Declarative**: Describe UI structure, not imperative steps
- **Type-safe**: Full TypeScript types
- **Test-driven**: Include Jest tests for new features (npx jest to execute)
- **AI-friendly**: AI assistance encouraged for tests, code
- **No backward compatibility burden**: We are the only users of this codebase. Feel free to refactor, rename, or restructure anything as long as you consider the whole repo and update all affected code, tests, and documentation together.

## Quick Start

### Agentic Dev Environments

If you're in a containerized/cloud environment (Claude Code Web, Google's JulesAgent, Codespaces, etc.) with restricted network access:

```bash
# Step 1: Install system dependencies
apt-get update -qq
apt-get install -y libgl1-mesa-dev xorg-dev libxrandr-dev

# Step 2: Build bridge with GOPROXY=direct (fetches from VCS repos directly, bypasses Google's proxy)
cd /home/user/tsyne/core/bridge
env CGO_ENABLED=1 GOPROXY=direct go build -o ../bin/tsyne-bridge .

# Step 3: Enable pnpm and install dependencies
corepack enable
corepack prepare pnpm@latest --activate
cd /home/user/tsyne
pnpm install --ignore-scripts

# Step 4: Build and test
pnpm run build
pnpm test
```

### Standard Environments (Full Network Access)

If you have unrestricted network access:

```bash
pnpm install
cd bridge && go build -o ../bin/tsyne-bridge && cd ..
pnpm run build
node examples/hello.js
pnpm test
```

**IMPORTANT:** DO NOT BUILD `tsyne-bridge` anywhere else - it goes into `bin/` only.

## Development Workflow

**CRITICAL: No compiled JavaScript in source directories**

- TypeScript source files live in `src/`, `cosyne/src/`, `core/src/` (`.ts` files only)
- Compiled output goes to `dist/` directory only (via `pnpm run build`)
- **NEVER** have `.js`, `.d.ts`, or `.js.map` files in source trees
- **NEVER** run `tsc` or `npx tsc` directly - it compiles into src/ and breaks everything
- Use `npx tsx` for running applications (compiles on-the-fly with esbuild)
- This applies to both development AND production - tsx is used everywhere
- Tests use tsx automatically - no pre-compilation needed

**Why this matters:**
- When `.js` files exist in `src/`, Node.js/tsx loads them instead of compiling `.ts` files
- This causes stale code issues where your TypeScript changes don't take effect
- The project depends on tsx on-the-fly compilation, not pre-compiled artifacts
- `pnpm run build` creates `dist/` for distribution, but runtime uses tsx

**If you find `.js` files in source directories:**
```bash
# Clean up stale compiled files from ALL source directories
rm -f src/*.js src/*.d.ts src/*.js.map src/**/*.js src/**/*.d.ts src/**/*.js.map
rm -f cosyne/src/*.js cosyne/src/*.d.ts cosyne/src/*.js.map cosyne/src/**/*.js cosyne/src/**/*.d.ts cosyne/src/**/*.js.map
rm -f core/src/*.js core/src/*.d.ts core/src/*.js.map core/src/**/*.js core/src/**/*.d.ts core/src/**/*.js.map
```

**Running applications (development and production):**
```bash
npx tsx examples/calculator.ts
npx tsx examples/todomvc.ts
npx tsx examples/01-hello-world.ts
npx tsx your-app.ts
```

## Troubleshooting

See **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** for detailed solutions to common issues:
- Cloud/LLM environment setup (restricted network access)
- Go module proxy issues (`storage.googleapis.com`, `fyne.io/systray`)
- Missing system libraries (X11, OpenGL)
- Bridge startup problems
- Test timeouts
- Stale compiled JavaScript

### Screenshots Are Blank in Cloud/LLM Environments

**Problem:** You've set up Xvfb, run tests with `TSYNE_HEADED=1 TAKE_SCREENSHOTS=1`, tests pass, but screenshots are blank/white (~600 bytes instead of ~7KB).

**This is expected behavior, not a bug.**

Fyne uses OpenGL for rendering, which requires GPU hardware acceleration. Xvfb provides a software X11 display but cannot render OpenGL content properly. As a result:

- ✅ Tests pass (logic is verified)
- ✅ Screenshot files are created (capture mechanism works)
- ❌ Screenshot content is blank (OpenGL doesn't render to software framebuffer)

**What to do:**

1. **Don't worry about it** - Tests verify functionality; screenshots are supplementary
2. **Use existing screenshots** - `examples/screenshots/` contains pre-captured screenshots from a real display
3. **Verify screenshots exist** - Check file sizes (~7KB = real content, ~600 bytes = blank)

**For documentation purposes:** The repository's existing screenshots were captured on machines with real displays and show actual UI content. These can be referenced without needing to regenerate them.

See `docs/SCREENSHOTS.md` for more details on screenshot troubleshooting.

## Window Abstraction (ITsyneWindow)

### The Problem It Solves

Apps need to work in **three different hosting contexts**:
1. **Standalone mode** - Direct OS window (regular desktop app)
2. **Desktop mode** - Inner window in MDI environment (multiple apps in one process)
3. **Phone mode** - Stack pane for modal/fullscreen navigation (PhoneTop launcher)

Without abstraction, apps would need different code for each context. Instead, Tsyne uses a unified `ITsyneWindow` interface that adapts automatically.

### How It Works

The `ITsyneWindow` interface (`src/tsyne-window.ts`) provides a common API:
- `Window` - real OS window (resizable, movable, iconifiable)
- `InnerWindowAdapter` - desktop MDI inner window (resizable, titlebar, close button)
- `StackPaneAdapter` - phone stack pane (fixed size fullscreen layer, navigational back/close)

**Critical insight:** Apps just call `a.window()` normally. The framework automatically creates the right window type based on the current mode:

```typescript
// App code (context-agnostic)
export function buildNotesApp(a: App) {
  return a.window({ title: 'Notes', width: 900, height: 600 }, (win) => {
    // Same code works in all three contexts!
  });
}

// Framework automatically chooses the implementation:
// Standalone: a.window() → Window
// Desktop:   a.window() → InnerWindowAdapter (enabled via enableDesktopMode())
// Phone:     a.window() → StackPaneAdapter (enabled via enablePhoneMode())
```

### Window-Specific Methods (Graceful Degradation)

Some window methods don't apply to all contexts - they're no-ops where not applicable:
- `resize()` - Works in standalone/desktop, no-op in phone (fixed size)
- `centerOnScreen()` - Works in standalone, no-op in desktop/phone (positioning managed by container)
- `setFullScreen()` - Works in standalone, no-op in desktop/phone
- `setIcon()` - Works in standalone, no-op in others
- `onResize(callback)` - Works in standalone/desktop, no-op in phone (no resize events)

All return promises/values gracefully, so apps don't need conditional logic.

### Dialog System (Unified)

Dialogs are also unified:
- `showInfo()`, `showError()`, `showConfirm()` - Work the same in all modes
- File dialogs, forms, color pickers - All delegate to parent window in inner/phone modes
- No special handling needed in app code

### Context Switching (Framework Level)

The framework enables/disables modes via global context:

```typescript
// In desktop.ts when launching an app:
enableDesktopMode({
  desktopMDI: container,
  parentWindow: desktopWindow,
  desktopApp: appInstance
});

// Now ALL window() calls in that app create InnerWindowAdapters
const appWindow = a.window(...);  // Creates InnerWindowAdapter

// When app closes
disableDesktopMode();  // Back to standalone mode
```

### Pattern for Apps That Work Everywhere

Apps follow this pattern naturally:

```typescript
export function buildMyApp(a: App) {
  // Just use a.window() - framework handles the rest
  a.window({ title: 'My App', width: 800, height: 600 }, (win) => {
    win.setContent(() => {
      // Your normal UI code
    });
    win.show();
  });
}
```

No special content builders or checks needed. Apps discovered by `scanForApps()` work in all contexts automatically.

## Desktop Mode & App Sandboxing

Tsyne includes a **desktop environment** that can run multiple apps in inner windows, similar to a traditional desktop OS. Apps are discovered from `ported-apps/` and `examples/` directories.

**Desktop Architecture:**
```
Desktop Environment
├── App Icons (TsyneDraggableIcon on desktop canvas)
├── Launch Bar (Show Desktop, All Apps, Running Apps)
└── Inner Windows (one per running app)
    └── Sandboxed App Instance
        ├── ScopedContext (isolated widget IDs)
        └── ScopedResourceManager (isolated resources)
```

### App Metadata Format

Apps declare their metadata and dependencies using JSDoc-style comments:

```typescript
/**
 * Calculator App
 *
 * @tsyne-app:name Calculator
 * @tsyne-app:icon calculatorIcon
 * @tsyne-app:category Utilities
 * @tsyne-app:args (a: App) => void  // Dependency injection signature
 */
export function buildCalculatorApp(a: App): void {
  // App implementation using injected App instance
}
```

**Metadata Tags:**
- `@tsyne-app:name` - Display name for the app
- `@tsyne-app:icon` - Icon resource name (Fyne theme icon)
- `@tsyne-app:category` - Category for grouping (Games, Utilities, etc.)
- `@tsyne-app:args` - Builder function signature for dependency injection

**Reading Metadata at Runtime:**
```typescript
import { getAppMetadata } from 'tsyne';

// In standalone execution block, derive title from metadata
if (require.main === module) {
  const meta = getAppMetadata();
  app(resolveTransport(), { title: meta?.name ?? 'App' }, buildMyApp);
}
```

### Dependency Injection Pattern

Apps receive their dependencies through the builder function signature:

```typescript
// Pattern 1: App instance only (most common)
// @tsyne-app:args (a: App) => void
export function buildMyApp(a: App): void { }

// Pattern 2: App + Window (for dialog access)
// @tsyne-app:args (a: App, win: Window) => void
export function buildMyApp(a: App, win: Window): void { }

// Pattern 3: App + Context (for advanced scenarios)
// @tsyne-app:args (a: App, ctx: Context) => void
export function buildMyApp(a: App, ctx: Context): void { }
```

The desktop injects these dependencies when launching the app in its sandboxed environment.

### Sandboxing Architecture

When apps run in desktop mode, they're isolated through:

1. **ScopedContext** - Widget IDs are prefixed with app instance scope
   - Prevents cross-app widget access
   - Format: `${appInstanceId}:${widgetId}`
   - Container stack operations delegate to parent (InnerWindow integration)

2. **ScopedResourceManager** - Resources are namespaced per app
   - Apps can't access other apps' registered resources
   - Format: `${appInstanceId}:${resourceName}`

3. **IApp Interface** - Apps use a restricted API surface
   - `vbox()`, `hbox()`, `label()`, etc. - widget creation
   - No direct access to system APIs without explicit grants

**Key Files:**
- `src/desktop.ts` - Desktop environment, app discovery, launching
- `src/context.ts` - Context and ScopedContext classes
- `src/app-transformer.ts` - AST transformer for sandbox preparation (if using VM isolation)
- `src/sandbox-runtime.ts` - Pluggable sandbox runtime (Node VM, isolated-vm)

### Running the Desktop

```bash
# Run desktop environment
npx tsx examples/desktop-demo.ts

# Or via the buildDesktop function
import { buildDesktop } from './src/desktop';
app({ title: 'Tsyne Desktop' }, async (a) => {
  await buildDesktop(a);
});
```

### Testing Desktop Apps

Desktop tests use async builders since `buildDesktop` is async:

```typescript
const testApp = await tsyneTest.createApp(async (app) => {
  await buildDesktop(app);
});

// Interact with desktop icons
await ctx.getById('icon-calculator').click();
await ctx.getById('icon-calculator').click(); // Double-click to launch

// Interact with launched app
await ctx.getById('calc-display').shouldBe('0');
```

## PhoneTop: Phone Launcher

**PhoneTop** (`phone-apps/phonetop.ts`) is a phone-style **launcher** (not an OS) that runs Tsyne apps in a mobile UI. It provides a grid home screen, category folders, swipe navigation, and virtual keyboard. See **[phone-apps/README.md](phone-apps/README.md)** for terminology, stack position, and phone app development.

## Tauri Mobile (Android APK)

**Build Android APK for all 4 architectures:**
```bash
cd tauri-phonetop
JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 \
ANDROID_HOME=~/Android/Sdk \
NDK_HOME=~/Android/Sdk/ndk/26.1.10909125 \
npx tauri android build
```

**Prerequisites:** Java 17, Android SDK, NDK 26.x, Rust Android targets (`rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`)

**Output:** `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk` (27MB)

**Architecture:** Tauri WebView ←→ WebSocket ←→ Node.js + phonetop.ts (via `TSYNE_BRIDGE_MODE=web-renderer`)

## References

### Documentation
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API reference for widgets, layouts, and dialogs
- **[docs/reference.md](docs/reference.md)** - Comprehensive technical reference with examples
- **[docs/README.md](docs/README.md)** - Documentation index and navigation
- `docs/ARCHITECTURE.md` - Deep dive into internal architecture
- `docs/TESTING.md` - TsyneTest framework guide
- `docs/BROWSER_TESTING.md` - Browser mode testing guide
- `docs/remote_control.md` - HTTP API for remote inspection/control of Tsyne environments
- `docs/PATTERNS.md` - MVC, MVVM, MVP patterns
- `docs/ACCESSIBILITY.md` - Accessibility features and guidelines
- `docs/QUICKSTART.md` - Getting started guide
- `docs/ROADMAP.md` - Feature roadmap (~85% Fyne coverage, lists remaining APIs)
- `docs/PROS_AND_CONS.md` - Honest comparison with Electron/Tauri
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

### Example Code
- `examples/todomvc.ts` - Full MVC example with when() and filtering
- `examples/todomvc-when.ts` - Preserved when() implementation variant
- `more_mvc_like_for_todomvc_app.md` - Implementation status and next steps
- `src/widgets/base.ts` - Widget base class, when() implementation
- `src/widgets/containers.ts` - ModelBoundList, all container widgets

### Community
- `CODE_OF_CONDUCT.md` - Community guidelines
- `CONTRIBUTING.md` - Developer guide
