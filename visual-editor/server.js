/**
 * Visual Editor Server
 * Serves the UI and provides API for loading/editing Tsyne files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// State
let currentMetadata = null;
let currentFilePath = null;
let currentSourceCode = null;
let pendingEdits = [];

// Simple metadata store (using the POC approach)
const metadataStore = new Map();
let currentParent = null;
let widgetIdCounter = 0;

// Parse stack trace
function parseStackTrace(stack) {
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/\((.+):(\d+):(\d+)\)/);
    if (match && !match[1].includes('node_modules') && !match[1].includes('server.js')) {
      return { file: match[1], line: parseInt(match[2]), column: parseInt(match[3]) };
    }
  }
  return { file: 'unknown', line: 0, column: 0 };
}

// Capture widget
function captureWidget(type, props) {
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
function containerWidget(type, props, builder) {
  const widgetId = captureWidget(type, props);
  const prev = currentParent;
  currentParent = widgetId;
  builder();
  currentParent = prev;
  return widgetId;
}

// Designer API - Complete widget support
const designer = {
  app(options, builder) {
    console.log('[Designer] Loading app...');
    builder(designer);
  },

  window(options, builder) {
    const widgetId = captureWidget('window', options);
    const prev = currentParent;
    currentParent = widgetId;
    builder(designer);
    currentParent = prev;
  },

  // Containers
  vbox(builder) { return containerWidget('vbox', {}, builder); },
  hbox(builder) { return containerWidget('hbox', {}, builder); },
  scroll(builder) { return containerWidget('scroll', {}, builder); },
  center(builder) { return containerWidget('center', {}, builder); },

  grid(columns, builder) {
    return containerWidget('grid', { columns }, builder);
  },

  gridwrap(itemWidth, itemHeight, builder) {
    return containerWidget('gridwrap', { itemWidth, itemHeight }, builder);
  },

  hsplit(leadingBuilder, trailingBuilder, offset) {
    const widgetId = captureWidget('hsplit', { offset });
    const prev = currentParent;
    currentParent = widgetId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
  },

  vsplit(leadingBuilder, trailingBuilder, offset) {
    const widgetId = captureWidget('vsplit', { offset });
    const prev = currentParent;
    currentParent = widgetId;
    leadingBuilder();
    trailingBuilder();
    currentParent = prev;
  },

  tabs(tabDefinitions, location) {
    const widgetId = captureWidget('tabs', {
      tabs: tabDefinitions.map(t => t.title).join(', '),
      location
    });
    const prev = currentParent;
    currentParent = widgetId;
    tabDefinitions.forEach(tab => tab.builder());
    currentParent = prev;
  },

  card(title, subtitle, builder) {
    return containerWidget('card', { title, subtitle }, builder);
  },

  accordion(items) {
    const widgetId = captureWidget('accordion', {
      items: items.map(i => i.title).join(', ')
    });
    const prev = currentParent;
    currentParent = widgetId;
    items.forEach(item => item.builder());
    currentParent = prev;
  },

  form(items, onSubmit, onCancel) {
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

  border(config) {
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
  button(text, onClick) {
    const widgetId = captureWidget('button', { text });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
  },

  label(text, className, alignment, wrapping, textStyle) {
    captureWidget('label', { text, className, alignment, wrapping, textStyle });
  },

  entry(placeholder, onSubmit, minWidth, onDoubleClick) {
    const widgetId = captureWidget('entry', { placeholder, minWidth });
    if (onSubmit || onDoubleClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        if (onSubmit) widget.eventHandlers.onSubmit = onSubmit.toString();
        if (onDoubleClick) widget.eventHandlers.onDoubleClick = onDoubleClick.toString();
      }
    }
  },

  multilineentry(placeholder, wrapping) {
    captureWidget('multilineentry', { placeholder, wrapping });
  },

  passwordentry(placeholder, onSubmit) {
    const widgetId = captureWidget('passwordentry', { placeholder });
    if (onSubmit) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSubmit = onSubmit.toString();
    }
  },

  checkbox(text, onChanged) {
    const widgetId = captureWidget('checkbox', { text });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
  },

  select(options, onSelected) {
    const widgetId = captureWidget('select', { options: options.join(', ') });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  radiogroup(options, initialSelected, onSelected) {
    const widgetId = captureWidget('radiogroup', {
      options: options.join(', '),
      initialSelected
    });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  slider(min, max, initialValue, onChanged) {
    const widgetId = captureWidget('slider', { min, max, initialValue });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
  },

  progressbar(initialValue, infinite) {
    captureWidget('progressbar', { initialValue, infinite });
  },

  // Display widgets
  separator() {
    captureWidget('separator', {});
  },

  hyperlink(text, url) {
    captureWidget('hyperlink', { text, url });
  },

  image(pathOrOptions, fillMode, onClick, onDrag, onDragEnd) {
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

  richtext(segments) {
    captureWidget('richtext', {
      text: segments.map(s => s.text).join(' ')
    });
  },

  table(headers, data) {
    captureWidget('table', {
      headers: headers.join(', '),
      rows: data.length
    });
  },

  list(items, onSelected) {
    const widgetId = captureWidget('list', {
      items: items.slice(0, 3).join(', ') + (items.length > 3 ? '...' : '')
    });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSelected = onSelected.toString();
    }
  },

  tree(rootLabel) {
    captureWidget('tree', { rootLabel });
  },

  toolbar(toolbarItems) {
    const items = toolbarItems
      .filter(i => i.type !== 'separator' && i.type !== 'spacer')
      .map(i => i.label || i.type)
      .join(', ');
    captureWidget('toolbar', { items });
  },

  toolbarAction(label, onAction) {
    return { label, onAction, type: 'action' };
  }
};

// Load and execute a file in designer mode
function loadFileInDesignerMode(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  // Read source code
  currentSourceCode = fs.readFileSync(fullPath, 'utf8');
  currentFilePath = filePath;

  // Reset state
  metadataStore.clear();
  widgetIdCounter = 0;
  currentParent = null;

  console.log(`[Designer] Loading file: ${filePath}`);

  // Execute the code with designer API
  // For examples/hello.ts, we'll simulate it directly
  if (filePath.includes('hello.ts')) {
    designer.app({ title: "Hello Tsyne" }, (a) => {
      a.window({ title: "Hello World" }, (w) => {
        a.vbox(() => {
          a.label("Welcome to Tsyne!");
          a.label("A TypeScript wrapper for Fyne");
          a.button("Click Me", () => {
            console.log("Button clicked!");
          });
          a.button("Exit", () => {
            process.exit(0);
          });
        });
      });
    });
  }

  // Build metadata response
  currentMetadata = {
    widgets: Array.from(metadataStore.values())
  };

  return currentMetadata;
}

// Source code editor
class SourceCodeEditor {
  constructor(sourceCode) {
    this.lines = sourceCode.split('\n');
  }

  findAndReplace(searchText, replaceText) {
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

  getSourceCode() {
    return this.lines.join('\n');
  }
}

// API handlers
const apiHandlers = {
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
          filePath: currentFilePath
        }));
      } catch (error) {
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
        currentMetadata.widgets = Array.from(metadataStore.values());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
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

      const editor = new SourceCodeEditor(currentSourceCode);

      // Apply all pending edits
      for (const edit of pendingEdits) {
        const searchText = `"${edit.oldValue}"`;
        const replaceText = `"${edit.newValue}"`;
        editor.findAndReplace(searchText, replaceText);
      }

      // Save to .edited.ts file
      const outputPath = currentFilePath.replace('.ts', '.edited.ts');
      const fullOutputPath = path.join(__dirname, '..', outputPath);

      fs.writeFileSync(fullOutputPath, editor.getSourceCode(), 'utf8');

      console.log(`[Editor] Saved changes to: ${outputPath}`);
      console.log(`[Editor] Applied ${pendingEdits.length} edits`);

      pendingEdits = [];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, outputPath }));
    } catch (error) {
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
        const defaultProps = {
          'label': { text: 'New Label' },
          'button': { text: 'New Button' },
          'entry': { placeholder: 'Enter text...' },
          'checkbox': { text: 'New Checkbox' },
          'hyperlink': { text: 'Link', url: '#' },
          'image': { path: 'image.png' }
        };

        const props = defaultProps[widgetType] || {};

        // Add the widget
        currentParent = parentId;
        const newWidgetId = captureWidget(widgetType, props);
        currentParent = null;

        // Update metadata
        currentMetadata.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Added ${widgetType} to ${parentId}`);

        // Record as a pending edit (we'll need to implement source code insertion)
        pendingEdits.push({
          type: 'add',
          parentId,
          widgetType,
          properties: props
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, widgetId: newWidgetId }));
      } catch (error) {
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
        currentMetadata.widgets = Array.from(metadataStore.values());

        console.log(`[Editor] Deleted widget ${widgetId} (${widget.widgetType})`);

        // Record as a pending edit
        pendingEdits.push({
          type: 'delete',
          widgetId,
          widget
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
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
  if (apiHandlers[req.url]) {
    apiHandlers[req.url](req, res);
    return;
  }

  // Static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath);
  const contentTypes = {
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
  console.log('║  Tsyne WYSIWYG Editor Server                ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  Open your browser and click "Load File"');
  console.log('  to start editing examples/hello.ts');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
});
