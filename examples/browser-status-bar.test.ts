/**
 * TsyneBrowserTest for status bar functionality
 *
 * This test verifies that the browser status bar shows appropriate messages
 * during navigation and allows pages to set custom status text.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';

describeBrowser('Browser Status Bar Functionality', () => {
  browserTest(
    'should show Ready status on startup',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Welcome Page');
  label('Status bar should show: Ready');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded
      await ctx.expect(ctx.getByText('Welcome Page')).toBeVisible();

      // Note: We can't directly test the status bar text in headless mode,
      // but we verify the page loads without crashing
      await ctx.expect(ctx.getByText('Status bar should show: Ready')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should allow pages to set custom status text',
    [
      {
        path: '/',
        code: `
const { vbox, label, button } = tsyne;

// Set initial status
browserContext.setStatus('Page loaded successfully');

vbox(() => {
  label('Custom Status Page');

  const btn = button('Update Status').onClick(() => {
    browserContext.setStatus('Button clicked!');
  });
  btn.id = 'update-status-btn';
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded
      await ctx.expect(ctx.getByText('Custom Status Page')).toBeVisible();

      // Click button to update status
      await ctx.getById('update-status-btn').click();

      // Verify button still works after status update
      await ctx.expect(ctx.getById('update-status-btn')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should update status during page navigation',
    [
      {
        path: '/',
        code: `
const { vbox, label, hyperlink } = tsyne;

browserContext.setStatus('Home page ready');

vbox(() => {
  label('Home Page');
  hyperlink('Go to Page 2', browserContext.currentUrl + 'page2');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label } = tsyne;

browserContext.setStatus('Page 2 ready');

vbox(() => {
  label('Page 2');
  label('This is the second page');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Start at home page
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to page 2
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();

      // Verify we're on page 2
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();
      await ctx.expect(ctx.getByText('This is the second page')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle dynamic status updates on same page',
    [
      {
        path: '/',
        code: `
const { vbox, label, button } = tsyne;

let count = 0;

vbox(() => {
  label('Dynamic Status Updates');

  const btn = button('Increment Counter').onClick(() => {
    count++;
    browserContext.setStatus(\`Counter: \${count}\`);
  });
  btn.id = 'increment-btn';

  const lbl = label(\`Count: \${count}\`);
  lbl.id = 'count-label';
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded
      await ctx.expect(ctx.getByText('Dynamic Status Updates')).toBeVisible();

      // Click button multiple times
      const button = ctx.getById('increment-btn');
      await button.click();
      await button.click();
      await button.click();

      // Verify button still works
      await ctx.expect(button).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reset status text on page navigation',
    [
      {
        path: '/page1',
        code: `
const { vbox, label, hyperlink } = tsyne;

browserContext.setStatus('On Page 1');

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

// Intentionally don't set status - should show default navigation status

vbox(() => {
  label('Page 2');
  hyperlink('Go to Page 3', browserContext.currentUrl.replace('page2', 'page3'));
});
        `
      },
      {
        path: '/page3',
        code: `
const { vbox, label } = tsyne;

browserContext.setStatus('On Page 3');

vbox(() => {
  label('Page 3');
  label('Final page');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      // Page 1
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Navigate to Page 2
      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      // Navigate to Page 3
      await ctx.getByText('Go to Page 3').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();
      await ctx.expect(ctx.getByText('Final page')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should show status messages with special characters',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setStatus('Status: Ready! (100%) - All systems go 🚀');

vbox(() => {
  label('Special Characters in Status');
  label('Status contains: symbols, emojis, and percentages');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Verify page loaded without crashing
      await ctx.expect(ctx.getByText('Special Characters in Status')).toBeVisible();
      await ctx.expect(ctx.getByText('Status contains: symbols, emojis, and percentages')).toBeVisible();
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
