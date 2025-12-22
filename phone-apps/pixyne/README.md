# Pixyne App

A simplified photo management application for browsing, organizing, and managing photos. This Tsyne port focuses on core features like reviewing photos, marking them for deletion, and batch cleanup.

## Features

- **Photo management** - Browse and organize photos
- **Photo marking** - Mark unwanted photos for deletion
- **Batch deletion** - Delete all marked photos at once
- **Photo details** - View name and path of selected photos
- **Selection tracking** - Keep track of which photo is selected
- **Marked counter** - See how many photos are marked for deletion
- **Sample loading** - Load sample photos for testing

## How to Use

### Loading Photos

1. Start Pixyne with no photos loaded
2. Click "Load Sample Photos" to add sample photos
3. Photos appear in the list on the left

### Reviewing Photos

1. Click on a photo in the list to select it
2. Photo details appear on the right panel
3. View the photo name and file path

### Marking Photos for Deletion

1. Select a photo in the list
2. Check the "Mark for deletion" checkbox
3. The marked counter increases
4. Repeat for all unwanted photos

### Deleting Marked Photos

1. Once all unwanted photos are marked
2. Click "Delete X Marked" button
3. All marked photos are removed
4. Remaining photos stay in the list

## Architecture

The Pixyne app uses Tsyne's declarative MVC pattern:

- **Model**: `Photo` array with marking state
- **View**: Split-panel layout with list and details
- **Controller**: Selection, marking, and deletion handlers

### Photo Structure

```typescript
interface Photo {
  id: string;        // Unique ID with timestamp
  name: string;      // Photo filename
  path: string;      // Full file path
  marked: boolean;   // Whether marked for deletion
  isSelected: boolean; // Whether currently selected
}
```

### State Management

- Photos are stored as JSON in preferences
- Marked photo IDs are tracked separately
- Selection is maintained across operations
- Marked count updates automatically

## Code Example

```typescript
import { buildPixyneApp } from './pixyne';
import { app } from './src';

app({ title: 'Pixyne' }, (a) => {
  a.window({ title: 'Pixyne - Photo Manager', width: 900, height: 700 }, (win) => {
    buildPixyneApp(a, win);
  });
});
```

## Testing

### Jest Tests

Unit tests for photo operations:

```bash
npm test -- pixyne.test.ts
```

Coverage includes:
- Photo addition and management
- Photo marking and unmarking
- Marked count tracking
- Photo deletion (marked photos)
- Selection management
- Photo search by name and path
- Edge cases (special characters, bulk operations, etc.)

**25 passing tests** cover all photo management operations.

### TsyneTest UI Tests

Integration tests for UI rendering:

```bash
cd core && npm test -- pixyne-tsyne
```

Coverage includes:
- Title rendering
- Marked count display
- Empty state display
- Load button visibility
- All UI elements present

## Settings Storage

Settings are automatically persisted:
- `pixyne_photos` - Array of photos as JSON
- `pixyne_folder` - Current folder path
- `pixyne_marked` - Array of marked photo IDs

## Performance

- Efficient list rendering
- Quick photo selection
- Fast marking and deletion
- Minimal memory footprint per photo

## Limitations

- No actual file system integration
- No EXIF metadata support
- No image preview/thumbnail
- No cropping or editing
- No comparison tools for similar photos
- Sample photos only (no real file loading in demo)

## Future Enhancements

- Real file system integration
- Image thumbnails and previews
- EXIF date management and fixing
- Image cropping and editing
- Duplicate/similar photo detection
- Batch renaming by EXIF date
- Folder state preservation
- Keyboard shortcuts
- Custom folder browsing
- Trash/backup folder creation

## Files

- `pixyne.ts` - Main implementation (phone-apps and core/src)
- `pixyne.test.ts` - Jest unit tests (phone-apps)
- `pixyne-tsyne.test.ts` - Tsyne UI tests (phone-apps and core/src)

## License

MIT License

Portions copyright original team and portions copyright Paul Hammant 2025

This is a port of the Pixyne application (https://github.com/vinser/pixyne) to Tsyne.
