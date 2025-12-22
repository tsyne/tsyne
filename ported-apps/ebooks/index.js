"use strict";
/**
 * Ebook Reader - Tsyne Port of FlutterEbookApp
 *
 * A simple ebook library manager with reading tracking, favorites,
 * and customizable reading preferences. Demonstrates Observable MVC pattern.
 *
 * @tsyne-app {"name": "Ebook Reader", "version": "1.0.0"}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EbookStore = void 0;
exports.buildEbookApp = buildEbookApp;
// Observable Store
class EbookStore {
    constructor() {
        this.books = [];
        this.bookmarks = [];
        this.readingStats = [];
        this.preferences = {
            theme: 'light',
            fontSize: 'medium',
            fontFamily: 'serif',
            lineSpacing: 'normal',
        };
        this.currentlyReading = null;
        this.changeListeners = [];
        this.nextBookId = 13;
        this.nextBookmarkId = 5;
        this.initializeBooks();
    }
    initializeBooks() {
        this.books = [
            {
                id: 'book-001',
                title: 'Pride and Prejudice',
                author: 'Jane Austen',
                description: 'A romantic novel of manners and marriage set in Georgian England.',
                coverEmoji: '📕',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: false,
                lastReadPosition: 45,
                fileSize: 2.3,
                format: 'EPUB',
                publicationDate: '1813-01-28',
                totalPages: 432,
                currentPage: 194,
            },
            {
                id: 'book-002',
                title: 'Wuthering Heights',
                author: 'Emily Brontë',
                description: 'A tale of passionate love and vengeance on the Yorkshire moors.',
                coverEmoji: '📗',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: true,
                lastReadPosition: 62,
                fileSize: 1.8,
                format: 'EPUB',
                publicationDate: '1847-12-19',
                totalPages: 352,
                currentPage: 218,
            },
            {
                id: 'book-003',
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                description: 'A novel of the Jazz Age that has been acclaimed by generations of readers.',
                coverEmoji: '📘',
                downloadProgress: 75,
                isDownloaded: false,
                isFavorite: false,
                lastReadPosition: 0,
                fileSize: 1.2,
                format: 'EPUB',
                publicationDate: '1925-04-10',
                totalPages: 180,
                currentPage: 0,
            },
            {
                id: 'book-004',
                title: 'Jane Eyre',
                author: 'Charlotte Brontë',
                description: 'An autobiography of a young woman discovering her place in the world.',
                coverEmoji: '📙',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: true,
                lastReadPosition: 78,
                fileSize: 2.1,
                format: 'EPUB',
                publicationDate: '1847-10-16',
                totalPages: 507,
                currentPage: 395,
            },
            {
                id: 'book-005',
                title: 'Moby Dick',
                author: 'Herman Melville',
                description: 'An epic tale of man versus nature on the high seas.',
                coverEmoji: '📓',
                downloadProgress: 50,
                isDownloaded: false,
                isFavorite: false,
                lastReadPosition: 0,
                fileSize: 2.8,
                format: 'EPUB',
                publicationDate: '1851-10-18',
                totalPages: 635,
                currentPage: 0,
            },
            {
                id: 'book-006',
                title: 'The Odyssey',
                author: 'Homer',
                description: 'An ancient Greek epic of adventure, heroism, and the journey home.',
                coverEmoji: '📕',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: false,
                lastReadPosition: 33,
                fileSize: 1.6,
                format: 'EPUB',
                publicationDate: '800 BC',
                totalPages: 425,
                currentPage: 140,
            },
            {
                id: 'book-007',
                title: 'Frankenstein',
                author: 'Mary Shelley',
                description: 'A gothic novel about the dangers of unchecked ambition and science.',
                coverEmoji: '📗',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: true,
                lastReadPosition: 55,
                fileSize: 1.4,
                format: 'EPUB',
                publicationDate: '1818-01-01',
                totalPages: 280,
                currentPage: 154,
            },
            {
                id: 'book-008',
                title: 'The Picture of Dorian Gray',
                author: 'Oscar Wilde',
                description: 'A novel about beauty, corruption, and the consequences of vanity.',
                coverEmoji: '📘',
                downloadProgress: 25,
                isDownloaded: false,
                isFavorite: false,
                lastReadPosition: 0,
                fileSize: 0.9,
                format: 'EPUB',
                publicationDate: '1890-07-01',
                totalPages: 254,
                currentPage: 0,
            },
            {
                id: 'book-009',
                title: '1984',
                author: 'George Orwell',
                description: 'A dystopian novel set in a totalitarian superstate.',
                coverEmoji: '📙',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: false,
                lastReadPosition: 88,
                fileSize: 2.2,
                format: 'EPUB',
                publicationDate: '1949-06-08',
                totalPages: 328,
                currentPage: 288,
            },
            {
                id: 'book-010',
                title: 'The Count of Monte Cristo',
                author: 'Alexandre Dumas',
                description: 'An adventure novel about revenge, forgiveness, and redemption.',
                coverEmoji: '📓',
                downloadProgress: 90,
                isDownloaded: false,
                isFavorite: true,
                lastReadPosition: 0,
                fileSize: 3.1,
                format: 'EPUB',
                publicationDate: '1844-08-28',
                totalPages: 928,
                currentPage: 0,
            },
            {
                id: 'book-011',
                title: 'Alice in Wonderland',
                author: 'Lewis Carroll',
                description: 'A whimsical tale of a young girl in a magical realm.',
                coverEmoji: '📕',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: false,
                lastReadPosition: 92,
                fileSize: 1.5,
                format: 'EPUB',
                publicationDate: '1865-11-26',
                totalPages: 196,
                currentPage: 180,
            },
            {
                id: 'book-012',
                title: 'The Hobbit',
                author: 'J.R.R. Tolkien',
                description: 'A fantasy adventure about an unlikely hero and his quest.',
                coverEmoji: '📗',
                downloadProgress: 100,
                isDownloaded: true,
                isFavorite: true,
                lastReadPosition: 71,
                fileSize: 2.4,
                format: 'EPUB',
                publicationDate: '1937-09-21',
                totalPages: 310,
                currentPage: 220,
            },
        ];
        this.bookmarks = [
            {
                id: 'bm-001',
                ebookId: 'book-001',
                pageNumber: 100,
                note: 'Important dialogue about marriage',
                createdAt: new Date(2025, 0, 10),
            },
            {
                id: 'bm-002',
                ebookId: 'book-002',
                pageNumber: 156,
                note: 'Emotional scene',
                createdAt: new Date(2025, 0, 15),
            },
            {
                id: 'bm-003',
                ebookId: 'book-004',
                pageNumber: 250,
                note: 'Character development turning point',
                createdAt: new Date(2025, 0, 18),
            },
            {
                id: 'bm-004',
                ebookId: 'book-007',
                pageNumber: 145,
                note: 'Key plot twist',
                createdAt: new Date(2025, 0, 20),
            },
        ];
        this.readingStats = [
            { ebookId: 'book-001', totalReadTime: 450, lastReadDate: new Date(), sessionCount: 15 },
            { ebookId: 'book-002', totalReadTime: 620, lastReadDate: new Date(), sessionCount: 22 },
            { ebookId: 'book-004', totalReadTime: 890, lastReadDate: new Date(), sessionCount: 35 },
            { ebookId: 'book-006', totalReadTime: 320, lastReadDate: new Date(), sessionCount: 12 },
            { ebookId: 'book-007', totalReadTime: 410, lastReadDate: new Date(), sessionCount: 18 },
            { ebookId: 'book-009', totalReadTime: 560, lastReadDate: new Date(), sessionCount: 28 },
            { ebookId: 'book-011', totalReadTime: 540, lastReadDate: new Date(), sessionCount: 20 },
            { ebookId: 'book-012', totalReadTime: 780, lastReadDate: new Date(), sessionCount: 32 },
        ];
        this.currentlyReading = 'book-001';
    }
    // Book Management
    getBooks() {
        return [...this.books];
    }
    getBookCount() {
        return this.books.length;
    }
    getBookById(id) {
        return this.books.find((b) => b.id === id);
    }
    searchBooks(query) {
        const lower = query.toLowerCase();
        return this.books.filter((b) => b.title.toLowerCase().includes(lower) ||
            b.author.toLowerCase().includes(lower) ||
            b.description.toLowerCase().includes(lower));
    }
    addBook(book) {
        const newBook = {
            ...book,
            id: `book-${String(this.nextBookId++).padStart(3, '0')}`,
        };
        this.books.push(newBook);
        this.notifyChange();
        return newBook;
    }
    deleteBook(id) {
        const index = this.books.findIndex((b) => b.id === id);
        if (index === -1)
            return false;
        this.books.splice(index, 1);
        if (this.currentlyReading === id) {
            this.currentlyReading = null;
        }
        this.notifyChange();
        return true;
    }
    getDownloadedBooks() {
        return [...this.books.filter((b) => b.isDownloaded)];
    }
    getDownloadedCount() {
        return this.books.filter((b) => b.isDownloaded).length;
    }
    // Favorite Management
    getFavorites() {
        return [...this.books.filter((b) => b.isFavorite)];
    }
    getFavoriteCount() {
        return this.books.filter((b) => b.isFavorite).length;
    }
    toggleFavorite(id) {
        const book = this.books.find((b) => b.id === id);
        if (!book)
            return false;
        book.isFavorite = !book.isFavorite;
        this.notifyChange();
        return true;
    }
    // Download Management
    startDownload(id) {
        const book = this.books.find((b) => b.id === id);
        if (!book)
            return false;
        if (book.isDownloaded)
            return false;
        book.downloadProgress = 10;
        this.simulateDownload(id);
        this.notifyChange();
        return true;
    }
    simulateDownload(id) {
        const book = this.books.find((b) => b.id === id);
        if (!book)
            return;
        const interval = setInterval(() => {
            if (book.downloadProgress >= 100) {
                book.isDownloaded = true;
                book.downloadProgress = 100;
                clearInterval(interval);
                this.notifyChange();
            }
            else {
                book.downloadProgress = Math.min(100, book.downloadProgress + Math.random() * 20);
                this.notifyChange();
            }
        }, 500);
    }
    cancelDownload(id) {
        const book = this.books.find((b) => b.id === id);
        if (!book || book.isDownloaded)
            return false;
        book.downloadProgress = 0;
        this.notifyChange();
        return true;
    }
    // Reading Progress
    getCurrentlyReading() {
        return this.currentlyReading;
    }
    setCurrentlyReading(id) {
        if (id === null) {
            this.currentlyReading = null;
            this.notifyChange();
            return true;
        }
        if (!this.books.find((b) => b.id === id))
            return false;
        this.currentlyReading = id;
        this.notifyChange();
        return true;
    }
    updateReadingProgress(id, page, percentage) {
        const book = this.books.find((b) => b.id === id);
        if (!book)
            return false;
        book.currentPage = Math.min(page, book.totalPages);
        book.lastReadPosition = Math.min(Math.max(percentage, 0), 100);
        this.currentlyReading = id;
        let stats = this.readingStats.find((s) => s.ebookId === id);
        if (!stats) {
            stats = { ebookId: id, totalReadTime: 0, lastReadDate: new Date(), sessionCount: 0 };
            this.readingStats.push(stats);
        }
        stats.lastReadDate = new Date();
        stats.sessionCount++;
        this.notifyChange();
        return true;
    }
    getReadingStats(id) {
        return this.readingStats.find((s) => s.ebookId === id);
    }
    getTotalReadTime(id) {
        return this.readingStats.find((s) => s.ebookId === id)?.totalReadTime || 0;
    }
    // Bookmarks
    getBookmarks(ebookId) {
        return [...this.bookmarks.filter((b) => b.ebookId === ebookId)];
    }
    getBookmarkCount() {
        return this.bookmarks.length;
    }
    addBookmark(ebookId, pageNumber, note) {
        const bookmark = {
            id: `bm-${String(this.nextBookmarkId++).padStart(3, '0')}`,
            ebookId,
            pageNumber,
            note,
            createdAt: new Date(),
        };
        this.bookmarks.push(bookmark);
        this.notifyChange();
        return bookmark;
    }
    deleteBookmark(id) {
        const index = this.bookmarks.findIndex((b) => b.id === id);
        if (index === -1)
            return false;
        this.bookmarks.splice(index, 1);
        this.notifyChange();
        return true;
    }
    // Preferences
    getPreferences() {
        return { ...this.preferences };
    }
    setTheme(theme) {
        this.preferences.theme = theme;
        this.notifyChange();
    }
    setFontSize(size) {
        this.preferences.fontSize = size;
        this.notifyChange();
    }
    setFontFamily(family) {
        this.preferences.fontFamily = family;
        this.notifyChange();
    }
    setLineSpacing(spacing) {
        this.preferences.lineSpacing = spacing;
        this.notifyChange();
    }
    // Observable Pattern
    subscribe(listener) {
        this.changeListeners.push(listener);
        return () => {
            this.changeListeners = this.changeListeners.filter((l) => l !== listener);
        };
    }
    notifyChange() {
        this.changeListeners.forEach((listener) => listener());
    }
}
exports.EbookStore = EbookStore;
// UI Builder
async function buildEbookApp(app) {
    const a = app.getAppBuilder();
    const store = new EbookStore();
    let selectedTab = 'library';
    const updateLabels = async () => {
        const currentPrefs = store.getPreferences();
        const downloaded = store.getDownloadedBooks();
        const favoriteCount = store.getFavoriteCount();
        const bookmarkCount = store.getBookmarkCount();
        if (userLabel) {
            userLabel.setText(`📚 Ebook Reader | Theme: ${currentPrefs.theme === 'dark' ? '🌙' : '☀️'} | Font: ${currentPrefs.fontSize}`);
        }
        if (statsLabel) {
            statsLabel.setText(`Total: ${store.getBookCount()} | Downloaded: ${downloaded.length} | Favorites: ${favoriteCount} | Bookmarks: ${bookmarkCount}`);
        }
    };
    let userLabel;
    let statsLabel;
    const libraryContainer = a
        .vbox(() => {
        userLabel = a
            .label(() => '📚 Ebook Reader')
            .withId('user-label');
        a.label(() => 'Library').withBold().withId('library-title');
        a.entry()
            .withPlaceholder('Search books...')
            .onChange(async (query) => {
            await updateLabels();
            await viewStack.refresh();
        });
        a.vbox(() => { })
            .withId('books-list')
            .bindTo({
            items: () => store.getBooks(),
            render: (book) => {
                return a.hbox(() => {
                    a.label(() => book.coverEmoji);
                    a.vbox(() => {
                        a.label(() => book.title).withBold().withId(`book-title-${book.id}`);
                        a.label(() => `by ${book.author}`).withId(`book-author-${book.id}`);
                        if (book.downloadProgress < 100) {
                            a.label(() => `⬇️ ${Math.round(book.downloadProgress)}%`);
                            const btn = a.button(() => `Cancel`, async () => {
                                store.cancelDownload(book.id);
                                await updateLabels();
                                await viewStack.refresh();
                            });
                        }
                        else if (!book.isDownloaded) {
                            a.button(() => '⬇️ Download', async () => {
                                store.startDownload(book.id);
                                await updateLabels();
                                await viewStack.refresh();
                            });
                        }
                        const favBtn = a.button(() => (book.isFavorite ? '❤️ Unfavorite' : '🤍 Favorite'), async () => {
                            store.toggleFavorite(book.id);
                            await updateLabels();
                            await viewStack.refresh();
                        });
                    });
                });
            },
            trackBy: (book) => book.id,
        });
    })
        .when(() => selectedTab === 'library' && store.getBooks());
    const readingContainer = a
        .vbox(() => {
        a.label(() => 'Currently Reading').withBold().withId('reading-title');
        const currentId = store.getCurrentlyReading();
        const currentBook = currentId ? store.getBookById(currentId) : null;
        if (currentBook) {
            a.label(() => currentBook.coverEmoji).withSize(48);
            a.label(() => currentBook.title).withBold();
            a.label(() => `by ${currentBook.author}`);
            a.label(() => `Progress: ${currentBook.currentPage}/${currentBook.totalPages} (${Math.round(currentBook.lastReadPosition)}%)`);
            a.vbox(() => { })
                .withId('reading-progress')
                .bindTo({
                items: () => {
                    const stats = store.getReadingStats(currentBook.id);
                    return stats ? [stats] : [];
                },
                render: (stats) => {
                    return a.hbox(() => {
                        a.label(() => `Read Time: ${stats.totalReadTime} min | Sessions: ${stats.sessionCount}`);
                    });
                },
                trackBy: (stats) => stats.ebookId,
            });
            a.hbox(() => {
                a.button(() => '-10 Pages', async () => {
                    const newPage = Math.max(0, currentBook.currentPage - 10);
                    store.updateReadingProgress(currentBook.id, newPage, Math.round((newPage / currentBook.totalPages) * 100));
                    await updateLabels();
                    await viewStack.refresh();
                });
                a.button(() => '+10 Pages', async () => {
                    const newPage = Math.min(currentBook.totalPages, currentBook.currentPage + 10);
                    store.updateReadingProgress(currentBook.id, newPage, Math.round((newPage / currentBook.totalPages) * 100));
                    await updateLabels();
                    await viewStack.refresh();
                });
            });
            a.label(() => 'Bookmarks').withBold();
            a.vbox(() => { })
                .withId('bookmarks-list')
                .bindTo({
                items: () => store.getBookmarks(currentBook.id),
                render: (bm) => {
                    return a.hbox(() => {
                        a.vbox(() => {
                            a.label(() => `Page ${bm.pageNumber}: ${bm.note}`);
                        });
                        a.button(() => '✕', async () => {
                            store.deleteBookmark(bm.id);
                            await updateLabels();
                            await viewStack.refresh();
                        });
                    });
                },
                trackBy: (bm) => bm.id,
            });
            a.button(() => '📌 Add Bookmark', async () => {
                const note = `Bookmark at page ${currentBook.currentPage}`;
                store.addBookmark(currentBook.id, currentBook.currentPage, note);
                await updateLabels();
                await viewStack.refresh();
            });
        }
        else {
            a.label(() => 'No book selected for reading');
            a.button(() => 'Select from Library', async () => {
                selectedTab = 'library';
                await updateLabels();
                await viewStack.refresh();
            });
        }
    })
        .when(() => selectedTab === 'reading');
    const favoritesContainer = a
        .vbox(() => {
        a.label(() => 'Favorites').withBold().withId('favorites-title');
        const favorites = store.getFavorites();
        if (favorites.length === 0) {
            a.label(() => 'No favorite books yet');
        }
        a.vbox(() => { })
            .withId('favorites-list')
            .bindTo({
            items: () => store.getFavorites(),
            render: (book) => {
                return a.hbox(() => {
                    a.label(() => book.coverEmoji);
                    a.vbox(() => {
                        a.label(() => book.title).withBold();
                        a.label(() => `by ${book.author}`);
                    });
                    a.button(() => '❤️', async () => {
                        store.toggleFavorite(book.id);
                        await updateLabels();
                        await viewStack.refresh();
                    });
                });
            },
            trackBy: (book) => book.id,
        });
    })
        .when(() => selectedTab === 'favorites');
    const downloadsContainer = a
        .vbox(() => {
        a.label(() => 'Downloads').withBold().withId('downloads-title');
        const downloaded = store.getDownloadedBooks();
        a.label(() => `${downloaded.length} downloaded books`);
        a.vbox(() => { })
            .withId('downloads-list')
            .bindTo({
            items: () => store.getDownloadedBooks(),
            render: (book) => {
                return a.hbox(() => {
                    a.label(() => book.coverEmoji);
                    a.vbox(() => {
                        a.label(() => book.title).withBold();
                        a.label(() => `${book.fileSize} MB`);
                    });
                    a.button(() => '📖 Read', async () => {
                        store.setCurrentlyReading(book.id);
                        selectedTab = 'reading';
                        await updateLabels();
                        await viewStack.refresh();
                    });
                });
            },
            trackBy: (book) => book.id,
        });
    })
        .when(() => selectedTab === 'downloads');
    const settingsContainer = a
        .vbox(() => {
        a.label(() => 'Settings').withBold().withId('settings-title');
        const prefs = store.getPreferences();
        a.label(() => '🌓 Theme');
        a.hbox(() => {
            a.button(() => `${prefs.theme === 'light' ? '☀️ Light' : '☀️ Light'}`, async () => {
                store.setTheme('light');
                await updateLabels();
                await viewStack.refresh();
            });
            a.button(() => `${prefs.theme === 'dark' ? '🌙 Dark' : '🌙 Dark'}`, async () => {
                store.setTheme('dark');
                await updateLabels();
                await viewStack.refresh();
            });
        });
        a.label(() => '🔤 Font Size');
        a.hbox(() => {
            a.button(() => `${prefs.fontSize === 'small' ? '▼' : '▽'} Small`, async () => {
                store.setFontSize('small');
                await updateLabels();
                await viewStack.refresh();
            });
            a.button(() => `${prefs.fontSize === 'medium' ? '▼' : '▽'} Medium`, async () => {
                store.setFontSize('medium');
                await updateLabels();
                await viewStack.refresh();
            });
            a.button(() => `${prefs.fontSize === 'large' ? '▼' : '▽'} Large`, async () => {
                store.setFontSize('large');
                await updateLabels();
                await viewStack.refresh();
            });
        });
        a.label(() => '━━━━━━━━━━━━━━━━━━━━━━');
        a.label(() => '📊 Statistics');
        a.label(() => `Total Books: ${store.getBookCount()} | Downloaded: ${store.getDownloadedCount()} | Favorites: ${store.getFavoriteCount()}`);
    })
        .when(() => selectedTab === 'settings');
    statsLabel = a.label(() => '');
    const viewStack = a.vbox(() => {
        userLabel = a
            .label(() => '📚 Ebook Reader')
            .withId('user-label');
        statsLabel = a.label(() => '').withId('stats-label');
        a.hbox(() => {
            a.button(() => '📚 Library', async () => {
                selectedTab = 'library';
                await viewStack.refresh();
            });
            a.button(() => '📖 Reading', async () => {
                selectedTab = 'reading';
                await viewStack.refresh();
            });
            a.button(() => '❤️ Favorites', async () => {
                selectedTab = 'favorites';
                await viewStack.refresh();
            });
            a.button(() => '⬇️ Downloads', async () => {
                selectedTab = 'downloads';
                await viewStack.refresh();
            });
            a.button(() => '⚙️ Settings', async () => {
                selectedTab = 'settings';
                await viewStack.refresh();
            });
        });
        libraryContainer;
        readingContainer;
        favoritesContainer;
        downloadsContainer;
        settingsContainer;
    });
    store.subscribe(async () => {
        await updateLabels();
    });
    await updateLabels();
    await viewStack.refresh();
    return viewStack;
}
//# sourceMappingURL=index.js.map