/**
 * Screenshot capture script for Visual Editor
 *
 * This script uses Puppeteer to capture screenshots of the WYSIWYG editor
 * for documentation purposes.
 *
 * Prerequisites:
 *   npm install puppeteer
 *
 * Usage:
 *   TAKE_SCREENSHOTS=1 node visual-editor/capture-screenshots.js
 *
 * Screenshots will be saved to: visual-editor/screenshots/
 */

const fs = require('fs');
const path = require('path');

// Check if we should take screenshots
if (process.env.TAKE_SCREENSHOTS !== '1') {
  console.log('ℹ️  Set TAKE_SCREENSHOTS=1 to capture screenshots');
  process.exit(0);
}

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('❌ Puppeteer not installed. Run: npm install --save-dev puppeteer');
  process.exit(1);
}

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const SERVER_URL = 'http://localhost:3000';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting Visual Editor screenshot capture...\n');

  const browser = await puppeteer.launch({
    headless: false,  // Set to false to see what's happening
    defaultViewport: {
      width: 1400,
      height: 900
    }
  });

  const page = await browser.newPage();

  try {
    // Screenshot 1: Initial load
    console.log('📸 Capturing: Initial editor view...');
    await page.goto(SERVER_URL, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.container', { timeout: 5000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-initial-view.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 01-initial-view.png\n');

    // Screenshot 2: Load file button
    console.log('📸 Capturing: Load file dialog...');
    await page.click('#load-btn');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-load-dialog.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 02-load-dialog.png\n');

    // Screenshot 3: File loaded with widget tree
    console.log('📸 Capturing: File loaded with widget tree...');
    await page.type('#file-path', 'examples/hello.ts');
    await page.click('button:has-text("Load")'); // Assumes there's a Load button in dialog
    await page.waitForTimeout(2000);  // Wait for file to load
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-file-loaded.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 03-file-loaded.png\n');

    // Screenshot 4: Widget selected showing properties
    console.log('📸 Capturing: Widget selected with properties panel...');
    // Click on the first label in the tree
    await page.click('.tree-item[data-type="label"]');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-widget-selected.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 04-widget-selected.png\n');

    // Screenshot 5: Editing a property
    console.log('📸 Capturing: Editing widget property...');
    await page.click('#property-text');  // Assumes text property input
    await page.keyboard.press('End');
    await page.keyboard.type(' - EDITED');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-property-editing.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 05-property-editing.png\n');

    // Screenshot 6: Widget palette
    console.log('📸 Capturing: Widget palette...');
    // Scroll to show palette if needed
    await page.evaluate(() => {
      document.querySelector('.widget-palette').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-widget-palette.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 06-widget-palette.png\n');

    // Screenshot 7: After adding widget
    console.log('📸 Capturing: After adding new widget...');
    await page.click('.palette-item[data-type="label"]');  // Add a label
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-widget-added.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 07-widget-added.png\n');

    // Screenshot 8: Save confirmation
    console.log('📸 Capturing: Save changes...');
    await page.click('#save-btn');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-save-changes.png'),
      fullPage: true
    });
    console.log('   ✓ Saved: 08-save-changes.png\n');

    console.log('✅ All screenshots captured successfully!\n');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  // Check if server is running
  const http = require('http');

  return new Promise((resolve, reject) => {
    http.get(SERVER_URL, (res) => {
      console.log('✓ Server is running\n');
      captureScreenshots()
        .then(resolve)
        .catch(reject);
    }).on('error', () => {
      console.error('❌ Server is not running!');
      console.error('   Start it with: cd visual-editor && node server.js\n');
      reject(new Error('Server not running'));
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Screenshot capture failed:', error.message);
    process.exit(1);
  });
