/**
 * Test Add/Delete Widget Source Code Persistence
 *
 * Tests that add and delete operations actually write to .ts files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';

async function apiCall(endpoint, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE);
    const postData = JSON.stringify(data);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('=== Add/Delete Widget Persistence Test ===\n');

  try {
    // Test 1: Load file
    console.log('Test 1: Load file');
    const loadResult = await apiCall('/api/load', { filePath: 'examples/hello.ts' });

    if (!loadResult.success) {
      throw new Error('Failed to load file');
    }

    console.log('✓ File loaded successfully');
    console.log(`  File: ${loadResult.filePath}`);
    console.log(`  Widgets found: ${loadResult.metadata.widgets.length}\n`);

    const widgets = loadResult.metadata.widgets;

    // Find the vbox container (to add widgets to)
    const vbox = widgets.find(w => w.widgetType === 'vbox');
    if (!vbox) {
      throw new Error('Could not find vbox container');
    }

    console.log(`  Found vbox container: ${vbox.id}\n`);

    // Find a button to delete
    const buttonToDelete = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Click Me');
    if (!buttonToDelete) {
      throw new Error('Could not find button to delete');
    }

    console.log(`  Found button to delete: "${buttonToDelete.properties.text}" at line ${buttonToDelete.sourceLocation.line}\n`);

    // Test 2: Add a new label
    console.log('Test 2: Add new label widget');
    const addResult = await apiCall('/api/add-widget', {
      parentId: vbox.id,
      widgetType: 'label'
    });

    if (!addResult.success) {
      throw new Error('Failed to add widget');
    }

    console.log('✓ Widget added successfully');
    console.log(`  New widget ID: ${addResult.widgetId}\n`);

    // Test 3: Delete the button
    console.log('Test 3: Delete button widget');
    const deleteResult = await apiCall('/api/delete-widget', {
      widgetId: buttonToDelete.id
    });

    if (!deleteResult.success) {
      throw new Error('Failed to delete widget');
    }

    console.log('✓ Widget deleted successfully\n');

    // Test 4: Save changes
    console.log('Test 4: Save changes to file');
    const saveResult = await apiCall('/api/save', {});

    if (!saveResult.success) {
      throw new Error('Failed to save changes');
    }

    console.log('✓ Changes saved successfully');
    console.log(`  Output: ${saveResult.outputPath}\n`);

    // Test 5: Verify saved file
    console.log('Test 5: Verify saved file contents');
    const savedFilePath = path.join(__dirname, saveResult.outputPath);
    const savedCode = fs.readFileSync(savedFilePath, 'utf8');

    console.log('\nSaved file contents:\n');
    console.log('---BEGIN FILE---');
    console.log(savedCode);
    console.log('---END FILE---\n');

    // Check that new label was added
    const hasNewLabel = savedCode.includes('label("New Label")');
    if (!hasNewLabel) {
      throw new Error('New label not found in saved file!');
    }
    console.log('✓ New label found in saved file');

    // Check that deleted button is gone
    const hasDeletedButton = savedCode.includes('button("Click Me"');
    if (hasDeletedButton) {
      throw new Error('Deleted button still exists in saved file!');
    }
    console.log('✓ Deleted button removed from saved file');

    // Test 6: Verify structure
    console.log('\nTest 6: Verify code structure');
    const lines = savedCode.split('\n');
    const labelLines = lines.filter(line => line.trim().startsWith('label('));
    const buttonLines = lines.filter(line => line.trim().startsWith('button('));

    console.log(`  Labels in file: ${labelLines.length} (should be 3: "Welcome", "TypeScript", "New Label")`);
    console.log(`  Buttons in file: ${buttonLines.length} (should be 1: "Exit" only)`);

    if (labelLines.length !== 3) {
      throw new Error(`Expected 3 labels, found ${labelLines.length}`);
    }

    if (buttonLines.length !== 1) {
      throw new Error(`Expected 1 button, found ${buttonLines.length}`);
    }

    console.log('✓ Code structure is correct\n');

    // Summary
    console.log('=== All Tests Passed! ===\n');
    console.log('Summary:');
    console.log('  ✓ File loading works');
    console.log('  ✓ Add widget works (metadata + source code)');
    console.log('  ✓ Delete widget works (metadata + source code)');
    console.log('  ✓ Save persists changes to .ts file');
    console.log('  ✓ Round-trip editing works');
    console.log('  ✓ Code structure is preserved\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTest();
