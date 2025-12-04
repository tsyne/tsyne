/**
 * Test script for Tsyne Designer proof of concept
 * This demonstrates loading a file, capturing metadata, and editing properties
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple metadata types
interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

interface WidgetMetadata {
  widgetId: string;
  widgetType: string;
  sourceLocation: SourceLocation;
  properties: Record<string, any>;
  parent: string | null;
}

// Parse stack trace to get source location
function parseStackTrace(stack: string): SourceLocation | null {
  const lines = stack.split('\n');

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\((.+):(\d+):(\d+)\)/);

    if (match && !match[1].includes('node_modules') && !match[1].includes('test-designer')) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
      };
    }
  }

  return null;
}

// Metadata store
const metadataStore: Map<string, WidgetMetadata> = new Map();
let currentParent: string | null = null;
let widgetIdCounter = 0;

// Designer functions that capture metadata
function captureWidget(type: string, props: Record<string, any>): string {
  const widgetId = `widget-${widgetIdCounter++}`;
  const stack = new Error().stack || '';
  const location = parseStackTrace(stack);

  const metadata: WidgetMetadata = {
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
  app(options: any, builder: (a: any) => void) {
    console.log('Designer: Loading app...');
    builder(designer);
  },

  window(options: any, builder: (w: any) => void) {
    const widgetId = captureWidget('window', options);
    builder(designer);
  },

  vbox(builder: () => void) {
    const widgetId = captureWidget('vbox', {});
    const prevParent = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prevParent;
  },

  hbox(builder: () => void) {
    const widgetId = captureWidget('hbox', {});
    const prevParent = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prevParent;
  },

  label(text: string) {
    captureWidget('label', { text });
  },

  button(text: string, onClick?: () => void) {
    captureWidget('button', { text, onClick: onClick?.toString() });
  }
};

// Source code editor
class SourceCodeEditor {
  private lines: string[];

  constructor(private filePath: string) {
    this.lines = fs.readFileSync(filePath, 'utf8').split('\n');
  }

  updateProperty(metadata: WidgetMetadata, property: string, newValue: string): boolean {
    const { line, column } = metadata.sourceLocation;

    if (line === 0 || line > this.lines.length) {
      return false;
    }

    const lineIndex = line - 1;
    const lineContent = this.lines[lineIndex];
    const afterColumn = lineContent.substring(column);

    // Find first string literal
    const match = afterColumn.match(/(['"])((?:(?!\1).)*)\1/);

    if (match) {
      const quote = match[1];
      const startIndex = column + afterColumn.indexOf(match[0]);
      const endIndex = startIndex + match[0].length;

      this.lines[lineIndex] =
        lineContent.substring(0, startIndex) +
        `${quote}${newValue}${quote}` +
        lineContent.substring(endIndex);

      return true;
    }

    return false;
  }

  getSourceCode(): string {
    return this.lines.join('\n');
  }

  save(outputPath: string): void {
    fs.writeFileSync(outputPath, this.getSourceCode(), 'utf8');
  }
}

// Test with hello.ts
console.log('=== Tsyne Designer Proof of Concept ===\n');

// Create a modified version of hello.ts that uses our designer
const helloPath = path.join(__dirname, 'examples', 'hello.ts');
const helloSource = fs.readFileSync(helloPath, 'utf8');

console.log('Original hello.ts:');
console.log(helloSource);
console.log('\n--- Executing in design mode ---\n');

// Execute the code with designer API
metadataStore.clear();
widgetIdCounter = 0;
currentParent = null;

// Simulate executing hello.ts with designer API
designer.app({ title: "Hello Tsyne" }, (a) => {
  a.window({ title: "Hello World" }, (w: any) => {
    a.vbox(() => {
      a.label("Welcome to Tsyne!");
      a.label("A TypeScript wrapper for Fyne");

      a.button("Click Me").onClick(() => {
        console.log("Button clicked!");
      });

      a.button("Exit").onClick(() => {
        process.exit(0);
      });
    });
  });
});

console.log('\n--- Captured Metadata ---\n');

// Show captured metadata
metadataStore.forEach((metadata, id) => {
  console.log(`Widget: ${metadata.widgetType} (${id})`);
  console.log(`  Location: ${metadata.sourceLocation.file}:${metadata.sourceLocation.line}:${metadata.sourceLocation.column}`);
  console.log(`  Properties:`, metadata.properties);
  console.log(`  Parent: ${metadata.parent || 'none'}`);
  console.log('');
});

console.log('--- Widget Tree ---\n');

function printTree(parentId: string | null, indent: string = '') {
  metadataStore.forEach((metadata, id) => {
    if (metadata.parent === parentId) {
      const props = Object.entries(metadata.properties)
        .filter(([k]) => k !== 'onClick')
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');

      console.log(`${indent}${metadata.widgetType} ${props}`);
      printTree(id, indent + '  ');
    }
  });
}

printTree(null);

console.log('\n--- Source Code Editing Demo ---\n');

// Find the "Click Me" button
const clickMeButton = Array.from(metadataStore.values()).find(
  w => w.widgetType === 'button' && w.properties.text === 'Click Me'
);

if (clickMeButton) {
  console.log(`Found button at ${clickMeButton.sourceLocation.file}:${clickMeButton.sourceLocation.line}:${clickMeButton.sourceLocation.column}`);
  console.log(`Current text: "${clickMeButton.properties.text}"`);
  console.log('Changing to: "Press Me!"\n');

  const editor = new SourceCodeEditor(helloPath);
  const success = editor.updateProperty(clickMeButton, 'text', 'Press Me!');

  if (success) {
    const outputPath = path.join(__dirname, 'examples', 'hello.edited.ts');
    editor.save(outputPath);
    console.log(`Saved edited file to: ${outputPath}`);
    console.log('\nEdited content:');
    console.log(editor.getSourceCode());
  } else {
    console.log('Failed to edit property');
  }
}

console.log('\n=== Proof of Concept Complete ===');
