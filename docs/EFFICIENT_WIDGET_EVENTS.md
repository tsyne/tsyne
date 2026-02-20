# Efficient Widget Events: Bitmask + Concrete Variants

## Architecture

The event system has three layers:

1. **TypeScript** — microtask batching collapses fluent `.onMouseIn()`, `.onKeyDown()`, etc. into a single `setWidgetEvents` wire message per synchronous execution context
2. **Wire protocol** — bitmask `events` field + `cbs` callback ID table, carried on both `setWidgetEvents` and any `create*` payload
3. **Go** — `EventDispatcher` (fixed-size callback array indexed by `EventKind` enum) + concrete widget variants that implement Fyne interfaces

### Why concrete variants instead of generic wrappers

The original design proposed generic `Wrap*` types that wrap any `fyne.CanvasObject`. In practice this doesn't work well because:

- Base Fyne widgets (`widget.Button`, `widget.Label`) implement interfaces like `fyne.Focusable` and `desktop.Hoverable` natively — wrapping them hides those implementations
- `getText`/`setText` must know the inner widget type to read/write `.Text` — wrappers add a layer of indirection
- `handleClickWidget` has per-type branches for `*widget.Button` etc. — wrapping breaks those type assertions

Instead, we use **concrete variant types** that embed the real Fyne widget:

```go
type ButtonWithHover struct {
    widget.Button       // full Button, not wrapped
    disp *EventDispatcher
}

type ButtonWithHoverMouse struct {
    widget.Button
    disp *EventDispatcher
}

type ButtonWithHoverFocusKey struct {
    widget.Button
    disp    *EventDispatcher
    focused bool
}

type LabelWithHover struct {
    widget.Label
    disp *EventDispatcher
}
```

