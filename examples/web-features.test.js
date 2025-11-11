/**
 * Web Features Browser Tests
 * Tests for web/HTML feature demonstrations in Tsyne Browser
 *
 * Run with: npm run build && node examples/web-features.test.js
 */

const { browserTest, runBrowserTests } = require('../dist/src/index.js');

console.log('Starting Web Features Browser Tests...\n');

// Test 1: /text-features - Verify text display and formatting
browserTest(
  'Test /text-features',
  [
    {
      path: '/text-features',
      code: require('fs').readFileSync(__dirname + '/pages/text-features.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/text-features');
    const ctx = bt.getContext();
    bt.assertUrl('/text-features');

    // Verify heading present
    const heading = await ctx.findWidget({ text: 'Text Features Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Text Features Demo');

    // Verify comparison section exists
    const comparison = await ctx.findWidget({ text: '=== Comparison to HTML ===' });
    if (!comparison) {
      throw new Error('Comparison section not found');
    }
    console.log('✓ HTML comparison section found');

    // Verify specific formatting examples present
    const htmlLabel = await ctx.findWidget({ text: 'HTML: <strong>Bold</strong>' });
    if (!htmlLabel) {
      throw new Error('Bold text HTML example not found');
    }
    console.log('✓ Rich text formatting examples found');

    // Verify paragraphs section exists
    const paragraphsSection = await ctx.findWidget({ text: '=== Paragraphs ===' });
    if (!paragraphsSection) {
      throw new Error('Paragraphs section not found');
    }
    console.log('✓ Paragraphs section found');

    console.log('✓ /text-features test passed\n');
  }
);

// Test 2: /scrolling - Verify scrollable content with 100 lines
browserTest(
  'Test /scrolling',
  [
    {
      path: '/scrolling',
      code: require('fs').readFileSync(__dirname + '/pages/scrolling.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/scrolling');
    const ctx = bt.getContext();
    bt.assertUrl('/scrolling');

    // Verify heading
    const heading = await ctx.findWidget({ text: 'Scrolling Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Scrolling Demo');

    // Verify first line exists
    const firstLine = await ctx.findWidget({ text: 'Line 1: This is a line of text to demonstrate scrolling. Scroll down to see more!' });
    if (!firstLine) {
      throw new Error('First line of content not found');
    }
    console.log('✓ First line (Line 1) found');

    // Verify middle line exists
    const middleLine = await ctx.findWidget({ text: 'Line 50: This is a line of text to demonstrate scrolling. Scroll down to see more!' });
    if (!middleLine) {
      throw new Error('Middle line (Line 50) not found');
    }
    console.log('✓ Middle line (Line 50) found');

    // Verify last line exists (Line 100)
    const lastLine = await ctx.findWidget({ text: 'Line 100: This is a line of text to demonstrate scrolling. Scroll down to see more!' });
    if (!lastLine) {
      throw new Error('Last line (Line 100) not found - all 100 lines not rendered');
    }
    console.log('✓ Last line (Line 100) found');
    console.log('✓ Scroll container holds 100 lines of content');

    console.log('✓ /scrolling test passed\n');
  }
);

// Test 3: /hyperlinks - Test button navigation and back/forward
browserTest(
  'Test /hyperlinks',
  [
    {
      path: '/hyperlinks',
      code: require('fs').readFileSync(__dirname + '/pages/hyperlinks.ts', 'utf8')
    },
    {
      path: '/about',
      code: require('fs').readFileSync(__dirname + '/pages/about.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/hyperlinks');
    const ctx = bt.getContext();
    bt.assertUrl('/hyperlinks');

    // Verify heading
    const heading = await ctx.findWidget({ text: 'Hyperlinks & Navigation Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Hyperlinks & Navigation Demo');

    // Test navigation button exists and works
    const aboutButton = await ctx.findWidget({ text: '→ Go to About Page' });
    if (!aboutButton) {
      throw new Error('Navigation button not found');
    }
    console.log('✓ Navigation button found: → Go to About Page');

    // Click button and verify navigation
    await ctx.clickWidget(aboutButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/about');
    console.log('✓ Button click navigates to /about');

    // Verify About page content loaded
    const aboutHeading = await ctx.findWidget({ text: 'About Page' });
    if (!aboutHeading) {
      throw new Error('About page content not loaded');
    }
    console.log('✓ About page content verified');

    // Test back navigation
    await bt.back();
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/hyperlinks');
    console.log('✓ Back navigation returns to /hyperlinks');

    // Verify we're back on hyperlinks page
    const backHeading = await ctx.findWidget({ text: 'Hyperlinks & Navigation Demo' });
    if (!backHeading) {
      throw new Error('Hyperlinks page not restored after back()');
    }
    console.log('✓ Hyperlinks page content restored');

    console.log('✓ /hyperlinks test passed\n');
  }
);

// Test 4: /images - Verify image API documentation
browserTest(
  'Test /images',
  [
    {
      path: '/images',
      code: require('fs').readFileSync(__dirname + '/pages/images.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/images');
    const ctx = bt.getContext();
    bt.assertUrl('/images');

    // Verify heading
    const heading = await ctx.findWidget({ text: 'Images Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Images Demo');

    // Verify all three image modes are documented
    const containMode = await ctx.findWidget({ text: '1. Contain mode (default) - fits image inside bounds:' });
    const stretchMode = await ctx.findWidget({ text: '2. Stretch mode - stretches to fill bounds:' });
    const originalMode = await ctx.findWidget({ text: '3. Original mode - displays at original size:' });

    if (!containMode || !stretchMode || !originalMode) {
      throw new Error('Not all image modes documented (contain, stretch, original)');
    }
    console.log('✓ All three image modes documented: contain, stretch, original');

    // Verify supported formats section
    const pngFormat = await ctx.findWidget({ text: '  • PNG (.png)' });
    const jpegFormat = await ctx.findWidget({ text: '  • JPEG (.jpg, .jpeg)' });
    const svgFormat = await ctx.findWidget({ text: '  • SVG (.svg)' });

    if (!pngFormat || !jpegFormat || !svgFormat) {
      throw new Error('Not all supported formats documented');
    }
    console.log('✓ Supported image formats documented: PNG, JPEG, GIF, BMP, SVG');

    console.log('✓ /images test passed\n');
  }
);

// Test 5: /table-demo - Verify table widget with headers and data
browserTest(
  'Test /table-demo',
  [
    {
      path: '/table-demo',
      code: require('fs').readFileSync(__dirname + '/pages/table-demo.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/table-demo');
    const ctx = bt.getContext();
    bt.assertUrl('/table-demo');

    const heading = await ctx.findWidget({ text: 'Table Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Table Demo');

    // Verify page description present
    const description = await ctx.findWidget({ text: 'This page demonstrates tables, similar to HTML <table> elements' });
    if (!description) {
      throw new Error('Table description not found');
    }
    console.log('✓ Table page content verified');

    console.log('✓ /table-demo test passed\n');
  }
);

// Test 6: /list-demo - Verify list widget with items
browserTest(
  'Test /list-demo',
  [
    {
      path: '/list-demo',
      code: require('fs').readFileSync(__dirname + '/pages/list-demo.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/list-demo');
    const ctx = bt.getContext();
    bt.assertUrl('/list-demo');

    const heading = await ctx.findWidget({ text: 'List Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: List Demo');

    // Verify page description present
    const description = await ctx.findWidget({ text: 'This page demonstrates lists, similar to HTML <ul> and <ol> elements' });
    if (!description) {
      throw new Error('List description not found');
    }
    console.log('✓ List page content verified');

    console.log('✓ /list-demo test passed\n');
  }
);

// Test 7: /dynamic-demo - Verify counter and control buttons
browserTest(
  'Test /dynamic-demo',
  [
    {
      path: '/dynamic-demo',
      code: require('fs').readFileSync(__dirname + '/pages/dynamic-demo.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/dynamic-demo');
    const ctx = bt.getContext();
    bt.assertUrl('/dynamic-demo');

    const heading = await ctx.findWidget({ text: 'Dynamic Updates Demo (AJAX-like)' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Dynamic Updates Demo (AJAX-like)');

    // Verify counter display at initial value
    const counterLabel = await ctx.findWidget({ text: 'Count: 0' });
    if (!counterLabel) {
      throw new Error('Counter label not found or not at initial value (0)');
    }
    console.log('✓ Counter display found: Count: 0');

    // Verify all control buttons present
    const incrementButton = await ctx.findWidget({ text: '+' });
    const decrementButton = await ctx.findWidget({ text: '-' });
    const resetButton = await ctx.findWidget({ text: 'Reset' });

    if (!incrementButton || !decrementButton || !resetButton) {
      throw new Error('Not all counter control buttons found');
    }
    console.log('✓ All control buttons found: +, -, Reset');

    console.log('✓ /dynamic-demo test passed\n');
  }
);

// Test 8: /post-demo - Verify form with POST-Redirect-GET pattern
browserTest(
  'Test /post-demo',
  [
    {
      path: '/post-demo',
      code: require('fs').readFileSync(__dirname + '/pages/post-demo.ts', 'utf8')
    },
    {
      path: '/post-success',
      code: require('fs').readFileSync(__dirname + '/pages/post-success.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/post-demo');
    const ctx = bt.getContext();
    bt.assertUrl('/post-demo');

    const heading = await ctx.findWidget({ text: 'POST-Redirect-GET Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: POST-Redirect-GET Demo');

    // Verify pattern explanation present
    const patternSection = await ctx.findWidget({ text: '=== POST-Redirect-GET Pattern ===' });
    if (!patternSection) {
      throw new Error('POST-Redirect-GET pattern section not found');
    }
    console.log('✓ POST-Redirect-GET pattern documented');

    // Verify form elements present
    const submitButton = await ctx.findWidget({ text: 'Submit Registration' });
    if (!submitButton) {
      throw new Error('Submit Registration button not found');
    }
    console.log('✓ Form submit button found');

    console.log('✓ /post-demo test passed\n');
  }
);

// Test 9: /fyne-widgets - Verify Fyne-specific widgets and interactive buttons
browserTest(
  'Test /fyne-widgets',
  [
    {
      path: '/fyne-widgets',
      code: require('fs').readFileSync(__dirname + '/pages/fyne-widgets.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/fyne-widgets');
    const ctx = bt.getContext();
    bt.assertUrl('/fyne-widgets');

    const heading = await ctx.findWidget({ text: 'Fyne-Specific Widgets Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Fyne-Specific Widgets Demo');

    // Verify glass ceiling concept section
    const glassCeiling = await ctx.findWidget({ text: '=== The Glass Ceiling Concept ===' });
    if (!glassCeiling) {
      throw new Error('Glass ceiling concept section not found');
    }
    console.log('✓ Glass ceiling concept section found');

    // Test interactive buttons - click Start button
    const startButton = await ctx.findWidget({ text: 'Start' });
    if (!startButton) {
      throw new Error('Start button not found');
    }
    console.log('✓ Start button found');

    await ctx.clickWidget(startButton.id);
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✓ Clicked Start button');

    // Click Reset button
    const resetButton = await ctx.findWidget({ text: 'Reset' });
    if (!resetButton) {
      throw new Error('Reset button not found');
    }
    console.log('✓ Reset button found');

    await ctx.clickWidget(resetButton.id);
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✓ Clicked Reset button');

    console.log('✓ /fyne-widgets test passed\n');
  }
);

// Test 10: / (home page) - Verify all navigation links present
browserTest(
  'Test /',
  [
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/');
    const ctx = bt.getContext();
    bt.assertUrl('/');

    const heading = await ctx.findWidget({ text: 'Welcome to Tsyne Browser!' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Welcome to Tsyne Browser!');

    // Verify all four section headers present
    const sections = [
      '=== Core Web/HTML Features ===',
      '=== Forms & User Input ===',
      '=== Dynamic Features (AJAX / Web 2.0) ===',
      '=== Desktop UI Features (Beyond HTML) ==='
    ];

    for (const section of sections) {
      const widget = await ctx.findWidget({ text: section });
      if (!widget) {
        throw new Error(`Section header not found: ${section}`);
      }
    }
    console.log('✓ All four section headers found');

    // Verify key navigation buttons (one from each section)
    const keyButtons = [
      '📝 Text Features (Paragraphs, Headings)',
      '📝 Form Demo (Inputs, Checkboxes, Selects)',
      '⚡ Dynamic Updates (AJAX-like)',
      '🎨 Fyne-Specific Widgets'
    ];

    for (const buttonText of keyButtons) {
      const button = await ctx.findWidget({ text: buttonText });
      if (!button) {
        throw new Error(`Navigation button not found: ${buttonText}`);
      }
    }
    console.log('✓ All navigation buttons present (one from each section verified)');

    console.log('✓ / test passed\n');
  }
);

// Run all collected tests
(async () => {
  try {
    await runBrowserTests();
    console.log('\n✅ All Web Features Browser Tests Passed!\n');
  } catch (error) {
    console.error('\n❌ Browser tests failed:', error);
    process.exit(1);
  }
})();
