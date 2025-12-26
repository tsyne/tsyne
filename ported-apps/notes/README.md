# Notes App - Tsyne Port

A simple but powerful notes application with persistent storage, live editing, and hot-swappable themes. This is a Tsyne port of the [original Notes app](https://github.com/fynelabs/notes) by Andy Williams, written in Go+Fyne.

## Features

- 📝 **Note Management**: Create, edit, and delete notes with automatic selection
- 💾 **Persistent Storage**: Notes are stored using the app preferences system
- 🎨 **Hot-Swappable Themes**: Switch between light, dark, and custom color themes instantly
- 🔍 **Search**: Find notes by title or content (case-insensitive)
- 📱 **Responsive Layout**: Dual-pane interface with notes list and editor
- ⌨️ **Multiline Editing**: Support for formatted text with proper line breaks

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│                        Notes Application                      │
├─────────────────────────┬───────────────────────────────────┤
│       LEFT SIDEBAR      │       RIGHT SIDEBAR (EDITOR)      │
├─────────────────────────┼───────────────────────────────────┤
│                         │                                   │
│  📝 Notes               │  Editor                           │
│  ┌─────────────────┐    │  ┌─────────────────────────────┐  │
│  │ [+] [-]        │    │  │ Title:                      │  │
│  ├─────────────────┤    │  │ ┌─────────────────────────┐ │  │
│  │ • Welcome       │    │  │ │ Welcome                 │ │  │
│  │ • Shopping List │    │  │ └─────────────────────────┘ │  │
│  │ • Ideas         │    │  │                             │  │
│  │ • New Note      │    │  │ Content:                    │  │
│  │                 │    │  │ ┌─────────────────────────┐ │  │
│  │                 │    │  │ │ Welcome to Notes App!   │ │  │
│  │                 │    │  │ │ ...                     │ │  │
│  │                 │    │  │ └─────────────────────────┘ │  │
│  │                 │    │  │                             │  │
│  │ 3 notes         │    │  │ 🎨 Theme                    │  │
│  └─────────────────┘    │  │ [☀️ Light] [🌙 Dark]        │  │
│                         │  │ [🎨 Custom Light]           │  │
│                         │  │ [🎨 Custom Dark]            │  │
│                         │  │                             │  │
│                         │  │ Theme: ☀️ Light             │  │
│                         │  └─────────────────────────────┘  │
└─────────────────────────┴───────────────────────────────────┘
```

## Data Model

### Note
```typescript
interface Note {
  id: string;              // Unique identifier (note-001, note-002, ...)
  title: string;           // Note title
  content: string;         // Full note content (supports multiline)
  createdAt: Date;         // Creation timestamp
  modifiedAt: Date;        // Last modification timestamp
}
```

### NotesPreferences
```typescript
interface NotesPreferences {
  theme: 'light' | 'dark'; // Current theme
  customTheme?: Record<string, string>; // Optional custom color scheme
}
```

## Key Features

### Note Management

- **Create**: Click the `[+]` button to create a new note
- **Edit**: Click on a note to select it, then edit title and content
- **Delete**: Click the `[-]` button to delete the selected note (disabled if only one note remains)
- **Search**: Filter notes by title or content (case-insensitive search)

### Theme System

The app supports three types of themes:

1. **Light Theme** (Default)
   - Clean, readable interface
   - Dark text on light background

2. **Dark Theme**
   - Eye-friendly for low-light environments
   - Light text on dark background

3. **Custom Themes**
   - Custom Light: Custom palette with light colors
   - Custom Dark: Custom palette with dark colors
   - Easy to extend with additional color schemes

Theme colors can be customized by modifying the `customLightTheme` and `customDarkTheme` objects in the app.

### Observable Store Pattern

The `NotesStore` follows the Observable pattern for reactive UI updates:

```typescript
const store = new NotesStore();

// Subscribe to changes
const unsubscribe = store.subscribe(async () => {
  // Update UI when store changes
  await updateUI();
});

// Changes trigger notifications
store.addNote();        // Notifies all listeners
store.updateNoteTitle(id, 'New Title'); // Notifies all listeners
store.deleteNote(id);   // Notifies all listeners
store.setTheme('dark'); // Notifies all listeners

// Cleanup
unsubscribe();
```

## Store API

### Note Management Methods

- `getNotes(): Note[]` - Get all notes
- `getNoteCount(): number` - Get total notes count
- `getSelectedNoteId(): string | null` - Get ID of currently selected note
- `getSelectedNote(): Note | undefined` - Get the currently selected note object
- `getNoteById(id: string): Note | undefined` - Get specific note by ID
- `selectNote(id: string): boolean` - Select a note for editing
- `addNote(): Note` - Create and select a new note
- `updateNoteTitle(id: string, title: string): boolean` - Update note title
- `updateNoteContent(id: string, content: string): boolean` - Update note content
- `deleteNote(id: string): boolean` - Delete a note
- `searchNotes(query: string): Note[]` - Search notes by title or content

### Preferences Methods

- `getPreferences(): NotesPreferences` - Get current preferences
- `setTheme(theme: 'light' | 'dark'): void` - Change theme
- `setCustomTheme(colors?: Record<string, string>): void` - Apply custom theme

### Observable Pattern

- `subscribe(listener: ChangeListener): () => void` - Subscribe to changes (returns unsubscriber function)

## Testing

### Jest Unit Tests (40+ tests)

```bash
npm test -- ported-apps/notes/index.test.ts
```

Covers:
- Initialization and default state
- CRUD operations (create, read, update, delete)
- Search functionality
- Theme preferences
- Observable pattern and subscriptions
- Immutability and defensive copies
- Edge cases (long titles, special characters, rapid operations)

### TsyneTest Widget Tests (20+ tests)

```bash
npm test -- ported-apps/notes/index.tsyne.test.ts
```

Covers:
- UI rendering and layout
- Note selection and editing
- Theme switching in the UI
- Status display updates
- Multi-operation workflows
- Editor functionality with multiline content

## Development

### Running the App

```bash
npx tsx ported-apps/notes/index.ts
```

Or as part of the desktop environment:

```bash
npx tsx examples/desktop-demo.ts
```

### File Structure

```
ported-apps/notes/
├── index.ts              # Main app implementation (600+ lines)
├── index.test.ts         # Jest unit tests (450+ lines)
├── index.tsyne.test.ts   # TsyneTest widget tests (400+ lines)
└── README.md             # This file
```

## Implementation Highlights

### Pseudo-Declarative UI Composition

The app uses Tsyne's builder pattern for clean, readable UI code:

```typescript
a.window({ title: 'Notes' }, (win) => {
  win.setContent(() => {
    a.hbox(() => {
      // Left sidebar
      a.vbox(() => {
        a.label('📝 Notes').withBold();
        notesList = a.vbox(() => {}).bindTo({
          items: () => store.getNotes(),
          render: (note) => { /* ... */ },
          trackBy: (note) => note.id
        });
      });

      // Right editor panel
      a.vbox(() => {
        titleEntry = a.entry().onChange((text) => {
          store.updateNoteTitle(selectedId, text);
        });
        contentEntry = a.multilineentry().onChange((text) => {
          store.updateNoteContent(selectedId, text);
        });
      });
    });
  });
});
```

### Observable Store with Reactive UI

Changes in the store automatically trigger UI updates:

```typescript
store.subscribe(async () => {
  await updateUI();  // Re-render affected UI elements
});

// User actions -> Store methods -> Change notification -> UI update
a.button('Add').onClick(async () => {
  store.addNote();  // Triggers notification
  // updateUI() called automatically
});
```

### Theme Switching

The app integrates theme switching at both the store level and app level:

```typescript
// User clicks theme button
a.button('Dark').onClick(async () => {
  store.setTheme('dark');           // Update store
  await a.setTheme('dark');         // Apply to app
  await updateUI();                  // Refresh UI
});

// On startup, reapply saved theme
const applyTheme = async () => {
  const prefs = store.getPreferences();
  if (prefs.customTheme) {
    await a.setCustomTheme(prefs.customTheme);
  } else {
    await a.setTheme(prefs.theme);
  }
};
```

## Immutability and Defensive Copying

All store methods return defensive copies to prevent external mutations:

```typescript
// Returns new array, not reference
getNotes(): Note[] {
  return [...this.notes];
}

// Returns shallow copy of preferences
getPreferences(): NotesPreferences {
  return { ...this.preferences };
}
```

## Lessons Applied from Ported Apps

1. **Observable Pattern**: Consistent use across all methods
2. **Defensive Copies**: Immutability verified in tests
3. **Counter-Based IDs**: Prevents collision issues (`note-001`, `note-002`, ...)
4. **Dual-Pane UI**: Two-column layout for better UX
5. **Theme Persistence**: Store preferences for application state
6. **Reactive Updates**: `store.subscribe()` triggers UI refresh

## Related Files

- **Original Fyne Implementation**: [github.com/fynelabs/notes](https://github.com/fynelabs/notes)
- **Tsyne Documentation**: [docs/pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md)
- **API Reference**: [docs/API_REFERENCE.md](../../docs/API_REFERENCE.md)

## License

This port is distributed under the same license as the original Fyne Notes app.
Portions copyright Andy Williams 2020-2023 and portions copyright Paul Hammant 2025.
