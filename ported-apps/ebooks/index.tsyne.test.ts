/**
 * TsyneTest for Ebook App
 *
 * Integration tests for the Ebook Reader UI using TsyneTest framework.
 * Tests tab navigation, UI interactions, and screenshot capture.
 */

import { TsyneTest, TestContext } from '../../src/index-test';
import { buildEbookApp } from './index';

describe('Ebook App UI Tests', () => {
  let tsyneTest: TsyneTest;
  let ctx: TestContext;

  beforeEach(async () => {
    tsyneTest = new TsyneTest({ headed: false });
  });

  it('should render app with title', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const title = await ctx.getById('user-label').getText();
    expect(title).toBeDefined();
    expect(title).toContain('Ebook Reader');
  });

  it('should display stats label', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const stats = await ctx.getById('stats-label').getText();
    expect(stats).toBeDefined();
    expect(stats).toContain('Total');
  });

  it('should show library tab by default', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const title = await ctx.getById('library-title').getText();
    expect(title).toContain('Library');
  });

  it('should switch to reading tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const readingBtn = await ctx.getByPattern(/Reading/);
    await readingBtn.click();

    const title = await ctx.getById('reading-title').within(1000).getText();
    expect(title).toContain('Reading');
  });

  it('should switch to favorites tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const favBtn = await ctx.getByPattern(/Favorites/);
    await favBtn.click();

    const title = await ctx.getById('favorites-title').within(1000).getText();
    expect(title).toContain('Favorites');
  });

  it('should switch to downloads tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const dlBtn = await ctx.getByPattern(/Downloads/);
    await dlBtn.click();

    const title = await ctx.getById('downloads-title').within(1000).getText();
    expect(title).toContain('Downloads');
  });

  it('should switch to settings tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();

    const title = await ctx.getById('settings-title').within(1000).getText();
    expect(title).toContain('Settings');
  });

  it('should maintain state when switching tabs', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const initialStats = await ctx.getById('stats-label').getText();

    const readingBtn = await ctx.getByPattern(/Reading/);
    await readingBtn.click();

    const favBtn = await ctx.getByPattern(/Favorites/);
    await favBtn.click();

    const dlBtn = await ctx.getByPattern(/Downloads/);
    await dlBtn.click();

    const libraryBtn = await ctx.getByPattern(/Library/);
    await libraryBtn.click();

    const finalStats = await ctx.getById('stats-label').within(500).getText();
    expect(finalStats).toBe(initialStats);
  });

  it('should display books in library', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const booksList = await ctx.getById('books-list');
    expect(booksList).toBeDefined();
  });

  it('should display downloaded books count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const dlBtn = await ctx.getByPattern(/Downloads/);
    await dlBtn.click();

    const title = await ctx.getById('downloads-title').within(1000).getText();
    expect(title).toContain('Downloads');
  });

  it('should display favorites count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const favBtn = await ctx.getByPattern(/Favorites/);
    await favBtn.click();

    const title = await ctx.getById('favorites-title').within(1000).getText();
    expect(title).toContain('Favorites');
  });

  it('should display reading section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const readingBtn = await ctx.getByPattern(/Reading/);
    await readingBtn.click();

    const title = await ctx.getById('reading-title').within(1000).getText();
    expect(title).toContain('Reading');
  });

  it('should display settings options', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();

    const title = await ctx.getById('settings-title').within(1000).getText();
    expect(title).toContain('Settings');
  });

  it('should capture screenshot of library view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/ebooks-library.png');
    }
  });

  it('should capture screenshot of reading view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const readingBtn = await ctx.getByPattern(/Reading/);
    await readingBtn.click();
    await ctx.getById('reading-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/ebooks-reading.png');
    }
  });

  it('should capture screenshot of favorites view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const favBtn = await ctx.getByPattern(/Favorites/);
    await favBtn.click();
    await ctx.getById('favorites-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/ebooks-favorites.png');
    }
  });

  it('should capture screenshot of downloads view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const dlBtn = await ctx.getByPattern(/Downloads/);
    await dlBtn.click();
    await ctx.getById('downloads-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/ebooks-downloads.png');
    }
  });

  it('should capture screenshot of settings view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    const settingsBtn = await ctx.getByPattern(/Settings/);
    await settingsBtn.click();
    await ctx.getById('settings-title').within(1000).shouldExist();

    const win = testApp.getWindow();
    if (win && process.env.TAKE_SCREENSHOTS) {
      await win.screenshot('/tmp/ebooks-settings.png');
    }
  });
});
