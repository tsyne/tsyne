# NextCloud Client - Tsyne Port

A cloud storage and file synchronization client ported from the open-source **NextCloud iOS app** to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **File browser** with folder navigation and search
- **Sync management** with upload/download tracking
- **File sharing** capabilities with access control
- **Account management** with connection handling
- **Storage analytics** with usage tracking
- **Observable MVC pattern** for reactive updates

## Features

### File Management
- Browse files and folders with path navigation
- Search files by name
- Delete files and folders
- Create new folders
- Toggle file sharing permissions
- View file properties (size, modified date, owner)
- Sort files by name, size, and modification date

### Sync Operations
- Track upload and download progress
- Monitor sync status (pending, in-progress, completed, error)
- Bulk sync operations
- View recent sync activity
- Progress indicators with percentage tracking

### Account Management
- Connect to NextCloud server with credentials
- Disconnect from server
- Toggle automatic sync
- View account information
- Last sync timestamp
- Connected status display

### File Sharing
- Share files with link generation
- Toggle sharing on/off
- View shared file list
- Share permissions management

### Storage Analytics
- Total storage used
- Storage percentage (0-100%)
- File and folder counts
- Readable storage formatting (B, KB, MB, GB)

## User Interface

### Files Tab
```
┌──────────────────────────────────────────────────────────┐
│ ☁️ NextCloud                   john.doe @ cloud.ex...   │
│ Connected  📁 / (2 folders, 4 files, 2.5 GB used)       │
├──────────────────────────────────────────────────────────┤
│ [📁 Files] [🔄 Sync] [🔗 Shared] [👤 Account]
│ ─────────────────────────────────────────────────────────
│ File Browser
│ [🔍 Search...] [⬆️ Upload] [➕ New Folder]
│
│ 📁 Documents                           [Folder] [Shared]
│ │  └─ Project Report.pdf   2.0 MB  [Share] [Delete]
│ │  └─ Budget.xlsx          512 KB  [Share] [Delete]
│ │
│ 📁 Photos                              [Folder]
│ │  └─ Vacation.zip         45 MB   [Share] [Delete]
│ │  └─ Family.zip           38 MB   [Share] [Delete]
│
│ 📄 README.md               1.2 KB  [Share] [Delete]
└──────────────────────────────────────────────────────────┘
```

### Sync Tab
```
┌──────────────────────────────────────────────────────────┐
│ ☁️ NextCloud                   john.doe @ cloud.ex...   │
│ Connected  📁 / (2 folders, 4 files, 2.5 GB used)       │
├──────────────────────────────────────────────────────────┤
│ [📁 Files] [🔄 Sync] [🔗 Shared] [👤 Account]
│ ─────────────────────────────────────────────────────────
│ Sync Status
│ [🔄 Sync All Files]
│
│ 🟢 COMPLETED - Presentation.pptx (Upload)
│    ████████████████████ 100%
│
│ 🟡 IN PROGRESS - Archive.zip (Download)
│    ████████████░░░░░░░░ 65%
│
│ ⏳ PENDING - document.pdf (Upload) [0%]
│ ⏳ PENDING - presentation.pptx (Upload) [0%]
│
│ Last Sync: 5 minutes ago
└──────────────────────────────────────────────────────────┘
```

### Shared Tab
```
┌──────────────────────────────────────────────────────────┐
│ ☁️ NextCloud                   john.doe @ cloud.ex...   │
│ Connected  📁 / (2 folders, 4 files, 2.5 GB used)       │
├──────────────────────────────────────────────────────────┤
│ [📁 Files] [🔄 Sync] [🔗 Shared] [👤 Account]
│ ─────────────────────────────────────────────────────────
│ Shared Files
│
│ 🔗 Project Report.pdf (Document)
│    Shared with: team@company.com
│    Public Link: https://...
│    [Revoke] [Copy Link]
│
│ 🔗 Budget.xlsx (Spreadsheet)
│    Shared with: finance@company.com
│    Permissions: View Only
│    [Update] [Revoke]
│
│ 🔗 Vacation.zip (Archive)
│    Shared with: Public
│    Public Link: https://...
│    [Revoke] [Copy Link]
│
│ Total Shared: 3 files
└──────────────────────────────────────────────────────────┘
```

### Account Tab
```
┌──────────────────────────────────────────────────────────┐
│ ☁️ NextCloud                   john.doe @ cloud.ex...   │
│ Connected  📁 / (2 folders, 4 files, 2.5 GB used)       │
├──────────────────────────────────────────────────────────┤
│ [📁 Files] [🔄 Sync] [🔗 Shared] [👤 Account]
│ ─────────────────────────────────────────────────────────
│ Account Settings
│
│ 👤 ACCOUNT INFORMATION
│ Username: john.doe
│ Email: john@example.com
│ Server: https://cloud.example.com
│ Status: ✓ Connected
│
│ 🔄 SYNC SETTINGS
│ [☑ Automatic Sync]
│ Last Sync: 5 minutes ago
│
│ 💾 STORAGE STATUS
│ Used: 2.5 GB / 5 GB
│ ███████░░░░░░ 50% Used
│
│ 🔐 SECURITY
│ [🔑 Change Password] [📋 Session Logs]
│
│ [⬅️ Disconnect] [🔄 Reconnect]
└──────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots of the application:

```bash
# Start app with visual display (requires X11/display)
npx tsx ported-apps/nextcloud/index.ts

