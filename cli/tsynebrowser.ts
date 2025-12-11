/**
 * Tsyne Browser - Load Tsyne TypeScript pages from web servers
 *
 * A Swiby-inspired browser that loads Tsyne pages dynamically from HTTP servers.
 * Pages are TypeScript code (not JavaScript) that use the Tsyne API.
 *
 * Usage:
 *   npx tsyne-browser <url>
 *   OR
 *   npx ts-node cli/tsynebrowser.ts <url>
 *
 * Examples:
 *   npx tsyne-browser http://localhost:3000/
 *   npx tsyne-browser https://example.com/tsyne/index
 *
 * To run with sample server:
 *   Terminal 1: node examples/demo-server.js
 *   Terminal 2: npx tsyne-browser http://localhost:3000/
 */

import { createBrowser } from '../core/src/browser';

async function main() {
  // Get URL from command-line arguments
  const url = process.argv[2];

  if (!url) {
    console.error('Tsyne Browser - Load Tsyne TypeScript pages from web servers');
    console.error('');
    console.error('Usage: npx tsyne-browser <url>');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsyne-browser http://localhost:3000/');
    console.error('  npx tsyne-browser https://example.com/tsyne/index');
    console.error('');
    console.error('Note: Pages must be TypeScript code using the Tsyne API,');
    console.error('      not HTML or JavaScript.');
    console.error('');
    console.error('To run with sample server:');
    console.error('  Terminal 1: node examples/demo-server.js');
    console.error('  Terminal 2: npx tsyne-browser http://localhost:3000/');
    process.exit(1);
  }

  // Create browser and navigate to initial page
  const browser = await createBrowser(url, {
    title: 'Tsyne Browser',
    width: 900,
    height: 700
  });

  // Run the browser
  await browser.run();
}

main().catch(err => {
  console.error('Tsyne Browser error:', err.message || err);
  process.exit(1);
});
