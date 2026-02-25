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

Single-file apps can declare npm dependencies inline — no `package.json` needed. `// @Grab('axios@^1.6.0')` comments are parsed by `tsyne myapp.ts`, installed to `~/.tsyne/packages/`, and made available via `NODE_PATH`. Inspired by Groovy's Grape. See `docs/INLINE_DEPENDENCY_DECLARATIONS.md`.

## Cosyne: Declarative Canvas Library (200+ Tests, ~6000 Lines)

**Pseudo-declarative canvas grammar** with data binding, reactive updates, and interactive events. Use within `a.canvasStack()`.

The API follows the same fluent/builder patterns as the rest of Tsyne. Entry point is `cosyne(a, (c) => { ... })`. Primitives: circle, rect, line, text, path, arc, wedge, polygon, star, grid, heatmap, gauge, dial. Collections via plural forms (`circles()`, `rects()`). Bindings via `bindPosition()`, `bindFill()`, etc. — lazy-evaluated, diffed on `refreshBindings()`. Nested coordinate systems via `c.transform()`. Foreign objects via `c.foreign()` to embed Tsyne widgets.

**After state changes:** call `refreshAllCosyneContexts()` to push binding updates.

**Events** are fluent (`.onClick()`, `.onDrag()`, `.onMouseMove()`, etc.). Hit testing is automatic — each primitive implements `getHitTester()`, and `EventRouter` routes by z-order. Use `.passthrough()` to let events fall through to primitives below.

**Animations:** Two APIs — `.animate('property', { from, to, duration, easing })` and a fluent builder `.animateFluent('property', from, to).duration(ms).easing(fn).start()`. 30+ easing functions in `cosyne/src/easing.ts`. Global `AnimationManager` singleton coordinates via `requestAnimationFrame`.

**Performance trap:** Distance-based drag throttling (≥4px) is built in. `refreshBindings()` skips primitives without bindings (`hasAnyBinding()` check) and only updates when values actually change.

**Architecture:** `cosyne/src/primitives/` (12 shape types extending `Primitive<T>`), `cosyne/src/binding.ts`, `cosyne/src/events.ts`, `cosyne/src/context.ts`. Tests in `cosyne/test/`.

**Key design:** Fluent API, lazy bindings, O(n) collection diffing via trackBy, z-order aware event routing, mockable hit testers for tests, no backward compatibility concerns.

## CVG: Cosyne Vector Graphics (SVG-peer with Reactivity)

SVG-inspired vector graphics system — not an SVG renderer, but shares SVG's element vocabulary (`circle`, `rect`, `path`, `g`, `text`, `use`/`defs`). Renders through Tsyne's canvas primitives.

**What CVG adds beyond SVG:** Reactive bindings (`.bindFill()`, `.bindPos()`), data-driven lists (`.bindTo()` with D3-style enter/update/exit), perspective transforms (`cosynePerspective` on groups), hit testing + events, animation, conditional rendering (`.when()`), named element lookup (`.name()` + `ctx.find()`).

**Two entry points:** `cvg(app, { viewBox, width, height }, (s) => { ... })` for standalone, `cvgBuilder(app)` for builder-style.

**SVG import pipeline:** `loadSvg(app, svgString)` for runtime, `transpileSvg()` for SVG → editable TypeScript. All path commands normalized to absolute M/L/C/Z. Tested against 199 W3C SVG files.

**Architecture:** `cosyne/src/cvg/` — grammar, parser (regex-based, no deps), normalizer, transform (affine + projective), loader, transpiler, rasterizer (CPU clipPath/gradients/blur), types. Full reference in `cosyne/src/cvg/README.md`.

## Cosyne 3D: Declarative Scene Graphs (~300 Tests, ~4000 Lines)

3D extension of Cosyne with identical fluent API patterns. Primitives: sphere, box, plane, cylinder. Camera (perspective/orthographic), lighting (ambient/directional/point/spot), materials with presets (`Materials.gold()`, etc.). Ray casting for hit detection. Same binding system as 2D (`bindPosition()`, `bindMaterial()`, `bindScale()`). Collections and nested transforms with quaternion-based rotation composition.

**Current limitation:** Scene graph only — no renderer yet. Demos use a software renderer through Tsyne's canvas primitives.

**Architecture:** `cosyne/src/context3d.ts`, `cosyne/src/primitives3d/`, `cosyne/src/math3d.ts` (Vector3, Matrix4, Quaternion, Ray, Box3), `cosyne/src/camera.ts`, `cosyne/src/light.ts`, `cosyne/src/material.ts`. See `cosyne/README-3D.md` and `docs/COSYNE_3D.md`.

