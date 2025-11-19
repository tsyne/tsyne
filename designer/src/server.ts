/**
 * Tsyne WYSIWYG Designer Server
 * Self-contained server providing design-time API for Tsyne applications
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { WidgetMetadata, SourceLocation } from './metadata';
import { transformerRegistry, TransformContext } from './transformers';

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
      // Line numbers from stack trace are from transpiled JS
      // Transpiler removes import+blank (2 lines) and adds "use strict" (1 line)
      // Net shift: original = transpiled + 2
      const transpiledLine = parseInt(match[2]);
      const originalLine = transpiledLine + 2;
      return { file: match[1], line: originalLine, column: parseInt(match[3]) };
    }
  }
  return { file: 'unknown', line: 0, column: 0 };
}

// Capture widget - returns chainable object with .withId(), .when(), .refresh()
function captureWidget(type: string, props: any): any {
  const location = parseStackTrace(new Error().stack || '');

  // Use internal auto-ID for tracking (needed for tree structure)
  const internalId = `widget-${widgetIdCounter++}`;

  const metadata: any = {
    id: internalId,  // Internal tracking ID
    widgetId: null as string | null,  // User-defined ID (set via .withId())
    widgetType: type,
    sourceLocation: location,
    properties: props,
    eventHandlers: {},
    parent: currentParent
  };
  metadataStore.set(internalId, metadata);

  // Return chainable object with full Tsyne widget API
  const chainableApi = {
    __internalId: internalId,  // For accessing metadata
    withId: (id: string) => {
      metadata.widgetId = id;
      return chainableApi; // Return self for chaining
    },
    when: (conditionFn: () => boolean) => {
      // Store visibility condition in metadata
      if (conditionFn) {
        metadata.eventHandlers.whenCondition = conditionFn.toString();
      }
      return chainableApi; // Return self for chaining
    },
    accessibility: (options: any) => {
      // Store accessibility options in metadata
      metadata.accessibility = options;
      return chainableApi; // Return self for chaining
    },
    refresh: async () => {
      // No-op in designer mode
      return Promise.resolve();
    },
    hide: async () => {
      return Promise.resolve();
    },
    show: async () => {
      return Promise.resolve();
    }
  };

  return chainableApi;
}

// Helper for container widgets
function containerWidget(type: string, props: any, builder: () => void): any {
  const location = parseStackTrace(new Error().stack || '');
  const internalId = `widget-${widgetIdCounter++}`;

  const metadata: any = {
    id: internalId,
    widgetId: null as string | null,
    widgetType: type,
    sourceLocation: location,
    properties: props,
    eventHandlers: {},
    parent: currentParent
  };
  metadataStore.set(internalId, metadata);

  // Execute builder with this widget as parent
  const prev = currentParent;
  currentParent = internalId;
  builder();
  currentParent = prev;

  // Return chainable object with full container API
  const chainableApi = {
    __internalId: internalId,
    withId: (id: string) => {
      metadata.widgetId = id;
      return chainableApi; // Return self for chaining
    },
    when: (conditionFn: () => boolean) => {
      // Store visibility condition in metadata
      if (conditionFn) {
        metadata.eventHandlers.whenCondition = conditionFn.toString();
      }
      return chainableApi; // Return self for chaining
    },
    accessibility: (options: any) => {
      // Store accessibility options in metadata
      metadata.accessibility = options;
      return chainableApi; // Return self for chaining
    },
    model: (items: any[]) => {
      // Return ModelBoundList-like API for method chaining
      return {
        trackBy: (fn: (item: any) => any) => {
          return {
            each: (builderFn: (item: any) => void) => {
              // In designer mode, just record the binding
              metadata.eventHandlers.modelBinding = {
                items: items.length,
                trackBy: fn.toString(),
                builder: builderFn.toString()
              };
              return chainableApi;
            }
          };
        }
      };
    },
    refresh: async () => {
      return Promise.resolve();
    },
    refreshVisibility: async () => {
      return Promise.resolve();
    },
    hide: async () => {
      return Promise.resolve();
    },
    show: async () => {
      return Promise.resolve();
    }
  };

  return chainableApi;
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

  window(options: any, builder: (win: any) => void): any {
    const result = captureWidget('window', options);
    const prev = currentParent;
    currentParent = result.__internalId;
    const windowObj = {
      setContent: (contentBuilder: () => void) => {
        contentBuilder();
      },
      show: () => {}
    };
    builder(windowObj);
    currentParent = prev;
    return result;
  },

  // Containers
  vbox(builder: () => void): any { return containerWidget('vbox', {}, builder); },
  hbox(builder: () => void): any { return containerWidget('hbox', {}, builder); },
  scroll(builder: () => void): any { return containerWidget('scroll', {}, builder); },
  center(builder: () => void): any { return containerWidget('center', {}, builder); },

  grid(columns: number, builder: () => void): any {
    return containerWidget('grid', { columns }, builder);
  },

  gridwrap(itemWidth: number, itemHeight: number, builder: () => void): any {
    return containerWidget('gridwrap', { itemWidth, itemHeight }, builder);
  },

  hsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): any {
    const result = captureWidget('hsplit', { offset });
    const prev = currentParent;
    currentParent = result.__internalId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
    return result;
  },

  vsplit(leadingBuilder: () => void, trailingBuilder: () => void, offset?: number): any {
    const result = captureWidget('vsplit', { offset });
    const prev = currentParent;
    currentParent = result.__internalId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
    return result;
  },

  tabs(tabDefinitions: any[], location?: string): any {
    const result = captureWidget('tabs', {
      tabs: tabDefinitions.map(t => t.title).join(', '),
      location
    });
    const prev = currentParent;
    currentParent = result.__internalId;
    tabDefinitions.forEach(tab => tab.builder());
    currentParent = prev;
    return result;
  },

  card(title: string, subtitle: string, builder: () => void): any {
    return containerWidget('card', { title, subtitle }, builder);
  },

  accordion(items: any[]): any {
    const result = captureWidget('accordion', {
      items: items.map(i => i.title).join(', ')
    });
    const prev = currentParent;
    currentParent = result.__internalId;
    items.forEach(item => item.builder());
    currentParent = prev;
    return result;
  },

  form(items: any[], onSubmit?: () => void, onCancel?: () => void): any {
    const result = captureWidget('form', {
      fields: items.map(i => i.label).join(', ')
    });
    if (onSubmit || onCancel) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) {
        if (onSubmit) widget.eventHandlers.onSubmit = onSubmit.toString();
        if (onCancel) widget.eventHandlers.onCancel = onCancel.toString();
      }
    }
    return result;
  },

  border(config: any): any {
    const result = captureWidget('border', {
      regions: Object.keys(config).join(', ')
    });
    const prev = currentParent;
    currentParent = result.__internalId;
    if (config.top) config.top();
    if (config.bottom) config.bottom();
    if (config.left) config.left();
    if (config.right) config.right();
    if (config.center) config.center();
    currentParent = prev;
    return result;
  },

  // Input widgets
  button(text: string, onClick?: () => void, className?: string): any {
    const result = captureWidget('button', { text, className });
    if (onClick) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
    return result;
  },

  label(text: string, className?: string, alignment?: string, wrapping?: string, textStyle?: any): any {
    return captureWidget('label', { text, className, alignment, wrapping, textStyle });
  },

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number, onDoubleClick?: () => void): any {
    const result = captureWidget('entry', { placeholder, minWidth });
    if (onSubmit || onDoubleClick) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) {
        if (onSubmit) widget.eventHandlers.onSubmit = onSubmit.toString();
        if (onDoubleClick) widget.eventHandlers.onDoubleClick = onDoubleClick.toString();
      }
    }
    return result;
  },

  multilineentry(placeholder?: string, wrapping?: string): any {
    return captureWidget('multilineentry', { placeholder, wrapping });
  },

  passwordentry(placeholder?: string, onSubmit?: (text: string) => void): any {
    const result = captureWidget('passwordentry', { placeholder });
    if (onSubmit) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onSubmit = onSubmit.toString();
    }
    return result;
  },

  checkbox(text: string, onChanged?: (checked: boolean) => void): any {
    const result = captureWidget('checkbox', { text });
    if (onChanged) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
    return result;
  },

  select(options: string[], onSelected?: (option: string) => void): any {
    const result = captureWidget('select', { options: options.join(', ') });
    if (onSelected) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
    return result;
  },

  radiogroup(options: string[], initialSelected?: string, onSelected?: (option: string) => void): any {
    const result = captureWidget('radiogroup', {
      options: options.join(', '),
      initialSelected
    });
    if (onSelected) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
    return result;
  },

  slider(min: number, max: number, initialValue?: number, onChanged?: (value: number) => void): any {
    const result = captureWidget('slider', { min, max, initialValue });
    if (onChanged) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
    return result;
  },

  progressbar(initialValue?: number, infinite?: boolean): any {
    return captureWidget('progressbar', { initialValue, infinite });
  },

  // Display widgets
  separator(): any {
    return captureWidget('separator', {});
  },

  hyperlink(text: string, url: string): any {
    return captureWidget('hyperlink', { text, url });
  },

  image(pathOrOptions: string | any, fillMode?: string, onClick?: () => void, onDrag?: () => void, onDragEnd?: () => void): any {
    const props = typeof pathOrOptions === 'string'
      ? { path: pathOrOptions, fillMode }
      : pathOrOptions;
    const result = captureWidget('image', props);
    if (onClick || onDrag || onDragEnd) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) {
        if (onClick) widget.eventHandlers.onClick = onClick.toString();
        if (onDrag) widget.eventHandlers.onDrag = onDrag.toString();
        if (onDragEnd) widget.eventHandlers.onDragEnd = onDragEnd.toString();
      }
    }
    return result;
  },

  richtext(segments: any[]): any {
    return captureWidget('richtext', {
      text: segments.map(s => s.text).join(' ')
    });
  },

  table(headers: string[], data: any[][]): any {
    return captureWidget('table', {
      headers: headers.join(', '),
      rows: data.length
    });
  },

  list(items: string[], onSelected?: (item: string) => void): any {
    const result = captureWidget('list', {
      items: items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '')
    });
    if (onSelected) {
      const widget = metadataStore.get(result.__internalId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
    return result;
  },

  tree(rootLabel: string): any {
    return captureWidget('tree', { rootLabel });
  },

  toolbar(toolbarItems: any[]): any {
    const items = toolbarItems
      .filter(i => i.type !== 'separator' && i.type !== 'spacer')
      .map(i => i.label || i.type)
      .join(', ');
    return captureWidget('toolbar', { items });
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

// Lint TypeScript source code
function lintSource(sourceCode: string, context: string = 'source'): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Use TypeScript compiler to check for syntax errors
    const result = ts.transpileModule(sourceCode, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        noEmitOnError: true
      },
      reportDiagnostics: true
    });

    if (result.diagnostics && result.diagnostics.length > 0) {
      result.diagnostics.forEach(diagnostic => {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          errors.push(`Line ${line + 1}, Column ${character + 1}: ${message}`);
        } else {
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          errors.push(message);
        }
      });
    }

    if (errors.length > 0) {
      console.warn(`[Lint] ${context} has ${errors.length} error(s):`);
      errors.forEach(err => console.warn(`  - ${err}`));
      return { valid: false, errors };
    }

    console.log(`[Lint] ${context} passed validation`);
    return { valid: true, errors: [] };
  } catch (error: any) {
    const errorMsg = `Linting failed: ${error.message}`;
    console.error(`[Lint] ${errorMsg}`);
    return { valid: false, errors: [errorMsg] };
  }
}

// Load and execute source code in designer mode
function loadSourceInDesignerMode(sourceCode: string, virtualPath: string = 'inline.ts'): { widgets: any[] } {
  currentSourceCode = sourceCode;
  currentFilePath = virtualPath;

  // Lint source code
  const lintResult = lintSource(currentSourceCode, `load(${virtualPath})`);
  if (!lintResult.valid) {
    console.warn('[Designer] Source has lint errors, but continuing with load');
  }

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

  console.log(`[Designer] Loading source: ${virtualPath}`);

  // Create temp file with similar name to preserve line numbers in stack traces
  const tempDir = path.join('/tmp', 'tsyne-designer-' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, path.basename(virtualPath, '.ts') + '.js');

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
    // Catch errors but still return captured metadata (e.g., for code with undefined dependencies)
    try {
      require(tempPath);
    } catch (error: any) {
      console.warn(`[Designer] Code execution error (metadata still captured): ${error.message}`);
      // Continue to return metadata that was captured before the error
    }

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

// Load and execute a file in designer mode
function loadFileInDesignerMode(filePath: string): { widgets: any[] } {
  const fullPath = path.join(__dirname, '..', '..', filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  // Read source code and load it
  const sourceCode = fs.readFileSync(fullPath, 'utf8');
  return loadSourceInDesignerMode(sourceCode, filePath);
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
    let parentLine = parentMetadata.sourceLocation.line - 1;

    // Find the actual parent line (sourceLocation might be slightly off due to transpilation)
    // Match both "a.vbox(" and "vbox(" (for different import styles)
    const parentType = parentMetadata.widgetType;
    const parentPattern = new RegExp(`(a\\.)?${parentType}\\(`);
    let actualParentLine = -1;

    // Search within a range of ±3 lines
    for (let offset = 0; offset <= 3; offset++) {
      for (const dir of [0, -offset, offset]) {
        if (dir === 0 && offset > 0) continue;
        const checkIndex = parentLine + dir;
        if (checkIndex >= 0 && checkIndex < this.lines.length) {
          const line = this.lines[checkIndex];
          if (parentPattern.test(line)) {
            actualParentLine = checkIndex;
            break;
          }
        }
      }
      if (actualParentLine !== -1) break;
    }

    if (actualParentLine !== -1) {
      if (actualParentLine !== parentLine) {
        console.log(`[Editor] Adjusted parent line from ${parentLine + 1} to ${actualParentLine + 1}`);
      }
      parentLine = actualParentLine;
    }

    // Check if parent is on a single line (empty container like "a.vbox(() => {});" )
    const parentLineContent = this.lines[parentLine];
    const isEmptySingleLine = parentLineContent.includes('() => {}');

    if (isEmptySingleLine) {
      // Expand empty container to multi-line format
      const match = parentLineContent.match(/^(\s*)(a\.)?([\w]+)\(\(\) => \{\}\);/);
      if (match) {
        const indent = match[1];
        const prefix = match[2] || '';
        const containerType = match[3];
        const childIndent = indent + '  ';

        // Generate widget code with proper prefix
        const widgetCode = this.generateWidgetCode(widgetType, properties, childIndent);

        // Replace single-line container with multi-line version
        this.lines[parentLine] = `${indent}${prefix}${containerType}(() => {`;
        this.lines.splice(parentLine + 1, 0, widgetCode);
        this.lines.splice(parentLine + 2, 0, `${indent}});`);

        console.log(`[Editor] Expanded empty container and added ${widgetType}`);
        return true;
      }
    }

    // Find the closing brace of the parent container's builder function
    const closingBraceLine = this.findClosingBrace(parentLine);

    if (closingBraceLine === -1) {
      console.warn('[Editor] Could not find closing brace for parent');
      return false;
    }

    // Get indentation from the line just before the closing brace
    const indentation = this.getIndentation(closingBraceLine);

    // Generate widget code
    const widgetCode = this.generateWidgetCode(widgetType, properties, indentation);

    // Insert before closing brace
    this.lines.splice(closingBraceLine, 0, widgetCode);

    console.log(`[Editor] Added ${widgetType} at line ${closingBraceLine + 1}`);
    return true;
  }

  removeWidget(metadata: any): boolean {
    let lineIndex = metadata.sourceLocation.line - 1;

    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      console.warn('[Editor] Invalid line index for widget removal');
      return false;
    }

    // Find the actual widget line (sourceLocation might be slightly off due to transpilation)
    // Search nearby lines for the widget call pattern
    // Match both "a.button(" and "button(" (for different import styles)
    const widgetType = metadata.widgetType;
    const widgetPattern = new RegExp(`(a\\.)?${widgetType}\\(`);
    let actualLineIndex = -1;

    // Search within a range of ±3 lines
    for (let offset = 0; offset <= 3; offset++) {
      // Try the exact line first, then above, then below
      for (const dir of [0, -offset, offset]) {
        if (dir === 0 && offset > 0) continue; // Skip 0 after first iteration
        const checkIndex = lineIndex + dir;
        if (checkIndex >= 0 && checkIndex < this.lines.length) {
          const line = this.lines[checkIndex];
          if (widgetPattern.test(line)) {
            // For widgets with text property, verify it matches
            if (metadata.properties && metadata.properties.text) {
              const textPattern = new RegExp(`${metadata.widgetType}\\(['"](${metadata.properties.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
              if (textPattern.test(line)) {
                actualLineIndex = checkIndex;
                break;
              }
            } else {
              actualLineIndex = checkIndex;
              break;
            }
          }
        }
      }
      if (actualLineIndex !== -1) break;
    }

    if (actualLineIndex === -1) {
      console.warn(`[Editor] Could not find ${widgetType} widget near line ${lineIndex + 1}`);
      actualLineIndex = lineIndex; // Fall back to original line
    } else if (actualLineIndex !== lineIndex) {
      console.log(`[Editor] Adjusted line from ${lineIndex + 1} to ${actualLineIndex + 1} for ${widgetType}`);
    }

    lineIndex = actualLineIndex;

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

    // After deletion, check if parent container is now empty and collapse it
    this.collapseEmptyContainers();

    return true;
  }

  private collapseEmptyContainers(): void {
    // Find and collapse empty multi-line containers to single-line format
    // Pattern: line with "a.something(() => {" followed by line with just "});" and whitespace
    for (let i = 0; i < this.lines.length - 1; i++) {
      const currentLine = this.lines[i];
      const nextLine = this.lines[i + 1];

      // Check if current line is a container opening: "a.vbox(() => {" etc.
      const containerMatch = currentLine.match(/^(\s*)(a\.)?(\w+)\(\(\) => \{\s*$/);
      if (containerMatch && nextLine.match(/^\s*\}\);?\s*$/)) {
        // Found empty container - collapse to single line
        const indent = containerMatch[1];
        const prefix = containerMatch[2] || '';
        const containerType = containerMatch[3];

        // Replace two lines with single line
        this.lines[i] = `${indent}${prefix}${containerType}(() => {});`;
        this.lines.splice(i + 1, 1);

        console.log(`[Editor] Collapsed empty ${containerType} at line ${i + 1}`);
      }
    }
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
        return `${indentation}a.label("${properties.text || 'New Label'}");`;

      case 'button':
        return `${indentation}a.button("${properties.text || 'New Button'}", () => {\n${indentation}  console.log("Button clicked");\n${indentation}});`;

      case 'entry':
        return `${indentation}a.entry("${properties.placeholder || ''}");`;

      case 'checkbox':
        return `${indentation}a.checkbox("${properties.text || 'New Checkbox'}");`;

      case 'vbox':
        return `${indentation}a.vbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'hbox':
        return `${indentation}a.hbox(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'scroll':
        return `${indentation}a.scroll(() => {\n${indentation}  // Add widgets here\n${indentation}});`;

      case 'separator':
        return `${indentation}a.separator();`;

      case 'hyperlink':
        return `${indentation}a.hyperlink("${properties.text || 'Link'}", "${properties.url || '#'}");`;

      case 'image':
        return `${indentation}a.image("${properties.path || 'image.png'}");`;

      case 'select':
        return `${indentation}a.select(["Option 1", "Option 2"]);`;

      case 'grid':
        return `${indentation}a.grid(2, () => {\n${indentation}  // Add widgets here\n${indentation}});`;

      default:
        return `${indentation}a.${widgetType}();`;
    }
  }

  updateWidgetId(metadata: any, oldWidgetId: string | null, newWidgetId: string | null): boolean {
    const lineIndex = metadata.sourceLocation.line - 1;
    const widgetType = metadata.widgetType;

    // Build a more specific pattern by including the first property value if available
    // For label("A"), button("Click", ...), etc.
    let widgetPattern: RegExp;
    const firstPropKey = Object.keys(metadata.properties)[0];
    const firstPropValue = firstPropKey ? metadata.properties[firstPropKey] : null;

    if (firstPropValue && typeof firstPropValue === 'string') {
      // Escape special regex characters in the property value
      const escapedValue = firstPropValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match: label("A") or a.label("A") or label('A') or a.label('A')
      widgetPattern = new RegExp(`\\b(a\\.)?${widgetType}\\s*\\(\\s*['"]${escapedValue}['"]`);
    } else {
      // Fallback to basic pattern if no string property
      widgetPattern = new RegExp(`\\b(a\\.)?${widgetType}\\s*\\(`);
    }

    let targetLineIndex = -1;
    for (let offset = 0; offset <= 2; offset++) {
      const checkIndex = lineIndex + offset;
      if (checkIndex >= 0 && checkIndex < this.lines.length && widgetPattern.test(this.lines[checkIndex])) {
        targetLineIndex = checkIndex;
        break;
      }
      const checkIndexBefore = lineIndex - offset;
      if (offset > 0 && checkIndexBefore >= 0 && checkIndexBefore < this.lines.length && widgetPattern.test(this.lines[checkIndexBefore])) {
        targetLineIndex = checkIndexBefore;
        break;
      }
    }

    if (targetLineIndex === -1) {
      console.warn(`[Editor] Could not find widget type '${widgetType}' near line ${lineIndex + 1}`);
      return false;
    }

    // Find the full statement (may span multiple lines)
    let statementLines = [targetLineIndex];
    let fullStatement = this.lines[targetLineIndex];

    // Check if this is a container widget OR a widget with event handlers (both need closing });)
    const containerTypes = ['vbox', 'hbox', 'grid', 'scroll', 'border', 'tabs', 'form', 'split'];
    const hasEventHandlers = metadata.eventHandlers && Object.keys(metadata.eventHandlers).length > 0;
    const isContainer = containerTypes.includes(widgetType) || hasEventHandlers;

    // Look ahead for continuation lines
    const startIndent = this.lines[targetLineIndex].search(/\S/);

    if (isContainer) {
      // For containers, use brace counting to find the matching closing
      let braceCount = 0;

      for (let i = targetLineIndex; i < Math.min(targetLineIndex + 20, this.lines.length); i++) {
        const line = this.lines[i];

        // Count braces in this line
        for (const char of line) {
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
        }

        // Add this line if it's not the first one
        if (i > targetLineIndex) {
          statementLines.push(i);
          fullStatement += '\n' + line;
        }

        // If braces balanced and line ends with });, we're done
        if (braceCount === 0 && line.trim().endsWith('});')) {
          break;
        }
      }
    } else {
      // For simple widgets, stop when we find a line that ends with semicolon
      for (let i = targetLineIndex + 1; i < Math.min(targetLineIndex + 10, this.lines.length); i++) {
        const line = this.lines[i];
        const lineIndent = line.search(/\S/);

        // If we hit a line with less or equal indentation that ends with ;, stop
        if (lineIndent <= startIndent && line.trim().endsWith(';')) {
          break;
        }

        statementLines.push(i);
        fullStatement += '\n' + line;

        // If this line ends with semicolon and has greater indentation, include it and stop
        if (line.includes(';') && lineIndent > startIndent) {
          break;
        }
      }
    }

    const firstLine = this.lines[targetLineIndex];
    const indent = firstLine.substring(0, firstLine.length - firstLine.trimStart().length);

    // Case 1: Update existing .withId('oldId') to .withId('newId')
    if (oldWidgetId && newWidgetId) {
      const withIdPattern = new RegExp(`\\.withId\\s*\\(\\s*['"]${oldWidgetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`);
      if (withIdPattern.test(fullStatement)) {
        const updatedStatement = fullStatement.replace(withIdPattern, `.withId('${newWidgetId}')`);
        this.replaceLines(statementLines, updatedStatement);
        console.log(`[Editor] Line ${targetLineIndex + 1}: Updated .withId('${oldWidgetId}') → .withId('${newWidgetId}')`);
        return true;
      }
    }

    // Case 2: Add .withId('newId') (no old ID, has new ID)
    if (!oldWidgetId && newWidgetId) {
      // Check if this is a container widget based on the widget type
      const containerTypes = ['vbox', 'hbox', 'grid', 'scroll', 'border', 'tabs', 'form', 'split'];
      const isContainer = containerTypes.includes(widgetType);

      let updatedStatement: string;
      if (isContainer) {
        // For container widgets, we need to find the matching closing brace
        // Count braces to find the correct closing }); for THIS container
        let braceCount = 0;
        let foundOpening = false;
        let closingIndex = -1;

        for (let i = 0; i < fullStatement.length; i++) {
          const char = fullStatement[i];

          if (char === '{') {
            braceCount++;
            foundOpening = true;
          } else if (char === '}') {
            braceCount--;

            // When braceCount returns to 0, we've found the matching closing brace
            if (foundOpening && braceCount === 0) {
              // Check if this is followed by );
              if (fullStatement.substring(i, i + 3) === '});') {
                closingIndex = i;
                break;
              }
            }
          }
        }

        if (closingIndex !== -1) {
          updatedStatement =
            fullStatement.substring(0, closingIndex) +
            `}).withId('${newWidgetId}');` +
            fullStatement.substring(closingIndex + 3);
        } else {
          console.warn(`[Editor] Could not find matching closing }); for container ${widgetType}`);
          return false;
        }
      } else {
        // For simple widgets, add .withId before the last semicolon
        const lastSemicolonIndex = fullStatement.lastIndexOf(';');
        if (lastSemicolonIndex !== -1) {
          updatedStatement =
            fullStatement.substring(0, lastSemicolonIndex) +
            `.withId('${newWidgetId}');` +
            fullStatement.substring(lastSemicolonIndex + 1);
        } else {
          console.warn(`[Editor] Could not find semicolon for ${widgetType}`);
          return false;
        }
      }

      this.replaceLines(statementLines, updatedStatement);
      console.log(`[Editor] Line ${targetLineIndex + 1}: Added .withId('${newWidgetId}') to ${widgetType}`);
      return true;
    }

    // Case 3: Remove .withId('oldId') (has old ID, no new ID)
    if (oldWidgetId && !newWidgetId) {
      const withIdPattern = new RegExp(`\\.withId\\s*\\(\\s*['"]${oldWidgetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\s*\\)`, 'g');
      const updatedStatement = fullStatement.replace(withIdPattern, '');
      this.replaceLines(statementLines, updatedStatement);
      console.log(`[Editor] Line ${targetLineIndex + 1}: Removed .withId('${oldWidgetId}')`);
      return true;
    }

    console.warn(`[Editor] Could not apply widget ID update for line ${targetLineIndex + 1}`);
    return false;
  }

  private replaceLines(lineIndices: number[], newText: string): void {
    const newLines = newText.split('\n');
    // Remove old lines
    this.lines.splice(lineIndices[0], lineIndices.length, ...newLines);
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

  updateAccessibility(metadata: any, accessibility: any): boolean {
    const lineIndex = metadata.sourceLocation.line - 1;
    const widgetType = metadata.widgetType;

    // Build widget pattern
    let widgetPattern: RegExp;
    const firstPropKey = Object.keys(metadata.properties || {})[0];
    const firstPropValue = firstPropKey ? metadata.properties[firstPropKey] : null;

    if (firstPropValue && typeof firstPropValue === 'string') {
      const escapedValue = firstPropValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      widgetPattern = new RegExp(`\\b(a\\.)?${widgetType}\\s*\\(\\s*['"]${escapedValue}['"]`);
    } else {
      widgetPattern = new RegExp(`\\b(a\\.)?${widgetType}\\s*\\(`);
    }

    // Find the widget line
    let targetLineIndex = -1;
    for (let offset = 0; offset <= 2; offset++) {
      const checkIndex = lineIndex + offset;
      if (checkIndex >= 0 && checkIndex < this.lines.length && widgetPattern.test(this.lines[checkIndex])) {
        targetLineIndex = checkIndex;
        break;
      }
      const checkIndexBefore = lineIndex - offset;
      if (offset > 0 && checkIndexBefore >= 0 && checkIndexBefore < this.lines.length && widgetPattern.test(this.lines[checkIndexBefore])) {
        targetLineIndex = checkIndexBefore;
        break;
      }
    }

    if (targetLineIndex === -1) {
      console.warn(`[Editor] Could not find widget type '${widgetType}' near line ${lineIndex + 1}`);
      return false;
    }

    // Find the full statement (may span multiple lines)
    let statementLines = [targetLineIndex];
    let fullStatement = this.lines[targetLineIndex];

    const containerTypes = ['vbox', 'hbox', 'grid', 'scroll', 'border', 'tabs', 'form', 'split'];
    const isContainer = containerTypes.includes(widgetType);

    // Look ahead for continuation lines
    if (isContainer) {
      let braceCount = 0;
      for (let i = targetLineIndex; i < Math.min(targetLineIndex + 20, this.lines.length); i++) {
        const line = this.lines[i];
        for (const char of line) {
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
        }
        if (i > targetLineIndex) {
          statementLines.push(i);
          fullStatement += '\n' + line;
        }
        if (braceCount === 0 && line.trim().endsWith('});')) {
          break;
        }
      }
    } else {
      const startIndent = this.lines[targetLineIndex].search(/\S/);
      for (let i = targetLineIndex + 1; i < Math.min(targetLineIndex + 10, this.lines.length); i++) {
        const line = this.lines[i];
        const lineIndent = line.search(/\S/);
        if (lineIndent <= startIndent && line.trim().endsWith(';')) {
          break;
        }
        statementLines.push(i);
        fullStatement += '\n' + line;
        if (line.includes(';') && lineIndent > startIndent) {
          break;
        }
      }
    }

    // Generate accessibility call
    const accessibilityStr = JSON.stringify(accessibility, null, 2).split('\n').join('\n    ');
    const accessibilityCall = `.accessibility(${accessibilityStr})`;

    // Check if .accessibility() already exists
    const accessibilityPattern = /\.accessibility\s*\([^)]*\)/s;
    let updatedStatement: string;

    if (accessibilityPattern.test(fullStatement)) {
      // Update existing .accessibility()
      updatedStatement = fullStatement.replace(accessibilityPattern, accessibilityCall);
    } else {
      // Add new .accessibility()
      if (isContainer) {
        // For containers, add before the closing });
        const closingPattern = /\}\);/;
        const match = closingPattern.exec(fullStatement);
        if (match && match.index !== undefined) {
          updatedStatement =
            fullStatement.substring(0, match.index) +
            `})${accessibilityCall};` +
            fullStatement.substring(match.index + 3);
        } else {
          console.warn(`[Editor] Could not find closing }); for container ${widgetType}`);
          return false;
        }
      } else {
        // For simple widgets, add before the last semicolon
        const lastSemicolonIndex = fullStatement.lastIndexOf(';');
        if (lastSemicolonIndex !== -1) {
          updatedStatement =
            fullStatement.substring(0, lastSemicolonIndex) +
            accessibilityCall +
            ';' +
            fullStatement.substring(lastSemicolonIndex + 1);
        } else {
          console.warn(`[Editor] Could not find semicolon for ${widgetType}`);
          return false;
        }
      }
    }

    this.replaceLines(statementLines, updatedStatement);
    console.log(`[Editor] Line ${targetLineIndex + 1}: Updated accessibility for ${widgetType}`);
    return true;
  }

  updateWidgetProperty(metadata: any, propertyName: string, oldValue: any, newValue: any): boolean {
    let lineIndex = metadata.sourceLocation.line - 1;
    const widgetType = metadata.widgetType;

    // Find the actual widget line using fuzzy search
    // Match both "a.button(" and "button(" (for different import styles)
    const widgetPattern = new RegExp(`(a\\.)?${widgetType}\\(`);
    let actualLineIndex = -1;

    // Search within a range of ±3 lines
    for (let offset = 0; offset <= 3; offset++) {
      for (const dir of [0, -offset, offset]) {
        if (dir === 0 && offset > 0) continue;
        const checkIndex = lineIndex + dir;
        if (checkIndex >= 0 && checkIndex < this.lines.length) {
          const line = this.lines[checkIndex];
          if (widgetPattern.test(line)) {
            actualLineIndex = checkIndex;
            break;
          }
        }
      }
      if (actualLineIndex !== -1) break;
    }

    if (actualLineIndex === -1) {
      console.warn(`[Editor] Could not find ${widgetType} widget near line ${lineIndex + 1}`);
      return false;
    }

    lineIndex = actualLineIndex;

    // For text property (and other string properties in the first argument position)
    if (propertyName === 'text') {
      const line = this.lines[lineIndex];

      // Try to replace with both single and double quotes
      const patterns = [
        { old: `'${oldValue}'`, new: `'${newValue}'` },
        { old: `"${oldValue}"`, new: `"${newValue}"` }
      ];

      for (const {old, new: newVal} of patterns) {
        if (line.includes(old)) {
          this.lines[lineIndex] = line.replace(old, newVal);
          console.log(`[Editor] Updated ${widgetType}.${propertyName} on line ${lineIndex + 1}: "${oldValue}" → "${newValue}"`);
          return true;
        }
      }

      console.warn(`[Editor] Could not find property value "${oldValue}" on line ${lineIndex + 1}`);
      return false;
    }

    // For other properties, use the generic find and replace
    const oldValueStr = typeof oldValue === 'string' ? `"${oldValue}"` : oldValue;
    const newValueStr = typeof newValue === 'string' ? `"${newValue}"` : newValue;
    return this.findAndReplace(String(oldValueStr), String(newValueStr));
  }

  reorderWidget(draggedWidget: any, targetWidget: any): boolean {
    // Find the line ranges for both widgets
    const draggedLineStart = this.findWidgetLine(draggedWidget);
    const targetLineStart = this.findWidgetLine(targetWidget);

    if (draggedLineStart === -1 || targetLineStart === -1) {
      console.warn('[Editor] Could not find widget lines for reordering');
      return false;
    }

    // Extract the full widget statement (may span multiple lines)
    const draggedLines = this.extractWidgetLines(draggedWidget, draggedLineStart);
    const targetLines = this.extractWidgetLines(targetWidget, targetLineStart);

    if (!draggedLines || !targetLines) {
      console.warn('[Editor] Could not extract widget statements for reordering');
      return false;
    }

    console.log(`[Editor] Reordering ${draggedWidget.widgetType} (lines ${draggedLines.start + 1}-${draggedLines.end + 1}) to position BEFORE ${targetWidget.widgetType} (lines ${targetLines.start + 1}-${targetLines.end + 1})`);

    // Extract the dragged widget code
    const draggedCode = this.lines.slice(draggedLines.start, draggedLines.end + 1);

    // Remove dragged widget from its current position
    this.lines.splice(draggedLines.start, draggedLines.end - draggedLines.start + 1);

    // Recalculate target position after removal (if dragged was before target)
    let newTargetPosition: number;
    if (draggedLines.start < targetLines.start) {
      // Dragged was before target, so target position shifts up
      const linesRemoved = draggedLines.end - draggedLines.start + 1;
      newTargetPosition = targetLines.start - linesRemoved;
    } else {
      // Dragged was after target, position stays the same
      newTargetPosition = targetLines.start;
    }

    // Insert dragged widget before target
    this.lines.splice(newTargetPosition, 0, ...draggedCode);

    console.log(`[Editor] Successfully reordered widgets - inserted at line ${newTargetPosition + 1}`);
    return true;
  }

  private findWidgetLine(widget: any): number {
    let lineIndex = widget.sourceLocation.line - 1;
    const widgetType = widget.widgetType;
    const widgetPattern = new RegExp(`(a\\.)?${widgetType}\\(`);

    // Search within a range of ±3 lines
    for (let offset = 0; offset <= 3; offset++) {
      for (const dir of [0, -offset, offset]) {
        if (dir === 0 && offset > 0) continue;
        const checkIndex = lineIndex + dir;
        if (checkIndex >= 0 && checkIndex < this.lines.length) {
          const line = this.lines[checkIndex];
          if (widgetPattern.test(line)) {
            // For widgets with text property, verify it matches
            if (widget.properties && widget.properties.text) {
              const textPattern = new RegExp(`${widgetType}\\(['"](${widget.properties.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
              if (textPattern.test(line)) {
                return checkIndex;
              }
            } else {
              return checkIndex;
            }
          }
        }
      }
    }

    return -1;
  }

  private extractWidgetLines(widget: any, startLine: number): { start: number; end: number } | null {
    // Check if this is a multi-line widget
    const firstLine = this.lines[startLine];
    let endLine = startLine;

    // If the line contains an opening brace but no closing brace/semicolon, it's multi-line
    if (firstLine.includes('{') && !firstLine.includes('});')) {
      let braceCount = (firstLine.match(/{/g) || []).length - (firstLine.match(/}/g) || []).length;

      // Continue until we find the closing braces
      for (let i = startLine + 1; i < this.lines.length && braceCount > 0; i++) {
        const line = this.lines[i];
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        endLine = i;

        // Stop if we've closed all braces and found the semicolon
        if (braceCount === 0 && line.includes(');')) {
          break;
        }
      }
    }

    return { start: startLine, end: endLine };
  }

  transformLayout(metadata: any, newLayout: string): boolean {
    const lineIndex = metadata.sourceLocation.line - 1;
    const oldType = metadata.widgetType;

    // Search for the widget on the exact line, or nearby lines (±2)
    let targetLineIndex = -1;
    const searchPattern = new RegExp(`\\ba\\.${oldType}\\(`);

    for (let offset = 0; offset <= 2; offset++) {
      const checkIndex = lineIndex + offset;
      if (checkIndex >= 0 && checkIndex < this.lines.length && searchPattern.test(this.lines[checkIndex])) {
        targetLineIndex = checkIndex;
        break;
      }
      const checkIndexBefore = lineIndex - offset;
      if (offset > 0 && checkIndexBefore >= 0 && checkIndexBefore < this.lines.length && searchPattern.test(this.lines[checkIndexBefore])) {
        targetLineIndex = checkIndexBefore;
        break;
      }
    }

    if (targetLineIndex === -1) {
      console.warn(`[Editor] Could not find widget type '${oldType}' near line ${lineIndex + 1}`);
      return false;
    }

    const line = this.lines[targetLineIndex];
    let newLine: string;

    // For grid, we need to add or update the column count parameter
    if (newLayout === 'grid') {
      const columns = metadata.properties._gridColumns || 2;
      // Replace: a.vbox(() => with a.grid(2, () =>
      const pattern = new RegExp(`(\\s*a\\.)${oldType}\\(`, 'g');
      newLine = line.replace(pattern, `$1${newLayout}(${columns}, `);
    } else if (oldType === 'grid') {
      // Replace: a.grid(2, () => with a.vbox(() =>
      // Remove the column count parameter
      const pattern = new RegExp(`(\\s*a\\.)grid\\(\\d+,\\s*`, 'g');
      newLine = line.replace(pattern, `$1${newLayout}(`);
    } else {
      // Simple container type transformation: vbox ↔ hbox, etc.
      const pattern = new RegExp(`(\\s*a\\.)${oldType}\\(`, 'g');
      newLine = line.replace(pattern, `$1${newLayout}(`);
    }

    if (newLine === line) {
      console.warn(`[Editor] Pattern match failed for ${oldType} on line ${targetLineIndex + 1}: ${line.trim()}`);
      return false;
    }

    this.lines[targetLineIndex] = newLine;
    console.log(`[Editor] Transformed ${oldType} → ${newLayout} on line ${targetLineIndex + 1}`);
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
          filePath: currentFilePath,
          originalSource: currentSourceCode
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/load-string': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sourceCode, virtualPath = 'inline.ts' } = JSON.parse(body);
        const metadata = loadSourceInDesignerMode(sourceCode, virtualPath);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          metadata,
          styles: currentStyles,
          filePath: currentFilePath,
          originalSource: currentSourceCode
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

        // Generate current source by applying all pending edits
        const editor = new SourceCodeEditor(currentSourceCode!);
        const propertyEdits = pendingEdits.filter(e => !e.type);
        for (const edit of propertyEdits) {
          const w = metadataStore.get(edit.widgetId);
          if (w) {
            editor.updateWidgetProperty(w, edit.propertyName, edit.oldValue, edit.newValue);
          }
        }
        const updatedSource = editor.getSourceCode();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          metadata: currentMetadata,
          currentSource: updatedSource
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/save': async (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        // Parse writer strategy from request (default: 'disk')
        const { writer = 'disk' } = body ? JSON.parse(body) : {};

        if (pendingEdits.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'No changes to save', content: currentSourceCode }));
          return;
        }

      const editor = new SourceCodeEditor(currentSourceCode!);

      // Process edits in order: delete first (to avoid line number shifts), then add, then property updates, then widget ID updates, then style updates
      const deleteEdits = pendingEdits.filter(e => e.type === 'delete');
      const addEdits = pendingEdits.filter(e => e.type === 'add');
      const propertyEdits = pendingEdits.filter(e => !e.type);
      const widgetIdEdits = pendingEdits.filter(e => e.type === 'update-widget-id');
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
        // Handle layout transformation pseudo-property
        if (edit.propertyName === '_layout') {
          const widget = metadataStore.get(edit.widgetId);
          if (widget) {
            editor.transformLayout(widget, edit.newValue);
          }
          continue;
        }

        // Handle grid column count changes
        if (edit.propertyName === '_gridColumns') {
          const widget = metadataStore.get(edit.widgetId);
          if (widget && widget.widgetType === 'grid') {
            // Search for the grid line (accounting for off-by-one errors)
            const lineIndex = widget.sourceLocation.line - 1;
            let targetLineIndex = -1;
            const searchPattern = /\ba\.grid\(\d+,/;

            for (let offset = 0; offset <= 2; offset++) {
              const checkIndex = lineIndex + offset;
              if (checkIndex >= 0 && checkIndex < editor['lines'].length && searchPattern.test(editor['lines'][checkIndex])) {
                targetLineIndex = checkIndex;
                break;
              }
              const checkIndexBefore = lineIndex - offset;
              if (offset > 0 && checkIndexBefore >= 0 && checkIndexBefore < editor['lines'].length && searchPattern.test(editor['lines'][checkIndexBefore])) {
                targetLineIndex = checkIndexBefore;
                break;
              }
            }

            if (targetLineIndex !== -1) {
              const line = editor['lines'][targetLineIndex];
              // Replace grid(oldCount, with grid(newCount,
              const newLine = line.replace(/grid\(\d+,/, `grid(${edit.newValue},`);
              editor['lines'][targetLineIndex] = newLine;
              console.log(`[Editor] Updated grid column count to ${edit.newValue} on line ${targetLineIndex + 1}`);
            }
          }
          continue;
        }

        // Regular property updates
        const widget = metadataStore.get(edit.widgetId);
        if (widget) {
          editor.updateWidgetProperty(widget, edit.propertyName, edit.oldValue, edit.newValue);
        }
      }

      // Apply widget ID edits (sort descending by line number to avoid line shift issues)
      widgetIdEdits.sort((a, b) => {
        const lineA = a.widget.sourceLocation.line;
        const lineB = b.widget.sourceLocation.line;
        return lineB - lineA; // Descending order
      });

      for (const edit of widgetIdEdits) {
        console.log(`[Editor] Updating widget ID: "${edit.oldWidgetId || '(none)'}" → "${edit.newWidgetId || '(none)'}"`);
        editor.updateWidgetId(edit.widget, edit.oldWidgetId, edit.newWidgetId);
      }

      // Apply style updates
      for (const edit of styleEdits) {
        console.log(`[Editor] Updating styles object`);
        editor.updateStyles(edit.styles);
      }

      // Apply accessibility updates
      const accessibilityEdits = pendingEdits.filter(e => e.type === 'update-accessibility');
      for (const edit of accessibilityEdits) {
        console.log(`[Editor] Updating accessibility for ${edit.widgetId}`);
        editor.updateAccessibility(edit.widget, edit.accessibility);
      }

      // Get candidate source (after all edits)
      const candidateSource = editor.getSourceCode();

      // Apply source transformer (pluggable last-minute corrections)
      const transformer = transformerRegistry.getTransformer();
      console.log(`[Transformer] Using transformer: ${transformer.name}`);

      const transformContext: TransformContext = {
        originalSource: currentSourceCode!,
        candidateSource,
        filePath: currentFilePath!,
        metadata: currentMetadata,
        edits: pendingEdits
      };

      const transformResult = await transformer.transform(transformContext);

      if (transformResult.transformed) {
        console.log(`[Transformer] Applied transformations`);
      }

      if (transformResult.warnings) {
        transformResult.warnings.forEach(warning => {
          console.warn(`[Transformer] ${warning}`);
        });
      }

      // Lint the final output source
      const lintResult = lintSource(transformResult.source, 'save');
      if (!lintResult.valid) {
        console.warn('[Designer] Generated source has lint errors');
      }

      // Prepare output path
      const outputPath = currentFilePath!.replace('.ts', '.edited.ts');
      const fullOutputPath = path.join(__dirname, '..', '..', outputPath);

      // Apply writer strategy
      if (writer === 'disk') {
        // Write to file system
        fs.writeFileSync(fullOutputPath, transformResult.source, 'utf8');
        console.log(`[Editor] Saved changes to: ${outputPath}`);
      } else if (writer === 'memory') {
        // Memory only - no file write
        console.log(`[Editor] Captured changes to memory (no file written)`);
      }

      console.log(`[Editor] Applied ${pendingEdits.length} edits (${deleteEdits.length} deletes, ${addEdits.length} adds, ${propertyEdits.length} property updates, ${widgetIdEdits.length} widget ID updates)`);

      pendingEdits = [];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, outputPath, transformed: transformResult.transformed, content: transformResult.source }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
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

        // Generate updated source code with new styles
        const editor = new SourceCodeEditor(currentSourceCode!);
        editor.updateStyles(styles);
        const updatedSource = editor.getSourceCode();

        // Update currentSource so the "source" tab shows the updated CSS
        currentSource = updatedSource;
        console.log('[Designer] Updated currentSource with new styles');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          styles: currentStyles,
          currentSource: updatedSource
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/update-widget-id': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { internalId, oldWidgetId, newWidgetId } = JSON.parse(body);

        // Check if widget exists
        const widget = metadataStore.get(internalId);
        if (!widget) {
          throw new Error('Widget not found');
        }

        // Validate new widget ID if provided
        if (newWidgetId && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newWidgetId)) {
          throw new Error('Invalid widget ID');
        }

        // Check if new widget ID already exists
        if (newWidgetId) {
          for (const [id, w] of metadataStore.entries()) {
            if (id !== internalId && w.widgetId === newWidgetId) {
              throw new Error('A widget with this ID already exists');
            }
          }
        }

        // Update the widget's ID
        widget.widgetId = newWidgetId || null;

        // Update current metadata
        currentMetadata!.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Updated widget ID: "${oldWidgetId || '(none)'}" → "${newWidgetId || '(none)'}"`);

        // Record as a pending edit (for save operation)
        pendingEdits.push({
          type: 'update-widget-id',
          internalId,
          widget,
          oldWidgetId,
          newWidgetId
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, metadata: currentMetadata }));
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
  },

  '/api/duplicate-widget': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { widgetId } = JSON.parse(body);

        const widget = metadataStore.get(widgetId);
        if (!widget) {
          throw new Error('Widget not found');
        }

        // Don't allow duplicating window widgets
        if (widget.widgetType === 'window') {
          throw new Error('Cannot duplicate window widget');
        }

        // Generate new ID for duplicated widget
        let duplicateCounter = 1;
        let newId: string;
        do {
          newId = `${widgetId}_copy${duplicateCounter}`;
          duplicateCounter++;
        } while (metadataStore.has(newId));

        // Deep copy the widget
        const newWidget: WidgetMetadata = {
          id: newId,
          widgetType: widget.widgetType,
          parent: widget.parent,
          properties: widget.properties ? { ...widget.properties } : undefined,
          children: widget.children ? [...widget.children] : undefined,
          widgetId: widget.widgetId ? `${widget.widgetId}_copy` : undefined
        };

        // Helper function to recursively duplicate children
        function duplicateChildren(originalParentId: string, newParentId: string) {
          const children = Array.from(metadataStore.values()).filter(w => w.parent === originalParentId);
          const newChildIds: string[] = [];

          for (const child of children) {
            let childCounter = 1;
            let newChildId: string;
            do {
              newChildId = `${child.id}_copy${childCounter}`;
              childCounter++;
            } while (metadataStore.has(newChildId));

            const newChild: WidgetMetadata = {
              id: newChildId,
              widgetType: child.widgetType,
              parent: newParentId,
              properties: child.properties ? { ...child.properties } : undefined,
              children: child.children ? [...child.children] : undefined,
              widgetId: child.widgetId ? `${child.widgetId}_copy` : undefined
            };

            metadataStore.set(newChildId, newChild);
            newChildIds.push(newChildId);

            // Recursively duplicate grandchildren
            duplicateChildren(child.id, newChildId);
          }

          return newChildIds;
        }

        // Add duplicated widget to metadata store
        metadataStore.set(newId, newWidget);

        // Duplicate children recursively
        duplicateChildren(widgetId, newId);

        // Update metadata
        currentMetadata!.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Duplicated widget ${widgetId} -> ${newId} (${widget.widgetType})`);

        // Record as a pending edit
        pendingEdits.push({
          type: 'duplicate',
          widgetId,
          newWidgetId: newId,
          widget: newWidget
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, newWidgetId: newId }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/reorder-widget': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { draggedWidgetId, targetWidgetId } = JSON.parse(body);

        const draggedWidget = metadataStore.get(draggedWidgetId);
        const targetWidget = metadataStore.get(targetWidgetId);

        if (!draggedWidget || !targetWidget) {
          throw new Error('Widget not found');
        }

        // Only allow reordering widgets that share the same parent
        if (draggedWidget.parent !== targetWidget.parent) {
          throw new Error('Can only reorder widgets within the same parent container');
        }

        console.log(`[Editor] Reordering ${draggedWidget.widgetType} relative to ${targetWidget.widgetType}`);

        // Get all siblings to understand the current order
        const siblings = Array.from(metadataStore.values()).filter(w => w.parent === draggedWidget.parent);
        console.log('[REORDER] Siblings before reorder:');
        siblings.forEach((s, i) => {
          console.log(`[REORDER]   ${i}: ${s.id} - ${s.widgetType} "${s.properties?.text || ''}"`);
        });

        const draggedIndex = siblings.findIndex(w => w.id === draggedWidgetId);
        const targetIndex = siblings.findIndex(w => w.id === targetWidgetId);
        console.log(`[REORDER] draggedIndex=${draggedIndex}, targetIndex=${targetIndex}`);
        console.log(`[REORDER] Want to insert BEFORE target (position ${targetIndex})`);

        // Record as a pending edit
        pendingEdits.push({
          type: 'reorder',
          draggedWidget,
          targetWidget
        });

        // Update metadata order (just swap positions in the array for preview)
        const widgets = Array.from(metadataStore.values());
        const draggedIndexGlobal = widgets.findIndex(w => w.id === draggedWidgetId);
        const targetIndexGlobal = widgets.findIndex(w => w.id === targetWidgetId);

        if (draggedIndexGlobal !== -1 && targetIndexGlobal !== -1) {
          // Remove dragged widget
          const [removed] = widgets.splice(draggedIndexGlobal, 1);

          // Calculate new insertion position
          // We want to insert BEFORE the target, accounting for the removal
          let newTargetIndex;
          if (draggedIndexGlobal < targetIndexGlobal) {
            // Dragging down: target shifts up by 1 after removal, so insert at targetIndex-1
            newTargetIndex = targetIndexGlobal - 1;
          } else {
            // Dragging up: target position unchanged, insert at targetIndex
            newTargetIndex = targetIndexGlobal;
          }

          console.log(`[REORDER] Inserting at metadata index ${newTargetIndex}`);
          widgets.splice(newTargetIndex, 0, removed);
        }

        // Update metadata store to reflect new order
        currentMetadata!.widgets = widgets;

        // Generate current source by applying only the LATEST reorder edit
        // (not all accumulated edits - that causes cascading reorders)
        const editor = new SourceCodeEditor(currentSourceCode!);

        // Apply only the current/latest reorder (the one we just added)
        const latestReorderEdit = pendingEdits[pendingEdits.length - 1];
        if (latestReorderEdit && latestReorderEdit.type === 'reorder') {
          editor.reorderWidget(latestReorderEdit.draggedWidget, latestReorderEdit.targetWidget);
        }

        const updatedSource = editor.getSourceCode();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          metadata: currentMetadata,
          currentSource: updatedSource
        }));
      } catch (error: any) {
        console.error('[API Error]', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  },

  '/api/update-accessibility': (req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { widgetId, accessibility } = JSON.parse(body);

        const widget = metadataStore.get(widgetId);
        if (!widget) {
          throw new Error('Widget not found');
        }

        console.log(`[Editor] Updating accessibility for ${widgetId}:`, accessibility);

        // Update metadata
        widget.accessibility = accessibility;
        currentMetadata!.widgets = Array.from(metadataStore.values());

        // Record as a pending edit
        pendingEdits.push({
          type: 'update-accessibility',
          widgetId,
          widget,
          accessibility
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, metadata: currentMetadata }));
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
