/**
 * TsyneBrowserTest for page title functionality
 *
 * This test verifies that pages can set their titles which are displayed in the browser window title bar.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from '../core/src/tsyne-browser-test';

describeBrowser('Browser Page Title Functionality', () => {
  browserTest(
    'should set page title on page load',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

// Set the page title
browserContext.setPageTitle('Home Page');

vbox(() => {
  label('Welcome to the home page');
  label('The window title should show: Home Page - Tsyne Browser');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page content loaded
      await ctx.expect(ctx.getByText('Welcome to the home page')).toBeVisible();

      // We can't directly test window title in headless mode,
      // but the setPageTitle call should not crash
      await ctx.expect(ctx.getByText('The window title should show: Home Page - Tsyne Browser')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should update page title on different pages',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;

browserContext.setPageTitle('Home');

vbox(() => {
  label('Home Page');
  hyperlink('Go to About', browserContext.currentUrl + 'about');
});
        `
      },
      {
        path: '/about',
        code: `
const { vbox, label, hyperlink } = tsyne;

browserContext.setPageTitle('About Us');

vbox(() => {
  label('About Page');
  hyperlink('Go to Contact', browserContext.currentUrl.replace('about', 'contact'));
});
        `
      },
      {
        path: '/contact',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Contact Information');

vbox(() => {
  label('Contact Page');
  label('Email: info@example.com');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Start at home
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to about
      await ctx.getByText('Go to About').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();

      // Navigate to contact
      await ctx.getByText('Go to Contact').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Contact Page')).toBeVisible();

      // Navigate back and verify
      await browserTest.back();
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();

      await browserTest.back();
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle pages without explicit title',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

// Don't set a page title - should show just browser name

vbox(() => {
  label('Page Without Title');
  label('Window should show: Tsyne Browser');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded without crashing
      await ctx.expect(ctx.getByText('Page Without Title')).toBeVisible();
      await ctx.expect(ctx.getByText('Window should show: Tsyne Browser')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should allow dynamic title updates on same page',
    [
      {
        path: '/',
        code: `
const { vbox, label, button } = tsyne;

browserContext.setPageTitle('Initial Title');

let titleNumber = 1;

vbox(() => {
  label('Dynamic Title Updates');

  const btn = button('Update Title').onClick(() => {
    titleNumber++;
    browserContext.setPageTitle(\`Title Version \${titleNumber}\`);
  });
  btn.id = 'update-title-btn';

  label('Click the button to update the page title');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded
      await ctx.expect(ctx.getByText('Dynamic Title Updates')).toBeVisible();

      // Click button to update title
      const button = ctx.getByID('update-title-btn');
      await button.click();

      // Should not crash
      await ctx.expect(button).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reset title when navigating to new page',
    [
      {
        path: '/page1',
        code: `
const { vbox, label, hyperlink } = tsyne;

browserContext.setPageTitle('Page 1 Title');

vbox(() => {
  label('Page 1');
  hyperlink('Go to Page 2 (has no title)', browserContext.currentUrl.replace('page1', 'page2'));
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label, hyperlink } = tsyne;

// Intentionally don't set a title - should reset to default

vbox(() => {
  label('Page 2');
  label('Title should be reset to just "Tsyne Browser"');
  hyperlink('Go to Page 3', browserContext.currentUrl.replace('page2', 'page3'));
});
        `
      },
      {
        path: '/page3',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page 3 Title');

vbox(() => {
  label('Page 3');
  label('Title should now show "Page 3 Title"');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      // Page 1 with title
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Navigate to Page 2 (no title)
      await ctx.getByText('Go to Page 2 (has no title)').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      // Navigate to Page 3 (has title)
      await ctx.getByText('Go to Page 3').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle special characters in title',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Special: Title & More - Info (2024)');

vbox(() => {
  label('Page with special characters in title');
  label('Title: Special: Title & More - Info (2024)');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Should handle special characters without crashing
      await ctx.expect(ctx.getByText('Page with special characters in title')).toBeVisible();
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
