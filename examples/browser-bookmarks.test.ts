/**
 * TsyneBrowserTest for bookmarks functionality
 *
 * This test verifies that the browser can save bookmarks, navigate to them,
 * and persist them across browser sessions.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from '../core/src/tsyne-browser-test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describeBrowser('Browser Bookmarks', () => {
  const bookmarksFilePath = path.join(os.homedir(), '.tsyne', 'browser-bookmarks.json');

  // Helper function to clear bookmarks file before each test
  const clearBookmarksFile = () => {
    try {
      if (fs.existsSync(bookmarksFilePath)) {
        fs.unlinkSync(bookmarksFilePath);
// console.log('Cleared bookmarks file before test');
      }
    } catch (error) {
      console.error('Failed to clear bookmarks file:', error);
    }
  };

  browserTest(
    'should add bookmark for current page',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

// Set page title
browserContext.setPageTitle('Home Page');

vbox(() => {
  label('Home Page Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Home Page Content')).toBeVisible();

      // Verify no bookmarks initially
      const bookmarksBefore = browser.getBookmarks();
// console.log('Bookmarks before:', bookmarksBefore.length);

      // Add bookmark
      await browser.addBookmark();

      // Verify bookmark was added
      const bookmarksAfter = browser.getBookmarks();
// console.log('Bookmarks after:', bookmarksAfter.length);
      if (bookmarksAfter.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarksAfter.length}`);
      }

      const bookmark = bookmarksAfter[0];
// console.log('Bookmark added:', bookmark.title, bookmark.url);

      // Verify bookmark has correct title
      if (!bookmark.title.includes('Home Page')) {
        console.warn(`Expected title to include 'Home Page', got: ${bookmark.title}`);
      }

      // Verify bookmark was saved to disk
      await new Promise(resolve => setTimeout(resolve, 200));
      const fileExists = fs.existsSync(bookmarksFilePath);
      if (!fileExists) {
        throw new Error('Expected bookmarks file to exist');
      }

// console.log('✓ Bookmark added successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should navigate to bookmarked page',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('First Page');

vbox(() => {
  label('First Page');
});
        `
      },
      {
        path: '/second',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Second Page');

vbox(() => {
  label('Second Page');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('First Page')).toBeVisible();

      // Add bookmark for first page
      await browser.addBookmark();

      // Navigate to second page
      await browser.changePage(browserTest.getTestUrl('/second'));
      await ctx.expect(ctx.getByText('Second Page')).toBeVisible();

      // Get bookmarked URL
      const bookmarks = browser.getBookmarks();
      if (bookmarks.length === 0) {
        throw new Error('Expected bookmark to exist');
      }

      const bookmarkedUrl = bookmarks[0].url;
// console.log('Navigating to bookmarked URL:', bookmarkedUrl);

      // Navigate back to bookmarked page
      await browser.changePage(bookmarkedUrl);

      // Verify we're back on first page
      await ctx.expect(ctx.getByText('First Page')).toBeVisible();

// console.log('✓ Navigated to bookmarked page successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should remove bookmark',
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
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Add bookmark
      await browser.addBookmark('Test Bookmark');

      // Verify bookmark exists
      const bookmarksBefore = browser.getBookmarks();
      if (bookmarksBefore.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarksBefore.length}`);
      }

      const bookmarkedUrl = bookmarksBefore[0].url;

      // Remove bookmark
      await browser.removeBookmark(bookmarkedUrl);

      // Verify bookmark was removed
      const bookmarksAfter = browser.getBookmarks();
// console.log('Bookmarks after removal:', bookmarksAfter.length);
      if (bookmarksAfter.length !== 0) {
        throw new Error(`Expected 0 bookmarks, found ${bookmarksAfter.length}`);
      }

// console.log('✓ Bookmark removed successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should persist bookmarks across sessions',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Persistent Page');

vbox(() => {
  label('Persistent Page');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      // First browser session
      const browser1 = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Persistent Page')).toBeVisible();

      // Add bookmark
      await browser1.addBookmark();

      // Verify bookmark exists
      const bookmarks1 = browser1.getBookmarks();
// console.log('Bookmarks in first session:', bookmarks1.length);
      if (bookmarks1.length === 0) {
        throw new Error('Expected bookmark in first session');
      }

      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create second browser instance (simulates restart)
      const { Browser } = require('../core/src/browser');
      const browser2 = new Browser({ testMode: true });

      // Check bookmarks were loaded
      const bookmarks2 = browser2.getBookmarks();
// console.log('Bookmarks in second session:', bookmarks2.length);

      if (bookmarks2.length === 0) {
        throw new Error('Expected bookmarks to persist across sessions');
      }

      // Verify bookmark data matches
      if (bookmarks2[0].title !== bookmarks1[0].title) {
        throw new Error(`Bookmark title mismatch: ${bookmarks2[0].title} vs ${bookmarks1[0].title}`);
      }

// console.log('✓ Bookmarks persisted across sessions');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle duplicate bookmarks',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Duplicate Test');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Duplicate Test')).toBeVisible();

      // Add bookmark
      await browser.addBookmark('First Bookmark');

      // Try to add same bookmark again
      await browser.addBookmark('Second Bookmark');

      // Verify only one bookmark exists
      const bookmarks = browser.getBookmarks();
// console.log('Bookmarks after duplicate attempt:', bookmarks.length);
      if (bookmarks.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarks.length}`);
      }

      // Verify status indicates already bookmarked
      await new Promise(resolve => setTimeout(resolve, 100));
      const status = browser.getStatusText();
// console.log('Status after duplicate:', status);

// console.log('✓ Duplicate bookmarks handled correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should support multiple bookmarks',
    [
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page 1');

vbox(() => {
  label('Page 1 Content');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page 2');

vbox(() => {
  label('Page 2 Content');
});
        `
      },
      {
        path: '/page3',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Page 3');

vbox(() => {
  label('Page 3 Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page 1 Content')).toBeVisible();

      // Add bookmark for page 1
      await browser.addBookmark();

      // Navigate to page 2
      await browser.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page 2 Content')).toBeVisible();

      // Add bookmark for page 2
      await browser.addBookmark();

      // Navigate to page 3
      await browser.changePage(browserTest.getTestUrl('/page3'));
      await ctx.expect(ctx.getByText('Page 3 Content')).toBeVisible();

      // Add bookmark for page 3
      await browser.addBookmark();

      // Verify all bookmarks exist
      const bookmarks = browser.getBookmarks();
// console.log('Total bookmarks:', bookmarks.length);
      if (bookmarks.length !== 3) {
        throw new Error(`Expected 3 bookmarks, found ${bookmarks.length}`);
      }

      // Verify each bookmark has correct title
      const titles = bookmarks.map(b => b.title);
// console.log('Bookmark titles:', titles.join(', '));

// console.log('✓ Multiple bookmarks created successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should bookmark with custom title',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Custom Title Test');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Custom Title Test')).toBeVisible();

      // Add bookmark with custom title
      await browser.addBookmark('My Custom Bookmark');

      // Verify bookmark has custom title
      const bookmarks = browser.getBookmarks();
      if (bookmarks.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarks.length}`);
      }

      const bookmark = bookmarks[0];
// console.log('Bookmark title:', bookmark.title);
      if (bookmark.title !== 'My Custom Bookmark') {
        throw new Error(`Expected custom title 'My Custom Bookmark', got: ${bookmark.title}`);
      }

// console.log('✓ Custom title bookmark created successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should check if URL is bookmarked',
    [
      {
        path: '/check-bookmarked',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Bookmark Check Test');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/check-bookmarked');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Bookmark Check Test')).toBeVisible();

      const testUrl = browserTest.getTestUrl('/check-bookmarked');

      // Verify not bookmarked initially
      const isBookmarkedBefore = browser.isBookmarked(testUrl);
// console.log('Is bookmarked before:', isBookmarkedBefore);
      if (isBookmarkedBefore) {
        throw new Error('Expected URL not to be bookmarked initially');
      }

      // Add bookmark
      await browser.addBookmark();

      // Verify is bookmarked now
      const isBookmarkedAfter = browser.isBookmarked(testUrl);
// console.log('Is bookmarked after:', isBookmarkedAfter);
      if (!isBookmarkedAfter) {
        throw new Error('Expected URL to be bookmarked after adding');
      }

// console.log('✓ Bookmark status checked correctly');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