## Package Imports: Always Use `'tsyne'`

**All app code imports from the `tsyne` package, never from relative paths like `../core/src`.** The `core/` directory is published as `tsyne` via pnpm workspaces. This applies to everything in `examples/`, `phone-apps/`, `ported-apps/`, `larger-apps/`, and `launchers/`.

**Trap:** Relative imports to `core/src` will work initially but break when files move and violate the workspace boundary. If you see them, fix them.

Everything is exported from `tsyne` — all widgets, canvas primitives, animation types, App/Window, state management (`ObservableState`, `StateStore`, `TwoWayBinding`), test utilities (`TsyneTest`, `TestContext`, `Locator`, `Expect`), service interfaces. Check `core/src/index.ts` for the full export list.

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

## Mental Shift: Fluent Methods vs Constructor Parameters

**If coming from React/Vue/Angular:** Tsyne uses fluent methods (`.onClick()`, `.onSubmit()`, etc.) instead of constructor parameters.

**The trap:** `a.button('Add', onClick)` — the second param must be an options object, not a bare callback. Use `a.button('Add', { onClick })` or `a.button('Add').onClick(onClick)`.

Both options-object and fluent approaches work and can be mixed: `a.button('Add', { onClick: handler }).when(() => isVisible).withId('addBtn')`.

**The rule:** Methods that configure the widget (`.onClick()`, `.when()`, `.withId()`, `.width()`) are fluent and return `this`. Methods that query or act immediately (`getText()`, `setText()`, `requestFocus()`) return Promise/values and don't chain.

All input widgets accept callbacks at instantiation via options objects — see the widget source for the exact shapes.

## Widget Events

All widgets support mouse, keyboard, and focus events as fluent chainable methods (`.onMouseIn()`, `.onKeyDown()`, etc.) — naming follows DOM conventions. Events can also be passed as a `WidgetEventOptions` object in constructors.

**Traps:**
- Keyboard events only fire if the widget has focus — call `.focus()` first
- `.onMouse({ in?, moved?, out? })` is a convenience combo — use it instead of three separate calls when you need all three

**Internals worth knowing:**
- Fluent event chains auto-batch into one wire message via microtask — chain freely
- Go side upgrades widgets to concrete variants (e.g. `LabelWithHover`, `ButtonWithHoverMouse`) based on which event bits are registered — this is automatic, but explains why you'll see those types in bridge code. See `buttonVariant()`/`labelVariant()` in `widget_properties.go`

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

## Ported Apps Patterns

**Observable Store Pattern** — all ported apps use the same store shape: private `changeListeners` array, `subscribe()` returns unsubscribe function, `notifyChange()` triggers view updates. See any existing ported app for the template.

**Critical Patterns:**
- ❌ Don't import App type: `import { App }` → TypeScript errors. Use `app: any` parameter
- ✅ Defensive copies: `[...array]`, `{...object}` (tests verify immutability)
- ✅ ID generation: counter pattern `id: 'entity-${String(this.nextId++).padStart(3, '0')}'` (not Date.now())
- ✅ UI updates: `.when()` + `await viewStack.refresh()` for tabs
- ✅ Lists: `.bindTo()` with `trackBy: (item) => item.id`
- ❌ Don't use `prompt()` (returns Promise) → generate default values instead

**Test Template:** Aim for 40-50 Jest tests covering: CRUD (10), relationships (5-7), edge cases (5-7), observable (5), immutability (5). Tests co-located with production code. Run: `pnpm test ported-apps/[app]/index.test.ts`

**Files to Create:**
1. `ported-apps/[app]/index.ts` (single file, 400-730 lines)
2. `ported-apps/[app]/index.test.ts` (Jest tests, co-located)
3. `ported-apps/[app]/index.tsyne.test.ts` (tab navigation + screenshot)
4. `ported-apps/[app]/package.json` (workspace package — **required**)
5. `ported-apps/[app]/jest.config.js` (test config — **required**)
6. `ported-apps/[app]/README.md` (ASCII diagrams)
7. `ported-apps/[app]/LICENSE` (MIT/Apache)

**Workspace Registration (Critical):**

Every new app module **must** have its own `package.json` and be registered in `pnpm-workspace.yaml`. Without this, `pnpm test` walks up to the repo root and runs the **entire** root test suite (~900+ tests) instead of the app's own tests. Copy `package.json` and `jest.config.js` from an existing ported app and adjust the name. Add the new entry alphabetically in `pnpm-workspace.yaml`. Run `pnpm install` to wire up workspace symlinks.

