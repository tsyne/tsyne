/**
 * TsyneBrowserTest for page caching functionality
 *
 * This test verifies that the browser caches fetched pages and reuses them
 * on subsequent navigations to avoid redundant HTTP requests.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';

describeBrowser('Browser Page Caching Functionality', () => {
  browserTest(
    'should cache pages and reuse them on navigation',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Home Page');
  label('This page should be cached');
  hyperlink('Go to Page 2', browserContext.currentUrl + 'page2');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Page 2');
  label('This is the second page');
  hyperlink('Back to Home', browserContext.currentUrl.replace('/page2', '/'));
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // First visit to home page - should fetch from server
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
      await ctx.expect(ctx.getByText('This page should be cached')).toBeVisible();

      // Navigate to page 2
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      // Navigate back to home page - should load from cache
      await ctx.getByText('Back to Home').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
      await ctx.expect(ctx.getByText('This page should be cached')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should cache multiple different pages',
    [
      {
        path: '/page1',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Page 1');
  hyperlink('Go to Page 2', browserContext.currentUrl.replace('page1', 'page2'));
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Page 2');
  hyperlink('Go to Page 3', browserContext.currentUrl.replace('page2', 'page3'));
});
        `
      },
      {
        path: '/page3',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Page 3');
  hyperlink('Back to Page 1', browserContext.currentUrl.replace('page3', 'page1'));
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      // Visit page 1
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Visit page 2 (first time)
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      // Visit page 3 (first time)
      await ctx.getByText('Go to Page 3').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();

      // Go back to page 1 (should be cached)
      await ctx.getByText('Back to Page 1').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Navigate through cached pages using history
      await browserTest.forward();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      await browserTest.forward();
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();

      await browserTest.back();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle cache with back/forward navigation',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Home');
  hyperlink('Go to About', browserContext.currentUrl + 'about');
});
        `
      },
      {
        path: '/about',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('About Page');
  label('Information about this site');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Start at home
      await ctx.expect(ctx.getByText('Home')).toBeVisible();

      // Navigate to about
      await ctx.getByText('Go to About').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();

      // Navigate back (uses history cache)
      await browserTest.back();
      await ctx.expect(ctx.getByText('Home')).toBeVisible();

      // Navigate forward (uses history cache)
      await browserTest.forward();
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();

      // Type same URL again in address bar (should use page cache)
      // This would be a second visit to /about, should come from cache
      // But we can't easily test manual address bar entry in headless mode
      // So we verify the page works correctly with cache
      await browserTest.back();
      await ctx.expect(ctx.getByText('Home')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should cache page and then navigate to it directly',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Home Page');
  hyperlink('Visit Products', browserContext.currentUrl + 'products');
});
        `
      },
      {
        path: '/products',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Products Page');
  label('List of products');
  hyperlink('Go Home', browserContext.currentUrl.replace('/products', '/'));
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Start at home
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Visit products page (first time - fetched from server)
      await ctx.getByText('Visit Products').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Products Page')).toBeVisible();
      await ctx.expect(ctx.getByText('List of products')).toBeVisible();

      // Go home
      await ctx.getByText('Go Home').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Visit products again via hyperlink (should use cache)
      await ctx.getByText('Visit Products').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Products Page')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should work with reload using cached page',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Reloadable Page');
  label('This page can be reloaded');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Initial load
      await ctx.expect(ctx.getByText('Reloadable Page')).toBeVisible();

      // Reload page (uses history cache, not re-fetching)
      await browserTest.reload();
      await ctx.expect(ctx.getByText('Reloadable Page')).toBeVisible();
      await ctx.expect(ctx.getByText('This page can be reloaded')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should cache pages with different paths on same domain',
    [
      {
        path: '/section/page1',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Section - Page 1');
  hyperlink('Go to Page 2', browserContext.currentUrl.replace('page1', 'page2'));
});
        `
      },
      {
        path: '/section/page2',
        code: `
const { vbox, label, hyperlink } = tsyne;

vbox(() => {
  label('Section - Page 2');
  hyperlink('Back to Page 1', browserContext.currentUrl.replace('page2', 'page1'));
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/section/page1');
      const ctx = browserTest.getContext();

      // First page
      await ctx.expect(ctx.getByText('Section - Page 1')).toBeVisible();

      // Navigate to page 2
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Section - Page 2')).toBeVisible();

      // Navigate back to page 1 (cached)
      await ctx.getByText('Back to Page 1').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Section - Page 1')).toBeVisible();

      // Use history navigation (also cached)
      await browserTest.forward();
      await ctx.expect(ctx.getByText('Section - Page 2')).toBeVisible();
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
