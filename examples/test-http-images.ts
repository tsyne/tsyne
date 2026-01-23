/**
 * Test script for HTTP Image Loading
 * Tests the dual-execution discovery pattern for fetching images from HTTP server
 *
 * Prerequisites:
 * 1. Demo server must be running: npx tsx examples/demo-server.ts
 * 2. Build must be up to date: npm run build
 *
 * Run: npx tsx examples/test-http-images.ts
 */

import { createBrowser } from 'tsyne';

async function testHttpImages() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  HTTP Image Loading Test                               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('Starting browser and navigating to images page...\n');

  try {
    // Create browser and navigate to images page
    const browser = await createBrowser('http://localhost:3000/images', {
      title: 'HTTP Image Test',
      width: 800,
      height: 600
    });

    console.log('\n✓ Page loaded successfully!');
    console.log('✓ Check the browser window to verify images are displayed');
    console.log('\nExpected behavior:');
    console.log('  1. Console should show [Discovery] pass');
    console.log('  2. Console should show [ResourceFetch] downloading images');
    console.log('  3. Console should show [Render] pass');
    console.log('  4. Browser window should display three test images:');
    console.log('     - Contain mode (blue background, white circle)');
    console.log('     - Stretch mode (same image)');
    console.log('     - Original mode (same image)');
    console.log('\nBrowser is running. Press Ctrl+C to exit.\n');

    // Keep the app running
    await browser.run();
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

testHttpImages();
