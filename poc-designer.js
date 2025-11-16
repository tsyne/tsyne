/**
 * Test script for Tsyne Designer proof of concept
 */

const fs = require('fs');
const path = require('path');

// Metadata store
const metadataStore = new Map();
let currentParent = null;
let widgetIdCounter = 0;

// Parse stack trace
function parseStackTrace(stack) {
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\((.+):(\d+):(\d+)\)/);
    if (match && !match[1].includes('node_modules') && !match[1].includes('poc-designer')) {
      return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
    }
  }
  return null;
}

// Capture widget
function captureWidget(type, props) {
  const widgetId = `widget-${widgetIdCounter++}`;
  const location = parseStackTrace(new Error().stack || '');
  const metadata = {
    widgetId,
    widgetType: type,
    sourceLocation: location || { file: 'unknown', line: 0, column: 0 },
    properties: props,
    parent: currentParent
  };
  metadataStore.set(widgetId, metadata);
  return widgetId;
}

// Designer API
const designer = {
  app(options, builder) {
    console.log('Designer: Loading app...');
    builder(designer);
  },
  window(options, builder) {
    captureWidget('window', options);
    builder(designer);
  },
  vbox(builder) {
    const widgetId = captureWidget('vbox', {});
    const prev = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prev;
  },
  label(text) { captureWidget('label', { text }); },
  button(text, onClick) { captureWidget('button', { text }); }
};

// Source editor
class SourceCodeEditor {
  constructor(filePath) {
    this.filePath = filePath;
    this.lines = fs.readFileSync(filePath, 'utf8').split('\n');
  }
  updateProperty(metadata, property, newValue) {
    const { line, column } = metadata.sourceLocation;
    if (line === 0 || line > this.lines.length) return false;
    const lineIndex = line - 1;
    const lineContent = this.lines[lineIndex];
    const afterColumn = lineContent.substring(column);
    const match = afterColumn.match(/(['"])((?:(?!\1).)*)\1/);
    if (match) {
      const quote = match[1];
      const startIndex = column + afterColumn.indexOf(match[0]);
      const endIndex = startIndex + match[0].length;
      this.lines[lineIndex] = lineContent.substring(0, startIndex) + `${quote}${newValue}${quote}` + lineContent.substring(endIndex);
      return true;
    }
    return false;
  }
  getSourceCode() { return this.lines.join('\n'); }
  save(outputPath) { fs.writeFileSync(outputPath, this.getSourceCode(), 'utf8'); }
}

// Main test
console.log('=== Tsyne Designer Proof of Concept ===\n');

designer.app({ title: "Hello Tsyne" }, (a) => {
  a.window({ title: "Hello World" }, (w) => {
    a.vbox(() => {
      a.label("Welcome to Tsyne!");
      a.label("A TypeScript wrapper for Fyne");
      a.button("Click Me", () => console.log("clicked"));
      a.button("Exit", () => process.exit(0));
    });
  });
});

console.log('--- Captured Metadata ---\n');
metadataStore.forEach((m, id) => {
  console.log(`${m.widgetType} (${id})`);
  console.log(`  Location: ${m.sourceLocation.file}:${m.sourceLocation.line}:${m.sourceLocation.column}`);
  console.log(`  Properties:`, m.properties);
  console.log('');
});

console.log('--- Widget Tree ---\n');
function printTree(parentId, indent = '') {
  metadataStore.forEach((m, id) => {
    if (m.parent === parentId) {
      const props = Object.entries(m.properties).map(([k,v]) => `${k}="${v}"`).join(' ');
      console.log(`${indent}${m.widgetType} ${props}`);
      printTree(id, indent + '  ');
    }
  });
}
printTree(null);

console.log('\n=== Proof of Concept Complete ===');
