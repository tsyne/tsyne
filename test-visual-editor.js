/**
 * Integration test for Visual Editor
 * Tests the API endpoints without needing a browser
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';

// Helper to make HTTP requests
function apiRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Wait for server to be ready
function waitForServer() {
  return new Promise((resolve) => {
    const check = () => {
      http.get('http://localhost:3000', (res) => {
        resolve();
      }).on('error', () => {
        setTimeout(check, 100);
      });
    };
    check();
  });
}

// Main test
async function runTests() {
  console.log('=== Visual Editor Integration Test ===\n');

  try {
    console.log('Waiting for server to be ready...');
    await waitForServer();
    console.log('✓ Server is ready\n');

    // Test 1: Load file
    console.log('Test 1: Load file');
    const loadResult = await apiRequest('/api/load', {
      filePath: 'examples/hello.ts'
    });

    if (!loadResult.success) {
      throw new Error('Load failed: ' + loadResult.error);
    }

    console.log('✓ File loaded successfully');
    console.log(`  File: ${loadResult.filePath}`);
    console.log(`  Widgets found: ${loadResult.metadata.widgets.length}`);

    const metadata = loadResult.metadata;

    // Print widget tree
    console.log('\n  Widget tree:');
    metadata.widgets.forEach(w => {
      const indent = w.parent ? '    ' : '  ';
      const props = w.properties.text ? `"${w.properties.text}"` :
                    w.properties.title ? `"${w.properties.title}"` : '';
      console.log(`${indent}- ${w.widgetType} ${props}`);
    });

    // Test 2: Find and update a button
    console.log('\nTest 2: Update button text');
    const clickMeButton = metadata.widgets.find(
      w => w.widgetType === 'button' && w.properties.text === 'Click Me'
    );

    if (!clickMeButton) {
      throw new Error('Could not find "Click Me" button');
    }

    console.log(`✓ Found button: "${clickMeButton.properties.text}"`);
    console.log(`  Location: ${clickMeButton.sourceLocation.file}:${clickMeButton.sourceLocation.line}`);
    console.log(`  Changing to: "Press Me!"`);

    const updateResult = await apiRequest('/api/update-property', {
      widgetId: clickMeButton.id,
      propertyName: 'text',
      newValue: 'Press Me!'
    });

    if (!updateResult.success) {
      throw new Error('Update failed: ' + updateResult.error);
    }

    console.log('✓ Property updated successfully');

    // Test 3: Save changes
    console.log('\nTest 3: Save changes');
    const saveResult = await apiRequest('/api/save', {});

    if (!saveResult.success) {
      throw new Error('Save failed: ' + saveResult.error);
    }

    console.log('✓ Changes saved successfully');
    console.log(`  Output: ${saveResult.outputPath}`);

    // Test 4: Verify the saved file
    console.log('\nTest 4: Verify saved file');
    const fs = require('fs');
    const path = require('path');

    const editedPath = path.join(__dirname, saveResult.outputPath);
    const editedContent = fs.readFileSync(editedPath, 'utf8');

    if (editedContent.includes('Press Me!') && !editedContent.includes('Click Me')) {
      console.log('✓ File contains updated text');
    } else {
      throw new Error('File does not contain expected changes');
    }

    console.log('\n=== All Tests Passed! ===\n');

    console.log('Summary:');
    console.log('  ✓ File loading works');
    console.log('  ✓ Metadata capture works');
    console.log('  ✓ Property editing works');
    console.log('  ✓ File saving works');
    console.log('  ✓ Round-trip editing works');

    console.log('\nVisual Editor is ready to use!');
    console.log('Open http://localhost:3000 in your browser\n');

    process.exit(0);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
