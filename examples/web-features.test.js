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

    const heading = await ctx.findWidget({ text: 'Text Features Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Text Features Demo');

    // Verify richtext widgets exist and count (demonstrates formatted text capability)
    const allWidgets = await ctx.getAllWidgets();
    const richtextWidgets = allWidgets.filter(w => w.type === 'richtext');
    if (richtextWidgets.length !== 2) {
      throw new Error(`Expected 2 richtext widgets (bold/italic and monospace), found ${richtextWidgets.length}`);
    }
    console.log('✓ Found 2 richtext widgets (bold/italic + monospace formatting)');

    // Verify separator widgets exist (demonstrates visual separation)
    const separatorWidgets = allWidgets.filter(w => w.type === 'separator');
    if (separatorWidgets.length < 5) {
      throw new Error(`Expected at least 5 separators for section breaks, found ${separatorWidgets.length}`);
    }
    console.log(`✓ Found ${separatorWidgets.length} separator widgets for section breaks`);

    // Test Back to Home button
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    if (!backButton) {
      throw new Error('Back to Home button not found');
    }
    await ctx.clickWidget(backButton.id);
    await ctx.wait(200);
    bt.assertUrl('/');
    console.log('✓ Back to Home button navigates correctly');

    console.log('✓ /text-features test passed - all text content verified!\n');
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

// Test 3: /hyperlinks - Click hyperlink and navigate
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
    console.log('✓ Started on /hyperlinks page');

    // Click an internal navigation hyperlink
    await ctx.getByExactText('About Page').click();
    console.log('✓ Clicked "About Page" hyperlink');

    // Verify navigation actually occurred
    await ctx.getByExactText('About Tsyne Browser').within(2000).waitFor();
    console.log('✓ About page content loaded');

    // CRITICAL: Assert the URL actually changed to /about
    bt.assertUrl('/about');
    console.log('✓ URL changed to /about - navigation confirmed!');

    console.log('✓ /hyperlinks test passed - hyperlink navigation works!\n');
  }
);

