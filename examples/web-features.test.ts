import { browserTest } from 'tsyne';
import * as fs from 'fs';
import * as path from 'path';

describe('Web Features Browser Tests', () => {
  it('Test /text-features', async () => {
    await browserTest(
      'Test /text-features',
      [
        {
          path: '/text-features',
          code: fs.readFileSync(path.join(__dirname, 'pages/text-features.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/text-features');
        const ctx = bt.getContext();
        bt.assertUrl('/text-features');

        await ctx.getByText('Text Features Demo').shouldExist();

        // Verify richtext widgets exist and count (demonstrates formatted text capability)
        const allWidgets = await ctx.getAllWidgets();
        const richtextWidgets = allWidgets.filter((w) => w.type === 'richtext');
        expect(richtextWidgets.length).toBe(2);

        // Verify separator widgets exist (demonstrates visual separation)
        const separatorWidgets = allWidgets.filter((w) => w.type === 'separator');
        expect(separatorWidgets.length).toBeGreaterThanOrEqual(5);

        // Test Back to Home button
        await ctx.getByText('Back to Home').click();
        await ctx.wait(200);
        bt.assertUrl('/');
      }
    );
  });

  it('Test /hyperlinks', async () => {
    await browserTest(
      'Test /hyperlinks',
      [
        {
          path: '/hyperlinks',
          code: fs.readFileSync(path.join(__dirname, 'pages/hyperlinks.ts'), 'utf8'),
        },
        {
          path: '/about',
          code: fs.readFileSync(path.join(__dirname, 'pages/about.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/hyperlinks');
        const ctx = bt.getContext();
        bt.assertUrl('/hyperlinks');

        // Click an internal navigation hyperlink
        await ctx.getByExactText('About Page').click();

        // Verify navigation actually occurred
        await ctx.getByExactText('About Tsyne Browser').within(2000).waitFor();

        // CRITICAL: Assert the URL actually changed to /about
        bt.assertUrl('/about');

        // Test Back to Home button
        await ctx.getByText('Back to Home').click();
        await ctx.wait(200);
        bt.assertUrl('/');
      }
    );
  });

  it('Test /images', async () => {
    await browserTest(
      'Test /images',
      [
        {
          path: '/images',
          code: fs.readFileSync(path.join(__dirname, 'pages/images.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/images');
        const ctx = bt.getContext();
        bt.assertUrl('/images');

        // Verify page loaded by checking for image widgets
        const allWidgets = await ctx.getAllWidgets();
        const imageWidgets = allWidgets.filter((w) => w.type === 'image');

        // Assert 3 images exist (contain, stretch, original modes)
        expect(imageWidgets.length).toBe(3);

        // Fluent assertions on first image widget (order doesn't matter)
        await ctx.getById(imageWidgets[0].id).shouldHaveType('image');

        // Verify first image has width and height properties
        const firstImageInfo = await ctx.getById(imageWidgets[0].id).getInfo();
        expect(typeof firstImageInfo.width).toBe('number');
        expect(firstImageInfo.width).toBeGreaterThan(0);
        expect(typeof firstImageInfo.height).toBe('number');
        expect(firstImageInfo.height).toBeGreaterThan(0);

        // Verify each image widget has valid properties
        const expectedFillModes = ['contain', 'stretch', 'original'];
        const foundFillModes = new Set();

        for (let i = 0; i < imageWidgets.length; i++) {
          const img = imageWidgets[i];
          const info = await ctx.getById(img.id).getInfo();

          expect(info.type).toBe('image');
          expect(typeof info.width).toBe('number');
          expect(info.width).toBeGreaterThan(0);
          expect(typeof info.height).toBe('number');
          expect(info.height).toBeGreaterThan(0);
          expect(expectedFillModes).toContain(info.fillMode);
          foundFillModes.add(info.fillMode);
        }

        expect(foundFillModes.size).toBe(3);
      }
    );
  });

  it('Test /scrolling', async () => {
    await browserTest(
      'Test /scrolling',
      [
        {
          path: '/scrolling',
          code: fs.readFileSync(path.join(__dirname, 'pages/scrolling.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/scrolling');
        const ctx = bt.getContext();
        bt.assertUrl('/scrolling');

        // Verify heading
        await ctx.getByText('Scrolling Demo').shouldExist();

        // Verify first line exists
        await ctx.getByText('Line 1: This is a line of text to demonstrate scrolling. Scroll down to see more!').shouldExist();

        // Verify middle line exists
        await ctx.getByText('Line 50: This is a line of text to demonstrate scrolling. Scroll down to see more!').shouldExist();

        // Verify last line exists (Line 100)
        await ctx.getByText('Line 100: This is a line of text to demonstrate scrolling. Scroll down to see more!').shouldExist();
      }
    );
  });

  it('Test /table-demo', async () => {
    await browserTest(
      'Test /table-demo',
      [
        {
          path: '/table-demo',
          code: fs.readFileSync(path.join(__dirname, 'pages/table-demo.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/table-demo');
        const ctx = bt.getContext();
        bt.assertUrl('/table-demo');

        await ctx.getByText('Table Demo').shouldExist();

        // Find all table widgets
        const allWidgets = await ctx.getAllWidgets();
        const tableWidgets = allWidgets.filter((w) => w.type === 'table');

        expect(tableWidgets.length).toBe(2);

        // Verify Product Table data (first table in widget tree) - 5 products
        const productTableData = await ctx.getTableData(tableWidgets[0].id);
        expect(productTableData.length).toBe(5);
        expect(productTableData).toContainEqual(['Laptop', '$999', 'In Stock', 'Electronics']);
        expect(productTableData).toContainEqual(['Headphones', '$120', 'In Stock', 'Audio']);

        // Verify Simple Table data (second table in widget tree) - 5 people
        const simpleTableData = await ctx.getTableData(tableWidgets[1].id);
        expect(simpleTableData.length).toBe(5);
        expect(simpleTableData).toContainEqual(['Alice', '25', 'New York']);
        expect(simpleTableData).toContainEqual(['Eve', '32', 'Austin']);
      }
    );
  });

  it('Test /list-demo', async () => {
    await browserTest(
      'Test /list-demo',
      [
        {
          path: '/list-demo',
          code: fs.readFileSync(path.join(__dirname, 'pages/list-demo.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/list-demo');
        const ctx = bt.getContext();
        bt.assertUrl('/list-demo');

        await ctx.getByText('List Demo').shouldExist();

        // Find all list widgets
        const allWidgets = await ctx.getAllWidgets();
        const listWidgets = allWidgets.filter((w) => w.type === 'list');

        expect(listWidgets.length).toBe(2);

        // Verify selection label exists (proves Simple List has selection callback)
        await ctx.getByText('Selected: (none)').shouldExist();
      }
    );
  });

  it('Test /dynamic-demo', async () => {
    await browserTest(
      'Test /dynamic-demo',
      [
        {
          path: '/dynamic-demo',
          code: fs.readFileSync(path.join(__dirname, 'pages/dynamic-demo.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/dynamic-demo');
        const ctx = bt.getContext();
        bt.assertUrl('/dynamic-demo');

        await ctx.getByText('Dynamic Updates Demo (AJAX-like)').shouldExist();

        // Verify counter display at initial value
        await ctx.getByText('Count: 0').shouldExist();

        // Test increment button
        await ctx.getByText('+').click();
        await ctx.getByText('Count: 1').shouldExist();

        // Click increment again
        await ctx.getByText('+').click();
        await ctx.getByText('Count: 2').shouldExist();

        // Test decrement button
        await ctx.getByText('-').click();
        await ctx.getByText('Count: 1').shouldExist();

        // Test reset button
        await ctx.getByText('Reset').click();
        await ctx.getByText('Count: 0').shouldExist();
      }
    );
  });

  it('Test /post-demo', async () => {
    await browserTest(
      'Test /post-demo',
      [
        {
          path: '/post-demo',
          code: fs.readFileSync(path.join(__dirname, 'pages/post-demo.ts'), 'utf8'),
        },
        {
          path: '/post-success',
          code: fs.readFileSync(path.join(__dirname, 'pages/post-success.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/post-demo');
        const ctx = bt.getContext();
        bt.assertUrl('/post-demo');

        await ctx.getByText('POST-Redirect-GET Demo').shouldExist();

        // Find and fill in the form fields
        const allWidgets = await ctx.getAllWidgets();
        const entryWidgets = allWidgets.filter((w) => w.type === 'entry');
        const formEntryWidgets = entryWidgets.filter(
          (e) => e.text && !e.text.startsWith('http://') && !e.text.startsWith('https://')
        );

        expect(formEntryWidgets.length).toBeGreaterThanOrEqual(2);

        // Fill in name field (first form entry widget)
        const nameEntry = formEntryWidgets[0];
        await ctx.getById(nameEntry.id).type('John Doe');

        // Fill in email field (second form entry widget)
        const emailEntry = formEntryWidgets[1];
        await ctx.getById(emailEntry.id).type('john@example.com');

        // Verify checkbox widget exists
        const checkboxWidgets = allWidgets.filter((w) => w.type === 'checkbox');
        expect(checkboxWidgets.length).toBe(1);
        await ctx.getById(checkboxWidgets[0].id).shouldHaveType('checkbox');

        // Verify submit button exists
        await ctx.getByText('Submit Registration').shouldExist();
      }
    );
  });

  it('Test /fyne-widgets', async () => {
    await browserTest(
      'Test /fyne-widgets',
      [
        {
          path: '/fyne-widgets',
          code: fs.readFileSync(path.join(__dirname, 'pages/fyne-widgets.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/fyne-widgets');
        const ctx = bt.getContext();
        bt.assertUrl('/fyne-widgets');

        await ctx.getByText('Fyne-Specific Widgets Demo').shouldExist();

        // Verify all Fyne-specific widget types are present on the page
        const allWidgets = await ctx.getAllWidgets();

        const accordionWidgets = allWidgets.filter((w) => w.type === 'accordion');
        expect(accordionWidgets.length).toBe(1);

        const cardWidgets = allWidgets.filter((w) => w.type === 'card');
        expect(cardWidgets.length).toBe(1);

        const toolbarWidgets = allWidgets.filter((w) => w.type === 'toolbar');
        expect(toolbarWidgets.length).toBe(1);

        const tabsWidgets = allWidgets.filter((w) => w.type === 'tabs');
        expect(tabsWidgets.length).toBe(1);

        const richtextWidgets = allWidgets.filter((w) => w.type === 'richtext');
        expect(richtextWidgets.length).toBe(1);

        const progressWidgets = allWidgets.filter((w) => w.type === 'progressbar');
        expect(progressWidgets.length).toBe(2);

        // Test progress bar interactivity
        await ctx.getByText('Start').shouldExist();
        await ctx.getByText('Reset').shouldExist();

        // Click Start to begin progress animation
        await ctx.getByText('Start').click();
        await ctx.wait(500); // Wait for animation to run (animates 0-100% over 2 seconds)

        // Click Reset to stop and reset progress
        await ctx.getByText('Reset').click();
        await ctx.wait(100);

        // Test Back to Home button navigation
        await ctx.getByText('Back to Home').click();
        await ctx.wait(200);
        bt.assertUrl('/');
      }
    );
  });

  it('Test /widget-interactions', async () => {
    await browserTest(
      'Test /widget-interactions',
      [
        {
          path: '/widget-interactions',
          code: fs.readFileSync(path.join(__dirname, 'pages/widget-interactions.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/widget-interactions');
        const ctx = bt.getContext();
        bt.assertUrl('/widget-interactions');

        await ctx.getByText('Widget Interactions Test Page').shouldExist();

        // Verify all widget types present
        const allWidgets = await ctx.getAllWidgets();

        // Test Select (dropdown) widget
        const selectWidgets = allWidgets.filter((w) => w.type === 'select');
        expect(selectWidgets.length).toBe(1);

        // Test Slider widget
        const sliderWidgets = allWidgets.filter((w) => w.type === 'slider');
        expect(sliderWidgets.length).toBe(1);

        // Test RadioGroup widget
        const radiogroupWidgets = allWidgets.filter((w) => w.type === 'radiogroup');
        expect(radiogroupWidgets.length).toBe(1);

        // Test MultiLineEntry widget
        const multilineWidgets = allWidgets.filter((w) => w.type === 'multilineentry');
        expect(multilineWidgets.length).toBe(1);

        // Test PasswordEntry widget
        const passwordWidgets = allWidgets.filter((w) => w.type === 'passwordentry');
        expect(passwordWidgets.length).toBe(1);

        // Test ProgressBar widget interaction
        await ctx.getByText('Set 25%').click();
        await ctx.wait(100);

        // Test Back to Home button
        await ctx.getByText('Back to Home').click();
        await ctx.wait(200);
        bt.assertUrl('/');
      }
    );
  });

  it('Test /layout-demo', async () => {
    await browserTest(
      'Test /layout-demo',
      [
        {
          path: '/layout-demo',
          code: fs.readFileSync(path.join(__dirname, 'pages/layout-demo.ts'), 'utf8'),
        },
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/layout-demo');
        const ctx = bt.getContext();
        bt.assertUrl('/layout-demo');

        await ctx.getByText('Layout & Container Demo').shouldExist();

        // Verify all layout container types present
        const allWidgets = await ctx.getAllWidgets();

        // Test Grid layout
        const gridWidgets = allWidgets.filter((w) => w.type === 'grid');
        expect(gridWidgets.length).toBe(1);

        // Test GridWrap layout
        const gridwrapWidgets = allWidgets.filter((w) => w.type === 'gridwrap');
        expect(gridwrapWidgets.length).toBe(1);

        // Test Center layout
        const centerWidgets = allWidgets.filter((w) => w.type === 'center');
        expect(centerWidgets.length).toBe(1);

        // Test Border layout (browser chrome also uses border, so we expect at least 1)
        const borderWidgets = allWidgets.filter((w) => w.type === 'border');
        expect(borderWidgets.length).toBeGreaterThanOrEqual(1);

        // Test Split widgets (hsplit and vsplit)
        const splitWidgets = allWidgets.filter((w) => w.type === 'split');
        expect(splitWidgets.length).toBe(2);

        // Test Form widget
        const formWidgets = allWidgets.filter((w) => w.type === 'form');
        expect(formWidgets.length).toBe(1);

        // Test Tree widget
        const treeWidgets = allWidgets.filter((w) => w.type === 'tree');
        expect(treeWidgets.length).toBe(1);

        // Test Back to Home button
        await ctx.getByText('Back to Home').click();
        await ctx.wait(200);
        bt.assertUrl('/');
      }
    );
  });

  it('Test /', async () => {
    await browserTest(
      'Test /',
      [
        {
          path: '/',
          code: fs.readFileSync(path.join(__dirname, 'pages/index.ts'), 'utf8'),
        },
      ],
      async (bt) => {
        await bt.createBrowser('/');
        const ctx = bt.getContext();
        bt.assertUrl('/');

        await ctx.getByText('Welcome to Tsyne Browser!').shouldExist();

        // Verify all four section headers present
        await ctx.getByText('=== Core Web/HTML Features ===').shouldExist();
        await ctx.getByText('=== Forms & User Input ===').shouldExist();
        await ctx.getByText('=== Dynamic Features (AJAX / Web 2.0) ===').shouldExist();
        await ctx.getByText('=== Desktop UI Features (Beyond HTML) ===').shouldExist();

        // Verify key navigation buttons (one from each section)
        await ctx.getByText('📝 Text Features (Paragraphs, Headings)').shouldExist();
        await ctx.getByText('📝 Form Demo (Inputs, Checkboxes, Selects)').shouldExist();
        await ctx.getByText('⚡ Dynamic Updates (AJAX-like)').shouldExist();
        await ctx.getByText('🎨 Fyne-Specific Widgets').shouldExist();
      }
    );
  });
});
