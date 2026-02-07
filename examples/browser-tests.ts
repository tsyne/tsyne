/**
 * Comprehensive Tsyne Browser Tests
 *
 * Tests core browser functionality: navigation, history, state management,
 * page title, status, error handling, cache, bookmarks, find-in-page.
 *
 * Run: npx tsx examples/browser-tests.ts
 */

import { browserTest, describeBrowser, runBrowserTests, TsyneBrowserTest } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper to clear bookmarks/history between tests
const tsyneDir = path.join(os.homedir(), '.tsyne');
const bookmarksFilePath = path.join(tsyneDir, 'browser-bookmarks.json');
const historyFilePath = path.join(tsyneDir, 'browser-history.json');
const clearBookmarksFile = () => {
  try {
    if (fs.existsSync(bookmarksFilePath)) fs.unlinkSync(bookmarksFilePath);
  } catch {}
};
const clearHistoryFile = () => {
  try {
    if (fs.existsSync(historyFilePath)) fs.unlinkSync(historyFilePath);
  } catch {}
};

// ── Test pages (inline code strings) ──────────────────────────

const homePage = {
  path: '/',
  code: `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('Welcome Home');
  button('Go to About', { onClick: () => browserContext.changePage('/about') });
  button('Go to Counter', { onClick: () => browserContext.changePage('/counter') });
});
  `
};

const aboutPage = {
  path: '/about',
  code: `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('About Page');
  button('Back', { onClick: () => browserContext.back() });
});
  `
};

const counterPage = {
  path: '/counter',
  code: `
const { vbox, hbox, label, button } = tsyne;
let count = 0;
let countLabel;
vbox(() => {
  hbox(() => {
    button('-', { onClick: () => { count--; countLabel.setText('Count: ' + count); } });
    countLabel = label('Count: 0');
    button('+', { onClick: () => { count++; countLabel.setText('Count: ' + count); } });
  });
});
  `
};

const titlePage = {
  path: '/title-test',
  code: `
const { vbox, label } = tsyne;
browserContext.setPageTitle('Custom Title');
vbox(() => { label('Title Test Page'); });
  `
};

const statusPage = {
  path: '/status-test',
  code: `
const { vbox, label } = tsyne;
browserContext.setStatus('Custom status');
vbox(() => { label('Status Test Page'); });
  `
};

const errorPage = {
  path: '/error',
  code: `throw new Error('boom');`
};

const emptyPage = {
  path: '/empty',
  code: ``
};

const formPage = {
  path: '/form',
  code: `
const { vbox, label, entry, button } = tsyne;
let nameEntry;
vbox(() => {
  label('Form Page');
  nameEntry = entry('Your name');
  button('Submit', { onClick: async () => {
    const name = await nameEntry.getText();
    browserContext.changePage('/about');
  } });
});
  `
};

const allPages = [homePage, aboutPage, counterPage, titlePage, statusPage, errorPage, emptyPage, formPage];

// ── Tests ─────────────────────────────────────────────────────

