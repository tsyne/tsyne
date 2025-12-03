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
  { file: 'todomvc-when', name: 'TodoMVC when()', title: 'TodoMVC' },
];

async function captureScreenshot(exampleFile: string, name: string) {
// console.log(`\n📸 Capturing ${name}...`);

  try {
    // Dynamic import to get the example's createApp function
    const exampleModule = await import(`./${exampleFile}.js`);

    // Each example exports a createApp or similar function
    // For now, we'll need to handle each differently
    // This is a placeholder - actual implementation would need per-example logic

    const tsyneTest = new TsyneTest({ headed: true });

    // Note: This requires each example to export its app creation logic
    // as a function that can be called in test mode
    console.warn(`⚠️  Screenshot capture requires examples to be refactored for programmatic use`);
    console.warn(`   Currently examples use top-level app() calls which execute immediately`);

    await tsyneTest.cleanup();

  } catch (error) {
    console.error(`❌ Failed to capture ${name}:`, error);
  }
}

async function captureAllScreenshots() {
// console.log('📸 Starting screenshot capture for all examples...');
// console.log('⚠️  Note: Screenshots will be captured in headed mode (windows will appear)\n');

  for (const example of examples) {
    await captureScreenshot(example.file, example.name);
  }

// console.log('\n✨ All screenshots captured!');
// console.log('Screenshots saved to: examples/screenshots/');
}

captureAllScreenshots().catch(console.error);
