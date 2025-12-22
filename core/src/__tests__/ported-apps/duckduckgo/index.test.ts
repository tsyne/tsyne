/**
 * Jest Tests for DuckDuckGo Store
 *
 * Tests for the DuckDuckGoStore model, including search history,
 * bookmarks, privacy tracking, and settings management.
 */

import { DuckDuckGoStore, SearchResult, Bookmark, TrackerBlock, PrivacyStats } from '../../../../../ported-apps/duckduckgo/index';

describe('DuckDuckGoStore', () => {
  let store: DuckDuckGoStore;

  beforeEach(() => {
    store = new DuckDuckGoStore();
  });

  describe('Search History', () => {
    it('should return all search history sorted by date (newest first)', () => {
      const searches = store.getSearchHistory();
      expect(searches.length).toBeGreaterThan(0);

      // Check sorting
      for (let i = 0; i < searches.length - 1; i++) {
        expect(searches[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          searches[i + 1].timestamp.getTime()
        );
      }
    });

    it('should add a new search', () => {
      const initialCount = store.getSearchHistory().length;
      const result = store.search('privacy browser');

      expect(result).toHaveProperty('id');
      expect(result.query).toBe('privacy browser');
      expect(store.getSearchHistory()).toHaveLength(initialCount + 1);
    });

    it('should delete a search from history', () => {
      const searches = store.getSearchHistory();
      const firstSearch = searches[0];
      const initialCount = store.getSearchHistory().length;

      const deleted = store.deleteSearchHistory(firstSearch.id);

      expect(deleted).toBe(true);
      expect(store.getSearchHistory()).toHaveLength(initialCount - 1);
      expect(store.getSearchHistory().find((s) => s.id === firstSearch.id)).toBeUndefined();
    });

    it('should delete non-existent search', () => {
      const initialCount = store.getSearchHistory().length;
      const deleted = store.deleteSearchHistory('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getSearchHistory()).toHaveLength(initialCount);
    });

    it('should filter search history by query', () => {
      const results = store.filterSearchHistory('privacy');
      expect(results.every((s) => s.query.toLowerCase().includes('privacy'))).toBe(true);
    });

    it('should get recent searches with limit', () => {
      const recent = store.getRecentSearches(2);
      expect(recent.length).toBeLessThanOrEqual(2);

      // Should be sorted newest first
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          recent[i + 1].timestamp.getTime()
        );
      }
    });

    it('should get most searched queries', () => {
      store.search('typescript');
      store.search('typescript');
      store.search('javascript');

      const top = store.getMostSearchedQueries(5);
      expect(top.length).toBeGreaterThan(0);
      // typescript should be in top searches
      expect(top.some((q) => q.includes('typescript'))).toBe(true);
    });

    it('should clear all search history', () => {
      store.clearAllHistory();
      expect(store.getSearchHistory()).toHaveLength(0);
    });

    it('should calculate average searches per day', () => {
      const average = store.getAverageSearchesPerDay();
      expect(typeof average).toBe('number');
      expect(average).toBeGreaterThan(0);
    });

    it('should get total searches', () => {
      const total = store.getTotalSearches();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(0);
    });

    it('should get today searches', () => {
      const today = store.getTodaySearches();
      expect(typeof today).toBe('number');
      expect(today).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Bookmarks', () => {
    it('should return all bookmarks', () => {
      const bookmarks = store.getBookmarks();
      expect(bookmarks.length).toBeGreaterThan(0);
    });

    it('should add a new bookmark', () => {
      const initialCount = store.getBookmarks().length;
      const bookmark = store.addBookmark('MDN Web Docs', 'https://developer.mozilla.org', 'Development');

      expect(bookmark).toHaveProperty('id');
      expect(bookmark.title).toBe('MDN Web Docs');
      expect(bookmark.category).toBe('Development');
      expect(store.getBookmarks()).toHaveLength(initialCount + 1);
    });

    it('should delete a bookmark', () => {
      const bookmarks = store.getBookmarks();
      const firstBookmark = bookmarks[0];
      const initialCount = store.getBookmarks().length;

      const deleted = store.deleteBookmark(firstBookmark.id);

      expect(deleted).toBe(true);
      expect(store.getBookmarks()).toHaveLength(initialCount - 1);
      expect(store.getBookmarks().find((b) => b.id === firstBookmark.id)).toBeUndefined();
    });

    it('should delete non-existent bookmark', () => {
      const initialCount = store.getBookmarks().length;
      const deleted = store.deleteBookmark('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getBookmarks()).toHaveLength(initialCount);
    });

    it('should update a bookmark', () => {
      const bookmarks = store.getBookmarks();
      const firstBookmark = bookmarks[0];

      const updated = store.updateBookmark(firstBookmark.id, 'New Title', 'Updated Category');

      expect(updated).toBe(true);
      const modified = store.getBookmarks().find((b) => b.id === firstBookmark.id);
      expect(modified?.title).toBe('New Title');
      expect(modified?.category).toBe('Updated Category');
    });

    it('should get bookmarks by category', () => {
      const privacyBookmarks = store.getBookmarksByCategory('Privacy');
      expect(privacyBookmarks.every((b) => b.category === 'Privacy')).toBe(true);
    });

    it('should get all categories', () => {
      const categories = store.getCategories();
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toEqual([...categories].sort());
    });

    it('should get favorites', () => {
      const favorites = store.getFavorites();
      expect(favorites.every((b) => b.category === 'Favorites')).toBe(true);
    });

    it('should add private bookmark', () => {
      const bookmark = store.addBookmark('Secret Site', 'https://secret.local', 'Privacy', true);
      expect(bookmark.isPrivate).toBe(true);
    });
  });

  describe('Privacy & Trackers', () => {
    it('should return tracker blocks', () => {
      const blocks = store.getTrackerBlocks();
      expect(Array.isArray(blocks)).toBe(true);
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should add tracker block', () => {
      const initialCount = store.getTrackerBlocks().length;
      store.addTrackerBlock('example.com', 15, true);

      expect(store.getTrackerBlocks()).toHaveLength(initialCount + 1);
    });

    it('should get privacy stats', () => {
      const stats = store.getPrivacyStats();

      expect(stats).toHaveProperty('totalTrackersBlocked');
      expect(stats).toHaveProperty('totalSitesVisited');
      expect(stats).toHaveProperty('httpsUpgrades');
      expect(stats).toHaveProperty('cookiePops');
      expect(stats).toHaveProperty('averageTrackersPerSite');

      expect(typeof stats.totalTrackersBlocked).toBe('number');
      expect(stats.totalTrackersBlocked).toBeGreaterThan(0);
    });

    it('should get top blocked domains', () => {
      const top = store.getTopBlockedDomains(3);
      expect(top.length).toBeLessThanOrEqual(3);

      // Should be sorted by trackers blocked (descending)
      for (let i = 0; i < top.length - 1; i++) {
        expect(top[i].trackersBlocked).toBeGreaterThanOrEqual(top[i + 1].trackersBlocked);
      }
    });

    it('should calculate privacy score', () => {
      const score = store.getPrivacyScore();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Settings', () => {
    it('should return current settings', () => {
      const settings = store.getSettings();

      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('autoHttpsUpgrade');
      expect(settings).toHaveProperty('blockTrackers');
      expect(settings).toHaveProperty('blockAds');
      expect(settings).toHaveProperty('safeSearch');
    });

    it('should update a setting', () => {
      const initialTheme = store.getSettings().theme;
      store.updateSetting('theme', initialTheme === 'light' ? 'dark' : 'light');

      expect(store.getSettings().theme).not.toBe(initialTheme);
    });

    it('should toggle theme', () => {
      const initialTheme = store.getSettings().theme;
      store.toggleTheme();

      expect(store.getSettings().theme).not.toBe(initialTheme);
    });

    it('should toggle tracker blocking', () => {
      const initialValue = store.getSettings().blockTrackers;
      store.toggleTracker();

      expect(store.getSettings().blockTrackers).toBe(!initialValue);
    });

    it('should toggle ad blocking', () => {
      const initialValue = store.getSettings().blockAds;
      store.toggleAds();

      expect(store.getSettings().blockAds).toBe(!initialValue);
    });

    it('should update multiple settings', () => {
      store.updateSetting('safeSearch', true);
      store.updateSetting('autoHttpsUpgrade', false);
      store.updateSetting('resultsPerPage', 50);

      const settings = store.getSettings();
      expect(settings.safeSearch).toBe(true);
      expect(settings.autoHttpsUpgrade).toBe(false);
      expect(settings.resultsPerPage).toBe(50);
    });
  });

  describe('Bangs', () => {
    it('should return all bangs', () => {
      const bangs = store.getBangs();
      expect(bangs.length).toBeGreaterThan(0);
      expect(bangs[0]).toHaveProperty('name');
      expect(bangs[0]).toHaveProperty('symbol');
    });

    it('should search bangs by name', () => {
      const results = store.searchBangs('wikipedia');
      expect(results.every((b) => b.name.toLowerCase().includes('wikipedia'))).toBe(true);
    });

    it('should search bangs by symbol', () => {
      const results = store.searchBangs('!g');
      expect(results.some((b) => b.symbol.includes('!g'))).toBe(true);
    });

    it('should search bangs by description', () => {
      const results = store.searchBangs('github');
      expect(results.some((b) => b.description.toLowerCase().includes('github'))).toBe(true);
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on search added', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.search('test query');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on bookmark added', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addBookmark('Test', 'https://test.local', 'Test');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on tracker block added', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addTrackerBlock('example.com', 5);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on setting changed', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.toggleTheme();

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on history cleared', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.clearAllHistory();

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      store.search('test query');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned search history', () => {
      const history1 = store.getSearchHistory();
      const history2 = store.getSearchHistory();

      expect(history1).not.toBe(history2);
    });

    it('should not mutate returned bookmarks', () => {
      const bookmarks1 = store.getBookmarks();
      const bookmarks2 = store.getBookmarks();

      expect(bookmarks1).not.toBe(bookmarks2);
    });

    it('should not mutate returned tracker blocks', () => {
      const blocks1 = store.getTrackerBlocks();
      const blocks2 = store.getTrackerBlocks();

      expect(blocks1).not.toBe(blocks2);
    });

    it('should not mutate returned settings', () => {
      const settings1 = store.getSettings();
      const settings2 = store.getSettings();

      expect(settings1).not.toBe(settings2);
    });

    it('should generate unique search IDs', () => {
      const search1 = store.search('query1');
      const search2 = store.search('query2');

      expect(search1.id).not.toBe(search2.id);
    });

    it('should generate unique bookmark IDs', () => {
      const bookmark1 = store.addBookmark('Title1', 'https://url1.local', 'Cat1');
      const bookmark2 = store.addBookmark('Title2', 'https://url2.local', 'Cat2');

      expect(bookmark1.id).not.toBe(bookmark2.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const result = store.search('');
      expect(result.query).toBe('');
    });

    it('should handle search with special characters', () => {
      const result = store.search('!g @#$%');
      expect(result.query).toBe('!g @#$%');
    });

    it('should handle long search query', () => {
      const longQuery = 'a'.repeat(1000);
      const result = store.search(longQuery);
      expect(result.query).toBe(longQuery);
    });

    it('should handle empty bookmark title', () => {
      const bookmark = store.addBookmark('', 'https://url.local', 'Category');
      expect(bookmark.title).toBe('');
    });

    it('should handle filter with no results', () => {
      const results = store.filterSearchHistory('xyznonexistent12345');
      expect(results).toEqual([]);
    });

    it('should handle category search with no matches', () => {
      const results = store.getBookmarksByCategory('NonExistentCategory');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle privacy stats with no tracker blocks', () => {
      store.clearAllHistory();
      const stats = store.getPrivacyStats();

      expect(stats.totalTrackersBlocked).toBe(0);
      expect(stats.totalSitesVisited).toBe(0);
      expect(stats.averageTrackersPerSite).toBe(0);
    });

    it('should handle zero trackers on domain', () => {
      store.addTrackerBlock('notracker.com', 0);
      const top = store.getTopBlockedDomains(1);
      expect(Array.isArray(top)).toBe(true);
    });

    it('should limit top blocked domains correctly', () => {
      const top = store.getTopBlockedDomains(2);
      expect(top.length).toBeLessThanOrEqual(2);
    });

    it('should handle bang search with no results', () => {
      const results = store.searchBangs('xyznonexistent');
      expect(results).toEqual([]);
    });

    it('should calculate privacy score with no activity', () => {
      store.clearAllHistory();
      const score = store.getPrivacyScore();
      expect(score).toBe(0);
    });
  });
});
