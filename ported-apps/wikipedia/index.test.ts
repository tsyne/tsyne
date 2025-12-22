/**
 * Jest Tests for Wikipedia Store
 *
 * Tests for the WikipediaStore model, including search, reading lists,
 * history, featured content, and language management.
 */

import { WikipediaStore, Article, ReadingListItem, ReadingHistory, FeaturedContent } from './index';

describe('WikipediaStore', () => {
  let store: WikipediaStore;

  beforeEach(() => {
    store = new WikipediaStore();
  });

  describe('Search', () => {
    it('should return search suggestions for a query', () => {
      const results = store.search('wikipedia');
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('title');
      expect(results[0]).toHaveProperty('pageId');
      expect(results[0]).toHaveProperty('views');
    });

    it('should search for articles', () => {
      const results = store.search('python');
      expect(results.every((r) => r.title.toLowerCase().includes('python'))).toBe(true);
    });

    it('should get search history', () => {
      const history = store.getSearchHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should view an article from search results', () => {
      const results = store.search('typescript');
      const article = store.viewArticle(results[0]);

      expect(article).toHaveProperty('id');
      expect(article.title).toBe(results[0].title);
      expect(store.getSearchHistory().find((a) => a.id === article.id)).toBeDefined();
    });

    it('should clear search history', () => {
      store.clearSearchHistory();
      expect(store.getSearchHistory()).toHaveLength(0);
    });

    it('should delete article from search history', () => {
      const history = store.getSearchHistory();
      const initialCount = history.length;
      const firstArticle = history[0];

      const deleted = store.deleteFromSearchHistory(firstArticle.id);

      expect(deleted).toBe(true);
      expect(store.getSearchHistory()).toHaveLength(initialCount - 1);
      expect(store.getSearchHistory().find((a) => a.id === firstArticle.id)).toBeUndefined();
    });

    it('should handle delete of non-existent article', () => {
      const initialCount = store.getSearchHistory().length;
      const deleted = store.deleteFromSearchHistory('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getSearchHistory()).toHaveLength(initialCount);
    });

    it('should get top read articles', () => {
      const topRead = store.getTopReadArticles(5);
      expect(topRead.length).toBeLessThanOrEqual(5);

      // Should be sorted by views (descending)
      for (let i = 0; i < topRead.length - 1; i++) {
        expect(topRead[i].views).toBeGreaterThanOrEqual(topRead[i + 1].views);
      }
    });
  });

  describe('Reading List (Saved Articles)', () => {
    it('should get reading list', () => {
      const list = store.getReadingList();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('should save an article', () => {
      const initialCount = store.getReadingList().length;
      const results = store.search('rust');
      const article = store.viewArticle(results[0]);

      const saved = store.saveArticle(article);

      expect(saved).toHaveProperty('id');
      expect(saved.articleTitle).toBe(article.title);
      expect(store.getReadingList()).toHaveLength(initialCount + 1);
    });

    it('should remove saved article', () => {
      const list = store.getReadingList();
      const initialCount = list.length;
      const firstItem = list[0];

      const removed = store.removeSavedArticle(firstItem.id);

      expect(removed).toBe(true);
      expect(store.getReadingList()).toHaveLength(initialCount - 1);
      expect(store.getReadingList().find((item) => item.id === firstItem.id)).toBeUndefined();
    });

    it('should handle remove of non-existent saved article', () => {
      const initialCount = store.getReadingList().length;
      const removed = store.removeSavedArticle('nonexistent-id');

      expect(removed).toBe(false);
      expect(store.getReadingList()).toHaveLength(initialCount);
    });

    it('should check if article is saved', () => {
      const list = store.getReadingList();
      const savedArticleId = list[0].articleId;

      expect(store.isSavedArticle(savedArticleId)).toBe(true);
      expect(store.isSavedArticle(999999)).toBe(false);
    });

    it('should get reading list by language', () => {
      const englishList = store.getReadingListByLanguage('en');
      expect(englishList.every((item) => item.language === 'en')).toBe(true);
    });
  });

  describe('Reading History', () => {
    it('should get reading history', () => {
      const history = store.getReadingHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should add to reading history when viewing article', () => {
      const initialCount = store.getReadingHistory().length;
      const results = store.search('java');
      store.viewArticle(results[0]);

      expect(store.getReadingHistory()).toHaveLength(initialCount + 1);
    });

    it('should clear reading history', () => {
      store.clearReadingHistory();
      expect(store.getReadingHistory()).toHaveLength(0);
    });

    it('should delete from reading history', () => {
      const history = store.getReadingHistory();
      const initialCount = history.length;
      const firstItem = history[0];

      const deleted = store.deleteFromReadingHistory(firstItem.id);

      expect(deleted).toBe(true);
      expect(store.getReadingHistory()).toHaveLength(initialCount - 1);
      expect(store.getReadingHistory().find((h) => h.id === firstItem.id)).toBeUndefined();
    });

    it('should handle delete of non-existent history item', () => {
      const initialCount = store.getReadingHistory().length;
      const deleted = store.deleteFromReadingHistory('nonexistent-id');

      expect(deleted).toBe(false);
      expect(store.getReadingHistory()).toHaveLength(initialCount);
    });

    it('should get reading statistics', () => {
      const stats = store.getReadingStats();

      expect(stats).toHaveProperty('totalArticles');
      expect(stats).toHaveProperty('totalTimeSpent');
      expect(stats).toHaveProperty('averageTimePerArticle');

      expect(typeof stats.totalArticles).toBe('number');
      expect(stats.totalArticles).toBeGreaterThanOrEqual(0);
      expect(typeof stats.totalTimeSpent).toBe('number');
    });

    it('should calculate days active', () => {
      const daysActive = store.getDaysActive();
      expect(typeof daysActive).toBe('number');
      expect(daysActive).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Featured Content', () => {
    it('should get featured content', () => {
      const content = store.getFeaturedContent();
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should get featured content by type', () => {
      const featured = store.getFeaturedContentByType('featured-article');
      expect(featured.every((c) => c.type === 'featured-article')).toBe(true);
    });

    it('should get featured articles', () => {
      const featured = store.getFeaturedContentByType('featured-article');
      expect(Array.isArray(featured)).toBe(true);
    });

    it('should get picture of the day', () => {
      const potd = store.getFeaturedContentByType('picture-of-the-day');
      expect(Array.isArray(potd)).toBe(true);
    });

    it('should get in the news', () => {
      const news = store.getFeaturedContentByType('in-the-news');
      expect(Array.isArray(news)).toBe(true);
    });

    it('should get on this day', () => {
      const otd = store.getFeaturedContentByType('on-this-day');
      expect(Array.isArray(otd)).toBe(true);
    });
  });

  describe('Languages', () => {
    it('should get list of languages', () => {
      const languages = store.getLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages[0]).toHaveProperty('code');
      expect(languages[0]).toHaveProperty('name');
      expect(languages[0]).toHaveProperty('articles');
    });

    it('should get current language', () => {
      const current = store.getCurrentLanguage();
      expect(current).toHaveProperty('code');
      expect(current.code).toBe('en');
    });

    it('should set current language', () => {
      const changed = store.setCurrentLanguage('es');
      expect(changed).toBe(true);
      expect(store.getCurrentLanguage().code).toBe('es');
    });

    it('should handle invalid language change', () => {
      const changed = store.setCurrentLanguage('xyz');
      expect(changed).toBe(false);
      expect(store.getCurrentLanguage().code).toBe('es');
    });

    it('should get article count for current language', () => {
      const count = store.getArticleCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should get article count for specific language', () => {
      const count = store.getArticleCount('zh');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should get total articles viewed', () => {
      const total = store.getTotalArticlesViewed();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThanOrEqual(0);
    });

    it('should calculate contribution score', () => {
      const score = store.getContributionScore();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on search view', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      const results = store.search('test');
      store.viewArticle(results[0]);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on save article', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      const results = store.search('save test');
      const article = store.viewArticle(results[0]);
      store.saveArticle(article);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on clear history', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.clearReadingHistory();

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on language change', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.setCurrentLanguage('de');

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      const results = store.search('test');
      store.viewArticle(results[0]);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned search history', () => {
      const history1 = store.getSearchHistory();
      const history2 = store.getSearchHistory();

      expect(history1).not.toBe(history2);
    });

    it('should not mutate returned reading list', () => {
      const list1 = store.getReadingList();
      const list2 = store.getReadingList();

      expect(list1).not.toBe(list2);
    });

    it('should not mutate returned reading history', () => {
      const history1 = store.getReadingHistory();
      const history2 = store.getReadingHistory();

      expect(history1).not.toBe(history2);
    });

    it('should not mutate returned featured content', () => {
      const content1 = store.getFeaturedContent();
      const content2 = store.getFeaturedContent();

      expect(content1).not.toBe(content2);
    });

    it('should not mutate returned languages', () => {
      const langs1 = store.getLanguages();
      const langs2 = store.getLanguages();

      expect(langs1).not.toBe(langs2);
    });

    it('should not mutate current language', () => {
      const lang1 = store.getCurrentLanguage();
      const lang2 = store.getCurrentLanguage();

      expect(lang1).not.toBe(lang2);
    });

    it('should generate unique article IDs', () => {
      const results = store.search('unique1');
      const article1 = store.viewArticle(results[0]);

      const results2 = store.search('unique2');
      const article2 = store.viewArticle(results2[0]);

      expect(article1.id).not.toBe(article2.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search query', () => {
      const results = store.search('');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle long search query', () => {
      const longQuery = 'a'.repeat(1000);
      const results = store.search(longQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle special characters in search', () => {
      const results = store.search('!@#$%^&*');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle reading stats with no history', () => {
      store.clearReadingHistory();
      const stats = store.getReadingStats();

      expect(stats.totalArticles).toBe(0);
      expect(stats.totalTimeSpent).toBe(0);
      expect(stats.averageTimePerArticle).toBe(0);
    });

    it('should handle getting article count for non-existent language', () => {
      const count = store.getArticleCount('xyz');
      expect(count).toBe(0);
    });

    it('should calculate days active with single article', () => {
      store.clearReadingHistory();
      const results = store.search('single');
      store.viewArticle(results[0]);

      const daysActive = store.getDaysActive();
      expect(daysActive).toBeGreaterThanOrEqual(1);
    });

    it('should handle contribution score with no activity', () => {
      store.clearReadingHistory();
      const score = store.getContributionScore();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should limit top read articles correctly', () => {
      const top3 = store.getTopReadArticles(3);
      expect(top3.length).toBeLessThanOrEqual(3);
    });

    it('should return empty for deleted non-existent saved article', () => {
      const deleted = store.removeSavedArticle('fake-id-12345');
      expect(deleted).toBe(false);
    });
  });
});