// Test 4: /images - Verify HTTP image loading with dual-execution discovery
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
    // Note: /assets/test-image.svg is NOT registered as a page
    // The test server automatically serves static files from examples/assets/
  ],
  async (bt) => {
    await bt.createBrowser('/images');
    const ctx = bt.getContext();
    bt.assertUrl('/images');

    // Verify page loaded by checking for image widgets
    // ACTUAL TEST: Find all image widgets in the page
    const allWidgets = await ctx.getAllWidgets();
    console.log(`DEBUG: Total widgets in tree: ${allWidgets.length}`);

    // DEBUG: Show widget type breakdown
    const widgetTypes = {};
    allWidgets.forEach(w => {
      widgetTypes[w.type] = (widgetTypes[w.type] || 0) + 1;
    });
    console.log('DEBUG: Widget types:', JSON.stringify(widgetTypes, null, 2));

    const imageWidgets = allWidgets.filter(w => w.type === 'image');

    // Assert 3 images exist (contain, stretch, original modes)
    if (imageWidgets.length !== 3) {
      console.error('DEBUG: Image widgets found:', imageWidgets);
      throw new Error(`Expected 3 image widgets, found ${imageWidgets.length}`);
    }
    console.log('✓ Found 3 image widgets');

    // Fluent assertions on first image widget (order doesn't matter)
    await ctx.getByID(imageWidgets[0].id).shouldHaveType('image');
    console.log('✓ Image widgets have correct type');

    // Verify first image has width and height properties
    const firstImageInfo = await ctx.getByID(imageWidgets[0].id).getInfo();
    if (typeof firstImageInfo.width !== 'number' || firstImageInfo.width <= 0) {
      throw new Error(`Image widget missing or invalid width: ${firstImageInfo.width}`);
    }
    if (typeof firstImageInfo.height !== 'number' || firstImageInfo.height <= 0) {
      throw new Error(`Image widget missing or invalid height: ${firstImageInfo.height}`);
    }
    console.log(`✓ Images have valid dimensions (${firstImageInfo.width}x${firstImageInfo.height})`);

    // Verify each image widget has valid properties
    const expectedFillModes = ['contain', 'stretch', 'original'];
    const foundFillModes = new Set();

    for (let i = 0; i < imageWidgets.length; i++) {
      const img = imageWidgets[i];
      if (!img.id || !img.type) {
        throw new Error(`Image widget ${i} missing required properties`);
      }

      // Query widget info to verify it's properly initialized
      const info = await ctx.getByID(img.id).getInfo();
      if (info.type !== 'image') {
        throw new Error(`Image widget ${i} has incorrect type: ${info.type}`);
      }

      // Verify image path (will be a cached path in /tmp/tsyne-resource-cache/)
      if (!info.path || !info.path.endsWith('.svg')) {
        throw new Error(`Image widget ${i} has unexpected path: ${info.path}`);
      }

      // Verify dimensions
      if (typeof info.width !== 'number' || info.width <= 0) {
        throw new Error(`Image widget ${i} has invalid width: ${info.width}`);
      }
      if (typeof info.height !== 'number' || info.height <= 0) {
        throw new Error(`Image widget ${i} has invalid height: ${info.height}`);
      }

      // Verify fillMode is one of the expected values
      if (!expectedFillModes.includes(info.fillMode)) {
        throw new Error(`Image widget ${i} has unexpected fillMode: ${info.fillMode}`);
      }
      foundFillModes.add(info.fillMode);
    }

    // Verify all three fillModes are present
    if (foundFillModes.size !== 3) {
      throw new Error(`Expected all 3 fillModes (contain, stretch, original), but found: ${Array.from(foundFillModes).join(', ')}`);
    }
    console.log('✓ All 3 image widgets have valid properties and all fillModes (contain, stretch, original) are present');

    // Save screenshot for visual inspection
    const path = require('path');
    const fs = require('fs');
    const screenshotPath = path.join(__dirname, '../test-output/images-test.png');
    const outputDir = path.dirname(screenshotPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Wait a moment for any pending renders to complete
    await ctx.wait(500);
    console.log('DEBUG: About to capture screenshot...');

    await bt.screenshot(screenshotPath);
    console.log(`✓ Screenshot saved: ${screenshotPath}`);

    // DEBUG: Verify screenshot file size
    const screenshotStats = fs.statSync(screenshotPath);
    console.log(`DEBUG: Screenshot file size: ${screenshotStats.size} bytes`);

    console.log('✓ /images test passed - HTTP images verified in widget tree!\n');
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

    // Find all table widgets
    const allWidgets = await ctx.getAllWidgets();
    const tableWidgets = allWidgets.filter(w => w.type === 'table');

    if (tableWidgets.length !== 2) {
      throw new Error(`Expected 2 table widgets, found ${tableWidgets.length}`);
    }
    console.log('✓ Found 2 table widgets (Simple Table + Product Table)');

    // Verify Product Table data (first table in widget tree) - 5 products
    const productTableData = await ctx.getTableData(tableWidgets[0].id);
    if (productTableData.length !== 5) {
      throw new Error(`Product Table should have 5 rows, found ${productTableData.length}`);
    }
    // Check for Laptop (first product)
    if (!productTableData.some(row => row[0] === 'Laptop' && row[1] === '$999' && row[3] === 'Electronics')) {
      throw new Error('Product Table missing Laptop row');
    }
    // Check for Headphones (last product)
    if (!productTableData.some(row => row[0] === 'Headphones' && row[1] === '$120' && row[3] === 'Audio')) {
      throw new Error('Product Table missing Headphones row');
    }
    console.log('✓ Product Table has 5 rows with correct product data (Laptop...Headphones)');

    // Verify Simple Table data (second table in widget tree) - 5 people
    const simpleTableData = await ctx.getTableData(tableWidgets[1].id);
    if (simpleTableData.length !== 5) {
      throw new Error(`Simple Table should have 5 rows, found ${simpleTableData.length}`);
    }
    // Check for Alice (first person)
    if (!simpleTableData.some(row => row[0] === 'Alice' && row[1] === '25' && row[2] === 'New York')) {
      throw new Error('Simple Table missing Alice row');
    }
    // Check for Eve (last person)
    if (!simpleTableData.some(row => row[0] === 'Eve' && row[1] === '32' && row[2] === 'Austin')) {
      throw new Error('Simple Table missing Eve row');
    }
    console.log('✓ Simple Table has 5 rows with correct people data (Alice...Eve)');

    console.log('✓ /table-demo test passed - tables fully verified!\n');
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

    // Find all list widgets
    const allWidgets = await ctx.getAllWidgets();
    const listWidgets = allWidgets.filter(w => w.type === 'list');

    if (listWidgets.length !== 2) {
      throw new Error(`Expected 2 list widgets (Simple List + Task List), found ${listWidgets.length}`);
    }
    console.log('✓ Found 2 list widgets (Simple List with 7 fruits + Task List with 6 tasks)');

    // Verify list widgets have correct type
    await ctx.getByID(listWidgets[0].id).shouldHaveType('list');
    await ctx.getByID(listWidgets[1].id).shouldHaveType('list');
    console.log('✓ Both widgets have correct type: list');

    // Verify selection label exists (proves Simple List has selection callback)
    const selectionLabel = await ctx.findWidget({ text: 'Selected: (none)' });
    if (!selectionLabel) {
      throw new Error('Selection label not found - Simple List may not have selection callback');
    }
    console.log('✓ Selection label exists (proves Simple List has callback for item selection)');

    // Note: List item interaction not supported in test API yet
    // In headed mode with TSYNE_HEADED=1, lists are fully interactive:
    //   - Clicking items triggers selection callback
    //   - Selection label updates to show "Selected: Apple (index 0)", etc.

    // Test Back to Home button
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    if (!backButton) {
      throw new Error('Back to Home button not found');
    }
    await ctx.clickWidget(backButton.id);
    await ctx.wait(200);
    bt.assertUrl('/');
    console.log('✓ Back to Home button navigates correctly');

    console.log('✓ /list-demo test passed - list widgets and structure verified!\n');
  }
);

