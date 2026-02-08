# Tsello - Kanban Board

A Trello-like kanban board app ported from [cl-trello-clone](https://github.com/rajasegar/cl-trello-clone) (Common Lisp / Caveman2 / HTMX) to Tsyne.

```
+------------------+------------------+------------------+
|     To Do        |     Doing        |     Done         |
+------------------+------------------+------------------+
| Design wireframes| Implement login  | Create project   |
| Set up CI        | Review PRs       | Define reqs      |
| Write unit tests |                  |                  |
| [+ Add Card]     | [+ Add Card]     | [+ Add Card]     |
+------------------+------------------+------------------+
                                        [+ Add List]
```

## Features

- Multiple kanban lists displayed as columns (bold titles)
- Cards within each list with full CRUD operations
- Drag-and-drop cards between lists with position-aware insertion
- Ghost overlay follows cursor during drag (card label in floating rectangle)
- Visual feedback: list highlights on drag-enter, card dims on drag-start
- Single-tap card to reveal edit/delete buttons; double-tap to open editor
- Rename and delete lists (cascade deletes cards)
- PouchDB-backed persistent store (data survives restarts)
- Observable store drives automatic UI updates
- Status bar shows list and card counts

## Run

```bash
npx tsx ported-apps/tsello/tsello.ts
```

## Test

```bash
cd ported-apps/tsello
npx jest --forceExit
```

## Pseudo-Declarative Scorecard

| Criteria                         | Score |
|----------------------------------|-------|
| Observable store                 | Y     |
| `.bindTo()` for dynamic lists    | Y     |
| Nested `.bindTo()` for cards     | Y     |
| `trackBy` on both levels         | Y     |
| `viewStack.refresh()` on change  | Y     |
| `.withId()` for testability      | Y     |
| `showForm()` for CRUD dialogs    | Y     |
| Menu integration                 | Y     |
| Drag-and-drop between lists      | Y     |
| No imperative DOM manipulation   | Y     |
| **Score**                        |**10/10**|

## Lines of Code

| Component                      | cl-trello-clone | Tsello   |
|--------------------------------|-----------------|----------|
| Backend logic (Lisp / TS)      | 269             | 239 (`tsello.ts`) |
| Data model / store             | —               | 157 (`store.ts`)  |
| Templates (Djula HTML)         | 247             | —        |
| Frontend (JS/CSS)              | 238             | —        |
| **Total (meaningful lines)**   | **754**         | **396**  |
| Tests                          | —               | 552 (59 tests)    |

The port is 53% of the original's size — three language layers (Lisp, HTML/Djula, JS/CSS) consolidate into two TypeScript files. Meaningful lines exclude blanks and closing-bracket-only lines like `});`.

## Persistence

Tsello uses [PouchDB](https://pouchdb.com/) (Apache 2.0) for local persistence. Data is stored in a LevelDB database in the `tsello/` directory alongside the app. Delete that directory to reset to seed data.

PouchDB is injected at startup, so TsyneOS can later swap in a syncing variant (remote CouchDB, peer-to-peer) without app code changes.

## Credits

- Original: [cl-trello-clone](https://github.com/rajasegar/cl-trello-clone) by Rajasegar Chandran (MIT)
- PouchDB: Apache Software Foundation (Apache 2.0)
- Port: Paul Hammant, 2026
