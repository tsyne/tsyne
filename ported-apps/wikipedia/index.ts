/**
 * Wikipedia - Tsyne Port
 *
 * @tsyne-app:name Wikipedia
 * @tsyne-app:icon book
 * @tsyne-app:category Reference
 * @tsyne-app:builder buildWikipediaApp
 * @tsyne-app:args app,windowWidth,windowHeight
 *
 * The free encyclopedia reader and discovery tool ported from Wikipedia iOS to Tsyne:
 * - Full-text search across millions of articles
 * - Multi-language support (300+ languages)
 * - Reading history tracking
 * - Saved articles and reading lists
 * - Featured content discovery
 * - Article tabs and organization
 * - Offline article storage
 *
 * Portions copyright (c) 2013–2025 Wikimedia Foundation and portions copyright Paul Hammant 2025
 */

// ============================================================================
// DATA MODELS
// ============================================================================

export interface Article {
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

export interface ReadingListItem {
  id: string;
  articleTitle: string;
  articleId: number;
  language: string;
  summary: string;
  timestamp: Date;
  imageUrl: string;
}

export interface ReadingHistory {
  id: string;
  articleTitle: string;
  articleId: number;
  language: string;
  viewedAt: Date;
  timeSpent: number; // milliseconds
  scrollPosition: number;
}

export interface FeaturedContent {
  id: string;
  title: string;
  type: 'featured-article' | 'picture-of-day' | 'in-the-news' | 'on-this-day';
  description: string;
  imageUrl: string;
  language: string;
  date: Date;
}

export interface SearchSuggestion {
  id: string;
  title: string;
  pageId: number;
  views: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  localName: string;
  articles: number;
}

// ============================================================================
// WIKIPEDIA STORE (Observable)
// ============================================================================

type ChangeListener = () => void;

export class WikipediaStore {
  private searchHistory: Article[] = [
    {
      id: 'article-001',
      title: 'TypeScript',
      extract: 'TypeScript is a free and open-source programming language developed by Microsoft.',
      imageUrl: '📖',
      language: 'en',
      url: 'https://en.wikipedia.org/wiki/TypeScript',
      pageId: 58034,
      timestamp: new Date(Date.now() - 3600000),
      views: 125000,
      isStub: false,
    },
    {
      id: 'article-002',
      title: 'Open Source Software',
      extract: 'Open-source software (OSS) is a type of computer software made available in source code form.',
      imageUrl: '📚',
      language: 'en',
      url: 'https://en.wikipedia.org/wiki/Open-source_software',
      pageId: 27620,
      timestamp: new Date(Date.now() - 7200000),
      views: 250000,
      isStub: false,
    },
    {
      id: 'article-003',
      title: 'Wikipedia',
      extract: 'Wikipedia is a free online encyclopedia created and edited by volunteers around the world.',
      imageUrl: '🌐',
      language: 'en',
      url: 'https://en.wikipedia.org/wiki/Wikipedia',
      pageId: 171,
      timestamp: new Date(Date.now() - 86400000),
      views: 5000000,
      isStub: false,
    },
  ];

  private readingList: ReadingListItem[] = [
    {
      id: 'saved-001',
      articleTitle: 'History of the Internet',
      articleId: 12345,
      language: 'en',
      summary: 'The history of the internet and its development from ARPANET to the modern web.',
      timestamp: new Date(Date.now() - 604800000),
      imageUrl: '🖥️',
    },
    {
      id: 'saved-002',
      articleTitle: 'Science and Technology',
      articleId: 67890,
      language: 'en',
      summary: 'An overview of modern scientific and technological advancements.',
      timestamp: new Date(Date.now() - 1209600000),
      imageUrl: '🔬',
    },
  ];

  private readingHistory: ReadingHistory[] = [
    {
      id: 'history-001',
      articleTitle: 'Python (Programming Language)',
      articleId: 23456,
      language: 'en',
      viewedAt: new Date(Date.now() - 1800000),
      timeSpent: 600000,
      scrollPosition: 0,
    },
    {
      id: 'history-002',
      articleTitle: 'Machine Learning',
      articleId: 34567,
      language: 'en',
      viewedAt: new Date(Date.now() - 3600000),
      timeSpent: 1200000,
      scrollPosition: 50,
    },
    {
      id: 'history-003',
      articleTitle: 'Artificial Intelligence',
      articleId: 45678,
      language: 'en',
      viewedAt: new Date(Date.now() - 7200000),
      timeSpent: 1800000,
      scrollPosition: 30,
    },
  ];

