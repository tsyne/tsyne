# Porting Guide: cl-trello-clone -> Tsello

This guide documents the choices made when porting a Common Lisp / Caveman2 / HTMX web app to a Tsyne desktop app. It is intended to help LLMs and developers approach similar CL-to-Tsyne ports.

## Source Stack -> Target Stack

| Original (CL)                  | Tsyne Port                          |
|---------------------------------|-------------------------------------|
| Common Lisp                     | TypeScript                          |
| Caveman2 web framework          | Tsyne desktop framework             |
| HTMX partial swaps              | `.bindTo()` + store subscriptions   |
| Djula template loops            | `.bindTo()` render fn               |
| Sortable.js drag-drop           | `.makeDraggable()` / `.makeDroppable()` |
| Hyperscript hover interactions  | `onTap` / `hide()` / `show()`      |
| In-memory `*board*` plist       | PouchDB-backed `KanbanStore` class  |
| Server-side routes (REST)       | Observable store methods            |
| HTML forms                      | `win.showForm()` dialogs            |

## Architecture Mapping

### Server Routes -> Store Methods

The CL app uses RESTful routes where each HTTP endpoint mutates server-side state and returns an HTML fragment for HTMX to swap into the DOM. Tsyne replaces this with direct store method calls that notify subscribers.

| CL Route                    | Store Method          | Notes                           |
|-----------------------------|-----------------------|---------------------------------|
| `POST /lists`               | `store.addList()`     | CL returns `_board.html` partial|
| `DELETE /lists/:id`         | `store.deleteList()`  | Cascade deletes cards           |
| `POST /cards/new/:list-id`  | `store.addCard()`     | CL returns `_card.html` partial |
| `PUT /cards/:list-id/:id`   | `store.updateCard()`  | CL inline-edits with HTMX swap |
| `DELETE /cards/:list-id/:id`| `store.deleteCard()`  | CL targets `#card-{id}`        |
| `POST /cards/move`          | `store.moveCard()`    | CL receives from/to/cardId     |

The key insight: every CL route handler does two things — mutates state and returns HTML. In Tsyne, the store method mutates state and calls `notifyChange()`, which triggers subscribers that call `.update()` on bound lists. The "return HTML" step is replaced by the framework's reactive re-render.

### Djula Templates -> `.bindTo()` Render Functions

Where the CL app uses Djula template loops to generate HTML:

```html
<!-- CL: templates/_board.html -->
{% for list in lists %}
  <div class="list" id="list-{{ list.id }}">
    <h3>{{ list.name }}</h3>
    <div class="sortable" id="list-{{ list.id }}">
      {% for card in list.cards %}
        {% include "_card.html" %}
      {% endfor %}
    </div>
  </div>
{% endfor %}
```

Tsyne uses nested `.bindTo()` with `trackBy` for efficient diffing:

```typescript
// Tsyne: tsello.ts — outer list binding
a.hbox(() => {}).bindTo({
  items: () => store.getLists(),
  render: (list: KanbanList) => {
    a.stack(() => {
      a.canvasRectangle({ fillColor: '#EBECF0' });
      a.padded(() => {
        a.vbox(() => {
          a.label(list.title, undefined, undefined, undefined, { bold: true });
          // Inner card binding (nested)
          a.vbox(() => {}).makeDroppable({ ... }).bindTo({
            items: () => store.getCardsForList(list.id),
            render: (card: KanbanCard) => { /* card UI */ },
            trackBy: (card) => card.id,
          });
        });
      });
    });
  },
  trackBy: (list) => list.id,
});
```

**Choice:** Nested `.bindTo()` is the natural equivalent of nested Djula loops. The `trackBy` function is critical — without it, Tsyne can't diff the list efficiently and re-creates all widgets on every update.

### HTMX Swaps -> Store Subscriptions

The CL app uses `hx-target` and `hx-swap` to control where server responses are inserted into the DOM. Tsyne replaces this with a single store subscription that updates all bound lists:

