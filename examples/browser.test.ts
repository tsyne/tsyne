/**
 * TsyneBrowserTest Examples
 *
 * Demonstrates testing Tsyne Browser pages with automated tests
 *
 * Run: npm run build && node examples/browser.test.js
 */

import { browserTest, describeBrowser, runBrowserTests, TsyneBrowserTest } from '../src';

describeBrowser('Tsyne Browser Tests', () => {
  // Test 1: Basic page navigation
  browserTest(
    'should navigate to home page',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Welcome to Home Page');
});
        `
      }
    ],
    async (bt: TsyneBrowserTest) => {
      await bt.createBrowser('/');

      const ctx = bt.getContext();

      // Find the welcome label
      const welcomeLabel = ctx.getByExactText('Welcome to Home Page');
      await ctx.expect(welcomeLabel).toExist();

      console.log('  ✓ Home page loaded successfully');
    }
  );

  // Test 2: Navigation between pages
  browserTest(
    'should navigate between pages',
    [
      {
        path: '/',
        code: `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('Home Page');
  button('Go to About', () => {
    browserContext.changePage('/about');
  });
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
    async (bt: TsyneBrowserTest) => {
      await bt.createBrowser('/');

      const ctx = bt.getContext();

      // Verify we're on home page
      bt.assertUrl('/');
      console.log('  ✓ Started on home page');

      // Click "Go to About" button
      const aboutButton = ctx.getByExactText('Go to About');
      await aboutButton.click();

      // Brief delay for onClick handler to start, then poll for navigation
      await ctx.wait(50);
      await ctx.waitForCondition(
        () => !(bt as any).browser?.loading,
        { timeout: 5000, interval: 10, description: 'navigation to complete' }
      );

      // Verify we're on about page
      bt.assertUrl('/about');
      console.log('  ✓ Navigated to about page');

      // Verify about page content
      const aboutLabel = ctx.getByExactText('About Page');
      await ctx.expect(aboutLabel).toExist();
      console.log('  ✓ About page content loaded');
    }
  );

  // Test 3: Back/Forward navigation
  browserTest(
    'should support back and forward navigation',
    [
      {
        path: '/page1',
        code: `
const { vbox, label, button } = tsyne;
vbox(() => {
  label('Page 1');
  button('Go to Page 2', () => {
    browserContext.changePage('/page2');
  });
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
      }
    ],
    async (bt: TsyneBrowserTest) => {
      await bt.createBrowser('/page1');

      const ctx = bt.getContext();

      // Navigate to page 2
      const page2Button = ctx.getByExactText('Go to Page 2');
      await page2Button.click();

      // Brief delay for onClick handler to start, then poll for navigation
      await ctx.wait(50);
      await ctx.waitForCondition(
        () => !(bt as any).browser?.loading,
        { timeout: 5000, interval: 10, description: 'navigation to page 2' }
      );

      bt.assertUrl('/page2');
      console.log('  ✓ Navigated to page 2');

      // Go back
      await bt.back();
      bt.assertUrl('/page1');
      console.log('  ✓ Back navigation works');

      // Go forward
      await bt.forward();
      bt.assertUrl('/page2');
      console.log('  ✓ Forward navigation works');
    }
  );

  // Test 4: Reload page
  browserTest(
    'should reload current page',
    [
      {
        path: '/',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Reloadable Page');
  label('Time: ' + Date.now());
});
        `
      }
    ],
    async (bt: TsyneBrowserTest) => {
      await bt.createBrowser('/');

      const ctx = bt.getContext();

      // Verify page loaded with reloadable content
      const pageLabel = ctx.getByExactText('Reloadable Page');
      await ctx.expect(pageLabel).toExist();
      console.log('  ✓ Page loaded with reloadable content');

      // Reload (no wait needed - reload() waits for page load)
      await bt.reload();

      // Verify page still has reloadable content (reload succeeded)
      await ctx.expect(pageLabel).toExist();
      console.log('  ✓ Page reloaded successfully');
    }
  );

  // Test 5: Form submission
  browserTest(
    'should handle form submission',
    [
      {
        path: '/',
        code: `
const { vbox, label, entry, button } = tsyne;

let nameEntry;

vbox(() => {
  label('Enter your name:');
  nameEntry = entry('Your name');

  button('Submit', async () => {
    const name = await nameEntry.getText();
    console.log('Submitted name:', name);
    browserContext.changePage('/thanks?name=' + encodeURIComponent(name));
  });
});
        `
      },
      {
        path: '/thanks',
        code: `
const { vbox, label } = tsyne;
vbox(() => {
  label('Thank you!');
});
        `
      }
    ],
    async (bt: TsyneBrowserTest) => {
      await bt.createBrowser('/');

      const ctx = bt.getContext();

      // Find name entry
      const nameEntry = ctx.getByType('entry');
      await ctx.expect(nameEntry).toExist();

      // Type name
      await nameEntry.type('Alice');
      console.log('  ✓ Typed name into entry');

      // Click submit button
      const submitButton = ctx.getByExactText('Submit');
      await submitButton.click();

      // Brief delay for onClick handler to start, then poll for navigation
      await ctx.wait(50);
      await ctx.waitForCondition(
        () => !(bt as any).browser?.loading,
        { timeout: 5000, interval: 10, description: 'form submission navigation' }
      );

      // Verify navigation to thanks page
      const currentUrl = bt.getCurrentUrl();
      if (!currentUrl.includes('/thanks')) {
        throw new Error(`Expected /thanks page, got ${currentUrl}`);
      }
      console.log('  ✓ Form submitted and navigated to thanks page');
    }
  );
});

// Run the tests sequentially
// Tests must run sequentially because they share the same global context
console.log('\n🧪 Running Tsyne Browser Tests...\n');
runBrowserTests();
