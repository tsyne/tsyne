/**
 * Run Browser - Launch Jyne Browser for manual testing
 *
 * Run: npm run build && npx ts-node examples/run-browser.ts
 */

import { createBrowser } from '../src';

async function main() {
  console.log('Starting Jyne Browser...');

  // Create browser with initial URL
  const browser = await createBrowser('http://localhost:3000', {
    title: 'Jyne Browser',
    width: 1000,
    height: 800
  });

  console.log('Browser started! Navigate to http://localhost:3000');

  // Keep running
  await browser.run();
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
