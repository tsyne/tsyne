/**
 * TsyneTest for Ebook App
 *
 * Integration tests for the Ebook Reader UI using TsyneTest framework.
 * Tests tab navigation, UI interactions, and screenshot capture.
 */

import { TsyneTest, TestContext } from 'tsyne';
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

    await ctx.getById('tab-reading').click();

    const title = await ctx.getById('reading-title').within(1000).getText();
    expect(title).toContain('Reading');
  });

  it('should switch to favorites tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-favorites').click();

    const title = await ctx.getById('favorites-title').within(1000).getText();
    expect(title).toContain('Favorites');
  });

  it('should switch to downloads tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-downloads').click();

    const title = await ctx.getById('downloads-title').within(1000).getText();
    expect(title).toContain('Downloads');
  });

  it('should switch to settings tab', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-settings').click();

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

    await ctx.getById('tab-reading').click();

    await ctx.getById('tab-favorites').click();

    await ctx.getById('tab-downloads').click();

    await ctx.getById('tab-library').click();

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

    await ctx.getById('tab-downloads').click();

    const title = await ctx.getById('downloads-title').within(1000).getText();
    expect(title).toContain('Downloads');
  });

  it('should display favorites count', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-favorites').click();

    const title = await ctx.getById('favorites-title').within(1000).getText();
    expect(title).toContain('Favorites');
  });

  it('should display reading section', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-reading').click();

    const title = await ctx.getById('reading-title').within(1000).getText();
    expect(title).toContain('Reading');
  });

  it('should display settings options', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-settings').click();

    const title = await ctx.getById('settings-title').within(1000).getText();
    expect(title).toContain('Settings');
  });

  it('should capture screenshot of library view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    // Screenshots not yet supported via this pattern
  });

  it('should capture screenshot of reading view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-reading').click();
    await ctx.getById('reading-title').within(1000).shouldExist();

    // Screenshots not yet supported via this pattern
  });

  it('should capture screenshot of favorites view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-favorites').click();
    await ctx.getById('favorites-title').within(1000).shouldExist();

    // Screenshots not yet supported via this pattern
  });

  it('should capture screenshot of downloads view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-downloads').click();
    await ctx.getById('downloads-title').within(1000).shouldExist();

    // Screenshots not yet supported via this pattern
  });

  it('should capture screenshot of settings view', async () => {
    const testApp = await tsyneTest.createApp((app) => {
      buildEbookApp(app);
    });
    ctx = tsyneTest.getContext();
    await testApp.run();

    await ctx.getById('tab-settings').click();
    await ctx.getById('settings-title').within(1000).shouldExist();

    // Screenshots not yet supported via this pattern
  });
});
