// Script to capture screenshots of all examples for documentation
import { TsyneTest } from '../src/index-test';
import * as path from 'path';

interface ExampleInfo {
  file: string;
  name: string;
  title: string;
}

const examples: ExampleInfo[] = [
  // Simple examples
  { file: '01-hello-world', name: 'Hello World', title: 'Hello' },
  { file: '02-counter', name: 'Counter', title: 'Counter' },
  { file: '03-button-spacer', name: 'Button Spacer', title: 'Button' },
  { file: '04-feedback-form', name: 'Feedback Form', title: 'Feedback' },
  { file: '05-live-clock', name: 'Live Clock', title: 'Date & Time' },
  { file: '07-signup-form', name: 'Signup Form', title: 'Form' },
  { file: '09-players-list', name: 'Players List', title: 'Gastown bingo players' },
  { file: '10-multiplication-table', name: 'Multiplication Table', title: 'Multiplication table' },
  { file: '11-percentage-clock', name: 'Percentage Clock', title: 'Percentage Clock' },
  { file: '12-shopping-list', name: 'Shopping List', title: 'Shopping List' },
  { file: '13-tabbed-settings', name: 'Tabbed Settings', title: 'Settings Panel' },

  // Comprehensive examples
  { file: 'calculator', name: 'Calculator', title: 'Calculator' },
  { file: 'todomvc', name: 'TodoMVC', title: 'TodoMVC' },
  { file: 'todomvc-ngshow', name: 'TodoMVC ngShow', title: 'TodoMVC' },
];

async function captureScreenshot(exampleFile: string, name: string) {
  console.log(`\n📸 Capturing ${name}...`);

  const tsyneTest = new TsyneTest({ headed: true });

  try {
    // Import and run the example
    const exampleModule = require(`./${exampleFile}`);

    // Give it time to render
    await new Promise(resolve => setTimeout(resolve, 1000));

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

async function captureAllScreenshots() {
  console.log('📸 Starting screenshot capture for all examples...');
  console.log('⚠️  Note: Screenshots will be captured in headed mode (windows will appear)\n');

  for (const example of examples) {
    await captureScreenshot(example.file, example.name);
  }

  console.log('\n✨ All screenshots captured!');
  console.log('Screenshots saved to: examples/screenshots/');
}

captureAllScreenshots().catch(console.error);
