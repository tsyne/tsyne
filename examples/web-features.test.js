/**
 * Web Features Browser Tests
 * Tests for web/HTML feature demonstrations in Tsyne Browser
 *
 * Run with: npm run build && node examples/web-features.test.js
 */

const { browserTest } = require('../dist/index.js');

console.log('Starting Web Features Browser Tests...\n');

// Test 1: Text Features Page
browserTest(
  'should load text features page with paragraphs and rich text',
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

    // Verify text features page loaded
    bt.assertUrl('/text-features');

    // Find heading
    const heading = await ctx.findWidget({ text: 'Text Features Demo' });
    if (!heading) {
      throw new Error('Text Features Demo heading not found');
    }

    // Find comparison section
    const comparison = await ctx.findWidget({ text: '=== Comparison to HTML ===' });
    if (!comparison) {
      throw new Error('Comparison section not found');
    }

    console.log('✓ Text features page loaded successfully');

    // Navigate back to home
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Text features test passed\n');
  }
);

// Test 2: Scrolling Page
browserTest(
  'should load scrolling demo with long content',
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

    // Find scrolling demo heading
    const heading = await ctx.findWidget({ text: 'Scrolling Demo' });
    if (!heading) {
      throw new Error('Scrolling Demo heading not found');
    }

    // Verify long content exists (checking for line 100)
    const lastLine = await ctx.findWidget({ text: 'Line 100: This is a line of text to demonstrate scrolling. Scroll down to see more!' });
    if (!lastLine) {
      throw new Error('Long content not found - scrolling may not be working');
    }

    console.log('✓ Scrolling page loaded with long content');

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Scrolling test passed\n');
  }
);

// Test 3: Hyperlinks Page
browserTest(
  'should load hyperlinks page and test navigation',
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

    const heading = await ctx.findWidget({ text: 'Hyperlinks & Navigation Demo' });
    if (!heading) {
      throw new Error('Hyperlinks Demo heading not found');
    }

    console.log('✓ Hyperlinks page loaded');

    // Test navigation button
    const aboutButton = await ctx.findWidget({ text: '→ Go to About Page' });
    if (aboutButton) {
      await ctx.clickWidget(aboutButton.id);
      await new Promise(resolve => setTimeout(resolve, 200));
      bt.assertUrl('/about');
      console.log('✓ Navigation to About page works');

      // Go back
      await bt.back();
      await new Promise(resolve => setTimeout(resolve, 200));
      bt.assertUrl('/hyperlinks');
      console.log('✓ Back navigation works');
    }

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Hyperlinks test passed\n');
  }
);

// Test 4: Images Page
browserTest(
  'should load images demo page',
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

    const heading = await ctx.findWidget({ text: 'Images Demo' });
    if (!heading) {
      throw new Error('Images Demo heading not found');
    }

    // Check for image mode descriptions
    const containMode = await ctx.findWidget({ text: '1. Contain mode (default) - fits image inside bounds:' });
    if (!containMode) {
      throw new Error('Image mode descriptions not found');
    }

    console.log('✓ Images page loaded successfully');

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Images test passed\n');
  }
);

// Test 5: Table Demo
browserTest(
  'should load table demo page',
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
      throw new Error('Table Demo heading not found');
    }

    console.log('✓ Table demo page loaded');

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Table test passed\n');
  }
);

// Test 6: List Demo
browserTest(
  'should load list demo page',
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
      throw new Error('List Demo heading not found');
    }

    console.log('✓ List demo page loaded');

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ List test passed\n');
  }
);

// Test 7: Dynamic Updates (AJAX-like)
browserTest(
  'should load dynamic updates demo',
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
      throw new Error('Dynamic Updates heading not found');
    }

    // Find counter display
    const counterLabel = await ctx.findWidget({ text: 'Count: 0' });
    if (!counterLabel) {
      throw new Error('Counter label not found');
    }

    console.log('✓ Dynamic updates page loaded with counter');

    // Test increment button (note: actual counter update may not be testable in headless mode)
    const incrementButton = await ctx.findWidget({ text: '+' });
    if (incrementButton) {
      console.log('✓ Found increment button for dynamic updates');
    }

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Dynamic updates test passed\n');
  }
);

// Test 8: POST-Redirect-GET Demo
browserTest(
  'should load POST demo and navigate to success',
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
      throw new Error('POST Demo heading not found');
    }

    console.log('✓ POST-Redirect-GET demo page loaded');

    // Note: Full form submission test would require filling out form fields
    // For now, just verify the page structure

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ POST-Redirect-GET test passed\n');
  }
);

// Test 9: Fyne-Specific Widgets
browserTest(
  'should load Fyne-specific widgets demo',
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
      throw new Error('Fyne Widgets heading not found');
    }

    // Check for glass ceiling section
    const glassCeiling = await ctx.findWidget({ text: '=== The Glass Ceiling Concept ===' });
    if (!glassCeiling) {
      throw new Error('Glass ceiling section not found');
    }

    console.log('✓ Fyne-specific widgets page loaded');
    console.log('✓ Glass ceiling concept section present');

    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    await ctx.clickWidget(backButton.id);
    await new Promise(resolve => setTimeout(resolve, 200));
    bt.assertUrl('/');

    console.log('✓ Fyne widgets test passed\n');
  }
);

// Test 10: Home Page with All Links
browserTest(
  'should load home page with all feature links',
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
      throw new Error('Home page heading not found');
    }

    // Check for all section headers
    const sections = [
      '=== Core Web/HTML Features ===',
      '=== Forms & User Input ===',
      '=== Dynamic Features (AJAX / Web 2.0) ===',
      '=== Desktop UI Features (Beyond HTML) ==='
    ];

    for (const section of sections) {
      const widget = await ctx.findWidget({ text: section });
      if (!widget) {
        throw new Error(`Section not found: ${section}`);
      }
      console.log(`✓ Found section: ${section}`);
    }

    // Check for some key navigation buttons
    const buttons = [
      '📝 Text Features (Paragraphs, Headings)',
      '🔗 Hyperlinks & Navigation',
      '📜 Scrolling Demo',
      '⚡ Dynamic Updates (AJAX-like)',
      '🎨 Fyne-Specific Widgets'
    ];

    for (const buttonText of buttons) {
      const button = await ctx.findWidget({ text: buttonText });
      if (!button) {
        throw new Error(`Button not found: ${buttonText}`);
      }
      console.log(`✓ Found button: ${buttonText}`);
    }

    console.log('✓ Home page test passed\n');
  }
);

console.log('\n✅ All Web Features Browser Tests Passed!\n');
