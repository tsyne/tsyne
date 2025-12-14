// Script to capture screenshots of all examples using their test files
// This leverages the existing test infrastructure which already creates apps programmatically

import { TsyneTest } from '../core/src/index-test';
import * as path from 'path';
import * as fs from 'fs';

interface ExampleInfo {
  file: string;
  name: string;
}

const examples: ExampleInfo[] = [
  { file: '01-hello-world', name: 'Hello World' },
  { file: '02-counter', name: 'Counter' },
  { file: '03-button-spacer', name: 'Button Spacer' },
  { file: '04-feedback-form', name: 'Feedback Form' },
  { file: '05-live-clock', name: 'Live Clock' },
  { file: '07-signup-form', name: 'Signup Form' },
  { file: '09-players-list', name: 'Players List' },
  { file: '10-multiplication-table', name: 'Multiplication Table' },
  { file: '11-percentage-clock', name: 'Percentage Clock' },
  { file: '12-shopping-list', name: 'Shopping List' },
  { file: '13-tabbed-settings', name: 'Tabbed Settings' },
];

async function captureScreenshot(exampleFile: string, name: string) {
  console.log(`\n📸 Capturing ${name}...`);

  const tsyneTest = new TsyneTest({ headed: true });

  try {
    // Import the test module to get the app creation logic
    const testModule = await import(`./${exampleFile}.test.js`);

    // Most test files have a similar structure - we'll create the app
    // from the first test's logic
    // For a simpler approach, we'll manually instantiate each example

    // For now, just create a placeholder app to demonstrate the process
    const testApp = await tsyneTest.createApp((app) => {
      // This would contain the example's UI creation code
      // Copied from the test file
      app.window({ title: name, width: 400, height: 300 }, (win) => {
        win.setContent(() => {
          app.label(`Screenshot placeholder for ${name}`);
        });
        win.show();
      });
    });

    const ctx = tsyneTest.getContext();
    await testApp.run();

    // Give it time to render
    await ctx.wait(1000);

    // Capture screenshot
    const screenshotPath = path.join(__dirname, 'screenshots', `${exampleFile}.png`);
    await tsyneTest.screenshot(screenshotPath);

    console.log(`✅ Saved: ${screenshotPath}`);

    // Cleanup
    await tsyneTest.cleanup();
    await new Promise(resolve => setTimeout(resolve, 500));

  } catch (error) {
    console.error(`❌ Failed to capture ${name}:`, error);
  }
}

async function main() {
  console.log('📸 Screenshot Capture Tool for Tsyne Examples\n');
  console.log('⚠️  Current Limitation:');
  console.log('   This script creates placeholder screenshots.');
  console.log('   To capture real screenshots, you need to:');
  console.log('   1. Run examples manually in headed mode');
  console.log('   2. Use a system screenshot tool (scrot, gnome-screenshot, etc.)');
  console.log('   3. Or refactor examples to export createApp functions\n');
  console.log('Alternative: Use the test files in headed mode and screenshot manually:\n');
  console.log('   TSYNE_HEADED=1 npm test examples/01-hello-world.test.ts');
  console.log('   # Take screenshot with your OS screenshot tool');
  console.log('   # Save to examples/screenshots/01-hello-world.png\n');

  const shouldContinue = process.argv.includes('--placeholder');

  if (!shouldContinue) {
    console.log('To create placeholder screenshots anyway, run:');
    console.log('   npx tsx examples/capture-screenshots-v2.ts --placeholder');
    return;
  }

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  for (const example of examples) {
    await captureScreenshot(example.file, example.name);
  }

  console.log('\n✨ Placeholder screenshots created!');
  console.log('   Replace with real screenshots by running examples manually');
}

main().catch(console.error);