**See Also:** `/docs/pseudo-declarative-ui-composition.md` → "Lessons from Ported Apps"

## Widget Categories

**Containers:** vbox, hbox, stack, scroll, grid, center, max, border, gridwrap, adaptivegrid, padded, split, tabs, doctabs, card, accordion, form, themeoverride, clip, innerwindow, navigation, popup, multiplewindows
**Inputs:** button, menuButton, entry, multilineentry, passwordentry, checkbox, select, selectentry, completionEntry, radiogroup, checkgroup, slider, dateentry, calendar
**Display:** label, hyperlink, separator, spacer, progressbar, progressbarInfinite, activity, image, richtext, table, list, tree, toolbar, menu, textgrid, icon, fileicon
**Canvas:** canvasLine, canvasCircle, canvasRectangle, canvasText, canvasRaster, canvasLinearGradient, canvasArc, canvasPolygon, canvasRadialGradient

**Widgets with non-obvious APIs:**

- **CompletionEntry** — autocomplete input from fyne.io/x. You create it with an empty options array and a callback; inside the callback, filter and call `entry.setOptions()` then `entry.showCompletion()`/`entry.hideCompletion()`
- **MenuButton** — button with popup menu. Builder callback gets `menu` with `.item(label, handler)`. Flat menus only, no submenus yet
- **TappableCanvasRaster** — pixel-level rendering. **Trap:** Use `setPixelBuffer(Uint8Array)` for full-canvas updates, never `setPixels()` with object arrays — that creates 80,000+ objects and crashes the bridge. Keyboard events require `.requestFocus()` first

**All widgets support:** `hide()`/`show()` (imperative), `when(() => boolean)` (declarative, chainable), `refresh()` (re-evaluate visibility). VBox/HBox also support `model(items)` for ModelBoundList and `refreshVisibility()`.

## Testing

**TsyneTest** creates a headless app instance for widget testing. Pattern: create app → get context → interact via locators → assert with polling.

```typescript
const tsyneTest = new TsyneTest({ headed: false });
const testApp = await tsyneTest.createApp((app) => { createMyApp(app); });
const ctx = tsyneTest.getContext();
await testApp.run();

await ctx.getById('helloBtn').click();
await ctx.getById('resultLabel').within(500).shouldBe('Result');
```

**`simulate()` vs `click()`:** `click()` exercises the full Fyne tap path. `simulate()` covers everything else — it calls real Fyne widget methods on concrete variants, exercising the full Go→TS callback path. Supported events: `mouseIn`, `mouseOut`, `mouseMoved`, `mouseDown`, `mouseUp`, `keyDown`, `keyUp`, `focusGained`, `focusLost`, `tap`, `doubleTap`, `secondaryTap`, `dragged`, `dragEnd`, `scrolled`. Keyboard events require the widget to be focused first.

**Browser mode:** `TsyneBrowserTest` with Playwright-style `test.page` methods.

**Run:** `pnpm test` or `TSYNE_HEADED=1 pnpm test examples/todomvc.test.ts`

**New demo apps (phone-apps/)** need their own `package.json` and `jest.config.js` — copy from an existing one. CI runs `pnpm test:phone-apps` recursively.

### TsyneTest: The Testing Religion

**Always `getById()`, never `getByText()`.** This is non-negotiable:
- Text can be duplicated (multiple "Reset" buttons), IDs can't
- Text changes with UI updates, IDs don't
- `getByText()` with dynamic content can crash the bridge
- Every widget tests interact with gets `.withId('stableId')`

**The `within()` pattern replaces waits:** `await ctx.getById('status').within(500).shouldBe('Loaded')` — this polls. Never use `ctx.wait()`, never increase Jest timeouts. If a test is slow, the problem is in your code, not the timeout.

**Internal IDs (`_label_k7m2z9`) vs custom IDs (`resetBtn`):** Internal IDs are auto-generated for bridge plumbing — underscore prefix means "don't use in tests." Only `.withId()` IDs are for test consumption.

**Trap:** `a.label('text', 'myId')` — second param is `className`, not ID. Use `a.label('text').withId('myId')`.

## MVC Pattern

