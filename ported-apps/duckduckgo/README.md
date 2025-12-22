# DuckDuckGo Privacy Browser - Tsyne Port

A privacy-focused search browser ported from the open-source **DuckDuckGo iOS app** to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **Private search** with no user tracking
- **Real-time privacy dashboard** showing blocked trackers and HTTPS upgrades
- **Search history** with filtering and analytics
- **Bookmarks management** with categorization and favorites
- **Privacy settings** with granular control
- **Quick actions (Bangs)** for specialized searches
- **Observable MVC pattern** for reactive updates

## Features

### Search Functionality
- Private search powered by DuckDuckGo
- Search history with full-text filtering
- Recent searches with timestamps
- Most searched queries analytics
- Search statistics (total, today, daily average)
- Clear history option

### Privacy Dashboard
- Real-time tracker blocking statistics
- HTTPS upgrade tracking
- Cookie management monitoring
- Top blocked domains
- Privacy score calculation
- Per-domain privacy metrics
- Historical activity view

### Bookmarks & Organization
- Add, edit, and delete bookmarks
- Organize by categories
- Favorite bookmarks
- Private bookmarks (confidential sites)
- Quick-access favorites
- Import/export capability
- URL preview and management

### Settings & Preferences
- **Theme**: Light/Dark mode toggle
- **Tracker Blocking**: Toggle on/off
- **Ad Blocking**: Toggle on/off
- **Auto HTTPS**: Upgrade HTTP to HTTPS
- **Safe Search**: Family-friendly results
- **Auto-clear Data**: Automatic session cleanup
- **Results Per Page**: Customizable result count

### Quick Actions (Bangs)
- Google: `!g` - Search on Google
- Wikipedia: `!w` - Search Wikipedia
- GitHub: `!gh` - Search GitHub repos
- Stack Overflow: `!so` - Search Stack Overflow
- npm: `!npm` - Search npm packages
- YouTube: `!yt` - Search YouTube videos

## User Interface

### Search Tab
```
┌──────────────────────────────────────────────────────────┐
│ 🦆 DuckDuckGo           🛡️ Privacy Score: 78% | Trackers: 147 │
│                         📊 Total Searches: 42 | Daily Avg: 1.8  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search privately...] [Search] [Clear]
│
│ [🔍 Search] [🛡️ Privacy] [🔖 Bookmarks] [⚙️ Settings]
│ ─────────────────────────────────────────────────────────
│ 📋 Search History
│ [🗑️ Clear History]                     Total: 42 searches
│
│ 🔍 typescript compiler options      [2 days ago] [✕]
│ 🔍 privacy respecting search engines [3 days ago] [✕]
│ 🔍 electron alternative frameworks   [4 days ago] [✕]
│ 🔍 rust programming language          [5 days ago] [✕]
└──────────────────────────────────────────────────────────┘
```

### Privacy Tab
```
┌──────────────────────────────────────────────────────────┐
│ 🦆 DuckDuckGo           🛡️ Privacy Score: 78% | Trackers: 147 │
│                         📊 Total Searches: 42 | Daily Avg: 1.8  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [🛡️ Privacy] [🔖 Bookmarks] [⚙️ Settings]
│ ─────────────────────────────────────────────────────────
│ 🛡️ Privacy Dashboard
│
│ 📊 STATS              │  🎯 BLOCKED DOMAINS
│ Trackers: 147         │  google.com: 42 trackers
│ Sites: 23             │  facebook.com: 28 trackers
│ HTTPS: 23             │  doubleclick.net: 18 trackers
│ Cookies: 8            │
│
│ 📈 RECENT ACTIVITY
│ google.com              42 trackers | HTTPS: ✓  [2 min]
│ facebook.com            28 trackers | HTTPS: ✓  [5 min]
│ news.ycombinator.com     0 trackers | HTTPS: ✓  [10 min]
│ example.com             15 trackers | HTTPS: ✕  [15 min]
└──────────────────────────────────────────────────────────┘
```