Each variant overrides the relevant interface methods to call **both** the base widget method (preserving Fyne's built-in behavior like hover highlighting) **and** `disp.fire()` (sending the event to TypeScript):

```go
func (b *ButtonWithHover) MouseIn(e *desktop.MouseEvent) {
    b.Button.MouseIn(e) // keep button's hover highlight
    b.disp.fire(EvMouseIn, posData(e.Position))
}
```

### Variant selection

`buttonVariant()` and `labelVariant()` select the minimal concrete type based on the events bitmask:

| Bitmask combination | Variant type |
|---|---|
| hover only | `ButtonWithHover` / `LabelWithHover` |
| hover + mouse | `ButtonWithHoverMouse` |
| hover + focus + key | `ButtonWithHoverFocusKey` |
| no hover | plain `*widget.Button` / `*widget.Label` (dispatcher fallback) |

Widgets that don't need hover (e.g. focus-only) keep their base type; events are dispatched via the `EventDispatcher` fallback path in `handleSimulateEvent`.

---

## Layer 1: TypeScript — Microtask Batching

Fluent event methods accumulate registrations and flush once via `queueMicrotask`:

```typescript
class Widget {
  protected registerEvent(eventKey: string, callbackId: string): void {
    if (!this.pendingEvents) this.pendingEvents = new Map();
    this.pendingEvents.set(eventKey, callbackId);
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => this.flushEvents());
    }
  }

  private flushEvents(): void {
    let events = 0;
    const cbs: Record<string, string> = {};
    for (const [key, id] of this.pendingEvents) {
      cbs[key] = id;
      const bit = eventKeyToBit[key];
      if (bit) events |= bit;
    }
    this.ctx.bridge.send('setWidgetEvents', { widgetId: this.id, events, cbs });
    this.pendingEvents = undefined;
    this.flushScheduled = false;
  }
}
```

All fluent calls within one synchronous execution context collapse into a single wire message:

```typescript
// One setWidgetEvents message (not four)
a.button('Submit', { onClick })
  .onMouseIn((e) => highlight())
  .onMouseOut(() => unhighlight())
  .onKeyDown((e) => handleKey(e))
  .onFocusChange((e) => ring());
```

---

## Layer 2: Wire Protocol — Bitmask + Callback ID Table

```json
{
  "widgetId": "_button_abc",
  "events": 43,
  "cbs": {
    "mouseIn":     "_cb_003",
    "mouseOut":    "_cb_004",
    "focusGained": "_cb_005",
    "focusLost":   "_cb_006"
  }
}
```

Bitmask:

```
bit 0:  Tappable          bit 5:  Focusable
bit 1:  DoubleTappable    bit 6:  Keyable
bit 2:  SecondaryTappable bit 7:  Draggable
bit 3:  Hoverable         bit 8:  Scrollable
bit 4:  Mouseable         bit 9:  Cursorable
```

---

## Layer 3: Go — EventDispatcher + Concrete Variants

### EventDispatcher

Fixed-size callback array indexed by `EventKind` enum — no map allocation, no string lookup:

```go
type EventDispatcher struct {
    bridge    *Bridge
    widgetID  string
    callbacks [eventCount]string
}

func (d *EventDispatcher) fire(kind EventKind, data map[string]interface{}) {
    cbID := d.callbacks[kind]
    if cbID == "" { return }
    data["callbackId"] = cbID
    d.bridge.sendEvent(Event{Type: "callback", WidgetID: d.widgetID, Data: data})
}
```

### handleSetWidgetEvents

Creates/updates the `EventDispatcher`, then upgrades the widget to the appropriate concrete variant if hover events are requested:

```go
func (b *Bridge) handleSetWidgetEvents(msg Message) Response {
    // 1. Create/update EventDispatcher with callback IDs
    disp := b.getOrCreateDispatcher(widgetID)
    for key, val := range cbs {
        disp.setCallback(cbKeyToEventKind(key), val)
    }

    // 2. Upgrade to concrete variant if needed
    switch w := obj.(type) {
    case *widget.Button:
        replacement = b.buttonVariant(w, events, disp)
    case *widget.Label:
        replacement = b.labelVariant(w, events, disp)
    }

    // 3. Replace in widget map and parent container
    if replacement != nil && replacement != obj {
        b.widgets[widgetID] = replacement
        // swap in parent container...
    }
}
```

This runs in **both headed and test mode** — concrete variants are always instantiated.

### handleSimulateEvent (test-mode only)

Calls **real Fyne interface methods** on concrete variants, exercising the same code path as headed mode:

```go
func (b *Bridge) handleSimulateEvent(msg Message) Response {
    // Only dispatch to widget methods on our concrete variants.
    // Base Fyne widgets (widget.Button) implement some interfaces
    // natively but their methods don't fire our EventDispatcher.
    if isEventVariant(obj) {
        switch eventStr {
        case "mouseIn":
            if h, ok := obj.(desktop.Hoverable); ok {
                h.MouseIn(buildMouseEvent(msg))  // → ButtonWithHover.MouseIn()
                return success                    //   → Button.MouseIn() + disp.fire()
            }
        case "focusGained":
            if f, ok := obj.(fyne.Focusable); ok {
                f.FocusGained()  // → ButtonWithHoverFocusKey.FocusGained()
                return success   //   → disp.fire()
            }
        // ... keyDown, mouseDown, etc.
        }
    }

    // Fallback: fire on dispatcher directly
    // (for widgets without concrete variants, e.g. focus-only buttons)
    if hasDisp {
        disp.fire(kind, buildDataMap(eventStr, msg))
        return success
    }
}
```

The `isEventVariant()` guard is critical: base `widget.Button` implements `fyne.Focusable` and `desktop.Hoverable` natively, but those methods don't fire our `EventDispatcher`. Without the guard, `simulate('focusGained')` on a plain button would call `Button.FocusGained()` (Fyne internal focus highlight) and return success without ever reaching our callback.

### Locator.focus() — Fyne canvas.Focus path

The test framework's `Locator` class has a `focus()` method that sends `focusWidget` to the Go bridge:

```typescript
async focus(): Promise<void> {
    const widgetId = await this.find();
    await this.bridge.send('focusWidget', { widgetId });
}
```

This exercises the full Fyne focus management path: `canvas.Focus(widget)` → Fyne calls `FocusGained()` on the widget → `ButtonWithHoverFocusKey.FocusGained()` fires → `disp.fire()` → TS callback.

---

## Test Coverage

### Three test suites (30 tests total)

**Event System Integration** (14 tests) — end-to-end widget creation, clicking, getText/setText:
- Buttons with all event type combinations
- Chained post-creation event registration
- Multiple buttons with different event combos
- Entry widgets alongside event-wrapped buttons
- Grid of event-wrapped buttons with dynamic text
- Mixed hbox/vbox layout with variant and plain widgets

**Event Stimulus — dispatcher round-trip** (8 tests) — simulate fires through the EventDispatcher:
- mouseIn/mouseOut with position data
- mouseMoved with position tracking
- mouseDown/mouseUp with button and position
- keyDown/keyUp with key names
- focusGained/focusLost with focused state (dispatcher fallback path)
- Combined sequence on one widget
- Rapid 20-event burst
- Widget state mutation via simulate callback

**Concrete variant stimulus — real widget methods** (8 tests) — simulate calls actual Fyne interface methods:
- `ButtonWithHover.MouseIn()`/`MouseMoved()`/`MouseOut()` with position data
- `ButtonWithHoverMouse.MouseDown()`/`MouseUp()` with button data
- `ButtonWithHoverFocusKey` via `focus()` → Fyne `canvas.Focus()` → `FocusGained()` + `KeyDown()`/`KeyUp()`
- `LabelWithHover.MouseIn()`/`MouseMoved()`/`MouseOut()` with position tracking
- `getText`/`setText` on all concrete variant types
- Full interaction sequence: mouseIn → mouseMoved → focusGained → keyDown → keyUp → focusLost → mouseOut
- `click()` on concrete variant fires `onClick`
- Mixed variant and plain widgets: click, simulate, getText all work

---

## Efficiency Summary

| Metric | Before (per-type Tsyne* structs) | Current (concrete variants) |
|--------|----------------------------------|-----------------------------|
| Wire messages for N events | N round trips | 1 (microtask batch) or 0 (constructor) |
| Go interface detection | 12 string-empty checks | 1 bitmask switch |
| Callback dispatch | Map lookup by string | Array index by EventKind enum |
| Widget types with event support | Button, Label (hover only) | Button (3 variants), Label (1 variant) |
| Test mode fidelity | `disp.fire()` directly (bypasses widget methods) | Real widget interface methods on variants |

### Files

| File | Purpose |
|---|---|
| `core/bridge/event_capabilities.go` | Bitmask constants, `EventKind` enum, `EventDispatcher`, capability structs (`HoverableCap`, `FocusableCap`, etc.), helper data builders |
| `core/bridge/event_widgets.go` | Concrete variant types: `ButtonWithHover`, `ButtonWithHoverMouse`, `ButtonWithHoverFocusKey`, `LabelWithHover` |
| `core/bridge/widget_properties.go` | `handleSetWidgetEvents`, `handleSimulateEvent`, `isEventVariant()`, `buttonVariant()`, `labelVariant()`, Fyne event struct builders |
| `core/src/widgets/base.ts` | `registerEvent()`, `flushEvents()`, `eventKeyToBit` mapping, fluent methods |
| `core/src/test.ts` | `Locator.simulate()`, `Locator.focus()` |
| `examples/event-system.test.ts` | 30 integration tests across 3 suites |
