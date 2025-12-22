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

    const title = await ctx.getByID('app-title').getText();
    expect(title).toContain('Wikipedia');
  });

  it('should display language and stats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const langLabel = await ctx.getByID('language-label').getText();
    expect(langLabel).toContain('Language');

    const statsLabel = await ctx.getByID('stats-label').getText();
    expect(statsLabel).toContain('Articles Viewed');
  });

  it('should show search tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchTitle = await ctx.getByID('search-title').getText();
    expect(searchTitle).toContain('Search Results');
  });

  it('should switch to explore tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('tab-explore').click();
    const exploreTitle = await ctx.getByID('explore-title').within(1000).getText();
    expect(exploreTitle).toContain('Featured Content');
  });

  it('should switch to saved tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('tab-saved').click();
    const savedTitle = await ctx.getByID('saved-title').within(1000).getText();
    expect(savedTitle).toContain('Saved Articles');
  });

  it('should switch to history tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getByID('tab-history').click();
    const historyTitle = await ctx.getByID('history-title').within(1000).getText();
    expect(historyTitle).toContain('Reading History');
  });

  it('should navigate between all tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Search
    let title = await ctx.getByID('search-title').getText();
    expect(title).toContain('Search Results');

    // Explore
    await ctx.getByID('tab-explore').click();
    title = await ctx.getByID('explore-title').within(500).getText();
    expect(title).toContain('Featured Content');

    // Saved
    await ctx.getByID('tab-saved').click();
    title = await ctx.getByID('saved-title').within(500).getText();
    expect(title).toContain('Saved Articles');

    // History
    await ctx.getByID('tab-history').click();
    title = await ctx.getByID('history-title').within(500).getText();
    expect(title).toContain('Reading History');

    // Back to Search
    await ctx.getByID('tab-search').click();
    title = await ctx.getByID('search-title').within(500).getText();
    expect(title).toContain('Search Results');
  });

  it('should have search input', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchInput = await ctx.getByID('search-input');
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
      const element = await ctx.getByID(id);
      expect(element).toBeDefined();
    }
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildWikipediaApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialLang = await ctx.getByID('language-label').getText();
    await ctx.getByID('tab-explore').click();
    await ctx.getByID('tab-saved').click();
    await ctx.getByID('tab-history').click();
    await ctx.getByID('tab-search').click();

    const finalLang = await ctx.getByID('language-label').within(500).getText();
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

    await ctx.getByID('tab-explore').click();
    await ctx.getByID('explore-title').within(1000).shouldExist();

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

    await ctx.getByID('tab-saved').click();
    await ctx.getByID('saved-title').within(1000).shouldExist();

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

    await ctx.getByID('tab-history').click();
    await ctx.getByID('history-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/wikipedia-history.png');
    }
  });
});
