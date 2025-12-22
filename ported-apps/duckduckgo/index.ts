/**
 * DuckDuckGo Privacy Browser - Tsyne Port
 *
 * @tsyne-app:name DuckDuckGo
 * @tsyne-app:icon search
 * @tsyne-app:category Internet
 * @tsyne-app:args (a: App) => void
 *
 * A privacy-focused search browser ported from DuckDuckGo iOS to Tsyne:
 * - Private search with no tracking
 * - Real-time privacy dashboard showing blocked trackers
 * - Search history with filtering
 * - Bookmarks and favorites management
 * - Privacy settings and configuration
 * - Quick actions (bangs) for specialized searches
 * - HTTPS encryption status
 *
 * Portions copyright Duck Duck Go Inc and portions copyright Paul Hammant 2025
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface SearchResult {
  id: string;
  query: string;
  timestamp: Date;
  domain: string;
  title: string;
  url: string;
  favicon: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon: string;
  category: string;
  timestamp: Date;
  isPrivate: boolean;
}

export interface TrackerBlock {
  id: string;
  domain: string;
  trackersBlocked: number;
  timestamp: Date;
  httpsUpgraded: boolean;
  cookiesManaged: number;
}

export interface PrivacyStats {
  totalTrackersBlocked: number;
  totalSitesVisited: number;
  httpsUpgrades: number;
  cookiePops: number;
  averageTrackersPerSite: number;
}

export interface BangAction {
  name: string;
  symbol: string;
  description: string;
  example: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  autoHttpsUpgrade: boolean;
  blockTrackers: boolean;
  blockAds: boolean;
  autoclearData: boolean;
  autoclearInterval: 'daily' | 'weekly' | 'monthly';
  safeSearch: boolean;
  resultsPerPage: number;
}

// ============================================================================
// DUCKDUCKGO STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class DuckDuckGoStore {
  private searchHistory: SearchResult[] = [
    {
      id: 'search-001',
      query: 'typescript compiler options',
      timestamp: new Date(Date.now() - 86400000),
      domain: 'duckduckgo.com',
      title: 'TypeScript: Handbook - Compiler Options',
      url: 'https://www.typescriptlang.org/docs/handbook/compiler-options.html',
      favicon: '🔍',
    },
    {
      id: 'search-002',
      query: 'privacy respecting search engines',
      timestamp: new Date(Date.now() - 172800000),
      domain: 'duckduckgo.com',
      title: 'Privacy Respecting Search Engines - DuckDuckGo',
      url: 'https://duckduckgo.com/about',
      favicon: '🔍',
    },
    {
      id: 'search-003',
      query: 'electron alternative desktop framework',
      timestamp: new Date(Date.now() - 259200000),
      domain: 'duckduckgo.com',
      title: 'Electron Alternatives - Comparisons',
      url: 'https://duckduckgo.com',
      favicon: '🔍',
    },
  ];

  private bookmarks: Bookmark[] = [
    {
      id: 'bookmark-001',
      title: 'DuckDuckGo Home',
      url: 'https://duckduckgo.com',
      favicon: '🦆',
      category: 'Search',
      timestamp: new Date(Date.now() - 604800000),
      isPrivate: false,
    },
    {
      id: 'bookmark-002',
      title: 'Privacy Policy',
      url: 'https://duckduckgo.com/privacy',
      favicon: '🛡️',
      category: 'Privacy',
      timestamp: new Date(Date.now() - 604800000),
      isPrivate: false,
    },
    {
      id: 'bookmark-003',
      title: 'Tech Documentation',
      url: 'https://developer.mozilla.org',
      favicon: '📚',
      category: 'Development',
      timestamp: new Date(Date.now() - 1209600000),
      isPrivate: false,
    },
    {
      id: 'bookmark-004',
      title: 'Secure Email',
      url: 'https://duckduckgo.com/email',
      favicon: '✉️',
      category: 'Privacy',
      timestamp: new Date(Date.now() - 1209600000),
      isPrivate: true,
    },
  ];

  private trackerBlocks: TrackerBlock[] = [
    {
      id: 'tracker-001',
      domain: 'google.com',
      trackersBlocked: 42,
      timestamp: new Date(Date.now() - 3600000),
      httpsUpgraded: true,
      cookiesManaged: 5,
    },
    {
      id: 'tracker-002',
      domain: 'facebook.com',
      trackersBlocked: 28,
      timestamp: new Date(Date.now() - 7200000),
      httpsUpgraded: true,
      cookiesManaged: 3,
    },
    {
      id: 'tracker-003',
      domain: 'news.ycombinator.com',
      trackersBlocked: 0,
      timestamp: new Date(Date.now() - 10800000),
      httpsUpgraded: true,
      cookiesManaged: 0,
    },
  ];

  private settings: AppSettings = {
    theme: 'light',
    autoHttpsUpgrade: true,
    blockTrackers: true,
    blockAds: true,
    autoclearData: false,
    autoclearInterval: 'daily',
    safeSearch: false,
    resultsPerPage: 30,
  };

  private bangs: BangAction[] = [
    {
      name: 'Google',
      symbol: '!g',
      description: 'Search on Google',
      example: '!g machine learning',
    },
    {
      name: 'Wikipedia',
      symbol: '!w',
      description: 'Search Wikipedia',
      example: '!w artificial intelligence',
    },
    {
      name: 'GitHub',
      symbol: '!gh',
      description: 'Search GitHub repositories',
      example: '!gh typescript utils',
    },
    {
      name: 'Stack Overflow',
      symbol: '!so',
      description: 'Search Stack Overflow',
      example: '!so async await',
    },
    {
      name: 'npm',
      symbol: '!npm',
      description: 'Search npm packages',
      example: '!npm express',
    },
    {
      name: 'YouTube',
      symbol: '!yt',
      description: 'Search YouTube videos',
      example: '!yt tutorial programming',
    },
  ];

  private nextSearchId = 4;
  private nextBookmarkId = 5;
  private changeListeners: ChangeListener[] = [];

  subscribe(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter((l) => l !== listener);
    };
  }

  private notifyChange() {
    this.changeListeners.forEach((listener) => listener());
  }

  // ========== Search ==========
  getSearchHistory(): SearchResult[] {
    return [...this.searchHistory];
  }

  search(query: string): SearchResult {
    const result: SearchResult = {
      id: `search-${String(this.nextSearchId++).padStart(3, '0')}`,
      query,
      timestamp: new Date(),
      domain: 'duckduckgo.com',
      title: `Results for "${query}" - DuckDuckGo`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      favicon: '🔍',
    };
    this.searchHistory.unshift(result);
    this.notifyChange();
    return result;
  }

  deleteSearchHistory(searchId: string): boolean {
    const initialLength = this.searchHistory.length;
    this.searchHistory = this.searchHistory.filter((s) => s.id !== searchId);
    if (this.searchHistory.length < initialLength) {
      this.notifyChange();
      return true;
    }
    return false;
  }

  clearAllHistory(): void {
    this.searchHistory = [];
    this.trackerBlocks = [];
    this.notifyChange();
  }

  filterSearchHistory(query: string): SearchResult[] {
    return this.searchHistory.filter((s) => s.query.toLowerCase().includes(query.toLowerCase()));
  }

  getRecentSearches(limit: number = 10): SearchResult[] {
    return [...this.searchHistory].slice(0, limit);
  }

  // ========== Bookmarks ==========
  getBookmarks(): Bookmark[] {
    return [...this.bookmarks];
  }

  getBookmarksByCategory(category: string): Bookmark[] {
    return this.bookmarks.filter((b) => b.category === category);
  }

  addBookmark(title: string, url: string, category: string, isPrivate: boolean = false): Bookmark {
    const bookmark: Bookmark = {
      id: `bookmark-${String(this.nextBookmarkId++).padStart(3, '0')}`,
      title,
      url,
      favicon: '🔖',
      category,
      timestamp: new Date(),
      isPrivate,
    };
    this.bookmarks.unshift(bookmark);
    this.notifyChange();
    return bookmark;
  }

  deleteBookmark(bookmarkId: string): boolean {
    const initialLength = this.bookmarks.length;
    this.bookmarks = this.bookmarks.filter((b) => b.id !== bookmarkId);
    if (this.bookmarks.length < initialLength) {
      this.notifyChange();
      return true;
    }
    return false;
  }

  updateBookmark(bookmarkId: string, title: string, category: string): boolean {
    const bookmark = this.bookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      bookmark.title = title;
      bookmark.category = category;
      this.notifyChange();
      return true;
    }
    return false;
  }

  getCategories(): string[] {
    const categories = new Set(this.bookmarks.map((b) => b.category));
    return Array.from(categories).sort();
  }

  getFavorites(): Bookmark[] {
    return this.bookmarks.filter((b) => b.category === 'Favorites');
  }

  // ========== Privacy & Trackers ==========
  getTrackerBlocks(): TrackerBlock[] {
    return [...this.trackerBlocks];
  }

  getPrivacyStats(): PrivacyStats {
    const totalTrackers = this.trackerBlocks.reduce((sum, t) => sum + t.trackersBlocked, 0);
    const totalSites = this.trackerBlocks.length;
    const httpsUpgrades = this.trackerBlocks.filter((t) => t.httpsUpgraded).length;
    const totalCookies = this.trackerBlocks.reduce((sum, t) => sum + t.cookiesManaged, 0);

    return {
      totalTrackersBlocked: totalTrackers,
      totalSitesVisited: totalSites,
      httpsUpgrades,
      cookiePops: totalCookies,
      averageTrackersPerSite: totalSites > 0 ? totalTrackers / totalSites : 0,
    };
  }

  addTrackerBlock(domain: string, trackersBlocked: number, httpsUpgraded: boolean = true): void {
    const block: TrackerBlock = {
      id: `tracker-${Date.now()}`,
      domain,
      trackersBlocked,
      timestamp: new Date(),
      httpsUpgraded,
      cookiesManaged: Math.floor(Math.random() * 5),
    };
    this.trackerBlocks.unshift(block);
    this.notifyChange();
  }

  getTopBlockedDomains(limit: number = 5): TrackerBlock[] {
    return [...this.trackerBlocks]
      .sort((a, b) => b.trackersBlocked - a.trackersBlocked)
      .slice(0, limit);
  }

  // ========== Settings ==========
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.notifyChange();
  }

  toggleTheme(): void {
    this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
    this.notifyChange();
  }

  toggleTracker(): void {
    this.settings.blockTrackers = !this.settings.blockTrackers;
    this.notifyChange();
  }

  toggleAds(): void {
    this.settings.blockAds = !this.settings.blockAds;
    this.notifyChange();
  }

  // ========== Bangs ==========
  getBangs(): BangAction[] {
    return [...this.bangs];
  }

  searchBangs(query: string): BangAction[] {
    return this.bangs.filter(
      (b) =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.symbol.includes(query) ||
        b.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  // ========== Stats ==========
  getTotalSearches(): number {
    return this.searchHistory.length;
  }

  getTodaySearches(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.searchHistory.filter((s) => s.timestamp.getTime() >= today.getTime()).length;
  }

  getAverageSearchesPerDay(): number {
    if (this.searchHistory.length === 0) return 0;
    const oldest = this.searchHistory[this.searchHistory.length - 1].timestamp.getTime();
    const newest = this.searchHistory[0].timestamp.getTime();
    const days = Math.ceil((newest - oldest) / (1000 * 60 * 60 * 24)) + 1;
    return Math.round((this.searchHistory.length / days) * 10) / 10;
  }

  getMostSearchedQueries(limit: number = 5): string[] {
    const queryCount = new Map<string, number>();
    this.searchHistory.forEach((s) => {
      queryCount.set(s.query, (queryCount.get(s.query) || 0) + 1);
    });
    return Array.from(queryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query]) => query);
  }

  getPrivacyScore(): number {
    const stats = this.getPrivacyStats();
    const blockRate = stats.totalSitesVisited > 0 ? stats.httpsUpgrades / stats.totalSitesVisited : 0;
    return Math.round(blockRate * 100);
  }
}

// ============================================================================
// APP BUILD FUNCTION
// ============================================================================

export function buildDuckDuckGoApp(a: any): void {
  const store = new DuckDuckGoStore();

  let selectedTab = 'search';
  let searchInputValue = '';
  let searchInput: any;
  let viewStack: any;
  let privacyLabel: any;
  let statsLabel: any;

  let searchContainer: any;
  let privacyContainer: any;
  let bookmarksContainer: any;
  let settingsContainer: any;

  const updateLabels = async () => {
    const stats = store.getPrivacyStats();
    const score = store.getPrivacyScore();
    if (privacyLabel) {
      await privacyLabel.setText(
        `🛡️ Privacy Score: ${score}% | Trackers Blocked: ${stats.totalTrackersBlocked}`
      );
    }
    if (statsLabel) {
      const searches = store.getTotalSearches();
      const avg = store.getAverageSearchesPerDay();
      await statsLabel.setText(`📊 Total Searches: ${searches} | Daily Avg: ${avg}`);
    }
  };

  a.window({ title: 'DuckDuckGo Privacy Browser' }, (win: any) => {
    win.setContent(() => {
      a.vbox(() => {
        // Header
        a.hbox(() => {
          a.label('🦆 DuckDuckGo').withId('app-title').withBold();
          a.spacer();
          privacyLabel = a.label('🛡️ Privacy Score: 0%').withId('privacy-label');
        });

        a.hbox(() => {
          a.spacer();
          statsLabel = a.label('📊 Total Searches: 0').withId('stats-label');
        });

        // Search Bar
        a.hbox(() => {
          searchInput = a.textEntry('').withPlaceholder('🔍 Search privately...').withId('search-input');
          searchInput.onChange(async (value: string) => {
            searchInputValue = value;
          });

          a.button('Search').onClick(async () => {
            if (searchInputValue.trim()) {
              store.search(searchInputValue);
              searchInputValue = '';
              if (searchInput) {
                await searchInput.setText('');
              }
              await updateLabels();
              await viewStack.refresh();
            }
          });

          a.button('Clear').onClick(async () => {
            searchInputValue = '';
            if (searchInput) {
              await searchInput.setText('');
            }
          });
        });

        // Tabs
        a.hbox(() => {
          a.button('🔍 Search').onClick(async () => {
            selectedTab = 'search';
            await viewStack.refresh();
          });

          a.button('🛡️ Privacy').onClick(async () => {
            selectedTab = 'privacy';
            await viewStack.refresh();
          });

          a.button('🔖 Bookmarks').onClick(async () => {
            selectedTab = 'bookmarks';
            await viewStack.refresh();
          });

          a.button('⚙️ Settings').onClick(async () => {
            selectedTab = 'settings';
            await viewStack.refresh();
          });
        });

        a.separator();

        // Content
        viewStack = a.vbox(() => {
          // Search Tab
          searchContainer = a.vbox(() => {
            a.label('📋 Search History').withId('search-title').withBold();

            a.hbox(() => {
              a.button('🗑️ Clear History').onClick(async () => {
                store.clearAllHistory();
                await updateLabels();
                await viewStack.refresh();
              });

              a.spacer();

              a.label(`Total: ${store.getTotalSearches()} searches`);
            });

            a.vbox(() => {})
              .bindTo({
                items: () => store.getSearchHistory(),
                render: (search: SearchResult) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${search.favicon} ${search.query}`).withBold();
                      a.label(`${new Date(search.timestamp).toLocaleString()}`).withSize(0.9);
                    });
                    a.spacer();
                    a.button('✕').onClick(async () => {
                      store.deleteSearchHistory(search.id);
                      await viewStack.refresh();
                    });
                  }).withPadding(5);
                },
                trackBy: (search: SearchResult) => search.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'search');

          // Privacy Tab
          privacyContainer = a.vbox(() => {
            a.label('🛡️ Privacy Dashboard').withId('privacy-title').withBold();

            const stats = store.getPrivacyStats();
            a.hbox(() => {
              a.vbox(() => {
                a.label('📊 STATS').withBold();
                a.label(`Trackers: ${stats.totalTrackersBlocked}`);
                a.label(`Sites: ${stats.totalSitesVisited}`);
                a.label(`HTTPS: ${stats.httpsUpgrades}`);
                a.label(`Cookies: ${stats.cookiePops}`);
              });

              a.spacer();

              a.vbox(() => {
                a.label('🎯 BLOCKED DOMAINS').withBold();
                const top = store.getTopBlockedDomains(3);
                for (const domain of top) {
                  a.label(`${domain.domain}: ${domain.trackersBlocked} trackers`);
                }
              });
            });

            a.separator();

            a.label('📈 RECENT ACTIVITY').withBold();
            a.vbox(() => {})
              .bindTo({
                items: () => store.getTrackerBlocks().slice(0, 10),
                render: (block: TrackerBlock) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${block.domain}`).withBold();
                      a.label(`${block.trackersBlocked} trackers | HTTPS: ${block.httpsUpgraded ? '✓' : '✕'}`);
                    });
                    a.spacer();
                    a.label(`${new Date(block.timestamp).toLocaleTimeString()}`);
                  }).withPadding(5);
                },
                trackBy: (block: TrackerBlock) => block.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'privacy');

          // Bookmarks Tab
          bookmarksContainer = a.vbox(() => {
            a.label('🔖 Bookmarks').withId('bookmarks-title').withBold();

            a.hbox(() => {
              a.button('➕ Add Bookmark').onClick(async () => {
                const result = await win.showForm({
                  title: 'Add Bookmark',
                  fields: [
                    { name: 'title', label: 'Title', type: 'text' },
                    { name: 'url', label: 'URL', type: 'text' },
                    {
                      name: 'category',
                      label: 'Category',
                      type: 'select',
                      options: ['Favorites', 'Development', 'Search', 'Privacy', 'Other'],
                    },
                  ],
                });

                if (result) {
                  store.addBookmark(result.title, result.url, result.category);
                  await viewStack.refresh();
                }
              });

              a.spacer();

              a.label(`Total: ${store.getBookmarks().length} bookmarks`);
            });

            a.vbox(() => {})
              .bindTo({
                items: () => store.getBookmarks(),
                render: (bookmark: Bookmark) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${bookmark.favicon} ${bookmark.title}`).withBold();
                      a.label(`${bookmark.category} | ${bookmark.url}`).withSize(0.85);
                    });
                    a.spacer();
                    a.button('✕').onClick(async () => {
                      store.deleteBookmark(bookmark.id);
                      await viewStack.refresh();
                    });
                  }).withPadding(5);
                },
                trackBy: (bookmark: Bookmark) => bookmark.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'bookmarks');

          // Settings Tab
          settingsContainer = a.vbox(() => {
            a.label('⚙️ Settings').withId('settings-title').withBold();

            const settings = store.getSettings();

            a.label('🔒 PRIVACY SETTINGS').withBold();
            a.hbox(() => {
              a.checkbox('Block Trackers', settings.blockTrackers).onChange(async (value: boolean) => {
                store.updateSetting('blockTrackers', value);
                await viewStack.refresh();
              });
            });

            a.hbox(() => {
              a.checkbox('Block Ads', settings.blockAds).onChange(async (value: boolean) => {
                store.updateSetting('blockAds', value);
                await viewStack.refresh();
              });
            });

            a.hbox(() => {
              a.checkbox('Auto HTTPS', settings.autoHttpsUpgrade).onChange(async (value: boolean) => {
                store.updateSetting('autoHttpsUpgrade', value);
                await viewStack.refresh();
              });
            });

            a.hbox(() => {
              a.checkbox('Safe Search', settings.safeSearch).onChange(async (value: boolean) => {
                store.updateSetting('safeSearch', value);
                await viewStack.refresh();
              });
            });

            a.separator();

            a.label('🎨 APPEARANCE').withBold();
            a.hbox(() => {
              a.label(`Theme: ${settings.theme}`);
              a.spacer();
              a.button('Toggle Theme').onClick(async () => {
                store.toggleTheme();
                await viewStack.refresh();
              });
            });

            a.separator();

            a.label('⚡ QUICK ACTIONS').withBold();
            a.label('DuckDuckGo Bangs - Use !bang before your search:').withSize(0.9);

            a.vbox(() => {})
              .bindTo({
                items: () => store.getBangs().slice(0, 6),
                render: (bang: BangAction) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${bang.symbol} ${bang.name}`).withBold();
                      a.label(`${bang.description}`).withSize(0.85);
                    });
                  }).withPadding(3);
                },
                trackBy: (bang: BangAction) => bang.symbol,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'settings');
        });
      });
    });

    // Observable subscription
    store.subscribe(async () => {
      await updateLabels();
      await viewStack.refresh();
    });

    updateLabels();
  });
}