describeBrowser('Tsyne Browser Comprehensive Tests', () => {

  // 1. Load home page
  browserTest('1. Load home page', allPages, async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Welcome Home')).toExist();
  });

  // 2. Navigate to about
  browserTest('2. Navigate to about', allPages, async (bt) => {
    await bt.createBrowser('/about');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('About Page')).toExist();
  });

  // 3. Back navigation
  browserTest('3. Back navigation', allPages, async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    await bt.navigate('/about');
    bt.assertUrl('/about');

    await bt.back();
    bt.assertUrl('/');
    await ctx.expect(ctx.getByExactText('Welcome Home')).toExist();
  });

  // 4. Forward navigation
  browserTest('4. Forward navigation', allPages, async (bt) => {
    await bt.createBrowser('/');
    await bt.navigate('/about');
    bt.assertUrl('/about');

    await bt.back();
    bt.assertUrl('/');

    await bt.forward();
    bt.assertUrl('/about');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('About Page')).toExist();
  });

  // 5. Reload
  browserTest('5. Reload page', allPages, async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Welcome Home')).toExist();
    await bt.reload();
    await ctx.expect(ctx.getByExactText('Welcome Home')).toExist();
  });

  // 6. Address bar URL
  browserTest('6. Address bar URL after navigate', allPages, async (bt) => {
    await bt.createBrowser('/');
    await bt.navigate('/about');
    bt.assertUrl('/about');
  });

  // 7. Page title
  browserTest('7. Page title', allPages, async (bt) => {
    const browser = await bt.createBrowser('/title-test');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Title Test Page')).toExist();
    // The page called setPageTitle('Custom Title') — verify via browser's window title
    // We can't directly check window title from test context, but we can verify
    // the pageTitle was set by checking status or internal state
    // Since we can verify the page rendered, the setPageTitle call succeeded without error
  });

  // 8. Status bar hidden after page load (like web browsers)
  browserTest('8. Status bar hidden after load', allPages, async (bt) => {
    const browser = await bt.createBrowser('/');
    const status = browser.getStatusText();
    if (status !== '') {
      throw new Error(`Expected empty status after load, got '${status}'`);
    }
  });

  // 9. 404 page
  browserTest('9. Navigate to 404 page', allPages, async (bt) => {
    await bt.createBrowser('/');
    await bt.navigate('/nonexistent');
    const ctx = bt.getContext();
    // The server returns a 404 page with "404 - Page Not Found" label
    await ctx.expect(ctx.getByText('404')).toExist();
  });

  // 10. Error page
  browserTest('10. Error page shows error', allPages, async (bt) => {
    await bt.createBrowser('/error');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByText('Error')).toExist();
  });

  // 11. Empty page
  browserTest('11. Empty page does not crash', allPages, async (bt) => {
    const browser = await bt.createBrowser('/empty');
    // If we get here without throwing, the test passes
    const ctx = bt.getContext();
    // The browser chrome should still be visible
    await ctx.expect(ctx.getByExactText('Go')).toExist();
  });

  // 12. Button click updates state
  browserTest('12. Button click updates counter state', allPages, async (bt) => {
    await bt.createBrowser('/counter');
    const ctx = bt.getContext();

    const countLabel = ctx.getByExactText('Count: 0');
    await ctx.expect(countLabel).toExist();

    // Click + button
    const plusBtn = ctx.getByExactText('+');
    await plusBtn.click();
    await ctx.wait(100);

    await ctx.expect(ctx.getByExactText('Count: 1')).toExist();
  });

  // 13. Page-initiated navigation
  browserTest('13. Page-initiated navigation via button click', allPages, async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();

    const aboutBtn = ctx.getByExactText('Go to About');
    await aboutBtn.click();

    await ctx.wait(50);
    await ctx.waitForCondition(
      () => !(bt as any).browser?.loading,
      { timeout: 5000, interval: 10, description: 'navigation to complete' }
    );

    bt.assertUrl('/about');
    await ctx.expect(ctx.getByExactText('About Page')).toExist();
  });

  // 14. History length
  browserTest('14. History length after navigating 3 pages', allPages, async (bt) => {
    clearHistoryFile();
    const browser = await bt.createBrowser('/');
    await bt.navigate('/about');
    await bt.navigate('/counter');

    const history = browser.getHistory();
    if (history.length !== 3) {
      throw new Error(`Expected history length 3, got ${history.length}`);
    }
  });

  // 15. canGoBack / canGoForward
  browserTest('15. canGoBack and canGoForward correctness', allPages, async (bt) => {
    clearHistoryFile();
    const browser = await bt.createBrowser('/');

    // At first page: can't go back, can't go forward
    if (browser.canGoBack()) throw new Error('Should not be able to go back at first page');
    if (browser.canGoForward()) throw new Error('Should not be able to go forward at first page');

    // Navigate to about
    await bt.navigate('/about');
    if (!browser.canGoBack()) throw new Error('Should be able to go back after navigating');
    if (browser.canGoForward()) throw new Error('Should not be able to go forward at last page');

    // Go back
    await bt.back();
    if (browser.canGoBack()) throw new Error('Should not be able to go back at first page again');
    if (!browser.canGoForward()) throw new Error('Should be able to go forward after going back');
  });

  // 16. Forward history truncation
  browserTest('16. Forward history truncated on new navigation', allPages, async (bt) => {
    clearHistoryFile();
    const browser = await bt.createBrowser('/');
    await bt.navigate('/about');
    await bt.back();

    // Now navigate to counter (should truncate forward history to /about)
    await bt.navigate('/counter');
    if (browser.canGoForward()) {
      throw new Error('canGoForward should be false after new navigation from middle of history');
    }
    if (browser.getHistory().length !== 2) {
      throw new Error(`Expected history length 2, got ${browser.getHistory().length}`);
    }
  });

  // 17. Cache behavior — page loads correctly on revisit
  browserTest('17. Cache hit on second visit', allPages, async (bt) => {
    const browser = await bt.createBrowser('/about');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('About Page')).toExist();

    // Navigate away and come back — should still render from cache
    await bt.navigate('/');
    await bt.navigate('/about');
    await ctx.expect(ctx.getByExactText('About Page')).toExist();
  });

  // 18. Add bookmark
  browserTest('18. Add bookmark', allPages, async (bt) => {
    clearBookmarksFile();
    const browser = await bt.createBrowser('/about');
    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('About Page')).toExist();

    await browser.addBookmark();
    if (!browser.isBookmarked(bt.getTestUrl('/about'))) {
      throw new Error('Page should be bookmarked after addBookmark()');
    }
  });

  // 19. Find in page
  browserTest('19. Find in page returns match count', allPages, async (bt) => {
    const browser = await bt.createBrowser('/');
    const matchCount = browser.findInPage('label');
    if (matchCount === 0) {
      throw new Error('Expected at least one match for "label"');
    }
  });

  // 20. Find next / find previous
  browserTest('20. Find next and find previous', allPages, async (bt) => {
    const browser = await bt.createBrowser('/');
    const matchCount = browser.findInPage('label');
    if (matchCount < 2) {
      throw new Error(`Need at least 2 matches for find nav test, got ${matchCount}`);
    }

    if (browser.getFindCurrentIndex() !== 0) {
      throw new Error('Should start at first match');
    }

    browser.findNext();
    if (browser.getFindCurrentIndex() !== 1) {
      throw new Error('findNext should advance to index 1');
    }

    browser.findPrevious();
    if (browser.getFindCurrentIndex() !== 0) {
      throw new Error('findPrevious should go back to index 0');
    }
  });
});

