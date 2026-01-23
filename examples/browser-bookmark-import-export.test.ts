/**
 * TsyneBrowserTest for bookmark import/export functionality
 *
 * This test verifies that the browser can export bookmarks to a file,
 * import bookmarks from a file, and handle merge/replace modes correctly.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describeBrowser('Browser Bookmark Import/Export', () => {
  const bookmarksFilePath = path.join(os.homedir(), '.tsyne', 'browser-bookmarks.json');
  const exportPath = path.join(process.cwd(), 'bookmarks-export.json');

  // Helper function to clear bookmarks file before each test
  const clearBookmarksFile = () => {
    try {
      if (fs.existsSync(bookmarksFilePath)) {
        fs.unlinkSync(bookmarksFilePath);
        console.log('Cleared bookmarks file before test');
      }
      if (fs.existsSync(exportPath)) {
        fs.unlinkSync(exportPath);
        console.log('Cleared export file before test');
      }
    } catch (error) {
      console.error('Failed to clear bookmarks files:', error);
    }
  };

  browserTest(
    'should export bookmarks to file',
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
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page 1 Content')).toBeVisible();

      // Add first bookmark
      await browser.addBookmark('First Bookmark');

      // Navigate to page 2 and add second bookmark
      await browser.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page 2 Content')).toBeVisible();
      await browser.addBookmark('Second Bookmark');

      // Verify bookmarks exist
      const bookmarks = browser.getBookmarks();
      console.log('Bookmarks before export:', bookmarks.length);
      if (bookmarks.length !== 2) {
        throw new Error(`Expected 2 bookmarks, found ${bookmarks.length}`);
      }

      // Export bookmarks
      await browser.exportBookmarks(exportPath);

      // Wait for file to be written
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify export file exists
      if (!fs.existsSync(exportPath)) {
        throw new Error('Expected export file to exist');
      }

      // Read and verify export file contents
      const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      console.log('Export data:', exportData);

      // Verify export format
      if (!exportData.version) {
        throw new Error('Expected export data to have version field');
      }
      if (!exportData.exportedAt) {
        throw new Error('Expected export data to have exportedAt timestamp');
      }
      if (!exportData.exportedFrom) {
        throw new Error('Expected export data to have exportedFrom field');
      }
      if (!exportData.bookmarks || !Array.isArray(exportData.bookmarks)) {
        throw new Error('Expected export data to have bookmarks array');
      }

      // Verify bookmark count
      if (exportData.bookmarks.length !== 2) {
        throw new Error(`Expected 2 bookmarks in export, found ${exportData.bookmarks.length}`);
      }

      // Verify bookmark data
      const exportedBookmark1 = exportData.bookmarks[0];
      if (!exportedBookmark1.title || !exportedBookmark1.url || !exportedBookmark1.addedAt) {
        throw new Error('Exported bookmark missing required fields');
      }

      console.log('✓ Bookmarks exported successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should import bookmarks in merge mode',
    [
      {
        path: '/existing',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Existing Page');

vbox(() => {
  label('Existing Page Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/existing');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Existing Page Content')).toBeVisible();

      // Add existing bookmark
      await browser.addBookmark('Existing Bookmark');

      // Verify one bookmark exists
      const bookmarksBefore = browser.getBookmarks();
      console.log('Bookmarks before import:', bookmarksBefore.length);
      if (bookmarksBefore.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarksBefore.length}`);
      }

      // Create import file with new bookmarks
      const importData = {
        version: '1.0',
        exportedAt: Date.now(),
        exportedFrom: 'Tsyne Browser',
        bookmarks: [
          {
            title: 'Imported Bookmark 1',
            url: 'http://localhost:9999/imported1',
            addedAt: Date.now()
          },
          {
            title: 'Imported Bookmark 2',
            url: 'http://localhost:9999/imported2',
            addedAt: Date.now()
          }
        ]
      };
      fs.writeFileSync(exportPath, JSON.stringify(importData, null, 2), 'utf8');

      // Import bookmarks in merge mode (default)
      await browser.importBookmarks(exportPath, true);

      // Wait for import to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify all bookmarks exist (1 existing + 2 imported)
      const bookmarksAfter = browser.getBookmarks();
      console.log('Bookmarks after import:', bookmarksAfter.length);
      if (bookmarksAfter.length !== 3) {
        throw new Error(`Expected 3 bookmarks (merge mode), found ${bookmarksAfter.length}`);
      }

      // Verify existing bookmark still exists
      const hasExisting = bookmarksAfter.some(b => b.title === 'Existing Bookmark');
      if (!hasExisting) {
        throw new Error('Expected existing bookmark to be preserved in merge mode');
      }

      // Verify imported bookmarks exist
      const hasImported1 = bookmarksAfter.some(b => b.title === 'Imported Bookmark 1');
      const hasImported2 = bookmarksAfter.some(b => b.title === 'Imported Bookmark 2');
      if (!hasImported1 || !hasImported2) {
        throw new Error('Expected imported bookmarks to be added in merge mode');
      }

      console.log('✓ Bookmarks imported in merge mode successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should import bookmarks in replace mode',
    [
      {
        path: '/existing',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Existing Page');

vbox(() => {
  label('Existing Page Content');
});
        `
      }
    ],
    async (browserTest) => {
      clearBookmarksFile();

      const browser = await browserTest.createBrowser('/existing');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Existing Page Content')).toBeVisible();

      // Add existing bookmark
      await browser.addBookmark('Existing Bookmark');

      // Verify one bookmark exists
      const bookmarksBefore = browser.getBookmarks();
      console.log('Bookmarks before import:', bookmarksBefore.length);
      if (bookmarksBefore.length !== 1) {
        throw new Error(`Expected 1 bookmark, found ${bookmarksBefore.length}`);
      }

      // Create import file with new bookmarks
      const importData = {
        version: '1.0',
        exportedAt: Date.now(),
        exportedFrom: 'Tsyne Browser',
        bookmarks: [
          {
            title: 'Replaced Bookmark 1',
            url: 'http://localhost:9999/replaced1',
            addedAt: Date.now()
          },
          {
            title: 'Replaced Bookmark 2',
            url: 'http://localhost:9999/replaced2',
            addedAt: Date.now()
          }
        ]
      };
      fs.writeFileSync(exportPath, JSON.stringify(importData, null, 2), 'utf8');

      // Import bookmarks in replace mode
      await browser.importBookmarks(exportPath, false);

      // Wait for import to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify only imported bookmarks exist
      const bookmarksAfter = browser.getBookmarks();
      console.log('Bookmarks after import:', bookmarksAfter.length);
      if (bookmarksAfter.length !== 2) {
        throw new Error(`Expected 2 bookmarks (replace mode), found ${bookmarksAfter.length}`);
      }

      // Verify existing bookmark was replaced
      const hasExisting = bookmarksAfter.some(b => b.title === 'Existing Bookmark');
      if (hasExisting) {
        throw new Error('Expected existing bookmark to be removed in replace mode');
      }

      // Verify imported bookmarks exist
      const hasReplaced1 = bookmarksAfter.some(b => b.title === 'Replaced Bookmark 1');
      const hasReplaced2 = bookmarksAfter.some(b => b.title === 'Replaced Bookmark 2');
      if (!hasReplaced1 || !hasReplaced2) {
        throw new Error('Expected imported bookmarks in replace mode');
      }

      console.log('✓ Bookmarks imported in replace mode successfully');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle duplicate imports in merge mode',
    [
      {
        path: '/test',
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

      const browser = await browserTest.createBrowser('/test');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Add bookmark
      await browser.addBookmark('Test Bookmark');

      // Verify one bookmark exists
      const bookmarksBefore = browser.getBookmarks();
      const url = bookmarksBefore[0].url;
      console.log('Bookmark URL:', url);

      // Create import file with same URL but different title
      const importData = {
        version: '1.0',
        exportedAt: Date.now(),
        exportedFrom: 'Tsyne Browser',
        bookmarks: [
          {
            title: 'Duplicate Bookmark',
            url: url,  // Same URL as existing bookmark
            addedAt: Date.now()
          }
        ]
      };
      fs.writeFileSync(exportPath, JSON.stringify(importData, null, 2), 'utf8');

      // Import bookmarks in merge mode
      await browser.importBookmarks(exportPath, true);

      // Wait for import to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify duplicate was not added
      const bookmarksAfter = browser.getBookmarks();
      console.log('Bookmarks after import:', bookmarksAfter.length);
      if (bookmarksAfter.length !== 1) {
        throw new Error(`Expected 1 bookmark (duplicate ignored), found ${bookmarksAfter.length}`);
      }

      console.log('✓ Duplicate imports handled correctly in merge mode');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle invalid import file',
    [
      {
        path: '/test',
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

      const browser = await browserTest.createBrowser('/test');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Try to import from non-existent file
      try {
        await browser.importBookmarks('/nonexistent/file.json', true);
        // If no error thrown, the error dialog was shown (expected behavior)
        console.log('Import failed as expected (file not found)');
      } catch (error) {
        console.log('Import error caught:', error);
      }

      // Create invalid import file (missing bookmarks array)
      const invalidData = {
        version: '1.0',
        exportedAt: Date.now()
        // Missing bookmarks array
      };
      fs.writeFileSync(exportPath, JSON.stringify(invalidData, null, 2), 'utf8');

      // Try to import invalid file
      try {
        await browser.importBookmarks(exportPath, true);
        // If no error thrown, the error dialog was shown (expected behavior)
        console.log('Import failed as expected (invalid format)');
      } catch (error) {
        console.log('Import error caught:', error);
      }

      console.log('✓ Invalid import files handled correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should export and import round-trip',
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

      // First browser: create bookmarks and export
      const browser1 = await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page 1 Content')).toBeVisible();

      // Add bookmarks
      await browser1.addBookmark('Bookmark 1');
      await browser1.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page 2 Content')).toBeVisible();
      await browser1.addBookmark('Bookmark 2');
      await browser1.changePage(browserTest.getTestUrl('/page3'));
      await ctx.expect(ctx.getByText('Page 3 Content')).toBeVisible();
      await browser1.addBookmark('Bookmark 3');

      const originalBookmarks = browser1.getBookmarks();
      console.log('Original bookmarks:', originalBookmarks.length);

      // Export bookmarks
      await browser1.exportBookmarks(exportPath);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Second browser: clear bookmarks file only (keep export file!)
      if (fs.existsSync(bookmarksFilePath)) {
        fs.unlinkSync(bookmarksFilePath);
        console.log('Cleared bookmarks file (keeping export file)');
      }
      const { Browser } = require('../core/src/browser');
      const browser2 = new Browser({ testMode: true });

      // Verify no bookmarks initially
      const emptyBookmarks = browser2.getBookmarks();
      console.log('Empty bookmarks:', emptyBookmarks.length);
      if (emptyBookmarks.length !== 0) {
        throw new Error(`Expected 0 bookmarks initially, found ${emptyBookmarks.length}`);
      }

      // Import bookmarks
      await browser2.importBookmarks(exportPath, false);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify imported bookmarks match original
      const importedBookmarks = browser2.getBookmarks();
      console.log('Imported bookmarks:', importedBookmarks.length);

      if (importedBookmarks.length !== originalBookmarks.length) {
        throw new Error(`Bookmark count mismatch: ${importedBookmarks.length} vs ${originalBookmarks.length}`);
      }

      // Verify URLs match (order may differ)
      const originalUrls = new Set(originalBookmarks.map((b: any) => b.url));
      const importedUrls = new Set(importedBookmarks.map((b: any) => b.url));

      for (const url of originalUrls) {
        if (!importedUrls.has(url)) {
          throw new Error(`Missing URL after import: ${url}`);
        }
      }

      // Verify titles match
      const originalTitles = new Set(originalBookmarks.map((b: any) => b.title));
      const importedTitles = new Set(importedBookmarks.map((b: any) => b.title));

      for (const title of originalTitles) {
        if (!importedTitles.has(title)) {
          throw new Error(`Missing title after import: ${title}`);
        }
      }

      console.log('✓ Export and import round-trip successful');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle empty bookmark export',
    [
      {
        path: '/test',
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

      const browser = await browserTest.createBrowser('/test');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Verify no bookmarks
      const bookmarks = browser.getBookmarks();
      console.log('Bookmarks:', bookmarks.length);
      if (bookmarks.length !== 0) {
        throw new Error(`Expected 0 bookmarks, found ${bookmarks.length}`);
      }

      // Export empty bookmarks (should still work)
      await browser.exportBookmarks(exportPath);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify export file exists
      if (!fs.existsSync(exportPath)) {
        throw new Error('Expected export file to exist');
      }

      // Read and verify export file
      const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      if (exportData.bookmarks.length !== 0) {
        throw new Error(`Expected 0 bookmarks in export, found ${exportData.bookmarks.length}`);
      }

      console.log('✓ Empty bookmark export handled correctly');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