  private featuredContent: FeaturedContent[] = [
    {
      id: 'featured-001',
      title: 'Great Barrier Reef',
      type: 'featured-article',
      description: 'The largest coral reef system in the world located off the coast of Queensland, Australia.',
      imageUrl: '🪸',
      language: 'en',
      date: new Date(Date.now() - 86400000),
    },
    {
      id: 'featured-002',
      title: 'Moon',
      type: 'picture-of-day',
      description: 'The natural satellite of Earth, our closest celestial neighbor.',
      imageUrl: '🌙',
      language: 'en',
      date: new Date(Date.now() - 172800000),
    },
    {
      id: 'featured-003',
      title: '2025 Nobel Prizes Announced',
      type: 'in-the-news',
      description: 'The 2025 Nobel Prize winners have been announced across all categories.',
      imageUrl: '🏆',
      language: 'en',
      date: new Date(Date.now() - 259200000),
    },
    {
      id: 'featured-004',
      title: 'On This Day: First Moon Landing',
      type: 'on-this-day',
      description: 'July 20, 1969: Apollo 11 astronauts land on the Moon.',
      imageUrl: '🚀',
      language: 'en',
      date: new Date(Date.now()),
    },
  ];

  private languages: LanguageOption[] = [
    { code: 'en', name: 'English', localName: 'English', articles: 6800000 },
    { code: 'es', name: 'Spanish', localName: 'Español', articles: 1800000 },
    { code: 'fr', name: 'French', localName: 'Français', articles: 2500000 },
    { code: 'de', name: 'German', localName: 'Deutsch', articles: 2600000 },
    { code: 'zh', name: 'Chinese', localName: '中文', articles: 1200000 },
    { code: 'ja', name: 'Japanese', localName: '日本語', articles: 1300000 },
    { code: 'ar', name: 'Arabic', localName: 'العربية', articles: 1100000 },
    { code: 'ru', name: 'Russian', localName: 'Русский', articles: 1700000 },
  ];

  private currentLanguage: LanguageOption = this.languages[0];
  private nextArticleId = 4;
  private nextSavedId = 3;
  private nextHistoryId = 4;
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
  search(query: string): SearchSuggestion[] {
    // Simulate search results
    const results: SearchSuggestion[] = [];
    const mockArticles = [
      { title: `${query} (Concept)`, views: Math.random() * 1000000 },
      { title: `${query} (History)`, views: Math.random() * 1000000 },
      { title: `${query} (Technology)`, views: Math.random() * 1000000 },
      { title: `History of ${query}`, views: Math.random() * 1000000 },
      { title: `${query} in Modern Times`, views: Math.random() * 1000000 },
    ];

    for (let i = 0; i < mockArticles.length; i++) {
      results.push({
        id: `suggestion-${i}`,
        title: mockArticles[i].title,
        pageId: 100000 + i,
        views: Math.round(mockArticles[i].views),
      });
    }
    return results;
  }

  viewArticle(suggestion: SearchSuggestion): Article {
    const article: Article = {
      id: `article-${String(this.nextArticleId++).padStart(3, '0')}`,
      title: suggestion.title,
      extract: `This is an article about ${suggestion.title}. ${suggestion.title} is a notable topic covered in Wikipedia with approximately ${suggestion.views} views.`,
      imageUrl: '📄',
      language: this.currentLanguage.code,
      url: `https://${this.currentLanguage.code}.wikipedia.org/wiki/${suggestion.title.replace(/ /g, '_')}`,
      pageId: suggestion.pageId,
      timestamp: new Date(),
      views: suggestion.views,
      isStub: Math.random() > 0.8,
    };
    this.searchHistory.unshift(article);
    this.addToReadingHistory(article.title, article.pageId);
    this.notifyChange();
    return article;
  }

  getSearchHistory(): Article[] {
    return [...this.searchHistory];
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    this.notifyChange();
  }

