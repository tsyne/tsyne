/**
 * Jest Tests for Ebook Store
 *
 * Tests for the EbookStore model, including book management, reading,
 * favorites, downloads, bookmarks, and preferences.
 */

import { EbookStore, Ebook, Bookmark, ReadingStats } from './index';

describe('EbookStore', () => {
  let store: EbookStore;

  beforeEach(() => {
    store = new EbookStore();
  });

  describe('Book Management', () => {
    it('should get list of books', () => {
      const books = store.getBooks();
      expect(Array.isArray(books)).toBe(true);
      expect(books.length).toBeGreaterThan(0);
    });

    it('should get book count', () => {
      const count = store.getBookCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should get book by id', () => {
      const books = store.getBooks();
      const book = store.getBookById(books[0].id);
      expect(book).toBeDefined();
      expect(book?.id).toBe(books[0].id);
    });

    it('should return undefined for non-existent book id', () => {
      const book = store.getBookById('nonexistent');
      expect(book).toBeUndefined();
    });

    it('should search books by title', () => {
      const results = store.searchBooks('Pride');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Pride');
    });

    it('should search books by author', () => {
      const results = store.searchBooks('Austen');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((b) => b.author.includes('Austen'))).toBe(true);
    });

    it('should search books by description', () => {
      const results = store.searchBooks('romantic');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no search matches', () => {
      const results = store.searchBooks('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('should add a new book', () => {
      const initialCount = store.getBookCount();
      const newBook = store.addBook({
        title: 'Test Book',
        author: 'Test Author',
        description: 'Test Description',
        coverEmoji: '📕',
        downloadProgress: 0,
        isDownloaded: false,
        isFavorite: false,
        lastReadPosition: 0,
        fileSize: 1.5,
        format: 'EPUB',
        publicationDate: '2025-01-01',
        totalPages: 300,
        currentPage: 0,
      });

      expect(store.getBookCount()).toBe(initialCount + 1);
      expect(newBook.id).toBeDefined();
      expect(newBook.title).toBe('Test Book');
    });

    it('should delete a book', () => {
      const books = store.getBooks();
      const initialCount = books.length;
      const bookToDelete = books[0];

      const deleted = store.deleteBook(bookToDelete.id);

      expect(deleted).toBe(true);
      expect(store.getBookCount()).toBe(initialCount - 1);
      expect(store.getBookById(bookToDelete.id)).toBeUndefined();
    });

    it('should handle delete of non-existent book', () => {
      const initialCount = store.getBookCount();
      const deleted = store.deleteBook('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getBookCount()).toBe(initialCount);
    });
  });

  describe('Favorite Management', () => {
    it('should get list of favorite books', () => {
      const favorites = store.getFavorites();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites.length).toBeGreaterThan(0);
    });

    it('should get favorite count', () => {
      const count = store.getFavoriteCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should toggle favorite status', () => {
      const books = store.getBooks();
      const book = books.find((b) => !b.isFavorite);

      if (book) {
        const result = store.toggleFavorite(book.id);
        expect(result).toBe(true);

        const updated = store.getBookById(book.id);
        expect(updated?.isFavorite).toBe(true);
      }
    });

    it('should toggle favorite back to false', () => {
      const books = store.getBooks();
      const book = books.find((b) => b.isFavorite);

      if (book) {
        store.toggleFavorite(book.id);
        const updated = store.getBookById(book.id);
        expect(updated?.isFavorite).toBe(false);
      }
    });

    it('should handle toggling favorite for non-existent book', () => {
      const result = store.toggleFavorite('nonexistent-id');
      expect(result).toBe(false);
    });
  });

  describe('Download Management', () => {
    it('should get downloaded books', () => {
      const downloaded = store.getDownloadedBooks();
      expect(Array.isArray(downloaded)).toBe(true);
      expect(downloaded.length).toBeGreaterThan(0);
      expect(downloaded.every((b) => b.isDownloaded)).toBe(true);
    });

    it('should get downloaded count', () => {
      const count = store.getDownloadedCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should start a download', () => {
      const books = store.getBooks();
      const book = books.find((b) => !b.isDownloaded && b.downloadProgress === 0);

      if (book) {
        const result = store.startDownload(book.id);
        expect(result).toBe(true);

        const updated = store.getBookById(book.id);
        expect(updated?.downloadProgress).toBeGreaterThan(0);
      }
    });

    it('should not start download for already downloaded book', () => {
      const books = store.getBooks();
      const downloaded = books.find((b) => b.isDownloaded);

      if (downloaded) {
        const result = store.startDownload(downloaded.id);
        expect(result).toBe(false);
      }
    });

    it('should cancel a download', () => {
      const books = store.getBooks();
      const book = books.find((b) => !b.isDownloaded && b.downloadProgress > 0);

      if (book) {
        const result = store.cancelDownload(book.id);
        expect(result).toBe(true);

        const updated = store.getBookById(book.id);
        expect(updated?.downloadProgress).toBe(0);
      }
    });

    it('should handle start download for non-existent book', () => {
      const result = store.startDownload('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should handle cancel download for non-existent book', () => {
      const result = store.cancelDownload('nonexistent-id');
      expect(result).toBe(false);
    });
  });

  describe('Reading Progress', () => {
    it('should get currently reading book id', () => {
      const id = store.getCurrentlyReading();
      expect(id).toBeDefined();
    });

    it('should set currently reading book', () => {
      const books = store.getBooks();
      const result = store.setCurrentlyReading(books[0].id);
      expect(result).toBe(true);
      expect(store.getCurrentlyReading()).toBe(books[0].id);
    });

    it('should handle set currently reading for non-existent book', () => {
      const result = store.setCurrentlyReading('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should clear currently reading', () => {
      const result = store.setCurrentlyReading(null);
      expect(result).toBe(true);
      expect(store.getCurrentlyReading()).toBeNull();
    });

    it('should update reading progress', () => {
      const books = store.getBooks();
      const book = books[0];

      const result = store.updateReadingProgress(book.id, 150, 50);

      expect(result).toBe(true);
      const updated = store.getBookById(book.id);
      expect(updated?.currentPage).toBe(150);
      expect(updated?.lastReadPosition).toBe(50);
    });

    it('should cap page number at total pages', () => {
      const books = store.getBooks();
      const book = books[0];

      store.updateReadingProgress(book.id, 1000, 100);
      const updated = store.getBookById(book.id);
      expect(updated?.currentPage).toBeLessThanOrEqual(updated?.totalPages!);
    });

    it('should clamp percentage between 0 and 100', () => {
      const books = store.getBooks();
      const book = books[0];

      store.updateReadingProgress(book.id, 100, 150);
      const updated = store.getBookById(book.id);
      expect(updated?.lastReadPosition).toBeLessThanOrEqual(100);
    });

    it('should handle reading progress for non-existent book', () => {
      const result = store.updateReadingProgress('nonexistent-id', 100, 50);
      expect(result).toBe(false);
    });

    it('should get reading stats', () => {
      const books = store.getBooks();
      const book = books[0];

      store.updateReadingProgress(book.id, 100, 50);
      const stats = store.getReadingStats(book.id);

      expect(stats).toBeDefined();
      expect(stats?.ebookId).toBe(book.id);
      expect(stats?.sessionCount).toBeGreaterThan(0);
    });

    it('should return undefined stats for book without reading history', () => {
      const newBook = store.addBook({
        title: 'Unread Book',
        author: 'Test',
        description: 'Test',
        coverEmoji: '📕',
        downloadProgress: 100,
        isDownloaded: true,
        isFavorite: false,
        lastReadPosition: 0,
        fileSize: 1.0,
        format: 'EPUB',
        publicationDate: '2025-01-01',
        totalPages: 200,
        currentPage: 0,
      });

      const stats = store.getReadingStats(newBook.id);
      expect(stats).toBeUndefined();
    });

    it('should get total read time', () => {
      const books = store.getBooks();
      const book = books[0];

      const time = store.getTotalReadTime(book.id);
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Bookmarks', () => {
    it('should get bookmarks for a book', () => {
      const books = store.getBooks();
      const bookmarks = store.getBookmarks(books[0].id);

      expect(Array.isArray(bookmarks)).toBe(true);
    });

    it('should get bookmark count', () => {
      const count = store.getBookmarkCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should add a bookmark', () => {
      const books = store.getBooks();
      const initialCount = store.getBookmarkCount();

      const bookmark = store.addBookmark(books[0].id, 100, 'Test bookmark');

      expect(store.getBookmarkCount()).toBe(initialCount + 1);
      expect(bookmark.id).toBeDefined();
      expect(bookmark.note).toBe('Test bookmark');
    });

    it('should delete a bookmark', () => {
      const books = store.getBooks();
      const bookmarks = store.getBookmarks(books[0].id);

      if (bookmarks.length > 0) {
        const initialCount = store.getBookmarkCount();
        const deleted = store.deleteBookmark(bookmarks[0].id);

        expect(deleted).toBe(true);
        expect(store.getBookmarkCount()).toBe(initialCount - 1);
      }
    });

    it('should handle delete of non-existent bookmark', () => {
      const initialCount = store.getBookmarkCount();
      const deleted = store.deleteBookmark('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getBookmarkCount()).toBe(initialCount);
    });
  });

  describe('Preferences', () => {
    it('should get preferences', () => {
      const prefs = store.getPreferences();
      expect(prefs).toHaveProperty('theme');
      expect(prefs).toHaveProperty('fontSize');
      expect(prefs).toHaveProperty('fontFamily');
      expect(prefs).toHaveProperty('lineSpacing');
    });

    it('should set theme to dark', () => {
      store.setTheme('dark');
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe('dark');
    });

    it('should set theme to light', () => {
      store.setTheme('light');
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe('light');
    });

    it('should set font size', () => {
      store.setFontSize('large');
      const prefs = store.getPreferences();
      expect(prefs.fontSize).toBe('large');
    });

    it('should set font family', () => {
      store.setFontFamily('sans-serif');
      const prefs = store.getPreferences();
      expect(prefs.fontFamily).toBe('sans-serif');
    });

    it('should set line spacing', () => {
      store.setLineSpacing('loose');
      const prefs = store.getPreferences();
      expect(prefs.lineSpacing).toBe('loose');
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on add book', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addBook({
        title: 'New Book',
        author: 'Author',
        description: 'Description',
        coverEmoji: '📕',
        downloadProgress: 0,
        isDownloaded: false,
        isFavorite: false,
        lastReadPosition: 0,
        fileSize: 1.0,
        format: 'EPUB',
        publicationDate: '2025-01-01',
        totalPages: 200,
        currentPage: 0,
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on favorite toggle', () => {
      const listener = jest.fn();
      store.subscribe(listener);
      const books = store.getBooks();

      store.toggleFavorite(books[0].id);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on reading progress update', () => {
      const listener = jest.fn();
      store.subscribe(listener);
      const books = store.getBooks();

      store.updateReadingProgress(books[0].id, 100, 50);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on theme change', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.setTheme('dark');

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      const books = store.getBooks();
      store.toggleFavorite(books[0].id);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned books array', () => {
      const books1 = store.getBooks();
      const books2 = store.getBooks();

      expect(books1).not.toBe(books2);
    });

    it('should not mutate returned bookmarks', () => {
      const bookmarks1 = store.getBookmarks(store.getBooks()[0].id);
      const bookmarks2 = store.getBookmarks(store.getBooks()[0].id);

      expect(bookmarks1).not.toBe(bookmarks2);
    });

    it('should not mutate returned favorites', () => {
      const favorites1 = store.getFavorites();
      const favorites2 = store.getFavorites();

      expect(favorites1).not.toBe(favorites2);
    });

    it('should not mutate returned downloaded books', () => {
      const downloaded1 = store.getDownloadedBooks();
      const downloaded2 = store.getDownloadedBooks();

      expect(downloaded1).not.toBe(downloaded2);
    });

    it('should not mutate returned preferences', () => {
      const prefs1 = store.getPreferences();
      const prefs2 = store.getPreferences();

      expect(prefs1).not.toBe(prefs2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle search with empty query', () => {
      const results = store.searchBooks('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle case-insensitive search', () => {
      const results1 = store.searchBooks('pride');
      const results2 = store.searchBooks('PRIDE');

      expect(results1.length).toBe(results2.length);
    });

    it('should handle adding book with long title', () => {
      const longTitle = 'A'.repeat(500);
      const book = store.addBook({
        title: longTitle,
        author: 'Test',
        description: 'Test',
        coverEmoji: '📕',
        downloadProgress: 0,
        isDownloaded: false,
        isFavorite: false,
        lastReadPosition: 0,
        fileSize: 1.0,
        format: 'EPUB',
        publicationDate: '2025-01-01',
        totalPages: 200,
        currentPage: 0,
      });

      expect(book.title).toBe(longTitle);
    });

    it('should handle adding book with zero pages', () => {
      const book = store.addBook({
        title: 'Zero Page Book',
        author: 'Test',
        description: 'Test',
        coverEmoji: '📕',
        downloadProgress: 100,
        isDownloaded: true,
        isFavorite: false,
        lastReadPosition: 0,
        fileSize: 0.1,
        format: 'EPUB',
        publicationDate: '2025-01-01',
        totalPages: 0,
        currentPage: 0,
      });

      expect(book.totalPages).toBe(0);
    });

    it('should handle adding bookmark with empty note', () => {
      const books = store.getBooks();
      const bookmark = store.addBookmark(books[0].id, 100, '');

      expect(bookmark.note).toBe('');
    });

    it('should handle adding bookmark with long note', () => {
      const books = store.getBooks();
      const longNote = 'X'.repeat(10000);
      const bookmark = store.addBookmark(books[0].id, 100, longNote);

      expect(bookmark.note).toBe(longNote);
    });
  });
});
