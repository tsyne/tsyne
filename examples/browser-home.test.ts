/**
 * TsyneBrowserTest for Home button navigation
 *
 * This test verifies that the browser Home button navigates to the configured home page.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';

describeBrowser('Browser Home Button Navigation', () => {
  browserTest(
    'should navigate to home page when home button is clicked',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Home Page');
  label('Welcome to the home page!');
});
        `
      },
      {
        path: '/page1',
        code: `
const { vbox, label, hyperlink } = tsyne;
vbox(() => {
  label('Page 1');
  label('This is page 1');
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
  label('This is page 2');
});
        `
      }
    ],
    async (browserTest) => {
      // Create browser with home URL configured
      const homeUrl = browserTest.getTestUrl('/');
      browserTest.browser = await browserTest['createBrowser'](homeUrl);
      (browserTest.browser as any).homeUrl = homeUrl;

      const ctx = browserTest.getContext();

      // Verify we're on home page
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
      await ctx.expect(ctx.getByText('Welcome to the home page!')).toBeVisible();

      // Navigate to page1
      await browserTest.navigate('/page1');
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();
      browserTest.assertUrl('/page1');

      // Navigate to page2 via hyperlink
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
      browserTest.assertUrl('/page2');

      // Call home() method to navigate back to home page
      await browserTest.browser.home();
      await browserTest.waitForPageLoad();

      // Verify we're back on home page
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
      await ctx.expect(ctx.getByText('Welcome to the home page!')).toBeVisible();
      browserTest.assertUrl('/');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle home navigation from deep page hierarchy',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;
vbox(() => {
  label('Home');
  hyperlink('Section A', browserContext.currentUrl + 'section-a');
});
        `
      },
      {
        path: '/section-a',
        code: `
const { vbox, label, hyperlink } = tsyne;
vbox(() => {
  label('Section A');
  hyperlink('Subsection A1', browserContext.currentUrl + '/subsection-a1');
});
        `
      },
      {
        path: '/section-a/subsection-a1',
        code: `
const { vbox, label, hyperlink } = tsyne;
vbox(() => {
  label('Subsection A1');
  hyperlink('Deep Page', browserContext.currentUrl + '/deep');
});
        `
      },
      {
        path: '/section-a/subsection-a1/deep',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Deep Page');
  label('You are deep in the hierarchy');
});
        `
      }
    ],
    async (browserTest) => {
      // Create browser with home URL
      const homeUrl = browserTest.getTestUrl('/');
      browserTest.browser = await browserTest['createBrowser'](homeUrl);
      (browserTest.browser as any).homeUrl = homeUrl;

      const ctx = browserTest.getContext();

      // Start at home
      await ctx.expect(ctx.getByText('Home')).toBeVisible();

      // Navigate deep into hierarchy
      await ctx.getByText('Section A').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Section A')).toBeVisible();

      await ctx.getByText('Subsection A1').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Subsection A1')).toBeVisible();

      await ctx.getByText('Deep Page').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Deep Page')).toBeVisible();
      await ctx.expect(ctx.getByText('You are deep in the hierarchy')).toBeVisible();

      // Now navigate home
      await browserTest.browser.home();
      await browserTest.waitForPageLoad();

      // Should be back at home page
      await ctx.expect(ctx.getByText('Home')).toBeVisible();
      browserTest.assertUrl('/');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should do nothing when home() is called without homeUrl configured',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Page Without Home');
});
        `
      }
    ],
    async (browserTest) => {
      // Create browser WITHOUT home URL configured
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify we're on the page
      await ctx.expect(ctx.getByText('Page Without Home')).toBeVisible();

      // Call home() - should do nothing (log message but not navigate)
      await browserTest.browser.home();

      // Small wait to ensure no navigation happens
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should still be on same page
      await ctx.expect(ctx.getByText('Page Without Home')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should navigate home multiple times',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;
vbox(() => {
  label('Home Page');
  hyperlink('Go to Page A', browserContext.currentUrl + 'page-a');
});
        `
      },
      {
        path: '/page-a',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Page A');
});
        `
      }
    ],
    async (browserTest) => {
      // Create browser with home URL
      const homeUrl = browserTest.getTestUrl('/');
      browserTest.browser = await browserTest['createBrowser'](homeUrl);
      (browserTest.browser as any).homeUrl = homeUrl;

      const ctx = browserTest.getContext();

      // Start at home
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to Page A
      await ctx.getByText('Go to Page A').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page A')).toBeVisible();

      // Go home (first time)
      await browserTest.browser.home();
      await browserTest.waitForPageLoad();
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to Page A again
      await ctx.getByText('Go to Page A').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page A')).toBeVisible();

      // Go home (second time)
      await browserTest.browser.home();
      await browserTest.waitForPageLoad();
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Verify we can still navigate after multiple home operations
      await ctx.getByText('Go to Page A').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page A')).toBeVisible();
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