  deleteFromSearchHistory(articleId: string): boolean {
    const initialLength = this.searchHistory.length;
    this.searchHistory = this.searchHistory.filter((a) => a.id !== articleId);
    if (this.searchHistory.length < initialLength) {
      this.notifyChange();
      return true;
    }
    return false;
  }

  // ========== Reading List (Saved Articles) ==========
  getReadingList(): ReadingListItem[] {
    return [...this.readingList];
  }

  saveArticle(article: Article): ReadingListItem {
    const item: ReadingListItem = {
      id: `saved-${String(this.nextSavedId++).padStart(3, '0')}`,
      articleTitle: article.title,
      articleId: article.pageId,
      language: article.language,
      summary: article.extract,
      timestamp: new Date(),
      imageUrl: article.imageUrl,
    };
    this.readingList.unshift(item);
    this.notifyChange();
    return item;
  }

  removeSavedArticle(itemId: string): boolean {
    const initialLength = this.readingList.length;
    this.readingList = this.readingList.filter((item) => item.id !== itemId);
    if (this.readingList.length < initialLength) {
      this.notifyChange();
      return true;
    }
    return false;
  }

  isSavedArticle(articleId: number): boolean {
    return this.readingList.some((item) => item.articleId === articleId);
  }

  getReadingListByLanguage(language: string): ReadingListItem[] {
    return this.readingList.filter((item) => item.language === language);
  }

  // ========== Reading History ==========
  getReadingHistory(): ReadingHistory[] {
    return [...this.readingHistory];
  }

  private addToReadingHistory(title: string, pageId: number): void {
    const history: ReadingHistory = {
      id: `history-${String(this.nextHistoryId++).padStart(3, '0')}`,
      articleTitle: title,
      articleId: pageId,
      language: this.currentLanguage.code,
      viewedAt: new Date(),
      timeSpent: Math.floor(Math.random() * 3600000),
      scrollPosition: Math.floor(Math.random() * 100),
    };
    this.readingHistory.unshift(history);
  }

  clearReadingHistory(): void {
    this.readingHistory = [];
    this.notifyChange();
  }

  deleteFromReadingHistory(historyId: string): boolean {
    const initialLength = this.readingHistory.length;
    this.readingHistory = this.readingHistory.filter((h) => h.id !== historyId);
    if (this.readingHistory.length < initialLength) {
      this.notifyChange();
      return true;
    }
    return false;
  }

  getReadingStats(): { totalArticles: number; totalTimeSpent: number; averageTimePerArticle: number } {
    const totalTimeSpent = this.readingHistory.reduce((sum, h) => sum + h.timeSpent, 0);
    return {
      totalArticles: this.readingHistory.length,
      totalTimeSpent,
      averageTimePerArticle: this.readingHistory.length > 0 ? totalTimeSpent / this.readingHistory.length : 0,
    };
  }

  // ========== Featured Content ==========
  getFeaturedContent(): FeaturedContent[] {
    return [...this.featuredContent];
  }

  getFeaturedContentByType(type: FeaturedContent['type']): FeaturedContent[] {
    return this.featuredContent.filter((c) => c.type === type);
  }

  // ========== Languages ==========
  getLanguages(): LanguageOption[] {
    return [...this.languages];
  }

  getCurrentLanguage(): LanguageOption {
    return { ...this.currentLanguage };
  }

  setCurrentLanguage(languageCode: string): boolean {
    const language = this.languages.find((l) => l.code === languageCode);
    if (language) {
      this.currentLanguage = language;
      this.notifyChange();
      return true;
    }
    return false;
  }

  getTopReadArticles(limit: number = 10): Article[] {
    return [...this.searchHistory].sort((a, b) => b.views - a.views).slice(0, limit);
  }

  // ========== Statistics ==========
  getTotalArticlesViewed(): number {
    return this.searchHistory.length;
  }

  getArticleCount(language?: string): number {
    if (language) {
      return this.languages.find((l) => l.code === language)?.articles || 0;
    }
    return this.currentLanguage.articles;
  }

  getDaysActive(): number {
    if (this.readingHistory.length === 0) return 0;
    const oldest = this.readingHistory[this.readingHistory.length - 1].viewedAt.getTime();
    const newest = this.readingHistory[0].viewedAt.getTime();
    return Math.ceil((newest - oldest) / (1000 * 60 * 60 * 24)) + 1;
  }

