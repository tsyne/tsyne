/**
 * TsyneTest for Wikipedia App
 *
 * Integration tests for the Wikipedia free encyclopedia app UI using TsyneTest framework.
 * Tests search, reading lists, history, and tab navigation.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildWikipediaApp } from './index';

describe('Wikipedia App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  it('should render app with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const title = await ctx.getById('app-title').getText();
    expect(title).toContain('Wikipedia');
  });

  it('should display language and stats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const langLabel = await ctx.getById('language-label').getText();
    expect(langLabel).toContain('Language');

    const statsLabel = await ctx.getById('stats-label').getText();
    expect(statsLabel).toContain('Articles Viewed');
  });

  it('should show search tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchTitle = await ctx.getById('search-title').getText();
    expect(searchTitle).toContain('Search Results');
  });

  it('should switch to explore tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-explore').click();
    const exploreTitle = await ctx.getById('explore-title').within(1000).getText();
    expect(exploreTitle).toContain('Featured Content');
  });

  it('should switch to saved tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-saved').click();
    const savedTitle = await ctx.getById('saved-title').within(1000).getText();
    expect(savedTitle).toContain('Saved Articles');
  });

  it('should switch to history tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-history').click();
    const historyTitle = await ctx.getById('history-title').within(1000).getText();
    expect(historyTitle).toContain('Reading History');
  });

  it('should navigate between all tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Search
    let title = await ctx.getById('search-title').getText();
    expect(title).toContain('Search Results');

    // Explore
    await ctx.getById('tab-explore').click();
    title = await ctx.getById('explore-title').within(500).getText();
    expect(title).toContain('Featured Content');

    // Saved
    await ctx.getById('tab-saved').click();
    title = await ctx.getById('saved-title').within(500).getText();
    expect(title).toContain('Saved Articles');

    // History
    await ctx.getById('tab-history').click();
    title = await ctx.getById('history-title').within(500).getText();
    expect(title).toContain('Reading History');

    // Back to Search
    await ctx.getById('tab-search').click();
    title = await ctx.getById('search-title').within(500).getText();
    expect(title).toContain('Search Results');
  });

  it('should have search input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchInput = await ctx.getById('search-input');
    expect(searchInput).toBeDefined();
  });

  it('should have accessibility IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const elements = ['app-title', 'language-label', 'stats-label', 'search-input', 'tab-search', 'tab-explore', 'tab-saved', 'tab-history'];
    for (const id of elements) {
      const element = await ctx.getById(id);
      expect(element).toBeDefined();
    }
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialLang = await ctx.getById('language-label').getText();
    await ctx.getById('tab-explore').click();
    await ctx.getById('tab-saved').click();
    await ctx.getById('tab-history').click();
    await ctx.getById('tab-search').click();

    const finalLang = await ctx.getById('language-label').within(500).getText();
    expect(finalLang).toBe(initialLang);
  });

  it('should capture screenshot of search view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/wikipedia-search.png');
    }
  });

  it('should capture screenshot of explore view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-explore').click();
    await ctx.getById('explore-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/wikipedia-explore.png');
    }
  });

  it('should capture screenshot of saved view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-saved').click();
    await ctx.getById('saved-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/wikipedia-saved.png');
    }
  });

  it('should capture screenshot of history view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-history').click();
    await ctx.getById('history-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/wikipedia-history.png');
    }
  });
});
