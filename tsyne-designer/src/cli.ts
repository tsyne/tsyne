#!/usr/bin/env node

/**
 * CLI tool for testing the Tsyne designer
 */

import * as fs from 'fs';
import * as path from 'path';
import { DesignerLoader } from './designer-loader';
import { SourceCodeEditor } from './source-editor';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: tsyne-designer <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  load <file>              Load a file and show metadata');
    console.log('  preview <file>           Preview swapped imports');
    console.log('  edit <file> <line> <col> <new-text>  Edit a property');
    process.exit(1);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'load': {
        const filePath = args[1];
        if (!filePath) {
          console.error('Error: file path required');
          process.exit(1);
        }

        console.log(`Loading ${filePath} in design mode...\n`);

        const designerApp = await DesignerLoader.loadFile(filePath);
        const metadata = designerApp.exportMetadata();

        console.log('Captured metadata:');
        console.log(JSON.stringify(metadata, null, 2));

        // Show widget tree
        console.log('\nWidget tree:');
        printWidgetTree(designerApp.getWidgetTree(), designerApp.metadata);

        break;
      }

      case 'preview': {
        const filePath = args[1];
        if (!filePath) {
          console.error('Error: file path required');
          process.exit(1);
        }

        const { original, modified } = DesignerLoader.previewSwappedImports(filePath);

        console.log('=== Original imports ===');
        console.log(getImportLines(original));

        console.log('\n=== Modified imports ===');
        console.log(getImportLines(modified));

        break;
      }

      case 'edit': {
        const filePath = args[1];
        const line = parseInt(args[2], 10);
        const column = parseInt(args[3], 10);
        const newText = args[4];

        if (!filePath || isNaN(line) || isNaN(column) || !newText) {
          console.error('Error: edit <file> <line> <col> <new-text>');
          process.exit(1);
        }

        console.log(`Editing ${filePath}:${line}:${column} → "${newText}"\n`);

        // First, load the file to get metadata
        const designerApp = await DesignerLoader.loadFile(filePath);

        // Find the widget at this location
        const widget = designerApp.metadata.getAll().find(
          w => w.sourceLocation.line === line && w.sourceLocation.column === column
        );

        if (!widget) {
          console.error(`No widget found at ${line}:${column}`);
          process.exit(1);
        }

        console.log(`Found widget: ${widget.widgetType} (id: ${widget.widgetId})`);

        // Edit the source
        const editor = new SourceCodeEditor(filePath);
        editor.backup();

        const success = editor.updateWidgetProperty(widget, 'text', newText);

        if (success) {
          const outputPath = filePath + '.edited';
          editor.save(outputPath);
          console.log(`\nSaved edited file to: ${outputPath}`);
          console.log(`Original backed up to: ${filePath}.backup`);
        } else {
          console.error('Failed to edit property');
          process.exit(1);
        }

        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function getImportLines(code: string): string {
  return code
    .split('\n')
    .filter(line => line.includes('import') || line.includes('require'))
    .join('\n');
}

function printWidgetTree(tree: any[], metadataStore: any, indent: string = ''): void {
  for (const widget of tree) {
    const props = Object.entries(widget.properties)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    console.log(`${indent}${widget.widgetType} (${widget.sourceLocation.file}:${widget.sourceLocation.line}:${widget.sourceLocation.column})`);
    if (props) {
      console.log(`${indent}  ${props}`);
    }

    // Print children
    const children = metadataStore.getChildren(widget.widgetId);
    if (children.length > 0) {
      printWidgetTree(children, metadataStore, indent + '  ');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