  getContributionScore(): number {
    const stats = this.getReadingStats();
    const saveCount = this.readingList.length;
    const historyCount = this.readingHistory.length;
    return Math.round((historyCount * 10 + saveCount * 25) / 100);
  }
}

// ============================================================================
// APP BUILD FUNCTION
// ============================================================================

export function buildWikipediaApp(a: any, windowWidth?: number, windowHeight?: number): void {
  const store = new WikipediaStore();

  let selectedTab = 'search';
  let searchInput: any;
  let searchInputValue = '';
  let viewStack: any;
  let statsLabel: any;
  let languageLabel: any;

  let searchContainer: any;
  let exploreContainer: any;
  let savedContainer: any;
  let historyContainer: any;

  const updateLabels = async () => {
    const stats = store.getReadingStats();
    const lang = store.getCurrentLanguage();
    if (statsLabel) {
      const hours = Math.floor(stats.totalTimeSpent / 3600000);
      const mins = Math.floor((stats.totalTimeSpent % 3600000) / 60000);
      await statsLabel.setText(`📖 Articles Viewed: ${stats.totalArticles} | Time Spent: ${hours}h ${mins}m`);
    }
    if (languageLabel) {
      await languageLabel.setText(`🌐 Language: ${lang.name} (${lang.articles.toLocaleString()} articles)`);
    }
  };

  const buildContent = () => {
    a.vbox(() => {
        // Header
        a.hbox(() => {
          a.label('📖 Wikipedia').withId('app-title').withBold();
          a.spacer();
          languageLabel = a.label('🌐 Language: English').withId('language-label');
        });

        a.hbox(() => {
          a.spacer();
          statsLabel = a.label('📖 Articles Viewed: 0').withId('stats-label');
        });

        // Search Bar
        a.hbox(() => {
          searchInput = a.textEntry('').withPlaceholder('🔍 Search Wikipedia...').withId('search-input');
          searchInput.onChange(async (value: string) => {
            searchInputValue = value;
          });

          a.button('Search').onClick(async () => {
            if (searchInputValue.trim()) {
              const results = store.search(searchInputValue);
              if (results.length > 0) {
                store.viewArticle(results[0]);
                searchInputValue = '';
                if (searchInput) {
                  await searchInput.setText('');
                }
                await updateLabels();
                await viewStack.refresh();
              }
            }
          });
        });

        // Tabs
        a.hbox(() => {
          a.button('🔍 Search').onClick(async () => {
            selectedTab = 'search';
            await viewStack.refresh();
          });

          a.button('✨ Explore').onClick(async () => {
            selectedTab = 'explore';
            await viewStack.refresh();
          });

          a.button('💾 Saved').onClick(async () => {
            selectedTab = 'saved';
            await viewStack.refresh();
          });

          a.button('📜 History').onClick(async () => {
            selectedTab = 'history';
            await viewStack.refresh();
          });
        });

        a.separator();

        // Content
        viewStack = a.vbox(() => {
          // Search Tab
          searchContainer = a.vbox(() => {
            a.label('🔍 Search Results').withId('search-title').withBold();

            a.hbox(() => {
              a.button('🗑️ Clear').onClick(async () => {
                store.clearSearchHistory();
                await updateLabels();
                await viewStack.refresh();
              });

              a.spacer();

              a.label(`Recent: ${store.getTotalArticlesViewed()} articles`);
            });

            a.vbox(() => {})
              .bindTo({
                items: () => store.getSearchHistory().slice(0, 20),
                render: (article: Article) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${article.imageUrl} ${article.title}`).withBold();
                      a.label(`Views: ${article.views.toLocaleString()} | ${new Date(article.timestamp).toLocaleDateString()}`).withSize(
                        0.85
                      );
                      a.label(`${article.extract.substring(0, 80)}...`).withSize(0.8);
                    });
                    a.spacer();
                    a.button('Save').onClick(async () => {
                      store.saveArticle(article);
                      await viewStack.refresh();
                    });
                    a.button('✕').onClick(async () => {
                      store.deleteFromSearchHistory(article.id);
                      await viewStack.refresh();
                    });
                  }).withPadding(5);
                },
                trackBy: (article: Article) => article.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'search');

          // Explore Tab
          exploreContainer = a.vbox(() => {
            a.label('✨ Featured Content').withId('explore-title').withBold();

            a.hbox(() => {
              a.spacer();
              a.label(`Total Articles: ${store.getArticleCount().toLocaleString()}`);
            });

            a.vbox(() => {})
              .bindTo({
                items: () => store.getFeaturedContent(),
                render: (content: FeaturedContent) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${content.imageUrl} ${content.title}`).withBold();
                      a.label(`[${content.type.replace('-', ' ').toUpperCase()}]`).withSize(0.8);
                      a.label(`${content.description}`).withSize(0.85);
                    });
                  }).withPadding(5);
                },
                trackBy: (content: FeaturedContent) => content.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'explore');

          // Saved Tab
          savedContainer = a.vbox(() => {
            a.label('💾 Saved Articles').withId('saved-title').withBold();

            a.hbox(() => {
              a.spacer();
              a.label(`Total: ${store.getReadingList().length} saved`);
            });

            a.vbox(() => {})
              .bindTo({
                items: () => store.getReadingList(),
                render: (item: ReadingListItem) => {
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${item.imageUrl} ${item.articleTitle}`).withBold();
                      a.label(`Saved: ${new Date(item.timestamp).toLocaleDateString()}`).withSize(0.85);
                      a.label(`${item.summary.substring(0, 70)}...`).withSize(0.8);
                    });
                    a.spacer();
                    a.button('✕').onClick(async () => {
                      store.removeSavedArticle(item.id);
                      await viewStack.refresh();
                    });
                  }).withPadding(5);
                },
                trackBy: (item: ReadingListItem) => item.id,
              });
          })
            .withPadding(10)
            .when(() => selectedTab === 'saved');

          // History Tab
          historyContainer = a.vbox(() => {
            a.label('📜 Reading History').withId('history-title').withBold();

            const stats = store.getReadingStats();
            a.hbox(() => {
              a.vbox(() => {
                a.label('📊 STATS').withBold();
                a.label(`Articles: ${stats.totalArticles}`);
                a.label(`Days Active: ${store.getDaysActive()}`);
                a.label(`Score: ${store.getContributionScore()}`);
              });

              a.spacer();

              a.vbox(() => {
                a.label('⏱️ TIME SPENT').withBold();
                const hours = Math.floor(stats.totalTimeSpent / 3600000);
                const mins = Math.floor((stats.totalTimeSpent % 3600000) / 60000);
                a.label(`Total: ${hours}h ${mins}m`);
                const avgMins = Math.floor(stats.averageTimePerArticle / 60000);
                a.label(`Average: ${avgMins}m per article`);
              });
            });

            a.separator();

            a.label('📈 RECENT READS').withBold();
            a.vbox(() => {})
              .bindTo({
                items: () => store.getReadingHistory().slice(0, 15),
                render: (history: ReadingHistory) => {
                  const mins = Math.floor(history.timeSpent / 60000);
                  a.hbox(() => {
                    a.vbox(() => {
                      a.label(`${history.articleTitle}`).withBold();
                      a.label(`${mins}m read | ${new Date(history.viewedAt).toLocaleTimeString()}`).withSize(0.85);
                    });
                    a.spacer();
                    a.button('✕').onClick(async () => {
                      store.deleteFromReadingHistory(history.id);
                      await viewStack.refresh();
                    });
                  }).withPadding(5);
                },
                trackBy: (history: ReadingHistory) => history.id,
              });

            a.hbox(() => {
              a.spacer();
              a.button('🗑️ Clear History').onClick(async () => {
                store.clearReadingHistory();
                await updateLabels();
                await viewStack.refresh();
              });
            });
          })
            .withPadding(10)
            .when(() => selectedTab === 'history');
        });
      });
    });
  };

  // Observable subscription
  store.subscribe(async () => {
    await updateLabels();
    await viewStack.refresh();
  });

  // Always create a window - PhoneTop intercepts this to create a StackPaneAdapter
  a.window({ title: 'Wikipedia - The Free Encyclopedia' }, (win: any) => {
    win.setContent(buildContent);
    win.show();
    updateLabels();
  });
}
