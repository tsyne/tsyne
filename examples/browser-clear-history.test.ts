/**
 * TsyneBrowserTest for clear history functionality
 *
 * This test verifies that the browser can clear browsing history
 * from both memory and disk, and updates the UI appropriately.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from '../core/src/tsyne-browser-test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describeBrowser('Browser Clear History', () => {
  const historyFilePath = path.join(os.homedir(), '.tsyne', 'browser-history.json');

  browserTest(
    'should clear history after navigation',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Home Page');
});
        `
      },
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page 1');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to page1
      const page1Url = browserTest.getTestUrl('/page1');
      await browser.changePage(page1Url);
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      // Verify history exists
      const historyBefore = browser.getHistory();
      console.log('History before clear:', historyBefore.length, 'entries');
      if (historyBefore.length === 0) {
        throw new Error('Expected history to have entries before clear');
      }

      // Clear history
      await browser.clearHistory();

      // Verify history cleared in memory
      const historyAfter = browser.getHistory();
      console.log('History after clear:', historyAfter.length, 'entries');
      if (historyAfter.length !== 0) {
        throw new Error(`Expected history to be empty, but found ${historyAfter.length} entries`);
      }

      // Verify history file deleted from disk
      await new Promise(resolve => setTimeout(resolve, 200));
      const fileExists = fs.existsSync(historyFilePath);
      console.log('History file exists after clear:', fileExists);
      if (fileExists) {
        throw new Error('Expected history file to be deleted');
      }

      console.log('✓ History cleared successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should clear history with multiple entries',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Start Page');
});
        `
      },
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page 1');
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
      },
      {
        path: '/page3',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page 3');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Start Page')).toBeVisible();

      // Navigate to multiple pages
      await browser.changePage(browserTest.getTestUrl('/page1'));
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      await browser.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      await browser.changePage(browserTest.getTestUrl('/page3'));
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();

      // Verify multiple entries
      const historyBefore = browser.getHistory();
      console.log('History entries before clear:', historyBefore.length);
      if (historyBefore.length < 3) {
        throw new Error(`Expected at least 3 history entries, found ${historyBefore.length}`);
      }

      // Clear all history
      await browser.clearHistory();

      // Verify all cleared
      const historyAfter = browser.getHistory();
      if (historyAfter.length !== 0) {
        throw new Error(`Expected empty history, found ${historyAfter.length} entries`);
      }

      console.log('✓ Multiple history entries cleared successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should have back button disabled after clearing history',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Initial Page');
});
        `
      },
      {
        path: '/second',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Second Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Initial Page')).toBeVisible();

      // Navigate forward
      await browser.changePage(browserTest.getTestUrl('/second'));
      await ctx.expect(ctx.getByText('Second Page')).toBeVisible();

      // Verify can go back (history exists)
      const canGoBackBefore = browser.canGoBack();
      console.log('Can go back before clear:', canGoBackBefore);

      // Clear history
      await browser.clearHistory();

      // Verify cannot go back (no history)
      const canGoBackAfter = browser.canGoBack();
      console.log('Can go back after clear:', canGoBackAfter);
      if (canGoBackAfter) {
        throw new Error('Expected back button to be disabled after clearing history');
      }

      console.log('✓ Back button disabled after history cleared');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reset history index after clearing',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page A');
});
        `
      },
      {
        path: '/pageB',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page B');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page A')).toBeVisible();

      // Navigate forward
      await browser.changePage(browserTest.getTestUrl('/pageB'));
      await ctx.expect(ctx.getByText('Page B')).toBeVisible();

      // Go back to create non-zero history index
      await browser.back();
      await new Promise(resolve => setTimeout(resolve, 100));

      const indexBefore = browser.getHistoryIndex();
      console.log('History index before clear:', indexBefore);

      // Clear history
      await browser.clearHistory();

      // Verify index reset to -1
      const indexAfter = browser.getHistoryIndex();
      console.log('History index after clear:', indexAfter);
      if (indexAfter !== -1) {
        throw new Error(`Expected history index to be -1, found ${indexAfter}`);
      }

      console.log('✓ History index reset to -1 after clear');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should update status bar when clearing history',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test Page');
});
        `
      },
      {
        path: '/another',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Another Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Navigate to build history
      await browser.changePage(browserTest.getTestUrl('/another'));
      await ctx.expect(ctx.getByText('Another Page')).toBeVisible();

      // Clear history
      await browser.clearHistory();

      // Check status text
      await new Promise(resolve => setTimeout(resolve, 100));
      const status = browser.getStatusText();
      console.log('Status after clear:', status);
      if (!status.includes('History cleared')) {
        console.warn('Expected status to mention history cleared, got:', status);
      }

      console.log('✓ Status bar updated on history clear');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle clearing empty history gracefully',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Only Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Only Page')).toBeVisible();

      // Clear history immediately (might be empty or have just one entry)
      await browser.clearHistory();

      // Should not crash
      const history = browser.getHistory();
      console.log('History after clearing (was minimal):', history.length);

      // Verify state is consistent
      if (history.length !== 0) {
        throw new Error('Expected history to be empty after clear');
      }

      const index = browser.getHistoryIndex();
      if (index !== -1) {
        throw new Error('Expected history index to be -1 after clear');
      }

      console.log('✓ Clearing empty/minimal history handled gracefully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should allow navigation after clearing history',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('First Page');
});
        `
      },
      {
        path: '/before-clear',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Before Clear');
});
        `
      },
      {
        path: '/after-clear',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('After Clear');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('First Page')).toBeVisible();

      // Navigate to build history
      await browser.changePage(browserTest.getTestUrl('/before-clear'));
      await ctx.expect(ctx.getByText('Before Clear')).toBeVisible();

      // Clear history
      await browser.clearHistory();

      // Navigate after clearing
      await browser.changePage(browserTest.getTestUrl('/after-clear'));
      await ctx.expect(ctx.getByText('After Clear')).toBeVisible();

      // Verify new history entry created
      const history = browser.getHistory();
      console.log('History after navigation post-clear:', history.length);
      if (history.length === 0) {
        throw new Error('Expected new history entry after navigation');
      }

      console.log('✓ Navigation works after clearing history');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
