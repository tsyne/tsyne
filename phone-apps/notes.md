# Notes App

A simple note-taking application for creating, editing, and managing text notes. All notes are stored persistently using the application preferences system.

## Features

- **Create notes** - Add new notes with the "+ New" button
- **Edit notes** - Change note titles and content in the editor panel
- **Delete notes** - Remove notes with the Delete button
- **Note list** - View all notes in a scrollable list with titles and previews
- **Date tracking** - See when each note was last modified (formatted as "Just now", "5m ago", etc.)
- **Content preview** - First line of each note is shown as preview text
- **Persistent storage** - All notes are automatically saved to preferences

## How to Use

### Creating a Note

1. Click the "+ New" button in the top-right
2. A new note appears at the top of the list
3. The note is automatically selected and ready to edit

### Viewing Notes

- The note list appears on the left side
- Each note shows its title, preview of content, and last modified time
- Notes are ordered with the most recently created at the top

### Editing a Note

1. Click on a note in the list to select it
2. The note content appears in the right editor panel
3. Edit the title in the title field at the top
4. Edit the full content in the main text area below
5. Changes are automatically saved every 500ms

### Deleting a Note

1. Select a note in the list
2. Click the "Delete" button in the editor panel
3. The note is immediately removed
4. If other notes exist, the previous note in the list becomes selected

### Finding Notes

- Scroll through the list to find notes by title or preview
- The list shows modification time for quick reference

## Architecture

The Notes app uses Tsyne's declarative MVC pattern:

- **Model**: `Note` array with `selectedNoteId` for tracking
- **View**: Split-panel layout with list on left, editor on right
- **Controller**: Button handlers for create/delete/select operations

### Note Structure

```typescript
interface Note {
  id: string;           // Unique ID with timestamp
  title: string;        // Note title
  content: string;      // Full note content
  createdAt: number;    // Creation timestamp
  modifiedAt: number;   // Last modification timestamp
}
```

### Storage

- Notes are stored as JSON in `notes_list` preference
- Debounced saves (500ms) prevent excessive storage writes
- Automatic format conversion for JSON serialization

### Date Formatting

- "Just now" - Within 1 minute
- "Xm ago" - Within 1 hour (minutes)
- "Xh ago" - Within 1 day (hours)
- "Xd ago" - Within 7 days (days)
- Full date - Older notes

### Preview Generation

- First line of content is used for preview
- Whitespace is trimmed
- Long previews are truncated to 50 characters with "..."
- Empty notes show "(empty)" as placeholder

## Code Example

```typescript
import { buildNotesApp } from './notes';
import { app } from './src';

app({ title: 'Notes' }, (a) => {
  a.window({ title: 'Notes', width: 600, height: 800 }, (win) => {
    buildNotesApp(a, win);
  });
});
```

## Testing

### Jest Tests

Unit tests for note operations and storage:

```bash
npm test -- notes.test.ts
```

Coverage includes:
- Note creation with unique IDs
- Note deletion and selection
- Title and content updates
- Timestamp management
- Date formatting
- Preview generation
- JSON serialization/deserialization
- Multiple notes management
- Edge cases (special characters, multiline content, etc.)

**31 passing tests** cover all CRUD operations and state management.

### TsyneTest UI Tests

Integration tests for UI rendering:

```bash
cd core && npm test -- notes-tsyne
```

Coverage includes:
- Title rendering
- Add button visibility
- Empty state display
- All UI elements present

## Settings Storage

Settings are automatically persisted:
- `notes_list` - Array of notes as JSON string

## Performance

- Real-time updates on edit with automatic save
- Debounced saves every 500ms to reduce I/O
- Efficient list rendering with virtual scrolling
- Minimal memory footprint per note

## Limitations

- No rich text formatting (plain text only)
- No search/filter functionality
- No categories or folders
- No synchronization between devices
- No undo/redo functionality

## Future Enhancements

- Search and filter notes
- Categories/folders for organization
- Rich text formatting
- Note sharing
- Markdown support
- Automatic backups
- Cloud synchronization

## Files

- `notes.ts` - Main implementation (phone-apps and core/src)
- `notes.test.ts` - Jest unit tests (phone-apps)
- `notes-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Notes application (https://github.com/fynelabs/notes) to Tsyne.