# Run tests with screenshot capture
TAKE_SCREENSHOTS=1 npm test ported-apps/nextcloud/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/nextcloud-files.png
# - /tmp/nextcloud-sync.png
# - /tmp/nextcloud-shared.png
# - /tmp/nextcloud-account.png
```

Screenshots show:
- **Files Tab**: Cloud file browser with folder navigation and file operations
- **Sync Tab**: Upload/download progress tracking with visual indicators
- **Shared Tab**: List of shared files with public links and permissions
- **Account Tab**: Account details, sync settings, and storage usage

## Architecture

The app follows Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new NextCloudStore();

store.subscribe(async () => {
  await updateStorageLabel();
  await viewStack.refresh();
});

// Tab-based Navigation with when() Visibility
filesContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'files');

syncContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'sync');

sharedContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'shared');

accountContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'account');

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getFiles(currentPath),
    render: (file: CloudFile) => {
      a.hbox(() => {
        // Render file row with operations
      });
    },
    trackBy: (file: CloudFile) => file.id,
  });
```

### Key Components

**Model: `NextCloudStore`**
- Observable pattern with change listeners
- Immutable data returning defensive copies
- Methods for file operations, sync tracking, account management
- Storage analytics and calculations

**View: Tab-based UI**
- 4 main tabs: Files, Sync, Shared, Account
- Declarative visibility with `when()`
- Smart list rendering with `bindTo()`
- Summary labels for account, storage, file counts

**Controller: Event Handlers**
- File operations (create, delete, share)
- Sync actions (upload, download, sync all)
- Account connection/disconnection
- Tab navigation
- Search functionality

## Running the App

### Development Mode
```bash
npx tsx ported-apps/nextcloud/index.ts
```

### Run Tests
```bash
# Jest unit tests (37 tests)
npm test ported-apps/nextcloud/index.test.ts

# TsyneTest UI tests
npm test ported-apps/nextcloud/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/nextcloud/index.tsyne.test.ts
```

### Desktop Environment
```bash
npx tsx examples/desktop-demo.ts
# (NextCloud app automatically discovered and available)
```

## Testing

### Jest Unit Tests (37 tests)
```
NextCloudStore
  ✓ Account Management (4 tests)
  ✓ File Management (7 tests)
  ✓ Sync Operations (5 tests)
  ✓ Storage Analytics (5 tests)
  ✓ Observable Pattern (4 tests)
  ✓ Data Integrity (4 tests)
  ✓ Edge Cases (6 tests)
```

Tests cover:
- Account connection/disconnection
- File CRUD operations
- Folder navigation
- File sharing and search
- Sync progress tracking
- Storage calculations
- Observable subscription patterns
- Data immutability
- Edge cases (non-existent files, empty search results, etc.)

### TsyneTest UI Tests
- App rendering and layout
- Tab navigation
- Account status display
- File list rendering
- Sync progress display
- Shared files list
- Account settings display
- Element accessibility (proper IDs)
- Screenshot capture

## Code Style

Demonstrates Tsyne best practices:

```typescript
// Pseudo-declarative UI construction
a.window({ title: 'NextCloud' }, (win) => {
  win.setContent(() => {
    a.vbox(() => {
      // Header with account and storage info
      a.hbox(() => {
        a.label('☁️ NextCloud').withId('app-title');
        a.spacer();
        accountLabel = a.label('').withId('account-label');
        storageLabel = a.label('').withId('storage-label');
      });

      // Tab navigation
      a.hbox(() => {
        a.button('Files').onClick(async () => {
          selectedTab = 'files';
          await viewStack.refresh();
        });
        a.button('Sync').onClick(async () => {
          selectedTab = 'sync';
          await viewStack.refresh();
        });
        a.button('Shared').onClick(async () => {
          selectedTab = 'shared';
          await viewStack.refresh();
        });
        a.button('Account').onClick(async () => {
          selectedTab = 'account';
          await viewStack.refresh();
        });
      });

      // Content with declarative visibility
      viewStack = a.vbox(() => {
        filesContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'files');
        syncContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'sync');
        sharedContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'shared');
        accountContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'account');
      });
    });
  });

  // Observable subscriptions for reactive updates
  store.subscribe(async () => {
    await updateAccountLabel();
    await updateStorageLabel();
    await viewStack.refresh();
  });
});
```