### Bookmarks Tab
```
┌──────────────────────────────────────────────────────────┐
│ 🦆 DuckDuckGo           🛡️ Privacy Score: 78% | Trackers: 147 │
│                         📊 Total Searches: 42 | Daily Avg: 1.8  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [🛡️ Privacy] [🔖 Bookmarks] [⚙️ Settings]
│ ─────────────────────────────────────────────────────────
│ 🔖 Bookmarks
│ [➕ Add Bookmark]                    Total: 4 bookmarks
│
│ 🦆 DuckDuckGo Home                    [Search]
│    https://duckduckgo.com             [✕]
│
│ 🛡️ Privacy Policy                     [Privacy]
│    https://duckduckgo.com/privacy     [✕]
│
│ 📚 Tech Documentation                 [Development]
│    https://developer.mozilla.org      [✕]
│
│ ✉️ Secure Email                       [Privacy]
│    https://duckduckgo.com/email       [✕]
└──────────────────────────────────────────────────────────┘
```

### Settings Tab
```
┌──────────────────────────────────────────────────────────┐
│ 🦆 DuckDuckGo           🛡️ Privacy Score: 78% | Trackers: 147 │
│                         📊 Total Searches: 42 | Daily Avg: 1.8  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [🛡️ Privacy] [🔖 Bookmarks] [⚙️ Settings]
│ ─────────────────────────────────────────────────────────
│ ⚙️ Settings
│
│ 🔒 PRIVACY SETTINGS
│ ☑ Block Trackers
│ ☑ Block Ads
│ ☑ Auto HTTPS
│ ☐ Safe Search
│
│ 🎨 APPEARANCE
│ Theme: light                          [Toggle Theme]
│
│ ⚡ QUICK ACTIONS
│ DuckDuckGo Bangs - Use !bang before your search:
│ !g Google - Search on Google
│ !w Wikipedia - Search Wikipedia
│ !gh GitHub - Search GitHub repositories
│ !so Stack Overflow - Search Stack Overflow
│ !npm npm - Search npm packages
│ !yt YouTube - Search YouTube videos
└──────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots of the application:

```bash
# Start app with visual display (requires X11/display)
npx tsx ported-apps/duckduckgo/index.ts

# Run tests with screenshot capture
TAKE_SCREENSHOTS=1 npm test ported-apps/duckduckgo/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/duckduckgo-search.png
# - /tmp/duckduckgo-privacy.png
# - /tmp/duckduckgo-bookmarks.png
# - /tmp/duckduckgo-settings.png
```

Screenshots show:
- **Search Tab**: History tracking with timestamps and filtering
- **Privacy Tab**: Real-time tracker blocking statistics and top blocked domains
- **Bookmarks Tab**: Organized bookmarks with categories and favorites
- **Settings Tab**: Privacy controls, theme selection, and quick action bangs

## Architecture

The app follows Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new DuckDuckGoStore();

store.subscribe(async () => {
  await updatePrivacyLabels();
  await viewStack.refresh();
});

// Tab-based Navigation with when() Visibility
searchContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'search');

privacyContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'privacy');

bookmarksContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'bookmarks');

settingsContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'settings');

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getSearchHistory(),
    render: (search: SearchResult) => {
      a.hbox(() => {
        // Render search row with operations
      });
    },
    trackBy: (search: SearchResult) => search.id,
  });
```

### Key Components

**Model: `DuckDuckGoStore`**
- Observable pattern with change listeners
- Immutable data returning defensive copies
- Methods for search, bookmarks, privacy tracking, settings
- Analytics calculations and statistics

**View: Tab-based UI**
- 4 main tabs: Search, Privacy, Bookmarks, Settings
- Declarative visibility with `when()`
- Smart list rendering with `bindTo()`
- Status labels for privacy score and statistics

**Controller: Event Handlers**
- Search and history management
- Bookmark CRUD operations
- Settings updates
- Tab navigation
- Privacy statistics display

## Running the App

### Development Mode
```bash
npx tsx ported-apps/duckduckgo/index.ts
```

### Run Tests
```bash
# Jest unit tests (58 tests)
npm test ported-apps/duckduckgo/index.test.ts

# TsyneTest UI tests
npm test ported-apps/duckduckgo/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/duckduckgo/index.tsyne.test.ts
```

### Desktop Environment
```bash
npx tsx examples/desktop-demo.ts
# (DuckDuckGo app automatically discovered and available)
```

## Testing

### Jest Unit Tests (58 tests)
```
DuckDuckGoStore
  ✓ Search History (11 tests)
  ✓ Bookmarks (10 tests)
  ✓ Privacy & Trackers (5 tests)
  ✓ Settings (6 tests)
  ✓ Bangs (4 tests)
  ✓ Observable Pattern (6 tests)
  ✓ Data Integrity (6 tests)
  ✓ Edge Cases (11 tests)
```