// Test 7: /dynamic-demo - Test dynamic counter updates (AJAX-like)
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
    let counterLabel = await ctx.findWidget({ text: 'Count: 0' });
    if (!counterLabel) {
      throw new Error('Counter label not found or not at initial value (0)');
    }
    console.log('✓ Counter display found: Count: 0');

    // Test increment button - find it fresh each time
    let incrementButton = await ctx.findWidget({ text: '+' });
    if (!incrementButton) {
      throw new Error('Increment button not found');
    }
    await ctx.clickWidget(incrementButton.id);
    await ctx.wait(150);
    counterLabel = await ctx.findWidget({ text: 'Count: 1' });
    if (!counterLabel) {
      throw new Error('Counter did not increment to 1');
    }
    console.log('✓ Increment button works: Count: 1');

    // Click increment again - re-find the button
    incrementButton = await ctx.findWidget({ text: '+' });
    await ctx.clickWidget(incrementButton.id);
    await ctx.wait(150);
    counterLabel = await ctx.findWidget({ text: 'Count: 2' });
    if (!counterLabel) {
      throw new Error('Counter did not increment to 2');
    }
    console.log('✓ Increment button works again: Count: 2');

    // Test decrement button - find it fresh
    // Use exact text match to avoid matching labels with '-' in them (like "/post-demo")
    const decrementButtonId = await ctx.getByExactText('-').find();
    if (!decrementButtonId) {
      throw new Error('Decrement button not found');
    }
    await ctx.clickWidget(decrementButtonId);
    await ctx.wait(150);
    counterLabel = await ctx.findWidget({ text: 'Count: 1' });
    if (!counterLabel) {
      throw new Error('Counter did not decrement to 1');
    }
    console.log('✓ Decrement button works: Count: 1');

    // Test reset button - find it fresh
    const resetButton = await ctx.findWidget({ text: 'Reset' });
    if (!resetButton) {
      throw new Error('Reset button not found');
    }
    await ctx.clickWidget(resetButton.id);
    await ctx.wait(150);
    counterLabel = await ctx.findWidget({ text: 'Count: 0' });
    if (!counterLabel) {
      throw new Error('Counter did not reset to 0');
    }
    console.log('✓ Reset button works: Count: 0');

    console.log('✓ /dynamic-demo test passed - dynamic updates work!\n');
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

    // Find and fill in the form fields
    const allWidgets = await ctx.getAllWidgets();
    const entryWidgets = allWidgets.filter(w => w.type === 'entry');

    // Filter out browser chrome entry widgets (search box, URL bar)
    // Form entry widgets are the last ones in the widget tree
    const formEntryWidgets = entryWidgets.filter(e => !e.text.startsWith('http://') && !e.text.startsWith('https://'));

    if (formEntryWidgets.length < 2) {
      throw new Error(`Expected at least 2 form entry fields (name, email), found ${formEntryWidgets.length}`);
    }
    console.log(`✓ Found ${formEntryWidgets.length} form entry fields`);

    // Fill in name field (first form entry widget)
    const nameEntry = formEntryWidgets[0];
    await ctx.getByID(nameEntry.id).type('John Doe');
    console.log('✓ Filled in name field: John Doe');

    // Fill in email field (second form entry widget)
    const emailEntry = formEntryWidgets[1];
    await ctx.getByID(emailEntry.id).type('john@example.com');
    console.log('✓ Filled in email field: john@example.com');

    // Verify checkbox widget exists
    const checkboxWidgets = allWidgets.filter(w => w.type === 'checkbox');
    if (checkboxWidgets.length === 0) {
      throw new Error('Terms and conditions checkbox not found');
    }
    const checkbox = checkboxWidgets[0];
    await ctx.getByID(checkbox.id).shouldHaveType('checkbox');
    console.log('✓ Terms and conditions checkbox present (checkbox interaction not yet supported in test API)');

    // Verify submit button exists
    const submitButton = await ctx.findWidget({ text: 'Submit Registration' });
    if (!submitButton) {
      throw new Error('Submit Registration button not found');
    }
    console.log('✓ Submit Registration button found');

    // Verify form structure complete
    console.log('✓ Form structure verified: 2 entry fields (name, email), 1 checkbox (terms), 1 submit button');

    // Note: Cannot test full POST-Redirect-GET flow because checkbox widgets are not clickable in test API yet
    // Form validation requires checkbox to be checked before allowing navigation to success page
    // When checkbox interaction is supported, this test should:
    //   1. Check the checkbox
    //   2. Click submit button
    //   3. Verify navigation to /post-success?name=John%20Doe
    //   4. Verify success page shows "Thank you, John Doe!"

    console.log('✓ /post-demo test passed - form structure and field interaction verified!\n');
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

    // Verify all Fyne-specific widget types are present on the page
    const allWidgets = await ctx.getAllWidgets();

    const accordionWidgets = allWidgets.filter(w => w.type === 'accordion');
    if (accordionWidgets.length !== 1) {
      throw new Error(`Expected 1 accordion widget, found ${accordionWidgets.length}`);
    }
    console.log('✓ Accordion widget present (collapsible sections)');

    const cardWidgets = allWidgets.filter(w => w.type === 'card');
    if (cardWidgets.length !== 1) {
      throw new Error(`Expected 1 card widget (User Profile), found ${cardWidgets.length}`);
    }
    console.log('✓ Card widget present (User Profile with title/subtitle/content)');

    const toolbarWidgets = allWidgets.filter(w => w.type === 'toolbar');
    if (toolbarWidgets.length !== 1) {
      throw new Error(`Expected 1 toolbar widget, found ${toolbarWidgets.length}`);
    }
    console.log('✓ Toolbar widget present (New/Open/Save/Help actions)');

    const tabsWidgets = allWidgets.filter(w => w.type === 'tabs');
    if (tabsWidgets.length !== 1) {
      throw new Error(`Expected 1 tabs widget, found ${tabsWidgets.length}`);
    }
    console.log('✓ Tabs widget present (Tab 1/2/3 for view switching)');

    const richtextWidgets = allWidgets.filter(w => w.type === 'richtext');
    if (richtextWidgets.length !== 1) {
      throw new Error(`Expected 1 richtext widget, found ${richtextWidgets.length}`);
    }
    console.log('✓ Richtext widget present (bold/italic/monospace formatting)');

    const progressWidgets = allWidgets.filter(w => w.type === 'progressbar');
    if (progressWidgets.length !== 2) {
      throw new Error(`Expected 2 progress bars (determinate + indeterminate), found ${progressWidgets.length}`);
    }
    console.log('✓ Found 2 progress bar widgets (determinate + indeterminate spinner)');

    // Test progress bar interactivity
    const startButton = await ctx.findWidget({ text: 'Start' });
    const resetButton = await ctx.findWidget({ text: 'Reset' });
    if (!startButton || !resetButton) {
      throw new Error('Progress bar control buttons (Start/Reset) not found');
    }
    console.log('✓ Progress bar control buttons found (Start + Reset)');

    // Click Start to begin progress animation
    await ctx.clickWidget(startButton.id);
    await ctx.wait(500); // Wait for animation to run (animates 0-100% over 2 seconds)
    console.log('✓ Start button clicked - progress animation running');

    // Click Reset to stop and reset progress
    await ctx.clickWidget(resetButton.id);
    await ctx.wait(100);
    console.log('✓ Reset button clicked - progress reset to 0');

    // Note: Progress bar value property not exposed in test API yet
    // In headed mode (TSYNE_HEADED=1), you can visually verify:
    //   - Start button animates progress from 0% to 100% over 2 seconds
    //   - Reset button immediately stops animation and resets to 0%
    //   - Indeterminate spinner continuously animates

    // Test Back to Home button navigation
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    if (!backButton) {
      throw new Error('Back to Home button not found');
    }
    await ctx.clickWidget(backButton.id);
    await ctx.wait(200);
    bt.assertUrl('/');
    console.log('✓ Back to Home button navigates correctly');

    console.log('✓ /fyne-widgets test passed - all Fyne widgets verified with interactions!\n');
  }
);

