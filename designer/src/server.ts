/**
 * Tsyne WYSIWYG Designer Server
 * Self-contained server providing design-time API for Tsyne applications
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { WidgetMetadata, SourceLocation } from './metadata';

// State
let currentMetadata: { widgets: any[] } | null = null;
let currentFilePath: string | null = null;
let currentSourceCode: string | null = null;
let currentStyles: Record<string, any> | null = null;
let pendingEdits: any[] = [];

// Simple metadata store (using the POC approach)
const metadataStore = new Map<string, any>();
let currentParent: string | null = null;
let widgetIdCounter = 0;

// Parse stack trace
function parseStackTrace(stack: string): SourceLocation {
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    // Try two formats: "at (file:line:col)" and "at file:line:col"
    let match = line.match(/\((.+):(\d+):(\d+)\)/);
    if (!match) {
      match = line.match(/at\s+(.+):(\d+):(\d+)/);
    }
    if (match && !match[1].includes('node_modules') && !match[1].includes('server')) {
      return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
    }
  }
  return { file: 'unknown', line: 0, column: 0 };
}

// Capture widget
function captureWidget(type: string, props: any): string {
  const widgetId = `widget-${widgetIdCounter++}`;
  const location = parseStackTrace(new Error().stack || '');
  const metadata = {
    id: widgetId,
    widgetType: type,
    sourceLocation: location,
    properties: props,
    eventHandlers: {},
    parent: currentParent
  };
  metadataStore.set(widgetId, metadata);
  return widgetId;
}

// Helper for container widgets
function containerWidget(type: string, props: any, builder: () => void): string {
  const widgetId = captureWidget(type, props);
  const prev = currentParent;
  currentParent = widgetId;
  builder();
  currentParent = prev;
  return widgetId;
}

// Designer API - Complete widget support (emulates Tsyne ABI)
const designer = {
  app(options: any, builder: (a: any) => void) {
    console.log('[Designer] Loading app...');
    builder(designer);
  },

  // Styles API - capture but don't process
  styles(styleDefinitions: any) {
    // In designer mode, capture styles for the CSS editor
    currentStyles = styleDefinitions;
    console.log('[Designer] Loaded styles:', Object.keys(styleDefinitions));
  },

  // FontStyle enum (from src/widgets.ts)
  FontStyle: {
    NORMAL: 0,
    BOLD: 1,
    ITALIC: 2,
    BOLD_ITALIC: 3,
    MONOSPACE: 4
  },

  window(options: any, builder: (win: any) => void) {
    const widgetId = captureWidget('window', options);
    const prev = currentParent;
    currentParent = widgetId;
    const windowObj = {
      setContent: (contentBuilder: () => void) => {
        contentBuilder();
      },
      show: () => {}
    };
    builder(windowObj);
    currentParent = prev;
  },

  // Containers
  vbox(builder: () => void): string { return containerWidget('vbox', {}, builder); },
  hbox(builder: () => void): string { return containerWidget('hbox', {}, builder); },
  scroll(builder: () => void): string { return containerWidget('scroll', {}, builder); },
  center(builder: () => void): string { return containerWidget('center', {}, builder); },

  grid(columns: number, builder: () => void): string {
    return containerWidget('grid', { columns }, builder);
  },

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): string {
    return containerWidget('gridwrap', { itemWidth, itemHeight }, builder);
  },

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): void {
    const widgetId = captureWidget('hsplit', { offset });
    const prev = currentParent;
    currentParent = widgetId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
  },

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): void {
    const widgetId = captureWidget('vsplit', { offset });
    const prev = currentParent;
    currentParent = widgetId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
  },

  tabs(tabDefinitions: any[], location?: string): void {
    const widgetId = captureWidget('tabs', {
      tabs: tabDefinitions.map(t => t.title).join(', '),
      location
    });
    const prev = currentParent;
    currentParent = widgetId;
    tabDefinitions.forEach(tab => tab.builder());
    currentParent = prev;
  },

  card(title: string, subtitle: string, builder: () => void): string {
    return containerWidget('card', { title, subtitle }, builder);
  },

  accordion(items: any[]): void {
    const widgetId = captureWidget('accordion', {
      items: items.map(i => i.title).join(', ')
    });
    const prev = currentParent;
    currentParent = widgetId;
    items.forEach(item => item.builder());
    currentParent = prev;
  },

  form(items: any[], onSubmit?: () => void, onCancel?: () => void): void {
    const widgetId = captureWidget('form', {
      fields: items.map(i => i.label).join(', ')
    });
    if (onSubmit || onCancel) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        if (onSubmit) widget.eventHandlers.onSubmit = onSubmit.toString();
        if (onCancel) widget.eventHandlers.onCancel = onCancel.toString();
      }
    }
  },

  border(config: any): void {
    const widgetId = captureWidget('border', {
      regions: Object.keys(config).join(', ')
    });
    const prev = currentParent;
    currentParent = widgetId;
    if (config.top) config.top();
    if (config.bottom) config.bottom();
    if (config.left) config.left();
    if (config.right) config.right();
    if (config.center) config.center();
    currentParent = prev;
  },

  // Input widgets
  button(text: string, onClick?: () => void, className?: string): void {
    const widgetId = captureWidget('button', { text, className });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
  },

  label(text: string, className?: string, alignment?: string, wrapping?: string, textStyle?: any): void {
    captureWidget('label', { text, className, alignment, wrapping, textStyle });
  },

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void): void {
    const widgetId = captureWidget('entry', { placeholder, minWidth });
    if (onSubmit || onDoubleClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        if (onSubmit) widget.eventHandlers.onSubmit = onSubmit.toString();
        if (onDoubleClick) widget.eventHandlers.onDoubleClick = onDoubleClick.toString();
      }
    }
  },

  multilineentry(placeholder?: string, wrapping?: string): void {
    captureWidget('multilineentry', { placeholder, wrapping });
  },

  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): void {
    const widgetId = captureWidget('passwordentry', { placeholder });
    if (onSubmit) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSubmit = onSubmit.toString();
    }
  },

  checkbox(text: string, onChanged?: (checked: boolean) => void): void {
    const widgetId = captureWidget('checkbox', { text });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
  },

  select(options: string[], onSelected?: (option: string) => void): void {
    const widgetId = captureWidget('select', { options: options.join(', ') });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  radiogroup(options: string[], initialSelected?: string, onSelected?: (option: string) => void): void {
    const widgetId = captureWidget('radiogroup', {
      options: options.join(', '),
      initialSelected
    });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void): void {
    const widgetId = captureWidget('slider', { min, max, initialValue });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
  },

  progressbar(initialValue?: number, infinite?: boolean): void {
    captureWidget('progressbar', { initialValue, infinite });
  },

  // Display widgets
  separator(): void {
    captureWidget('separator', {});
  },

  hyperlink(text: string, url: string): void {
    captureWidget('hyperlink', { text, url });
  },

  image(pathOrOptions: string | any, fillMode?: string, onClick?: () => void, onDrag?: () => void, onDragEnd?: () => void): void {
    const props = typeof pathOrOptions === 'string'
      ? { path: pathOrOptions, fillMode }
      : pathOrOptions;
    const widgetId = captureWidget('image', props);
    if (onClick || onDrag || onDragEnd) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        if (onClick) widget.eventHandlers.onClick = onClick.toString();
        if (onDrag) widget.eventHandlers.onDrag = onDrag.toString();
        if (onDragEnd) widget.eventHandlers.onDragEnd = onDragEnd.toString();
      }
    }
  },

  richtext(segments: any[]): void {
    captureWidget('richtext', {
      text: segments.map(s => s.text).join(' ')
    });
  },

  table(headers: string[], data: any[][]): void {
    captureWidget('table', {
      headers: headers.join(', '),
      rows: data.length
    });
  },

  list(items: string[], onSelected?: (item: string) => void): void {
    const widgetId = captureWidget('list', {
      items: items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '')
    });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  tree(rootLabel: string): void {
    captureWidget('tree', { rootLabel });
  },

  toolbar(toolbarItems: any[]): void {
    const items = toolbarItems
      .filter(i => i.type !== 'separator' && i.type !== 'spacer')
      .map(i => i.label || i.type)
      .join(', ');
    captureWidget('toolbar', { items });
  },

  toolbarAction(label: string, onAction: () => void) {
    return { label, onAction, type: 'action' };
  }
};

// Extract CSS styles from source code
function extractStyles(sourceCode: string): Record<string, any> | null {
  // Look for "const styles = { ... }" pattern
  const stylesMatch = sourceCode.match(/const\s+styles\s*=\s*\{([^]*?)\};/);
  if (!stylesMatch) {
    return null;
  }

  try {
    // Extract the styles object content and convert to JSON format
    let stylesContent = stylesMatch[1];

    // Replace unquoted property names with quoted ones
    stylesContent = stylesContent.replace(/(\w+):/g, '"$1":');
    // Replace single quotes with double quotes
    stylesContent = stylesContent.replace(/'/g, '"');
    // Remove trailing commas before closing braces
    stylesContent = stylesContent.replace(/,(\s*[}\]])/g, '$1');

    // Parse as JSON
    const stylesObj = JSON.parse('{' + stylesContent + '}');
    return stylesObj;
  } catch (error) {
    console.warn('[Designer] Could not parse styles:', error);
    return null;
  }
}

// Load and execute a file in designer mode
function loadFileInDesignerMode(filePath: string): { widgets: any[] } {
  const fullPath = path.join(__dirname, '..', '..', filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  // Read source code
  currentSourceCode = fs.readFileSync(fullPath, 'utf8');
  currentFilePath = filePath;

  // Extract CSS styles
  currentStyles = extractStyles(currentSourceCode);
  if (currentStyles) {
    console.log('[Designer] Found styles:', Object.keys(currentStyles));
  }

  // Reset state
  metadataStore.clear();
  widgetIdCounter = 0;
  currentParent = null;
  pendingEdits = [];

  console.log(`[Designer] Loading file: ${filePath}`);

  // Create temp file with similar name to preserve line numbers in stack traces
  const tempDir = path.join('/tmp', 'tsyne-designer-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, path.basename(filePath, '.ts') + '.js');

  try {
    // Make designer available globally BEFORE writing/executing the file
    (global as any).designer = designer;

    // Use TypeScript compiler to properly transpile the code
    // This handles all TypeScript syntax correctly: type aliases, interfaces, union types, generics, etc.
    const transpileResult = ts.transpileModule(currentSourceCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        removeComments: false,
        // Preserve line numbers for accurate stack traces
        inlineSourceMap: false,
        sourceMap: false
      }
    });

    // REPLACE import statement with global.designer
    // TypeScript transpiles: import { foo } from 'bar' → const bar_1 = require('bar'); (0, bar_1.foo)()
    // We need to replace the module reference with global.designer
    let executableCode = transpileResult.outputText
      // Replace: const src_1 = require("../src"); → (nothing, we'll use global.designer)
      .replace(/(?:var|const|let)\s+(\w+)\s*=\s*require\(['"]\.\.\/src['"]\);?\s*\n?/g, '')
      // Replace: (0, src_1.foo) → global.designer.foo
      .replace(/\(0,\s*\w+\.(\w+)\)/g, 'global.designer.$1')
      // Replace standalone: src_1.foo → global.designer.foo
      .replace(/\b\w+_\d+\.(\w+)/g, 'global.designer.$1')
      // Handle Object.defineProperty exports line
      .replace(/Object\.defineProperty\(exports,\s*"__esModule",\s*\{\s*value:\s*true\s*\}\);?\s*\n?/g, '');

    fs.writeFileSync(tempPath, executableCode, 'utf8');

    // Clear module cache
    delete require.cache[require.resolve(tempPath)];

    // Execute by requiring the file - this gives us proper stack traces with line numbers!
    require(tempPath);

    delete (global as any).designer;

  } finally {
    // Clean up temp files
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    } catch (err: any) {
      console.warn('[Cleanup] Could not remove temp files:', err.message);
    }
  }

  // Build metadata response
  currentMetadata = {
    widgets: Array.from(metadataStore.values())
  };

  return currentMetadata;
}

// Source code editor
class SourceCodeEditor {
  private lines: string[];

  constructor(sourceCode: string) {
    this.lines = sourceCode.split('\n');
  }

  findAndReplace(searchText: string, replaceText: string): boolean {
    let found = false;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].includes(searchText)) {
        this.lines[i] = this.lines[i].replace(searchText, replaceText);
        found = true;
        console.log(`[Editor] Line ${i + 1}: Replaced "${searchText}" with "${replaceText}"`);
      }
    }
    return found;
  }

  addWidget(parentMetadata: any, widgetType: string, properties: any): boolean {
    const parentLine = parentMetadata.sourceLocation.line - 1;

    // Find the closing brace of the parent container's builder function
    const closingBraceLine = this.findClosingBrace(parentLine);

    if (closingBraceLine === -1) {
      console.warn('[Editor] Could not find closing brace for parent');
      return false;
    }

    // Get indentation from parent line
    const indentation = this.getIndentation(parentLine);
    const childIndentation = indentation + '      '; // Match existing indentation in examples

    // Generate widget code
    const widgetCode = this.generateWidgetCode(widgetType, properties, childIndentation);

    // Insert before closing brace
    this.lines.splice(closingBraceLine, 0, widgetCode);

    console.log(`[Editor] Added ${widgetType} at line ${closingBraceLine + 1}`);
    return true;
  }

  removeWidget(metadata: any): boolean {
    const lineIndex = metadata.sourceLocation.line - 1;

    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      console.warn('[Editor] Invalid line index for widget removal');
      return false;
    }

    // Check if this is a multi-line widget (e.g., button with callback)
    const firstLine = this.lines[lineIndex];
    const linesToRemove = [lineIndex];

    // If the line contains an opening brace but no closing brace/semicolon, it's multi-line
    if (firstLine.includes('{') && !firstLine.includes('});')) {
      let braceCount = (firstLine.match(/{/g) || []).length - (firstLine.match(/}/g) || []).length;

      // Continue until we find the closing braces
      for (let i = lineIndex + 1; i < this.lines.length && braceCount > 0; i++) {
        const line = this.lines[i];
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        linesToRemove.push(i);

        // Stop if we've closed all braces and found the semicolon
        if (braceCount === 0) {
          break;
        }
      }
    }

    // Remove all lines in reverse order to avoid index shifting
    for (let i = linesToRemove.length - 1; i >= 0; i--) {
      this.lines.splice(linesToRemove[i], 1);
    }

    console.log(`[Editor] Removed widget at lines ${lineIndex + 1} to ${lineIndex + linesToRemove.length}: ${firstLine.trim()}`);
    return true;
  }

  private getIndentation(lineIndex: number): string {
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      return '';
    }

    const line = this.lines[lineIndex];
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  private findClosingBrace(startLine: number): number {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];

      // Count opening braces
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;

      braceCount += openBraces;
      braceCount -= closeBraces;

      if (openBraces > 0) {
        foundOpenBrace = true;
      }

      // When we've found an opening brace and count returns to 0, we found the closing brace
      if (foundOpenBrace && braceCount === 0) {
        // Return the line before the closing brace (where we want to insert)
        return i;
      }
    }

    return -1;
  }

  private generateWidgetCode(widgetType: string, properties: any, indentation: string): string {
    switch (widgetType) {
      case 'label':
        return `${indentation}label("${properties.text || 'New Label'}");`;

      case 'button':
        return `${indentation}button("${properties.text || 'New Button'}", () => {\n${indentation}  console.log("Button clicked");\n${indentation}});`;

      case 'entry':
        return `${indentation}entry("${properties.placeholder || ''}");`;

      case 'checkbox':
        return `${indentation}checkbox("${properties.text || 'New Checkbox'}");`;

      case 'vbox':
        return `${indentation}vbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'hbox':
        return `${indentation}hbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'scroll':
        return `${indentation}scroll(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'separator':
        return `${indentation}separator();`;

      case 'hyperlink':
        return `${indentation}hyperlink("${properties.text || 'Link'}", "${properties.url || '#'}");`;

      case 'image':
        return `${indentation}image("${properties.path || 'image.png'}");`;

      case 'select':
        return `${indentation}select(["Option 1", "Option 2"]);`;

      case 'grid':
        return `${indentation}grid(2, () => {\n${indentation}  // Add widgets here\n${indentation}});`;

      default:
        return `${indentation}${widgetType}();`;
    }
  }

  updateStyles(styles: Record<string, any>): boolean {
    // Find the styles object in the source code
    let stylesStartLine = -1;
    let stylesEndLine = -1;

    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].match(/const\s+styles\s*=\s*\{/)) {
        stylesStartLine = i;
        // Find the closing brace
        let braceCount = 0;
        for (let j = i; j < this.lines.length; j++) {
          const line = this.lines[j];
          braceCount += (line.match(/{/g) || []).length;
          braceCount -= (line.match(/}/g) || []).length;
          if (braceCount === 0 && line.includes('}')) {
            stylesEndLine = j;
            break;
          }
        }
        break;
      }
    }

    if (stylesStartLine === -1 || stylesEndLine === -1) {
      console.warn('[Editor] Could not find styles object in source');
      return false;
    }

    // Generate new styles code
    const indent = '  ';
    const newStylesLines = ['const styles = {'];

    for (const [className, styleProps] of Object.entries(styles)) {
      newStylesLines.push(`${indent}${className}: {`);
      for (const [prop, value] of Object.entries(styleProps as any)) {
        const valueStr = typeof value === 'string' ? `'${value}'` : value;
        newStylesLines.push(`${indent}${indent}${prop}: ${valueStr},`);
      }
      newStylesLines.push(`${indent}},`);
    }
    newStylesLines.push('};');

    // Replace the old styles with new ones
    this.lines.splice(stylesStartLine, stylesEndLine - stylesStartLine + 1, ...newStylesLines);

    console.log(`[Editor] Updated styles object (lines ${stylesStartLine}-${stylesEndLine})`);
    return true;
  }

  getSourceCode(): string {
    return this.lines.join('\n');
  }
}

// API handlers
const apiHandlers: Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> = {
  '/api/load': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { filePath } = JSON.parse(body);
        const metadata = loadFileInDesignerMode(filePath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          metadata,
          styles: currentStyles,
          filePath: currentFilePath
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/update-property': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { widgetId, propertyName, newValue } = JSON.parse(body);

        const widget = metadataStore.get(widgetId);
        if (!widget) {
          throw new Error('Widget not found');
        }

        const oldValue = widget.properties[propertyName];

        console.log(`[Editor] Updating ${widgetId}.${propertyName}: "${oldValue}" → "${newValue}"`);

        // Record the edit
        pendingEdits.push({
          widgetId,
          propertyName,
          oldValue,
          newValue
        });

        // Update metadata
        widget.properties[propertyName] = newValue;
        currentMetadata!.widgets = Array.from(metadataStore.values());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, metadata: currentMetadata }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/save': (req, res) => {
    try {
      if (pendingEdits.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'No changes to save' }));
        return;
      }

      const editor = new SourceCodeEditor(currentSourceCode!);

      // Process edits in order: delete first (to avoid line number shifts), then add, then property updates, then style updates
      const deleteEdits = pendingEdits.filter(e => e.type === 'delete');
      const addEdits = pendingEdits.filter(e => e.type === 'add');
      const propertyEdits = pendingEdits.filter(e => !e.type);
      const styleEdits = pendingEdits.filter(e => e.type === 'update-styles');

      // Apply delete operations first (sort by line number descending to avoid line shift issues)
      deleteEdits.sort((a, b) => {
        const lineA = a.widget.sourceLocation.line;
        const lineB = b.widget.sourceLocation.line;
        return lineB - lineA; // Descending order
      });

      for (const edit of deleteEdits) {
        console.log(`[Editor] Deleting ${edit.widget.widgetType} at line ${edit.widget.sourceLocation.line}`);
        editor.removeWidget(edit.widget);
      }

      // Apply add operations
      for (const edit of addEdits) {
        const parent = metadataStore.get(edit.parentId);
        if (parent) {
          console.log(`[Editor] Adding ${edit.widgetType} to ${parent.widgetType}`);
          editor.addWidget(parent, edit.widgetType, edit.properties);
        }
      }

      // Apply property updates
      for (const edit of propertyEdits) {
        // Handle string vs numeric values
        const oldValueStr = typeof edit.oldValue === 'string' ? `"${edit.oldValue}"` : edit.oldValue;
        const newValueStr = typeof edit.newValue === 'string' ? `"${edit.newValue}"` : edit.newValue;
        editor.findAndReplace(String(oldValueStr), String(newValueStr));
      }

      // Apply style updates
      for (const edit of styleEdits) {
        console.log(`[Editor] Updating styles object`);
        editor.updateStyles(edit.styles);
      }

      // Save to .edited.ts file
      const outputPath = currentFilePath!.replace('.ts', '.edited.ts');
      const fullOutputPath = path.join(__dirname, '..', '..', outputPath);

      fs.writeFileSync(fullOutputPath, editor.getSourceCode(), 'utf8');

      console.log(`[Editor] Saved changes to: ${outputPath}`);
      console.log(`[Editor] Applied ${pendingEdits.length} edits (${deleteEdits.length} deletes, ${addEdits.length} adds, ${propertyEdits.length} updates)`);

      pendingEdits = [];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, outputPath }));
    } catch (error: any) {
      console.error('[API Error]', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },

  '/api/add-widget': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { parentId, widgetType } = JSON.parse(body);

        const parent = metadataStore.get(parentId);
        if (!parent) {
          throw new Error('Parent widget not found');
        }

        // Check if parent is a container
        const containerTypes = [
          'vbox', 'hbox', 'scroll', 'grid', 'gridwrap', 'center',
          'hsplit', 'vsplit', 'tabs', 'card', 'accordion', 'form', 'border', 'window'
        ];
        if (!containerTypes.includes(parent.widgetType)) {
          throw new Error('Parent must be a container widget');
        }

        // Generate default properties based on widget type
        const defaultProps: Record<string, any> = {
          'label': { text: 'New Label' },
          'button': { text: 'New Button' },
          'entry': { placeholder: 'Enter text...' },
          'checkbox': { text: 'New Checkbox' },
          'hyperlink': { text: 'Link', url: '#' },
          'image': { path: 'image.png' }
        };

        const props = defaultProps[widgetType] || {};

        // Add the widget to metadata (don't reload file!)
        currentParent = parentId;
        const newWidgetId = captureWidget(widgetType, props);
        currentParent = null;

        // Update metadata
        currentMetadata!.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Added ${widgetType} to ${parentId}`);

        // Record as a pending edit
        pendingEdits.push({
          type: 'add',
          parentId,
          widgetType,
          properties: props
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          widgetId: newWidgetId,
          metadata: currentMetadata  // Return updated metadata
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/get-styles': (req, res) => {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        styles: currentStyles || {},
        sourceCode: currentSourceCode
      }));
    } catch (error: any) {
      console.error('[API Error]', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },

  '/api/update-styles': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { styles } = JSON.parse(body);

        currentStyles = styles;
        console.log('[Designer] Updated styles:', Object.keys(styles));

        // Record as a pending edit
        pendingEdits.push({
          type: 'update-styles',
          styles
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, styles: currentStyles }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/delete-widget': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { widgetId } = JSON.parse(body);

        const widget = metadataStore.get(widgetId);
        if (!widget) {
          throw new Error('Widget not found');
        }

        // Don't allow deleting window widgets
        if (widget.widgetType === 'window') {
          throw new Error('Cannot delete window widget');
        }

        // Remove from metadata store
        metadataStore.delete(widgetId);

        // Update metadata
        currentMetadata!.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Deleted widget ${widgetId} (${widget.widgetType})`);

        // Record as a pending edit
        pendingEdits.push({
          type: 'delete',
          widgetId,
          widget
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }
};

// HTTP server
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // API routes
  if (req.url && apiHandlers[req.url]) {
    apiHandlers[req.url](req, res);
    return;
  }

  // Static files
  const publicDir = path.join(__dirname, '..', 'public');
  let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url || '');

  const extname = path.extname(filePath);
  const contentTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css'
  };

  const contentType = contentTypes[extname] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Tsyne WYSIWYG Designer                     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  Open your browser and select a file from the dropdown');
  console.log('  (hello.ts, calculator.ts, or todomvc.ts)');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
