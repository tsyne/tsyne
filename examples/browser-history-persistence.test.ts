/**
 * TsyneBrowserTest for history persistence functionality
 *
 * This test verifies that the browser saves browsing history to disk
 * and restores it when a new browser session starts.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from '../core/src/tsyne-browser-test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describeBrowser('Browser History Persistence', () => {
  const historyFilePath = path.join(os.homedir(), '.tsyne', 'browser-history.json');

  browserTest(
    'should save history to disk after navigation',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Home Page');
  label('First page visited');
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Wait for page to load
      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Give time for history to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify history file exists
      if (!fs.existsSync(historyFilePath)) {
        throw new Error('History file was not created');
      }

      // Read and verify history file
      const historyData = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
      if (!historyData.history || historyData.history.length === 0) {
        throw new Error('History file does not contain any entries');
      }

// console.log('History file contains', historyData.history.length, 'entries');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should persist history across multiple navigations',
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
const { vbox, label } = tsyne;

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

      // Navigate through multiple pages
      await ctx.expect(ctx.getByText('Page 1')).toBeVisible();

      await ctx.getByText('Go to Page 2').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 2')).toBeVisible();

      await ctx.getByText('Go to Page 3').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('Page 3')).toBeVisible();

      // Give time for history to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify history file has all 3 pages
      const historyData = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
      const pageUrls = historyData.history.map((entry: any) => entry.url);

      const hasPage1 = pageUrls.some((url: string) => url.includes('page1'));
      const hasPage2 = pageUrls.some((url: string) => url.includes('page2'));
      const hasPage3 = pageUrls.some((url: string) => url.includes('page3'));

      if (!hasPage1 || !hasPage2 || !hasPage3) {
        throw new Error('History file does not contain all visited pages');
      }

// console.log('History correctly saved all', historyData.history.length, 'navigations');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should persist history index on back/forward navigation',
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
});
        `
      }
    ],
    async (browserTest) => {
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Navigate forward
      await ctx.expect(ctx.getByText('Home')).toBeVisible();
      await ctx.getByText('Go to About').click();
      await browserTest.waitForNavigation();
      await ctx.expect(ctx.getByText('About Page')).toBeVisible();

      // Navigate back
      await browserTest.back();
      await ctx.expect(ctx.getByText('Home')).toBeVisible();

      // Give time for history to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify historyIndex was saved (should be 0 after going back)
      const historyData = JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));

      // After going back, we should be at an earlier index
      // The history should have at least 2 entries and index should be valid
      if (historyData.history.length < 2) {
        throw new Error('History should have at least 2 entries');
      }

      if (historyData.historyIndex === historyData.history.length - 1) {
        throw new Error('History index was not updated after back navigation');
      }

// console.log('History index correctly saved:', historyData.historyIndex);
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle history file with invalid JSON gracefully',
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
      // Write invalid JSON to history file
      const dir = path.dirname(historyFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(historyFilePath, 'invalid json content', 'utf8');

      // Create browser - should handle invalid JSON gracefully
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      // Browser should still work despite invalid history file
      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

// console.log('Browser handled invalid history file gracefully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should create history directory if it does not exist',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Directory Test');
});
        `
      }
    ],
    async (browserTest) => {
      // Remove .tsyne directory if it exists
      const tsyneDir = path.dirname(historyFilePath);
      if (fs.existsSync(tsyneDir)) {
        if (fs.existsSync(historyFilePath)) {
          fs.unlinkSync(historyFilePath);
        }
        // Try to remove directory (may not be empty)
        try {
          fs.rmdirSync(tsyneDir);
        } catch (e) {
          // Directory might not be empty, that's okay
        }
      }

      // Create browser
      await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Directory Test')).toBeVisible();

      // Give time for history to be saved
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify directory and file were created
      if (!fs.existsSync(tsyneDir)) {
        throw new Error('History directory was not created');
      }

      if (!fs.existsSync(historyFilePath)) {
        throw new Error('History file was not created');
      }

// console.log('History directory and file created successfully');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