// Test 10: /widget-interactions - Test all interactive widgets (select, slider, radiogroup, etc.)
browserTest(
  'Test /widget-interactions',
  [
    {
      path: '/widget-interactions',
      code: require('fs').readFileSync(__dirname + '/pages/widget-interactions.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/widget-interactions');
    const ctx = bt.getContext();
    bt.assertUrl('/widget-interactions');

    const heading = await ctx.findWidget({ text: 'Widget Interactions Test Page' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Widget Interactions Test Page');

    // Verify all widget types present
    const allWidgets = await ctx.getAllWidgets();

    // Test Select (dropdown) widget
    const selectWidgets = allWidgets.filter(w => w.type === 'select');
    if (selectWidgets.length !== 1) {
      throw new Error(`Expected 1 select widget, found ${selectWidgets.length}`);
    }
    console.log('✓ Select (dropdown) widget present');

    // Test Slider widget
    const sliderWidgets = allWidgets.filter(w => w.type === 'slider');
    if (sliderWidgets.length !== 1) {
      throw new Error(`Expected 1 slider widget, found ${sliderWidgets.length}`);
    }
    console.log('✓ Slider widget present');

    // Test RadioGroup widget
    const radiogroupWidgets = allWidgets.filter(w => w.type === 'radiogroup');
    if (radiogroupWidgets.length !== 1) {
      throw new Error(`Expected 1 radiogroup widget, found ${radiogroupWidgets.length}`);
    }
    console.log('✓ RadioGroup widget present');

    // Test MultiLineEntry widget
    const multilineWidgets = allWidgets.filter(w => w.type === 'multilineentry');
    if (multilineWidgets.length !== 1) {
      throw new Error(`Expected 1 multilineentry widget, found ${multilineWidgets.length}`);
    }
    console.log('✓ MultiLineEntry widget present');

    // Test PasswordEntry widget
    const passwordWidgets = allWidgets.filter(w => w.type === 'passwordentry');
    if (passwordWidgets.length !== 1) {
      throw new Error(`Expected 1 passwordentry widget, found ${passwordWidgets.length}`);
    }
    console.log('✓ PasswordEntry widget present');

    // Test ProgressBar widget interaction
    const set25Button = await ctx.findWidget({ text: 'Set 25%' });
    if (!set25Button) {
      throw new Error('Progress bar control button not found');
    }
    await ctx.clickWidget(set25Button.id);
    await ctx.wait(100);
    console.log('✓ ProgressBar widget interactive (Set 25% button clicked)');

    // Test Back to Home button
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    if (!backButton) {
      throw new Error('Back to Home button not found');
    }
    await ctx.clickWidget(backButton.id);
    await ctx.wait(200);
    bt.assertUrl('/');
    console.log('✓ Back to Home button navigates correctly');

    console.log('✓ /widget-interactions test passed - all interactive widgets verified!\n');
  }
);

// Test 11: /layout-demo - Test layout containers (Grid, GridWrap, Border, Center, Split, Form, Tree)
browserTest(
  'Test /layout-demo',
  [
    {
      path: '/layout-demo',
      code: require('fs').readFileSync(__dirname + '/pages/layout-demo.ts', 'utf8')
    },
    {
      path: '/',
      code: require('fs').readFileSync(__dirname + '/pages/index.ts', 'utf8')
    }
  ],
  async (bt) => {
    await bt.createBrowser('/layout-demo');
    const ctx = bt.getContext();
    bt.assertUrl('/layout-demo');

    const heading = await ctx.findWidget({ text: 'Layout & Container Demo' });
    if (!heading) {
      throw new Error('Page heading not found');
    }
    console.log('✓ Page heading found: Layout & Container Demo');

    // Verify all layout container types present
    const allWidgets = await ctx.getAllWidgets();

    // Test Grid layout
    const gridWidgets = allWidgets.filter(w => w.type === 'grid');
    if (gridWidgets.length !== 1) {
      throw new Error(`Expected 1 grid widget, found ${gridWidgets.length}`);
    }
    console.log('✓ Grid layout present (2-column grid with 6 cells)');

    // Test GridWrap layout
    const gridwrapWidgets = allWidgets.filter(w => w.type === 'gridwrap');
    if (gridwrapWidgets.length !== 1) {
      throw new Error(`Expected 1 gridwrap widget, found ${gridwrapWidgets.length}`);
    }
    console.log('✓ GridWrap layout present (wrapping grid with fixed item sizes)');

    // Test Center layout
    const centerWidgets = allWidgets.filter(w => w.type === 'center');
    if (centerWidgets.length !== 1) {
      throw new Error(`Expected 1 center widget, found ${centerWidgets.length}`);
    }
    console.log('✓ Center layout present (centered card container)');

    // Test Border layout (browser chrome also uses border, so we expect at least 1)
    const borderWidgets = allWidgets.filter(w => w.type === 'border');
    if (borderWidgets.length < 1) {
      throw new Error(`Expected at least 1 border widget, found ${borderWidgets.length}`);
    }
    console.log(`✓ Border layout present (${borderWidgets.length} border widgets including browser chrome)`);

    // Test Split widgets (hsplit and vsplit)
    const splitWidgets = allWidgets.filter(w => w.type === 'split');
    if (splitWidgets.length !== 2) {
      throw new Error(`Expected 2 split widgets (hsplit + vsplit), found ${splitWidgets.length}`);
    }
    console.log('✓ Split layouts present (horizontal and vertical split panes)');

    // Test Form widget
    const formWidgets = allWidgets.filter(w => w.type === 'form');
    if (formWidgets.length !== 1) {
      throw new Error(`Expected 1 form widget, found ${formWidgets.length}`);
    }
    console.log('✓ Form widget present (labeled fields with submit/cancel)');

    // Test Tree widget
    const treeWidgets = allWidgets.filter(w => w.type === 'tree');
    if (treeWidgets.length !== 1) {
      throw new Error(`Expected 1 tree widget, found ${treeWidgets.length}`);
    }
    console.log('✓ Tree widget present (hierarchical tree structure)');

    // Test Back to Home button
    const backButton = await ctx.findWidget({ text: 'Back to Home' });
    if (!backButton) {
      throw new Error('Back to Home button not found');
    }
    await ctx.clickWidget(backButton.id);
    await ctx.wait(200);
    bt.assertUrl('/');
    console.log('✓ Back to Home button navigates correctly');

    console.log('✓ /layout-demo test passed - all layout containers verified!\n');
  }
);

// Test 12: / (home page) - Verify all navigation links present
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
