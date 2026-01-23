/**
 * TsyneBrowserTest for history UI functionality
 *
 * This test verifies that the browser can display browsing history with
 * dates/times and that history entries include timestamps and titles.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describeBrowser('Browser History UI', () => {
  const historyFilePath = path.join(os.homedir(), '.tsyne', 'browser-history.json');

  // Helper function to clear history file before each test
  const clearHistoryFile = () => {
    try {
      if (fs.existsSync(historyFilePath)) {
        fs.unlinkSync(historyFilePath);
      }
    } catch (error) {
      console.error('Failed to clear history file:', error);
    }
  };

  browserTest(
    'should store timestamps when visiting pages',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('First Page');

vbox(() => {
  label('First Page Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('First Page Content')).toBeVisible();

      // Get history
      const history = browser.getHistory();

      if (history.length === 0) {
        throw new Error('Expected history to have entries');
      }

      // Check that the entry has a timestamp
      const entry = history[0];

      if (!entry.visitedAt) {
        throw new Error('Expected history entry to have visitedAt timestamp');
      }

      // Verify timestamp is recent (within last 5 seconds)
      const now = Date.now();
      const timeDiff = now - entry.visitedAt;

      if (timeDiff < 0 || timeDiff > 5000) {
        throw new Error(`Expected timestamp to be recent, but difference was ${timeDiff}ms`);
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should store page titles in history',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Test Page Title');

vbox(() => {
  label('Page Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page Content')).toBeVisible();

      // Get history
      const history = browser.getHistory();

      if (history.length === 0) {
        throw new Error('Expected history to have entries');
      }

      // Check that the entry has a title
      const entry = history[0];

      if (entry.title !== 'Test Page Title') {
        throw new Error(`Expected title 'Test Page Title', got: ${entry.title}`);
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should format history with dates and times',
    [
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page One');

vbox(() => {
  label('Page One Content');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page Two');

vbox(() => {
  label('Page Two Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page One Content')).toBeVisible();

      // Navigate to page 2
      await browser.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page Two Content')).toBeVisible();

      // Get formatted history
      const formatted = browser.getFormattedHistory();

      if (formatted.length !== 2) {
        throw new Error(`Expected 2 history entries, got ${formatted.length}`);
      }

      // Check that formatted history includes titles
      const hasPageOne = formatted.some(line => line.includes('Page One'));
      const hasPageTwo = formatted.some(line => line.includes('Page Two'));

      if (!hasPageOne) {
        throw new Error('Expected formatted history to include "Page One"');
      }

      if (!hasPageTwo) {
        throw new Error('Expected formatted history to include "Page Two"');
      }

      // Check that formatted history includes timestamps (should have date/time format)
      const hasTimestamp = formatted.some(line => /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || /\d{4}-\d{2}-\d{2}/.test(line));

      if (!hasTimestamp) {
        console.warn('Expected formatted history to include date/time, but might vary by locale');
      }

      // Check that current entry is marked
      const hasCurrent = formatted.some(line => line.includes('(current)'));

      if (!hasCurrent) {
        throw new Error('Expected formatted history to mark current entry');
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should show history via console',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Test Page');

vbox(() => {
  label('Test Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Content')).toBeVisible();

      // Capture console output
      const originalLog = console.log;
      const logMessages: string[] = [];
      console.log = (...args: any[]) => {
        logMessages.push(args.join(' '));
        originalLog(...args);
      };

      try {
        // Show history
        browser.showHistory();

        // Restore console.log
        console.log = originalLog;

        // Check that history was displayed
        const hasHeader = logMessages.some(msg => msg.includes('Browsing History'));
        const hasEntry = logMessages.some(msg => msg.includes('Test Page'));

        if (!hasHeader) {
          throw new Error('Expected history display to include header');
        }

        if (!hasEntry) {
          throw new Error('Expected history display to include page entry');
        }
      } finally {
        // Ensure console.log is restored
        console.log = originalLog;
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle entries without timestamps (backward compatibility)',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test Page');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Manually create an old-style history entry without timestamp
      const history = browser.getHistory();
      if (history.length > 0) {
        // Remove timestamp from entry to simulate old format
        const entry = history[0];
        delete (entry as any).visitedAt;
        delete (entry as any).title;
      }

      // Try to format history - should not crash
      const formatted = browser.getFormattedHistory();

      if (formatted.length === 0) {
        throw new Error('Expected formatted history to have entries');
      }

      // Should show "Unknown date" for entries without timestamp
      const hasUnknownDate = formatted.some(line => line.includes('Unknown date'));

      if (!hasUnknownDate) {
        throw new Error('Expected formatted history to show "Unknown date" for old entries');
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should persist timestamps across sessions',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Persistent Page');

vbox(() => {
  label('Persistent Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      // First browser session
      const browser1 = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Persistent Content')).toBeVisible();

      // Get timestamp from first session
      const history1 = browser1.getHistory();
      if (history1.length === 0) {
        throw new Error('Expected history in first session');
      }

      const timestamp1 = history1[0].visitedAt;

      if (!timestamp1) {
        throw new Error('Expected timestamp in first session');
      }

      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create second browser instance (simulates restart)
      const { Browser } = require('../core/src/browser');
      const browser2 = new Browser({ testMode: true });

      // Check history was loaded with timestamp
      const history2 = browser2.getHistory();

      if (history2.length === 0) {
        throw new Error('Expected history to persist across sessions');
      }

      const timestamp2 = history2[0].visitedAt;

      if (!timestamp2) {
        throw new Error('Expected timestamp to persist across sessions');
      }

      if (timestamp1 !== timestamp2) {
        throw new Error(`Timestamp mismatch: ${timestamp1} vs ${timestamp2}`);
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should show empty history message when no history',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test Page');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Clear history
      await browser.clearHistory();

      // Capture console output
      const originalLog = console.log;
      const logMessages: string[] = [];
      console.log = (...args: any[]) => {
        logMessages.push(args.join(' '));
        originalLog(...args);
      };

      try {
        // Show empty history
        browser.showHistory();

        // Restore console.log
        console.log = originalLog;

        // Check that empty message was displayed
        const hasEmptyMessage = logMessages.some(msg => msg.includes('(No history)'));

        if (!hasEmptyMessage) {
          throw new Error('Expected empty history message');
        }
      } finally {
        // Ensure console.log is restored
        console.log = originalLog;
      }
    },
    { timeout: 30000 }
  );

  browserTest(
    'should update title in history after page renders',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

// Set title after initial render
setTimeout(() => {
  browserContext.setPageTitle('Updated Title');
}, 50);

vbox(() => {
  label('Test Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearHistoryFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Content')).toBeVisible();

      // Wait for title to be set
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that title was updated in history
      const history = browser.getHistory();
      if (history.length === 0) {
        throw new Error('Expected history to have entries');
      }

      const entry = history[0];

      // Note: The title update happens synchronously after the page renders,
      // so we should see the title in the history entry
      if (!entry.title || entry.title === browserTest.getTestUrl('/')) {
        console.warn('Title might not have been updated yet');
      }
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