## Single File Design

The entire application (544 lines) is a single `index.ts` file, eliminating build complexity. This demonstrates Tsyne's ability to build feature-rich cloud clients without:
- Webpack/bundler configuration
- Component framework overhead
- Complex project structure
- Build toolchain management

Compare to NextCloud's original iOS app with Xcode, multiple files, and native complexity.

## Data Model

```typescript
interface CloudFile {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  size: number;
  modified: Date;
  shared: boolean;
  owner: string;
}

interface Account {
  id: string;
  username: string;
  server: string;
  email: string;
  isConnected: boolean;
  lastSync: Date;
  syncEnabled: boolean;
}

interface SyncItem {
  id: string;
  fileName: string;
  action: 'upload' | 'download' | 'sync';
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
}
```

## Future Enhancements

- WebDAV protocol implementation
- End-to-end encryption support
- Version history and file recovery
- Custom sync folders and ignore patterns
- Thumbnail caching and preview
- Mobile responsive layout
- Notifications for sync events
- Bandwidth throttling options
- Conflict resolution UI
- Two-factor authentication support

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 9/10 | Clean `vbox > hbox(header) + separator + hbox(tabs) + separator + hbox(status) + separator + vbox(viewStack)` nesting. `buildContent()` defines header, tab bar, status area, and 4 tab containers in a single tree |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on all tab buttons (`tab-files`, `tab-sync`, `tab-shared`, `tab-account`), action buttons (`btn-upload`, `btn-new-folder`, `btn-search`), per-file elements (`file-{id}`, `file-date-{id}`, `btn-share-{id}`, `btn-delete-{id}`), status labels, section titles. `.when()` on all 4 containers |
| **Core declarative** | Programmatic generation | 6/10 | Lists driven by `.bindTo()` but no loop-based UI generation for structural elements. Tab buttons and status labels are manually listed. Sync status icon derived from object lookup |
| **State architecture** | Observable store | 9/10 | Full `NextCloudStore` with `subscribe()`/`notifyChange()`. 3 data model types (`CloudFile`, `Account`, `SyncItem`). Defensive copies on `getFiles()`, `getAllFiles()`, `getSyncItems()`, `getAccount()`. Counter-based IDs (`sync-003`). Rich analytics methods (`formatBytes()`, `getStoragePercentage()`) |
| **Declarative updates** | `.when()` + `.bindTo()` | 9/10 | 4 tab containers (files, sync, shared, account) use `.when()`. 3 lists use `.bindTo()` with `trackBy` + `empty` callbacks — files, sync items, shared files. `viewStack.refresh()` in store subscription. Four `setText()` escapes for `accountStatusLabel`, `storageLabel`, `fileCountLabel`, `syncProgressLabel`. `showForm()` and `showEntryDialog()` for CRUD |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 1 | Uses `win.setContent(buildContent)` for initial render only. All subsequent updates via `.when()`, `.bindTo()`, and `viewStack.refresh()`. Minor penalty |
| **Testing** | `.withId()` coverage | 9/10 | Excellent per-item IDs: `file-{id}`, `file-date-{id}`, `btn-share-{id}`, `btn-delete-{id}`, `sync-{id}`, `sync-progress-{id}`, `shared-{id}`, `shared-size-{id}`, `btn-unshare-{id}`. Also IDs on all tab buttons, action buttons, status labels, account fields. 37 Jest tests |
| **Design** | Separation of concerns | 9/10 | `NextCloudStore` is 250 lines of pure file/sync logic (no UI). `buildNextCloudApp()` is purely presentational. Store handles files, sync items, account, storage analytics — all with `notifyChange()`. `formatBytes()` utility in store |
| | **Overall** | **9/10** | Strong pseudo-declarative implementation with 4 tabs, 3 `.bindTo()` lists with `trackBy` + `empty`, `showForm()`/`showEntryDialog()` for CRUD, and excellent per-item `.withId()` coverage. The main gap is four `setText()` escapes on status labels (could use `.bindText()`). The per-item ID pattern (`file-{id}`, `sync-{id}`) is exemplary |

## License

Portions copyright NextCloud Inc and portions copyright Paul Hammant 2025

Licensed under MIT License. See LICENSE file for details.

### NextCloud Original License
The original NextCloud iOS app is available at https://github.com/nextcloud/ios
Licensed under GNU Affero General Public License v3.0. This port is distributed under MIT with attribution.

## References

- [NextCloud iOS Repository](https://github.com/nextcloud/ios)
- [NextCloud Official Website](https://nextcloud.com)
- [Pseudo-Declarative UI Composition](../../docs/pseudo-declarative-ui-composition.md)
- [TsyneTest Framework](../../docs/TESTING.md)
- [Tsyne API Reference](../../docs/API_REFERENCE.md)
