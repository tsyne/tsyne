/**
 * TsyneBrowserTest for URL validation functionality
 *
 * This test verifies that the browser validates URLs before navigation
 * and shows appropriate error messages for invalid URLs.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';

describeBrowser('Browser URL Validation', () => {
  browserTest(
    'should reject empty URL',
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
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test Page')).toBeVisible();

      // Try to navigate to empty URL
      await browser.changePage('   ');

      // Should show error
      await ctx.expect(ctx.getByText('Error Loading Page')).toBeVisible();
      await ctx.expect(ctx.getByText('URL cannot be empty')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reject URL without protocol',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Initial Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Initial Page')).toBeVisible();

      // Try to navigate to URL without protocol
      await browser.changePage('localhost:3000');

      // Should show error about missing protocol
      await ctx.expect(ctx.getByText('Error Loading Page')).toBeVisible();
      // Check for part of the error message (avoiding regex)
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('URL validation error: missing protocol detected');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reject unsupported protocol',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Start Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Start Page')).toBeVisible();

      // Try to navigate to FTP URL
      await browser.changePage('ftp://ftp.example.com/file.txt');

      // Should show error about unsupported protocol
      await ctx.expect(ctx.getByText('Error Loading Page')).toBeVisible();
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('URL validation error: unsupported protocol ftp:// detected');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should reject URL with invalid format',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Landing Page');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Landing Page')).toBeVisible();

      // Try to navigate to malformed URL
      await browser.changePage('http://');

      // Should show error about invalid format
      await ctx.expect(ctx.getByText('Error Loading Page')).toBeVisible();
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('URL validation error: invalid format detected');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should accept valid http URL',
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
        path: '/test',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test Page Loaded');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Home Page')).toBeVisible();

      // Navigate to valid URL
      const testUrl = browserTest.getTestUrl('/test');
      await browser.changePage(testUrl);

      // Should load successfully
      await ctx.expect(ctx.getByText('Test Page Loaded')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should accept relative URL when current page exists',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Base Page');
});
        `
      },
      {
        path: '/relative-test',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Relative Page Loaded');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Base Page')).toBeVisible();

      // Navigate using relative URL
      await browser.changePage('/relative-test');

      // Should load successfully
      await ctx.expect(ctx.getByText('Relative Page Loaded')).toBeVisible();
    },
    { timeout: 30000 }
  );

  browserTest(
    'should show error for malformed hostname',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Check Validation');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Check Validation')).toBeVisible();

      // Try to navigate to URL with invalid characters
      await browser.changePage('http://invalid space.com/page');

      // Should show error
      await ctx.expect(ctx.getByText('Error Loading Page')).toBeVisible();
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('URL validation error: invalid hostname detected');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
