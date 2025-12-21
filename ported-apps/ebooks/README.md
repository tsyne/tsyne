# Ebook Reader - Tsyne Port

A simplified ebook library manager ported from **FlutterEbookApp** to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **Book library management** with search and filtering
- **Reading progress tracking** with bookmarks and statistics
- **Favorite book collections** for quick access
- **Download management** with progress tracking
- **Customizable reading preferences** (dark/light mode, font size, line spacing)
- **Observable MVC pattern** for reactive updates
- **Tab-based navigation** with state preservation

## Features

### Library
- Browse and search ebooks by title, author, or description
- View book metadata (author, description, format, file size)
- Toggle favorite status
- Start downloads with progress tracking
- Quick access to reading experience

### Reading Progress
- Track reading progress (current page and percentage)
- Page navigation controls (-10/+10 pages)
- Bookmark management with notes
- Reading statistics (total time, session count)
- Seamless session restoration

### Favorites
- Quick access to bookmarked books
- One-click favorite management
- Organized collection view
- Fast reading access

### Downloads
- View all downloaded books
- Track download progress
- Cancel in-progress downloads
- Local storage management
- Quick read access

### Reading Preferences
- Dark mode and light mode toggle
- Font size customization (small, medium, large)
- Font family selection (serif, sans-serif)
- Line spacing adjustment (normal, relaxed, loose)
- Settings persistence

## User Interface

### Library View
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Ebook Reader | Theme: ☀️ | Font: medium                   │
│ Total: 12 | Downloaded: 8 | Favorites: 4 | Bookmarks: 4      │
│ ─────────────────────────────────────────────────────────────│
│ 📚 Library | 📖 Reading | ❤️ Favorites | ⬇️ Downloads | ⚙️ Set │
│ ─────────────────────────────────────────────────────────────│
│ Library                                                        │
│ [Search books...]                                             │
│                                                               │
│ 📕 Pride and Prejudice                                        │
│ by Jane Austen                                                │
│ ⬇️ Download | 🤍 Favorite                                     │
│                                                               │
│ 📗 Wuthering Heights                                          │
│ by Emily Brontë                                               │
│ ❤️ Unfavorite                                                 │
│                                                               │
│ 📘 The Great Gatsby                                           │
│ by F. Scott Fitzgerald                                        │
│ ⬇️ 75% | 🤍 Favorite                                          │
│                                                               │
│ 📙 Jane Eyre                                                  │
│ by Charlotte Brontë                                           │
│ ❤️ Unfavorite                                                 │
└──────────────────────────────────────────────────────────────┘
```

### Reading Progress View
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Ebook Reader | Theme: ☀️ | Font: medium                   │
│ Total: 12 | Downloaded: 8 | Favorites: 4 | Bookmarks: 4      │
│ ─────────────────────────────────────────────────────────────│
│ 📚 Library | 📖 Reading | ❤️ Favorites | ⬇️ Downloads | ⚙️ Set │
│ ─────────────────────────────────────────────────────────────│
│ Currently Reading                                             │
│ 📕                                                            │
│ Pride and Prejudice                                           │
│ by Jane Austen                                                │
│ Progress: 194/432 (45%)                                       │
│                                                               │
│ Read Time: 450 min | Sessions: 15                             │
│                                                               │
│ [-10 Pages] [+10 Pages]                                       │
│                                                               │
│ Bookmarks                                                     │
│ Page 100: Important dialogue about marriage          [✕]     │
│ Page 156: Emotional scene                            [✕]     │
│                                                               │
│ [📌 Add Bookmark]                                             │
└──────────────────────────────────────────────────────────────┘
```

### Favorites View
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Ebook Reader | Theme: ☀️ | Font: medium                   │
│ Total: 12 | Downloaded: 8 | Favorites: 4 | Bookmarks: 4      │
│ ─────────────────────────────────────────────────────────────│
│ 📚 Library | 📖 Reading | ❤️ Favorites | ⬇️ Downloads | ⚙️ Set │
│ ─────────────────────────────────────────────────────────────│
│ Favorites                                                     │
│                                                               │
│ 📗 Wuthering Heights                                          │
│ by Emily Brontë                              [❤️]             │
│                                                               │
│ 📙 Jane Eyre                                                  │
│ by Charlotte Brontë                          [❤️]             │
│                                                               │
│ 📕 Frankenstein                                               │
│ by Mary Shelley                              [❤️]             │
│                                                               │
│ 📗 The Hobbit                                                 │
│ by J.R.R. Tolkien                            [❤️]             │
└──────────────────────────────────────────────────────────────┘
```

### Downloads View
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Ebook Reader | Theme: ☀️ | Font: medium                   │
│ Total: 12 | Downloaded: 8 | Favorites: 4 | Bookmarks: 4      │
│ ─────────────────────────────────────────────────────────────│
│ 📚 Library | 📖 Reading | ❤️ Favorites | ⬇️ Downloads | ⚙️ Set │
│ ─────────────────────────────────────────────────────────────│
│ Downloads                                                     │
│ 8 downloaded books                                            │
│                                                               │
│ 📕 Pride and Prejudice     2.3 MB              [📖 Read]      │
│ 📗 Wuthering Heights       1.8 MB              [📖 Read]      │
│ 📙 Jane Eyre               2.1 MB              [📖 Read]      │
│ 📓 The Odyssey             1.6 MB              [📖 Read]      │
│ 📗 Frankenstein            1.4 MB              [📖 Read]      │
│ 📙 1984                    2.2 MB              [📖 Read]      │
│ 📕 Alice in Wonderland     1.5 MB              [📖 Read]      │
│ 📗 The Hobbit              2.4 MB              [📖 Read]      │
└──────────────────────────────────────────────────────────────┘
```

