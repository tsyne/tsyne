// Test script for FFI bridge
// Run with: npx tsx examples/test-ffi.ts

import { FfiBridgeConnection } from '../core/src/ffibridge';

async function main() {
  console.log('Testing FFI Bridge...\n');

  // Create FFI connection in headless mode
  console.log('1. Creating FFI connection (headless mode)...');
  const bridge = new FfiBridgeConnection(true);

  console.log('2. Waiting for ready...');
  await bridge.waitUntilReady();
  console.log('   Ready!\n');

  // Test createWindow
  console.log('3. Creating window...');
  const windowResult = await bridge.send('createWindow', {
    id: 'ffi_test_window_1',
    title: 'FFI Test Window',
    width: 400,
    height: 300
  }) as { windowId: string };
  console.log(`   Window created: ${windowResult.windowId}\n`);

  // Test createLabel
  console.log('4. Creating label...');
  const labelResult = await bridge.send('createLabel', {
    id: 'ffi_label_1',
    text: 'Hello from FFI!'
  }) as { widgetId: string };
  console.log(`   Label created: ${labelResult.widgetId}\n`);

  // Test createButton
  console.log('5. Creating button...');
  const buttonResult = await bridge.send('createButton', {
    id: 'ffi_button_1',
    text: 'Click Me'
  }) as { widgetId: string };
  console.log(`   Button created: ${buttonResult.widgetId}\n`);

  // Test getText
  console.log('6. Getting label text...');
  const textResult = await bridge.send('getText', {
    widgetId: labelResult.widgetId
  }) as { text: string };
  console.log(`   Label text: "${textResult.text}"\n`);

  // Test getAllWidgets
  console.log('7. Getting all widgets...');
  const widgetsResult = await bridge.send('getAllWidgets', {}) as { widgets: Array<{id: string, type: string, text: string}> };
  console.log(`   Found ${widgetsResult.widgets.length} widgets:`);
  for (const w of widgetsResult.widgets) {
    console.log(`     - ${w.type}: "${w.text}" (${w.id})`);
  }
  console.log();

  // Test shutdown
  console.log('8. Shutting down...');
  bridge.shutdown();
  console.log('   Done!\n');

  console.log('All FFI tests passed!');
}

main().catch(err => {
  console.error('FFI test failed:', err);
  process.exit(1);
});