```typescript
store.subscribe(async () => {
  await this.updateStatus();     // Update status bar
  this.listBinding.update();     // Re-render list columns
  for (const binding of this.cardBindings.values()) {
    binding.update();            // Re-render each list's cards
  }
});
```

**Choice:** A single subscription point is simpler than HTMX's per-element targeting. The store is the single source of truth, and all UI updates flow from it.

## Drag-and-Drop: Sortable.js -> makeDraggable/makeDroppable

### Original: Sortable.js + Hyperscript

The CL app uses Sortable.js with `group: 'shared'` to enable cross-list card dragging. The drop event is captured via Hyperscript on the board div, which populates a hidden form and triggers an HTMX POST:

```html
<!-- CL: templates/default.html -->
<div id="board" _="on end put event.from.id into #fromList.value
  then put event.to.id into #toList.value
  then put event.item.id into #movedCard.value
  then trigger cardmoved">
```

### Port: Tsyne Drag-Drop API

Tsyne's `.makeDraggable()` and `.makeDroppable()` provide equivalent functionality:

```typescript
// Card stack — draggable
a.stack(() => {
  cardBg.ref = a.canvasRectangle({ fillColor: '#FFFFFF' });
  a.padded(() => { /* card content */ });
}).makeDraggable({
  dragData: card.id,                    // Equivalent to Sortable's item.id
  dragLabel: card.label,                // Ghost overlay text
  onDragStart: () => { cardBg.ref?.setFillColor('#E0E0E0'); },
  onDragEnd: () => { cardBg.ref?.setFillColor('#FFFFFF'); },
  onDoubleTap: (cardId) => { /* open editor */ },
  onTap: (cardId) => { /* reveal action buttons */ },
});

// List vbox — droppable
a.vbox(() => {}).makeDroppable({
  onDrop: (dragData, _sourceId, dropIndex) => {
    listBg.setFillColor('#EBECF0');     // Reset highlight
    store.moveCard(dragData, list.id, dropIndex >= 0 ? dropIndex : undefined);
  },
  onDragEnter: () => { listBg.setFillColor('#D6EAF8'); },
  onDragLeave: () => { listBg.setFillColor('#EBECF0'); },
});
```

**Visual feedback mapping:**
| Sortable.js Feature       | Tsyne Equivalent                                |
|---------------------------|-------------------------------------------------|
| Ghost element follows cursor | `dragLabel` option creates floating overlay  |
| `animation: 150`          | List background highlights on drag-enter        |
| Sortable's `onEnd` event  | `onDrop` callback with `dropIndex`              |
| `group: 'shared'`         | Global drop target registry (automatic)         |

**Key difference:** Sortable.js provides automatic reordering within a list. Tsyne's drag-drop is inter-list only — the store's `moveCard()` handles the position logic. Reordering within a list would use the same `dropIndex` parameter.

## Hover Interactions -> Tap to Reveal

### Original: CSS + Hyperscript

The CL app uses CSS `:hover` and Hyperscript `_="on mouseenter toggle .hidden"` to show/hide edit and delete buttons on cards. This works naturally in a browser with mouse hover.

### Port: Single-Tap to Reveal

Desktop apps don't have the same hover semantics (especially on touch devices). Tsello uses single-tap to reveal action buttons:

```typescript
// Buttons are hidden initially
editBtn.ref.hide();
deleteBtn.ref.hide();
this.cardActionButtons.set(card.id, { editBtn: editBtn.ref, deleteBtn: deleteBtn.ref });

// makeDraggable's onTap reveals them
onTap: (cardId: string) => {
  this.selectCard(cardId);  // Hides previous card's buttons, shows this card's
},
```

**Choice:** Tap-to-reveal is more discoverable than hover on touch-first UIs, and avoids the problem of hover states not existing on mobile. Double-tap opens the full editor dialog.

## Inline Editing -> Dialog Editing

### Original: HTMX Inline Swap

The CL app replaces a card's display HTML with an edit form in-place using `hx-get="/cards/edit/:list-id/:id"` and `hx-swap="outerHTML"`. Cancel swaps back to the display template.