Tests cover:
- Search history management and filtering
- Bookmark CRUD operations and categorization
- Privacy statistics and tracker blocking
- Settings updates and theme toggling
- Bang action searching
- Observable subscription patterns
- Data immutability
- Edge cases (empty queries, long strings, special characters, etc.)

### TsyneTest UI Tests
- App rendering and layout
- Tab navigation
- Privacy and statistics display
- Search history list rendering
- Bookmark list rendering
- Settings panel display
- Element accessibility (proper IDs)
- Screenshot capture

## Code Style

Demonstrates Tsyne best practices:

```typescript
// Pseudo-declarative UI construction
a.window({ title: 'DuckDuckGo Privacy Browser' }, (win) => {
  win.setContent(() => {
    a.vbox(() => {
      // Header with stats
      a.hbox(() => {
        a.label('🦆 DuckDuckGo').withId('app-title').withBold();
        a.spacer();
        privacyLabel = a.label('🛡️ Privacy Score: 0%').withId('privacy-label');
      });

      // Search bar
      a.hbox(() => {
        searchInput = a.textEntry('').withPlaceholder('🔍 Search privately...');
        a.button('Search').onClick(async () => {
          if (searchInputValue.trim()) {
            store.search(searchInputValue);
            await viewStack.refresh();
          }
        });
      });

      // Tab navigation
      a.hbox(() => {
        a.button('🔍 Search').onClick(async () => {
          selectedTab = 'search';
          await viewStack.refresh();
        });
        // ... other tabs
      });

      // Content with declarative visibility
      viewStack = a.vbox(() => {
        searchContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'search');
        privacyContainer = a.vbox(() => { /* ... */ })
          .when(() => selectedTab === 'privacy');
        // ... other tabs
      });
    });
  });

  // Observable subscriptions for reactive updates
  store.subscribe(async () => {
    await updateLabels();
    await viewStack.refresh();
  });
});
```

## Single File Design

The entire application (650+ lines) is a single `index.ts` file, eliminating build complexity. This demonstrates Tsyne's ability to build feature-rich privacy browsers without:
- Webpack/bundler configuration
- Component framework overhead
- Complex project structure
- Build toolchain management

Compare to DuckDuckGo's original iOS app with Xcode, multiple files, and native complexity.

## Data Model

```typescript
interface SearchResult {
  id: string;
  query: string;
  timestamp: Date;
  domain: string;
  title: string;
  url: string;
  favicon: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon: string;
  category: string;
  timestamp: Date;
  isPrivate: boolean;
}

interface TrackerBlock {
  id: string;
  domain: string;
  trackersBlocked: number;
  timestamp: Date;
  httpsUpgraded: boolean;
  cookiesManaged: number;
}

interface PrivacyStats {
  totalTrackersBlocked: number;
  totalSitesVisited: number;
  httpsUpgrades: number;
  cookiePops: number;
  averageTrackersPerSite: number;
}

interface BangAction {
  name: string;
  symbol: string;
  description: string;
  example: string;
}
```

## Future Enhancements

- Full web search integration (simulated queries)
- Search suggestions and autocomplete
- Tracker blocking ruleset updates
- Email protection service integration
- VPN/Network protection layer
- Password manager integration
- Dark web site warnings
- Custom bang creation
- Search result formatting
- Mobile responsive layout
- iCloud/cloud sync support
- Encrypted vault for sensitive bookmarks

## License

Portions copyright Duck Duck Go Inc and portions copyright Paul Hammant 2025

Licensed under Apache License 2.0. See LICENSE file for details.

### DuckDuckGo Original License
The original DuckDuckGo iOS app is available at https://github.com/duckduckgo/iOS
Licensed under Apache License 2.0. This port is distributed under Apache License 2.0 with attribution.

## References

- [DuckDuckGo iOS Repository](https://github.com/duckduckgo/iOS)
- [DuckDuckGo Official Website](https://duckduckgo.com)
- [DuckDuckGo Bangs Help](https://duckduckgo.com/bang)
- [Pseudo-Declarative UI Composition](../../docs/pseudo-declarative-ui-composition.md)
- [TsyneTest Framework](../../docs/TESTING.md)
- [Tsyne API Reference](../../docs/API_REFERENCE.md)
