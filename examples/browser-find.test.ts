/**
 * TsyneBrowserTest for find-in-page functionality
 *
 * This test verifies that the browser can search for text in the current page,
 * navigate through matches, and handle various edge cases.
 */

import { TsyneBrowserTest, browserTest, describeBrowser, runBrowserTests } from 'tsyne';

describeBrowser('Browser Find in Page', () => {
  browserTest(
    'should find text in page (case-insensitive)',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

browserContext.setPageTitle('Find Test Page');

vbox(() => {
  label('Hello World');
  label('This is a test page');
  label('Testing the find feature');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Hello World')).toBeVisible();

      // Find "test" (should match "test" in "This is a test page" and "Testing")
      const matchCount = browser.findInPage('test');
// console.log('Match count:', matchCount);

      if (matchCount < 2) {
        throw new Error(`Expected at least 2 matches, found ${matchCount}`);
      }

      // Verify find query is stored
      const query = browser.getFindQuery();
// console.log('Find query:', query);
      if (query !== 'test') {
        throw new Error(`Expected query 'test', got: ${query}`);
      }

      // Verify current match index is set to first match
      const currentIndex = browser.getFindCurrentIndex();
// console.log('Current match index:', currentIndex);
      if (currentIndex !== 0) {
        throw new Error(`Expected current index 0, got: ${currentIndex}`);
      }

// console.log('✓ Find text in page (case-insensitive) works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should find text in page (case-sensitive)',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Hello World');
  label('hello world');
  label('HELLO WORLD');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Hello World')).toBeVisible();

      // Case-insensitive search (default)
      const matchCountInsensitive = browser.findInPage('hello');
// console.log('Case-insensitive matches:', matchCountInsensitive);
      if (matchCountInsensitive !== 3) {
        throw new Error(`Expected 3 matches (case-insensitive), found ${matchCountInsensitive}`);
      }

      // Case-sensitive search
      const matchCountSensitive = browser.findInPage('Hello', true);
// console.log('Case-sensitive matches:', matchCountSensitive);
      if (matchCountSensitive !== 1) {
        throw new Error(`Expected 1 match (case-sensitive), found ${matchCountSensitive}`);
      }

// console.log('✓ Case-sensitive find works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should navigate to next match',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('First match');
  label('Second match');
  label('Third match');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('First match')).toBeVisible();

      // Find "match"
      const matchCount = browser.findInPage('match');
// console.log('Match count:', matchCount);
      if (matchCount !== 3) {
        throw new Error(`Expected 3 matches, found ${matchCount}`);
      }

      // Should start at first match (index 0)
      let currentIndex = browser.getFindCurrentIndex();
// console.log('Initial index:', currentIndex);
      if (currentIndex !== 0) {
        throw new Error(`Expected initial index 0, got: ${currentIndex}`);
      }

      // Navigate to next match (index 1)
      const moved1 = browser.findNext();
      if (!moved1) {
        throw new Error('Expected findNext to return true');
      }
      currentIndex = browser.getFindCurrentIndex();
// console.log('After first findNext:', currentIndex);
      if (currentIndex !== 1) {
        throw new Error(`Expected index 1, got: ${currentIndex}`);
      }

      // Navigate to next match (index 2)
      const moved2 = browser.findNext();
      if (!moved2) {
        throw new Error('Expected findNext to return true');
      }
      currentIndex = browser.getFindCurrentIndex();
// console.log('After second findNext:', currentIndex);
      if (currentIndex !== 2) {
        throw new Error(`Expected index 2, got: ${currentIndex}`);
      }

// console.log('✓ Navigate to next match works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should wrap to first match when navigating past last',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Match one');
  label('Match two');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Match one')).toBeVisible();

      // Find "Match"
      const matchCount = browser.findInPage('Match');
// console.log('Match count:', matchCount);
      if (matchCount !== 2) {
        throw new Error(`Expected 2 matches, found ${matchCount}`);
      }

      // Navigate to last match
      browser.findNext();
      let currentIndex = browser.getFindCurrentIndex();
// console.log('At last match:', currentIndex);
      if (currentIndex !== 1) {
        throw new Error(`Expected index 1, got: ${currentIndex}`);
      }

      // Navigate past last match (should wrap to first)
      browser.findNext();
      currentIndex = browser.getFindCurrentIndex();
// console.log('After wrap:', currentIndex);
      if (currentIndex !== 0) {
        throw new Error(`Expected wrap to index 0, got: ${currentIndex}`);
      }

// console.log('✓ Wrapping to first match works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should navigate to previous match',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('First match');
  label('Second match');
  label('Third match');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('First match')).toBeVisible();

      // Find "match"
      browser.findInPage('match');

      // Navigate to second match
      browser.findNext();
      let currentIndex = browser.getFindCurrentIndex();
// console.log('At second match:', currentIndex);
      if (currentIndex !== 1) {
        throw new Error(`Expected index 1, got: ${currentIndex}`);
      }

      // Navigate to previous match (back to first)
      const moved = browser.findPrevious();
      if (!moved) {
        throw new Error('Expected findPrevious to return true');
      }
      currentIndex = browser.getFindCurrentIndex();
// console.log('After findPrevious:', currentIndex);
      if (currentIndex !== 0) {
        throw new Error(`Expected index 0, got: ${currentIndex}`);
      }

// console.log('✓ Navigate to previous match works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should wrap to last match when navigating before first',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Match one');
  label('Match two');
  label('Match three');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Match one')).toBeVisible();

      // Find "Match"
      const matchCount = browser.findInPage('Match');
// console.log('Match count:', matchCount);
      if (matchCount !== 3) {
        throw new Error(`Expected 3 matches, found ${matchCount}`);
      }

      // Should start at first match (index 0)
      let currentIndex = browser.getFindCurrentIndex();
      if (currentIndex !== 0) {
        throw new Error(`Expected initial index 0, got: ${currentIndex}`);
      }

      // Navigate before first match (should wrap to last)
      browser.findPrevious();
      currentIndex = browser.getFindCurrentIndex();
// console.log('After wrap to last:', currentIndex);
      if (currentIndex !== 2) {
        throw new Error(`Expected wrap to index 2, got: ${currentIndex}`);
      }

// console.log('✓ Wrapping to last match works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should clear find state',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test content');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test content')).toBeVisible();

      // Find "Test"
      const matchCount = browser.findInPage('Test');
// console.log('Match count:', matchCount);
      if (matchCount === 0) {
        throw new Error('Expected to find matches');
      }

      // Verify find state is set
      if (browser.getFindQuery() === '') {
        throw new Error('Expected find query to be set');
      }
      if (browser.getFindMatchesCount() === 0) {
        throw new Error('Expected matches count to be > 0');
      }

      // Clear find
      browser.clearFind();

      // Verify find state is cleared
      const query = browser.getFindQuery();
      if (query !== '') {
        throw new Error(`Expected empty query after clear, got: ${query}`);
      }

      const matches = browser.getFindMatchesCount();
      if (matches !== 0) {
        throw new Error(`Expected 0 matches after clear, got: ${matches}`);
      }

      const index = browser.getFindCurrentIndex();
      if (index !== -1) {
        throw new Error(`Expected index -1 after clear, got: ${index}`);
      }

// console.log('✓ Clear find state works correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle no matches found',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Hello World');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Hello World')).toBeVisible();

      // Search for text that doesn't exist
      const matchCount = browser.findInPage('nonexistent');
// console.log('Match count for nonexistent text:', matchCount);

      if (matchCount !== 0) {
        throw new Error(`Expected 0 matches, found ${matchCount}`);
      }

      // Verify find query is still set (user searched for it)
      const query = browser.getFindQuery();
      if (query !== 'nonexistent') {
        throw new Error(`Expected query 'nonexistent', got: ${query}`);
      }

      // Verify no matches
      const matches = browser.getFindMatchesCount();
      if (matches !== 0) {
        throw new Error(`Expected 0 matches, got: ${matches}`);
      }

      // Verify current index is -1 (no match)
      const index = browser.getFindCurrentIndex();
      if (index !== -1) {
        throw new Error(`Expected index -1, got: ${index}`);
      }

      // Verify findNext returns false when no matches
      const movedNext = browser.findNext();
      if (movedNext) {
        throw new Error('Expected findNext to return false when no matches');
      }

      // Verify findPrevious returns false when no matches
      const movedPrev = browser.findPrevious();
      if (movedPrev) {
        throw new Error('Expected findPrevious to return false when no matches');
      }

// console.log('✓ No matches found handled correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should handle empty query',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Test content');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Test content')).toBeVisible();

      // First set up a search
      browser.findInPage('Test');
      if (browser.getFindMatchesCount() === 0) {
        throw new Error('Expected to find matches for Test');
      }

      // Now search with empty query (should clear find state)
      const matchCount = browser.findInPage('');
// console.log('Match count for empty query:', matchCount);

      if (matchCount !== 0) {
        throw new Error(`Expected 0 matches for empty query, found ${matchCount}`);
      }

      // Verify find state is cleared
      const query = browser.getFindQuery();
      if (query !== '') {
        throw new Error(`Expected empty query, got: ${query}`);
      }

      const matches = browser.getFindMatchesCount();
      if (matches !== 0) {
        throw new Error(`Expected 0 matches, got: ${matches}`);
      }

// console.log('✓ Empty query handled correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should find overlapping matches',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('aaa');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('aaa')).toBeVisible();

      // Find "aa" in "aaa" - should find 2 overlapping matches
      const matchCount = browser.findInPage('aa');
// console.log('Match count for overlapping:', matchCount);

      if (matchCount !== 2) {
        throw new Error(`Expected 2 overlapping matches, found ${matchCount}`);
      }

// console.log('✓ Overlapping matches handled correctly');
    },
    { timeout: 30000 }
  );

  browserTest(
    'should persist find across page navigation',
    [
      {
        path: '/page1',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page one content');
});
        `
      },
      {
        path: '/page2',
        code: `
const { vbox, label } = tsyne;

vbox(() => {
  label('Page two content');
});
        `
      }
    ],
    async (browserTest) => {
      const browser = await browserTest.createBrowser('/page1');
      const ctx = browserTest.getContext();

      await ctx.expect(ctx.getByText('Page one content')).toBeVisible();

      // Find "one" on page 1
      const matchCount1 = browser.findInPage('one');
// console.log('Match count on page 1:', matchCount1);
      if (matchCount1 === 0) {
        throw new Error('Expected to find "one" on page 1');
      }

      // Navigate to page 2
      await browser.changePage(browserTest.getTestUrl('/page2'));
      await ctx.expect(ctx.getByText('Page two content')).toBeVisible();

      // Find query should still be "one" but no matches on page 2
      const query = browser.getFindQuery();
// console.log('Find query after navigation:', query);
      if (query !== 'one') {
        throw new Error(`Expected query 'one' to persist, got: ${query}`);
      }

      // Can search for "two" on page 2
      const matchCount2 = browser.findInPage('two');
// console.log('Match count on page 2:', matchCount2);
      if (matchCount2 === 0) {
        throw new Error('Expected to find "two" on page 2');
      }

// console.log('✓ Find persists across navigation correctly');
    },
    { timeout: 30000 }
  );
});

// Run all tests
runBrowserTests().catch(err => {
  console.error('Browser tests failed:', err);
  process.exit(1);
});