### Settings View
```
┌──────────────────────────────────────────────────────────────┐
│ 📚 Ebook Reader | Theme: ☀️ | Font: medium                   │
│ Total: 12 | Downloaded: 8 | Favorites: 4 | Bookmarks: 4      │
│ ─────────────────────────────────────────────────────────────│
│ 📚 Library | 📖 Reading | ❤️ Favorites | ⬇️ Downloads | ⚙️ Set │
│ ─────────────────────────────────────────────────────────────│
│ Settings                                                      │
│                                                               │
│ 🌓 Theme                                                      │
│ [☀️ Light] [🌙 Dark]                                          │
│                                                               │
│ 🔤 Font Size                                                  │
│ [▽ Small] [▼ Medium] [▽ Large]                               │
│                                                               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 📊 Statistics                                                 │
│ Total Books: 12 | Downloaded: 8 | Favorites: 4               │
└──────────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots:

```bash
# Start app
npx tsx ported-apps/ebooks/index.ts

# Run tests with screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/ebooks/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/ebooks-library.png
# - /tmp/ebooks-reading.png
# - /tmp/ebooks-favorites.png
# - /tmp/ebooks-downloads.png
# - /tmp/ebooks-settings.png
```

## Testing

### Jest Unit Tests (48 tests)
```
EbookStore
  ✓ Book Management (10 tests)
  ✓ Favorite Management (5 tests)
  ✓ Download Management (7 tests)
  ✓ Reading Progress (10 tests)
  ✓ Bookmarks (5 tests)
  ✓ Preferences (6 tests)
  ✓ Observable Pattern (5 tests)
  ✓ Data Integrity (5 tests)
  ✓ Edge Cases (7 tests)
```

### TsyneTest UI Tests
- Tab navigation between Library, Reading, Favorites, Downloads, Settings
- State preservation across tabs
- Stats display and update
- Screenshot capture for all views

## Running the App

### Development Mode
```bash
npx tsx ported-apps/ebooks/index.ts
```

### Run Tests
```bash
# Jest unit tests (48 tests)
npm test ported-apps/ebooks/index.test.ts

# TsyneTest UI tests
npm test ported-apps/ebooks/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/ebooks/index.tsyne.test.ts
```

## Architecture

The app demonstrates Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new EbookStore();

store.subscribe(async () => {
  await updateLabels();
  await viewStack.refresh();
});

// Tab-based Navigation with when()
libraryContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'library' && store.getBooks());

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getBooks(),
    render: (book: Ebook) => { /* ... */ },
    trackBy: (book: Ebook) => book.id,
  });
```

## Data Models

**Ebook**
- `id`: Unique identifier
- `title`: Book title
- `author`: Author name
- `description`: Book synopsis
- `coverEmoji`: Visual representation
- `format`: EPUB, PDF, or MOBI
- `fileSize`: Size in MB
- `totalPages`: Total page count
- `currentPage`: Last read position
- `lastReadPosition`: Percentage (0-100)
- `isDownloaded`: Local storage status
- `isFavorite`: Bookmarked status
- `downloadProgress`: Download percentage (0-100)

**Bookmark**
- `id`: Unique identifier
- `ebookId`: Associated book
- `pageNumber`: Page with bookmark
- `note`: User note
- `createdAt`: Timestamp

**ReadingStats**
- `ebookId`: Associated book
- `totalReadTime`: Cumulative reading time in minutes
- `lastReadDate`: Most recent reading date
- `sessionCount`: Number of reading sessions

**ReadingPreferences**
- `theme`: 'light' or 'dark'
- `fontSize`: 'small', 'medium', or 'large'
- `fontFamily`: 'serif' or 'sans-serif'
- `lineSpacing`: 'normal', 'relaxed', or 'loose'

## License

Apache License Version 2.0

Copyright (c) 2025 Festus Olusegun
Portions copyright Paul Hammant 2025

Licensed under the Apache License, Version 2.0. See LICENSE file for details.

### Original App Attribution
The original FlutterEbookApp is available at https://github.com/JideGuru/FlutterEbookApp
Licensed under Apache License Version 2.0. This port is distributed under Apache License Version 2.0 with attribution to Festus Olusegun.

## References

- [FlutterEbookApp Repository](https://github.com/JideGuru/FlutterEbookApp)
- [Tsyne Framework Documentation](../../docs/API_REFERENCE.md)
- [Project Gutenberg API](https://gutendex.com)
- [EPUB Format](https://en.wikipedia.org/wiki/EPUB)