### Port: showForm() Dialogs

Tsyne uses modal form dialogs:

```typescript
const result = await this.win.showForm('Edit Card', [
  { name: 'label', label: 'Label', type: 'multiline' as const, value: card.label },
], {
  confirmText: 'Save',
  dismissText: 'Delete',
  confirmImportance: 'success',
  dismissImportance: 'danger'
});
```

**Choice:** `showForm()` is the Tsyne equivalent of HTML forms. The dialog approach is simpler than HTMX inline editing (no swap/cancel lifecycle to manage) and gives us the Delete action "for free" via the dismiss button.

## Data Model

### Original: Property Lists

```lisp
;; CL: in-memory board as nested property lists
(defvar *board*
  '((:name "To Do" :id 1 :cards ((:id 101 :label "Task" :list 1)))
    (:name "Doing" :id 2 :cards ())
    (:name "Done"  :id 3 :cards ())))
```

### Port: TypeScript Interfaces + Class

```typescript
// store.ts
interface KanbanList { id: string; title: string; }
interface KanbanCard { id: string; listId: string; label: string; }

class KanbanStore {
  private lists: KanbanList[] = [];
  private cards: KanbanCard[] = [];
  // Methods return defensive copies: [...this.lists]
}
```

**Choices:**
- **Separate cards array** rather than cards nested inside lists — simpler `moveCard()` (just update `listId` field) vs CL's `remove-card-from-list` + `add-card-to-list`
- **String IDs** (`list-001`, `card-001`) rather than CL's integer IDs — natural for `trackBy` and `dragData`
- **Defensive copies** — all getters return `[...array]` to prevent mutation, essential for `.bindTo()` diffing

## Persistence via PouchDB

The CL original uses in-memory state (despite having `cl-dbi` in its `.asd` dependencies, the `*board*` variable is the actual data store). Tsello adds persistence via PouchDB (Apache 2.0):

- **In-memory cache** for all reads (synchronous, defensive copies — required by `.bindTo()`)
- **PouchDB** for all writes (optimistic — cache updated immediately, DB write is fire-and-forget)
- **`initialize()`** loads PouchDB into cache on startup, seeds if empty
- PouchDB is injected from `main()` / the app factory, so TsyneOS can later swap in a syncing variant (remote CouchDB, peer-to-peer) without app code changes

## No Authentication

The original has no auth — this maps directly.

## Test Strategy

The CL app has a `tests/` directory but no substantive tests. Tsello has 59 tests across two files:

- **`store.test.ts`** — Pure store logic: CRUD operations, move with position, edge cases, defensive copies, subscriptions
- **`tsello.test.ts`** — Full UI integration: widget creation, form dialogs, menu items, drag-drop callbacks, bound list updates

**Pattern for porting tests:** Focus on store tests first (pure logic, no bridge dependency), then UI tests that verify widget creation and event flow through the mock bridge.

## Summary: Porting Checklist for CL/HTMX -> Tsyne

1. **Map routes to store methods** — Each CL route handler becomes a store method that mutates state + `notifyChange()`
2. **Map Djula loops to `.bindTo()`** — Nested template loops become nested `.bindTo()` with `trackBy`
3. **Map HTMX swaps to subscriptions** — `hx-target`/`hx-swap` becomes `store.subscribe()` + `.update()`
4. **Map HTML forms to `showForm()`** — Form inputs become `showForm()` field descriptors
5. **Map Sortable.js to `makeDraggable()`/`makeDroppable()`** — Ghost overlay, drop index, visual feedback callbacks
6. **Map CSS hover to tap interactions** — `onTap` callback to reveal buttons, `hide()`/`show()` for toggle
7. **Map Hyperscript events to Tsyne callbacks** — `_="on click..."` becomes `onClick`, `onDrop`, etc.
8. **Use defensive copies** — All store getters return `[...array]`, never direct references
9. **Use counter-based IDs** — `card-001` not `Date.now()` to avoid test collisions
