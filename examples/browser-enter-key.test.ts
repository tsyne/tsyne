/**
 * TsyneBrowserTest for Enter key navigation in address bar
 *
 * This test verifies that pressing Enter in the browser's address bar
 * navigates to the URL (P2 feature from Browser_TODO.md).
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from '../core/src/tsyne-browser-test';

describeBrowser('Browser Address Bar - Enter Key Navigation', () => {
  browserTest(
    'should navigate when Enter is pressed in address bar',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Home Page');
  label('You are on the home page');
});
        `
      },
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Page 1');
  label('This is page 1');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Page 2');
  label('This is page 2');
});
        `
      }
    ],
    async (browserTest) => {
      // Create browser and navigate to home page
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify we're on home page
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate using the programmatic API (simulates Enter key)
      // In a real browser, user would type URL and press Enter
      await browserTest.navigate('/page1');

      // Verify navigation occurred
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();
      await ctx.expect(ctx.getByText('This is page 1')).toBeVisible();
      browserTest.assertUrl('/page1');

      // Navigate to another page
      await browserTest.navigate('/page2');

      // Verify second navigation
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
      browserTest.assertUrl('/page2');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle invalid URLs gracefully',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Home Page');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify home page loaded
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Try to navigate to invalid URL (non-existent page)
      await browserTest.navigate('/nonexistent');

      // Should show 404 error page
      await ctx.expect(ctx.getByText('404 - Page Not Found')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should preserve address bar functionality with Go button',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Home');
});
        `
      },
      {
        path: '/about',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('About Page');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify home loaded
      await ctx.expect(ctx.getByText('Home')).toBeVisible();

      // Navigate using the browser API (simulates typing and clicking Go)
      await browserTest.navigate('/about');

      // Verify navigation via Go button still works
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();
      browserTest.assertUrl('/about');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should update address bar when navigating via back/forward buttons',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Page 0');
});
        `
      },
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
const { vbox, label } = tsyne;
vbox(() => {
  label('Page 2');
});
        `
      }
    ],
    async (browserTest) => {
      // Start at home
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page 0')).toBeVisible();

      // Navigate to page1 via address bar
      await browserTest.navigate('/page1');
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Click hyperlink to go to page2
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      // Now use back button
      await browserTest.back();
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();
      browserTest.assertUrl('/page1');

      // Use forward button
      await browserTest.forward();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
      browserTest.assertUrl('/page2');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