**Model:** Observable store with change listeners. **View:** Widget references (update, don't rebuild). **Controller:** Event handlers that update model only.

The pattern: store mutates → `notifyChange()` → subscribers update widgets (`.setText()`, `.refresh()`, etc.). Declarative visibility via `widget.when(() => boolean)`. Smart lists via `container.model(items).trackBy(fn).each(builder)` with O(n) diffing.

**Current limitations:** TodoMVC still rebuilds full lists (ModelBoundList ready but not yet used everywhere), no two-way binding (manual setText/getText), no computed properties. See `more_mvc_like_for_todomvc_app.md` for status.

## Dialogs

All dialogs are `await`-able methods on **Window** (not App).

- **Info/Error/Confirm:** `win.showInfo(title, msg)`, `win.showError(...)`, `win.showConfirm(...)` — confirm returns boolean
- **File:** `showFileOpen()`, `showFileSave(default)`, `showFolderOpen()` — all return path or null
- **Text input:** `showEntryDialog(title, prompt)` — returns string
- **Form:** `showForm(title, fieldDescriptors[])` — returns `{ submitted, values }`. Field types: entry, password, multiline, select, check
- **Color:** `showColorPicker(title, default)` — returns `{ hex, r, g, b, a }`
- **Custom content:** `showCustom(title, builder)` and `showCustomConfirm(title, builder)` — builder callback gets full widget access
- **Progress:** `showProgress(title, msg, { infinite?, onCancelled? })` — returns handle with `.setValue()` and `.hide()`

**Trap:** Custom dialogs use builder callbacks — same reentrant/idempotent rules apply as `setContent()`.

## Window Methods

Standard window control: `resize()`, `setTitle()`, `centerOnScreen()`, `setFullScreen()`, `setIcon()`, `close()`. Close intercept via `win.setCloseIntercept(async () => boolean)`. Application menus via `win.setMainMenu([...])`. Clipboard via `win.getClipboard()`/`win.setClipboard()`. Screenshots via `win.screenshot(path)`.

All straightforward — see `src/window.ts` for exact signatures.

## App-Level Features

**Themes:** `app.setTheme('dark'|'light')` applies instantly, no reload. `app.setCustomTheme({...})` for custom palettes (20+ color keys), `app.clearCustomTheme()` to revert. Notes app demonstrates the full pattern.

**Fonts:** `app.setCustomFont(path, style)` where style is regular|bold|italic|boldItalic|monospace|symbol. `app.setFontScale(0.75-1.5)` for global scaling.

**Persistent prefs:** `app.setPreference(key, val)` / `app.getPreference(key, default)` — also `getPreferenceInt`, `getPreferenceFloat`, `getPreferenceBool`. Persists across sessions. Use this for theme choices, window sizes, etc.

**System tray, notifications:** `app.setSystemTray({ iconPath, menuItems })`, `app.sendNotification(title, msg)` — straightforward, see source for shapes.

**Trap:** `app.showSource()` pops a window with the running app's source code. Handy for demos, don't leave it in production.

## Container Expansion (VBox/HBox Layout)

**The trap:** Scroll containers collapse to one line in a vbox because everything sizes to content.

**The rule:** Only `border()` regions (top/center/bottom/left/right) and `max()` expand to fill available space. Everything else sizes to content.

```typescript
// ❌ scroll collapses in vbox
a.vbox(() => { a.label('Title'); a.scroll(a.vbox(items)); a.label('Footer'); });

// ✅ border() with center region expands
a.border({
  top: () => a.vbox(() => { a.label('Title'); a.separator(); }),
  center: () => a.scroll(a.vbox(items)),
  bottom: () => a.vbox(() => { a.separator(); a.label('Footer'); })
});

// ✅ max() wrapper also works
a.vbox(() => { a.label('Title'); a.max(a.scroll(a.vbox(items))); a.label('Footer'); });
```

## Container, Interaction, and Display Widgets

DocTabs (dynamic tab management), Navigation (stack-based), InnerWindow, Popup — all follow the builder pattern. Drag & drop via `setDraggable()`/`setDroppable()`. Context menus via `setContextMenu([...])`. Focus management via `focus()`/`focusNext()`/`focusPrevious()`. Accessibility via `setAccessibility({ label, description, role })` and `app.announce()`. Resource management via `app.resources.register()`/`unregister()`.

**TextGrid** — terminal-style character grid with cell-level styling. Used by the terminal app. Key methods: `setText(text)`, `getText()`, `setCell(col, row, char, style?)`, `setRow(row, text, style?)`, `setStyle(col, row, style)`, `setStyleRange(col1, row1, col2, row2, style)`. Style options: `fgColor`, `bgColor`, `bold`, `italic`. See `core/src/widgets/display_data.ts`.

All other container/interaction widgets are straightforward — read the source when you need exact APIs.

## Adding Features

**New widget pattern:** TypeScript side extends `Widget`, generates an ID via `ctx.generateId()`, sends a create message over the bridge, and calls `ctx.addToCurrentContainer(id)`. Go side handles the create message, instantiates the Fyne widget, stores it in `b.widgets[id]`, and sends a success response. See any existing widget pair for the template.

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

- TypeScript source lives in `src/`, `cosyne/src/`, `core/src/` (`.ts` files only)
- Compiled output goes to `dist/` only (via `pnpm run build`)
- **NEVER** run `tsc` or `npx tsc` directly — it compiles into src/ and breaks everything
- Use `npx tsx` for running applications (compiles on-the-fly with esbuild)
- Tests use tsx automatically — no pre-compilation needed

**Why this is a trap:** When `.js` files exist in `src/`, Node.js/tsx loads them instead of compiling `.ts` files. Your TypeScript changes silently don't take effect. If you find `.js`/`.d.ts`/`.js.map` files in source directories, delete them — they're stale artifacts.

**Running apps:** `npx tsx examples/calculator.ts`, `npx tsx your-app.ts`

## Troubleshooting

See **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** for: cloud/LLM environment setup, Go module proxy issues, missing system libraries, bridge startup, test timeouts, stale compiled JavaScript.

**Screenshots are blank in cloud environments** — this is expected. Fyne uses OpenGL which needs GPU hardware acceleration. Xvfb provides software X11 but can't render OpenGL. Tests pass (logic verified), screenshots are just blank. Don't worry about it. See `docs/VISUAL_TESTING.md`.

## Window Abstraction (ITsyneWindow)

Apps work in three hosting contexts without code changes: **standalone** (real OS window), **desktop** (MDI inner window), **phone** (stack pane). The framework automatically creates the right window type based on the current mode — apps just call `a.window()` normally.

Methods that don't apply degrade gracefully as no-ops (e.g. `resize()` in phone mode, `centerOnScreen()` in desktop mode). Dialogs are unified across all modes.

**The key insight:** Apps should never check which mode they're in. Just use `a.window()` and the framework handles it.

**Decoupled content pattern:** For maximum reuse, ported apps decouple content from window via `IRenderTarget` and `asRenderTarget(win)` — the app function takes a render target, the entry point creates the appropriate window and casts it. See `docs/WINDOW_ADAPTATION.md`.

## Desktop Mode & App Sandboxing

Desktop environment runs multiple apps in inner windows. Apps discovered from `launchers/all-apps.ts`. Each app gets a `ScopedContext` (widget IDs prefixed with app instance) and `ScopedResourceManager` (resources namespaced per app) — prevents cross-app interference.

**App metadata** via JSDoc: `@tsyne-app:name`, `@tsyne-app:icon`, `@tsyne-app:category`, `@tsyne-app:args`. The `@tsyne-app:args` tag declares the dependency injection signature — `(a: App) => void` is most common. Desktop injects these when launching.

**Key files:** `launchers/desktop/index.ts`, `src/context.ts` (ScopedContext), `src/sandbox-runtime.ts`.

**Run:** `npx tsx launchers/desktop/index.ts`

## PhoneTop: Phone Launcher

Phone-style launcher (`phone-apps/phonetop.ts`) — grid home screen, category folders, swipe navigation, virtual keyboard. It's a launcher, not an OS. See `phone-apps/README.md`.

## Tauri Mobile (Android APK)

Build via `npx tauri android build` in `tauri-phonetop/`. Needs Java 17, Android SDK, NDK 26.x, Rust Android targets. Architecture: Tauri WebView ←→ WebSocket ←→ Node.js + phonetop.ts (via `TSYNE_BRIDGE_MODE=web-renderer`). See the build commands in `tauri-phonetop/`.

## References

### Documentation
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete API reference for widgets, layouts, and dialogs
- **[docs/reference.md](docs/reference.md)** - Comprehensive technical reference with examples
- **[docs/README.md](docs/README.md)** - Documentation index and navigation
- `docs/ARCHITECTURE.md` - Internal architecture deep dive
- `docs/TESTING.md` - TsyneTest framework guide
- `docs/BROWSER_TESTING.md` - Browser mode testing guide
- `docs/remote_control.md` - HTTP API for remote inspection/control
- `docs/PATTERNS.md` - MVC, MVVM, MVP patterns
- `docs/ACCESSIBILITY.md` - Accessibility features and guidelines
- `docs/QUICKSTART.md` - Getting started guide
- `docs/ROADMAP.md` - Feature roadmap (~85% Fyne coverage)
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

### Example Code
- `examples/todomvc.ts` - Full MVC example with when() and filtering
- `src/widgets/base.ts` - Widget base class, when() implementation
- `src/widgets/containers.ts` - ModelBoundList, all container widgets
