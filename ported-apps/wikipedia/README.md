# Wikipedia - The Free Encyclopedia - Tsyne Port

The world's largest free online encyclopedia ported from the open-source **Wikipedia iOS app** to **Tsyne**, a TypeScript-based desktop application framework.

This single-file Tsyne application demonstrates:
- **Full-text search** across millions of articles in 300+ languages
- **Multi-language support** with article counts per language
- **Reading history** with time-spent tracking
- **Saved articles** and reading lists
- **Featured content** discovery (featured articles, pictures, news, on this day)
- **Statistics tracking** (contribution score, reading habits)
- **Observable MVC pattern** for reactive updates

## Features

### Search
- Full-text search with suggestions
- Search history tracking and management
- Top read articles discovery
- View article from search results
- Clear search history

### Reading Lists (Saved Articles)
- Save articles for offline reading
- Organize saved articles
- Check if article is already saved
- Filter by language
- Remove from saved articles

### Reading History
- Track viewed articles with timestamps
- Measure time spent reading per article
- Calculate reading statistics
- View days active and contribution score
- Clear reading history

### Featured Content
- Featured articles of the day
- Picture of the day
- In the news section
- On this day historical events
- Browse by content type

### Multi-Language Support
- 8+ languages (English, Spanish, French, German, Chinese, Japanese, Arabic, Russian)
- Switch between languages
- View article counts per language
- Language-specific reading lists

### Statistics & Analytics
- Total articles viewed
- Time spent reading
- Days active
- Contribution score
- Average reading time per article

## User Interface

### Search Tab
```
┌──────────────────────────────────────────────────────────┐
│ 📖 Wikipedia              🌐 Language: English (6.8M arts) │
│                           📖 Articles Viewed: 3 | Time: 2h  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search Wikipedia...]     [Search] [Clear]
│
│ [🔍 Search] [✨ Explore] [💾 Saved] [📜 History]
│ ─────────────────────────────────────────────────────────
│ 🔍 Search Results
│ [🗑️ Clear]                            Recent: 3 articles
│
│ 📖 TypeScript
│ Views: 125,000 | 2 days ago
│ TypeScript is a free and open-source programming...
│ [Save] [✕]
│
│ 📚 Open Source Software
│ Views: 250,000 | 3 days ago
│ Open-source software (OSS) is a type of computer...
│ [Save] [✕]
└──────────────────────────────────────────────────────────┘
```

### Explore Tab
```
┌──────────────────────────────────────────────────────────┐
│ 📖 Wikipedia              🌐 Language: English (6.8M arts) │
│                           📖 Articles Viewed: 3 | Time: 2h  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [✨ Explore] [💾 Saved] [📜 History]
│ ─────────────────────────────────────────────────────────
│ ✨ Featured Content
│ Total Articles: 6,800,000
│
│ 🪸 Great Barrier Reef                [FEATURED ARTICLE]
│ The largest coral reef system in the world located
│ off the coast of Queensland, Australia.
│
│ 🌙 Moon                              [PICTURE OF DAY]
│ The natural satellite of Earth, our closest
│ celestial neighbor.
│
│ 🏆 2025 Nobel Prizes Announced       [IN THE NEWS]
│ The 2025 Nobel Prize winners have been announced.
│
│ 🚀 On This Day: First Moon Landing   [ON THIS DAY]
│ July 20, 1969: Apollo 11 astronauts land on Moon.
└──────────────────────────────────────────────────────────┘
```

### Saved Tab
```
┌──────────────────────────────────────────────────────────┐
│ 📖 Wikipedia              🌐 Language: English (6.8M arts) │
│                           📖 Articles Viewed: 3 | Time: 2h  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [✨ Explore] [💾 Saved] [📜 History]
│ ─────────────────────────────────────────────────────────
│ 💾 Saved Articles
│ Total: 2 saved
│
│ 🖥️ History of the Internet
│ Saved: 1 week ago
│ The history of the internet and its development from...
│ [✕]
│
│ 🔬 Science and Technology
│ Saved: 2 weeks ago
│ An overview of modern scientific and technological...
│ [✕]
└──────────────────────────────────────────────────────────┘
```

### History Tab
```
┌──────────────────────────────────────────────────────────┐
│ 📖 Wikipedia              🌐 Language: English (6.8M arts) │
│                           📖 Articles Viewed: 3 | Time: 2h  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Search] [✨ Explore] [💾 Saved] [📜 History]
│ ─────────────────────────────────────────────────────────
│ 📜 Reading History
│
│ 📊 STATS              │  ⏱️ TIME SPENT
│ Articles: 3           │  Total: 2h 15m
│ Days Active: 5        │  Average: 45m per article
│ Score: 42             │
│
│ 📈 RECENT READS
│ Python (Programming Language)        45m read | 12:30pm [✕]
│ Machine Learning                     1h 20m read | 11:00am [✕]
│ Artificial Intelligence              30m read | 10:15am [✕]
│
│ [🗑️ Clear History]
└──────────────────────────────────────────────────────────┘
```

## Screenshots

To generate live screenshots:

```bash
# Start app
npx tsx ported-apps/wikipedia/index.ts

# Run tests with screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/wikipedia/index.tsyne.test.ts

# Screenshots saved to:
# - /tmp/wikipedia-search.png
# - /tmp/wikipedia-explore.png
# - /tmp/wikipedia-saved.png
# - /tmp/wikipedia-history.png
```

## Architecture

Demonstrates Tsyne's pseudo-declarative MVC pattern:

