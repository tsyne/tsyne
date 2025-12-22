/**
 * TsyneTest for DuckDuckGo App
 *
 * Integration tests for the DuckDuckGo privacy browser UI using TsyneTest framework.
 * Tests user interactions, search functionality, and tab navigation.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildDuckDuckGoApp } from './index';

describe('DuckDuckGo Privacy Browser UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  afterEach(async () => {
    // Cleanup
  });

  it('should render the app with title and tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Check app title
    const title = await ctx.getById('app-title').getText();
    expect(title).toContain('DuckDuckGo');

    // Check search input
    const searchInput = await ctx.getById('search-input');
    expect(searchInput).toBeDefined();
  });

  it('should display privacy stats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const privacyLabel = await ctx.getById('privacy-label').getText();
    expect(privacyLabel).toMatch(/Privacy Score|Trackers/);
  });

  it('should display search stats', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const statsLabel = await ctx.getById('stats-label').getText();
    expect(statsLabel).toMatch(/Searches|Daily/);
  });

  it('should show search tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchTitle = await ctx.getById('search-title').getText();
    expect(searchTitle).toBe('📋 Search History');
  });

  it('should switch to privacy tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click privacy tab
    await ctx.getById('tab-privacy').click();

    // Privacy title should be visible (use within to wait)
    const privacyTitle = await ctx.getById('privacy-title').within(1000).getText();
    expect(privacyTitle).toBe('🛡️ Privacy Dashboard');
  });

  it('should switch to bookmarks tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click bookmarks tab
    await ctx.getById('tab-bookmarks').click();

    // Bookmarks title should be visible
    const bookmarksTitle = await ctx.getById('bookmarks-title').within(1000).getText();
    expect(bookmarksTitle).toBe('🔖 Bookmarks');
  });

  it('should switch to settings tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Click settings tab
    await ctx.getById('tab-settings').click();

    // Settings title should be visible
    const settingsTitle = await ctx.getById('settings-title').within(1000).getText();
    expect(settingsTitle).toBe('⚙️ Settings');
  });

  it('should navigate between all tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Start in search
    let title = await ctx.getById('search-title').getText();
    expect(title).toBe('📋 Search History');

    // Go to privacy
    await ctx.getById('tab-privacy').click();
    title = await ctx.getById('privacy-title').within(500).getText();
    expect(title).toBe('🛡️ Privacy Dashboard');

    // Go to bookmarks
    await ctx.getById('tab-bookmarks').click();
    title = await ctx.getById('bookmarks-title').within(500).getText();
    expect(title).toBe('🔖 Bookmarks');

    // Go to settings
    await ctx.getById('tab-settings').click();
    title = await ctx.getById('settings-title').within(500).getText();
    expect(title).toBe('⚙️ Settings');

    // Back to search
    await ctx.getById('tab-search').click();
    title = await ctx.getById('search-title').within(500).getText();
    expect(title).toBe('📋 Search History');
  });

  it('should display search history list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Should have search title visible
    const searchTitle = await ctx.getById('search-title').within(500).getText();
    expect(searchTitle).toBeDefined();
  });

  it('should display privacy dashboard', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to privacy tab
    await ctx.getById('tab-privacy').click();

    // Should have privacy title
    const privacyTitle = await ctx.getById('privacy-title').within(500).getText();
    expect(privacyTitle).toBe('🛡️ Privacy Dashboard');
  });

  it('should display bookmarks list', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to bookmarks tab
    await ctx.getById('tab-bookmarks').click();

    // Should have bookmarks title
    const bookmarksTitle = await ctx.getById('bookmarks-title').within(500).getText();
    expect(bookmarksTitle).toBe('🔖 Bookmarks');
  });

  it('should display settings panel', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Go to settings
    await ctx.getById('tab-settings').click();

    // Should have settings title
    const settingsTitle = await ctx.getById('settings-title').within(500).getText();
    expect(settingsTitle).toBe('⚙️ Settings');
  });

  it('should have search input field', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchInput = await ctx.getById('search-input');
    expect(searchInput).toBeDefined();
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Get initial privacy label
    const initialPrivacy = await ctx.getById('privacy-label').getText();

    // Switch tabs
    await ctx.getById('tab-privacy').click();
    await ctx.getById('tab-bookmarks').click();
    await ctx.getById('tab-settings').click();

    // Back to search
    await ctx.getById('tab-search').click();

    // Privacy label should be same
    const finalPrivacy = await ctx.getById('privacy-label').within(500).getText();
    expect(finalPrivacy).toBe(initialPrivacy);
  });

  it('should have proper accessibility with IDs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Key elements should have IDs
    const elements = [
      'app-title',
      'privacy-label',
      'stats-label',
      'search-input',
      'tab-search',
      'tab-privacy',
      'tab-bookmarks',
      'tab-settings',
      'search-title',
    ];

    for (const id of elements) {
      const element = await ctx.getById(id);
      expect(element).toBeDefined();
    }
  });

  it('should have tab navigation buttons', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const searchTab = await ctx.getById('tab-search');
    const privacyTab = await ctx.getById('tab-privacy');
    const bookmarksTab = await ctx.getById('tab-bookmarks');
    const settingsTab = await ctx.getById('tab-settings');

    expect(searchTab).toBeDefined();
    expect(privacyTab).toBeDefined();
    expect(bookmarksTab).toBeDefined();
    expect(settingsTab).toBeDefined();
  });

  it('should display initial privacy score', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    const privacyLabel = await ctx.getById('privacy-label').getText();
    expect(privacyLabel).toMatch(/\d+%/); // Should contain a percentage
  });

  it('should capture screenshot of search view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/duckduckgo-search.png');
    }
  });

  it('should capture screenshot of privacy view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to privacy
    await ctx.getById('tab-privacy').click();
    await ctx.getById('privacy-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/duckduckgo-privacy.png');
    }
  });

  it('should capture screenshot of bookmarks view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to bookmarks
    await ctx.getById('tab-bookmarks').click();
    await ctx.getById('bookmarks-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/duckduckgo-bookmarks.png');
    }
  });

  it('should capture screenshot of settings view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildDuckDuckGoApp(app);
    });

    ctx = tsyneTest.getContext();
    await testApp.run();

    // Switch to settings
    await ctx.getById('tab-settings').click();
    await ctx.getById('settings-title').within(1000).shouldExist();

    // Take screenshot
    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/duckduckgo-settings.png');
    }
  });
});
