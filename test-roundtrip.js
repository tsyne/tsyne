/**
 * Round-trip test: Load -> Edit -> Save -> Verify
 */

const fs = require('fs');
const path = require('path');

// Source editor class
class SourceCodeEditor {
  constructor(filePath) {
    this.filePath = filePath;
    this.lines = fs.readFileSync(filePath, 'utf8').split('\n');
  }

  findAndReplace(searchText, replaceText) {
    let found = false;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].includes(searchText)) {
        this.lines[i] = this.lines[i].replace(searchText, replaceText);
        found = true;
        console.log(`  Line ${i + 1}: Found and replaced`);
      }
    }
    return found;
  }

  getSourceCode() {
    return this.lines.join('\n');
  }

  save(outputPath) {
    fs.writeFileSync(outputPath, this.getSourceCode(), 'utf8');
  }
}

console.log('=== Tsyne Designer Round-Trip Test ===\n');

// Step 1: Load original file
const helloPath = path.join(__dirname, 'examples', 'hello.ts');
console.log('Step 1: Loading examples/hello.ts...');
const originalCode = fs.readFileSync(helloPath, 'utf8');
console.log('Original file:');
console.log(originalCode);

// Step 2: Edit the file
console.log('\nStep 2: Editing "Click Me" -> "Press Me!"...');
const editor = new SourceCodeEditor(helloPath);
const found = editor.findAndReplace('"Click Me"', '"Press Me!"');

if (!found) {
  console.error('Error: Could not find "Click Me" in the file');
  process.exit(1);
}

// Step 3: Save edited version
const editedPath = path.join(__dirname, 'examples', 'hello.edited.ts');
console.log(`\nStep 3: Saving to ${editedPath}...`);
editor.save(editedPath);

console.log('\nEdited file:');
const editedCode = fs.readFileSync(editedPath, 'utf8');
console.log(editedCode);

// Step 4: Verify the change
console.log('\nStep 4: Verifying changes...');
if (editedCode.includes('"Press Me!"') && !editedCode.includes('"Click Me"')) {
  console.log('✓ Edit successful!');
  console.log('✓ Round-trip test PASSED');
} else {
  console.error('✗ Edit failed!');
  console.error('✗ Round-trip test FAILED');
  process.exit(1);
}

// Step 5: Show diff
console.log('\nStep 5: Diff:');
const originalLines = originalCode.split('\n');
const editedLines = editedCode.split('\n');

for (let i = 0; i < Math.max(originalLines.length, editedLines.length); i++) {
  if (originalLines[i] !== editedLines[i]) {
    console.log(`Line ${i + 1}:`);
    console.log(`  - ${originalLines[i]}`);
    console.log(`  + ${editedLines[i]}`);
  }
}

console.log('\n=== Round-Trip Test Complete ===');