```typescript
// Observable Store Pattern
const store = new WikipediaStore();

store.subscribe(async () => {
  await updateLabels();
  await viewStack.refresh();
});

// Tab-based Navigation with when()
searchContainer = a.vbox(() => { /* ... */ })
  .when(() => selectedTab === 'search');

// Smart List Rendering with bindTo()
a.vbox(() => {})
  .bindTo({
    items: () => store.getSearchHistory(),
    render: (article: Article) => { /* ... */ },
    trackBy: (article: Article) => article.id,
  });
```

## Running the App

### Development Mode
```bash
npx tsx ported-apps/wikipedia/index.ts
```

### Run Tests
```bash
# Jest unit tests (56 tests)
npm test ported-apps/wikipedia/index.test.ts

# TsyneTest UI tests
npm test ported-apps/wikipedia/index.tsyne.test.ts

# With screenshots
TAKE_SCREENSHOTS=1 npm test ported-apps/wikipedia/index.tsyne.test.ts
```

## Testing

### Jest Unit Tests (56 tests)
```
WikipediaStore
  ✓ Search (8 tests)
  ✓ Reading List (6 tests)
  ✓ Reading History (7 tests)
  ✓ Featured Content (6 tests)
  ✓ Languages (6 tests)
  ✓ Statistics (2 tests)
  ✓ Observable Pattern (5 tests)
  ✓ Data Integrity (7 tests)
  ✓ Edge Cases (10 tests)
```

Tests cover all store operations, data immutability, observable patterns, and edge cases.

### TsyneTest UI Tests
- App rendering and tab navigation
- All tab views display correctly
- State preservation across tabs
- Element accessibility
- Screenshot capture for all views

## Data Model

```typescript
interface Article {
  id: string;
  title: string;
  extract: string;
  imageUrl: string;
  language: string;
  url: string;
  pageId: number;
  timestamp: Date;
  views: number;
  isStub: boolean;
}

interface ReadingListItem {
  id: string;
  articleTitle: string;
  articleId: number;
  language: string;
  summary: string;
  timestamp: Date;
  imageUrl: string;
}

interface LanguageOption {
  code: string;
  name: string;
  localName: string;
  articles: number;
}
```

## Pseudo-Declarative Scorecard

How well does this implementation follow [pseudo-declarative-ui-composition.md](../../docs/pseudo-declarative-ui-composition.md) patterns?

| Category | Pattern | Score | Notes |
|----------|---------|-------|-------|
| **Core declarative** | Nested builder layout | 9/10 | Clean `vbox > hbox + separator + vbox` nesting. `buildContent()` defines header, search bar, tab bar, and 4 tab containers in a single tree. Each tab container is self-contained with title, stats, and `.bindTo()` list |
| **Core declarative** | Fluent method chaining | 8/10 | `.withId()` on tab buttons, section titles, search input, stats/language labels. `.withBold()`, `.withSize()`, `.withPadding()` for styling. `.when()` on all 4 tab containers. `.bindTo()` with `trackBy` on 4 lists |
| **Core declarative** | Programmatic generation | 6/10 | Lists driven by `.bindTo()` but no loop-based UI generation. Tab buttons and header elements are manually listed. Mock search generates results programmatically |
| **State architecture** | Observable store | 9/10 | Full `WikipediaStore` with `subscribe()`/`notifyChange()`. 6 data model types. Defensive copies on `getSearchHistory()`, `getReadingList()`, `getReadingHistory()`, `getFeaturedContent()`, `getLanguages()`, `getCurrentLanguage()`. Counter-based IDs (`article-004`, `saved-003`, `history-004`) |
| **Declarative updates** | `.when()` + `.bindTo()` | 9/10 | 4 tab containers (search, explore, saved, history) use `.when()`. 4 lists use `.bindTo()` with `trackBy` — search results, featured content, saved articles, reading history. `viewStack.refresh()` in store subscription. Two `setText()` escapes for `statsLabel` and `languageLabel` |
| **Anti-declarative** | No `removeAll()`/`setContent()` | 1 | Uses `win.setContent(buildContent)` for initial render, but all subsequent updates go through `.when()`, `.bindTo()`, and `viewStack.refresh()`. Minor penalty |
| **Testing** | `.withId()` coverage | 7/10 | IDs on tab buttons, section titles, search input, stats/language labels. Per-item IDs not present in list renderers (items identified by `trackBy` instead) |
| **Design** | Separation of concerns | 9/10 | `WikipediaStore` is 445 lines of pure data logic (search, reading lists, history, featured content, languages, statistics). `buildWikipediaApp()` is purely presentational. Complex data model (6 interfaces) cleanly separated from UI |
| | **Overall** | **8/10** | Solid pseudo-declarative implementation with 4 tabs, 4 dynamic lists, and a rich Observable store covering 6 data types. The main gaps are two `setText()` escapes and lack of per-item `.withId()` in list renderers. Using `.bindText()` for the header labels and adding IDs to rendered items would push this to 9/10 |

## License

Copyright (c) 2013–2025 Wikimedia Foundation
Portions copyright Paul Hammant 2025

Licensed under MIT License. See LICENSE file for details.

### Wikipedia Original License
The original Wikipedia iOS app is available at https://github.com/wikimedia/wikipedia-ios
Licensed under MIT License. This port is distributed under MIT with attribution to Wikimedia Foundation.

## References

- [Wikipedia iOS Repository](https://github.com/wikimedia/wikipedia-ios)
- [Wikipedia Official Website](https://www.wikipedia.org)
- [Wikimedia Foundation](https://wikimediafoundation.org)
- [Tsyne Framework Documentation](../../docs/API_REFERENCE.md)