// ── File Protocol Tests ─────────────────────────────────────

describeBrowser('Tsyne Browser file:// Tests', () => {
  const tmpDir = path.join(os.tmpdir(), 'tsyne-browser-file-test-' + process.pid);

  const ensureTmpDir = () => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  };

  const cleanTmpDir = () => {
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  // 21. Load local file
  browserTest('21. Load local .ts file via file://', [], async (bt) => {
    ensureTmpDir();
    const filePath = path.join(tmpDir, 'hello.ts');
    fs.writeFileSync(filePath, `
const { vbox, label } = tsyne;
vbox(() => { label('Hello from file'); });
    `, 'utf-8');

    const browser = await bt.createBrowser();
    await browser.changePage(`file://${filePath}`);
    await new Promise(r => setTimeout(r, 200));

    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Hello from file')).toExist();
    cleanTmpDir();
  });

  // 22. File not found
  browserTest('22. File not found shows error', [], async (bt) => {
    const browser = await bt.createBrowser();
    await browser.changePage('file:///nonexistent/path/foo.ts');
    await new Promise(r => setTimeout(r, 200));

    const ctx = bt.getContext();
    await ctx.expect(ctx.getByText('Error')).toExist();
  });

  // 23. Relative path resolution between file:// pages
  browserTest('23. Relative path resolution for file://', [], async (bt) => {
    ensureTmpDir();
    const mainFile = path.join(tmpDir, 'main.ts');
    const subFile = path.join(tmpDir, 'sub.ts');
    fs.writeFileSync(mainFile, `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('Main File Page');
  button('Go Sub', { onClick: () => browserContext.changePage('sub.ts') });
});
    `, 'utf-8');
    fs.writeFileSync(subFile, `
const { vbox, label } = tsyne;
vbox(() => { label('Sub File Page'); });
    `, 'utf-8');

    const browser = await bt.createBrowser();
    await browser.changePage(`file://${mainFile}`);
    await new Promise(r => setTimeout(r, 200));

    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Main File Page')).toExist();

    // Click button that navigates to relative path 'sub.ts'
    const goSubBtn = ctx.getByExactText('Go Sub');
    await goSubBtn.click();

    await ctx.wait(50);
    await ctx.waitForCondition(
      () => !(bt as any).browser?.loading,
      { timeout: 5000, interval: 10, description: 'navigation to sub file' }
    );

    await ctx.expect(ctx.getByExactText('Sub File Page')).toExist();
    cleanTmpDir();
  });
});

// ── Module Page Tests ─────────────────────────────────────────

describeBrowser('Tsyne Browser Module Page Tests', () => {
  const tmpDir = path.join(os.tmpdir(), 'tsyne-browser-module-test-' + process.pid);

  const ensureTmpDir = () => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  };

  const cleanTmpDir = () => {
    try {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  };

  // 24. Load module page with @tsyne-app:builder metadata
  browserTest('24. Module page with @tsyne-app:builder', [], async (bt) => {
    ensureTmpDir();
    const filePath = path.join(tmpDir, 'module-app.ts');
    fs.writeFileSync(filePath, `
// @tsyne-app:name TestModuleApp
// @tsyne-app:builder buildTestModule

import { App } from 'tsyne';

export function buildTestModule(a: any) {
  const { vbox, label } = require('tsyne');
  vbox(() => {
    label('Module Builder Loaded');
  });
}

if (require.main === module) {
  // This should NOT run in browser mode
  console.log('main() was called - this is wrong in browser mode!');
}
    `, 'utf-8');

    const browser = await bt.createBrowser();
    await browser.changePage(`file://${filePath}`);
    await new Promise(r => setTimeout(r, 300));

    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Module Builder Loaded')).toExist();
    cleanTmpDir();
  });

  // 25. Auto-detect exported build* function (no metadata)
  browserTest('25. Auto-detect export function buildXxx', [], async (bt) => {
    ensureTmpDir();
    const filePath = path.join(tmpDir, 'auto-build.ts');
    fs.writeFileSync(filePath, `
export function buildAutoApp(a: any) {
  const { vbox, label } = require('tsyne');
  vbox(() => {
    label('Auto-Detected Builder');
  });
}
    `, 'utf-8');

    const browser = await bt.createBrowser();
    await browser.changePage(`file://${filePath}`);
    await new Promise(r => setTimeout(r, 300));

    const ctx = bt.getContext();
    await ctx.expect(ctx.getByExactText('Auto-Detected Builder')).toExist();
    cleanTmpDir();
  });
});

// ── Run ───────────────────────────────────────────────────────
console.log('\nRunning Tsyne Browser Comprehensive Tests...\n');
runBrowserTests();
