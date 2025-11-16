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

// Designer API
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
  vbox(builder) {
    const widgetId = captureWidget('vbox', {});
    const prev = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prev;
  },
  hbox(builder) {
    const widgetId = captureWidget('hbox', {});
    const prev = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prev;
  },
  label(text) {
    captureWidget('label', { text });
  },
  button(text, onClick) {
    const widgetId = captureWidget('button', { text });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.eventHandlers.onClick = onClick.toString();
      }
    }
  },
  entry(placeholder, onSubmit, minWidth) {
    const widgetId = captureWidget('entry', { placeholder, minWidth });
    if (onSubmit) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.eventHandlers.onSubmit = onSubmit.toString();
      }
    }
  },
  checkbox(text, onChanged) {
    const widgetId = captureWidget('checkbox', { text });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.eventHandlers.onChanged = onChanged.toString();
      }
    }
  },
  select(options, onSelected) {
    const widgetId = captureWidget('select', { options: options.join(', ') });
    if (onSelected) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.eventHandlers.onSelected = onSelected.toString();
      }
    }
  },
  separator() { captureWidget('separator', {}); },
  hyperlink(text, url) { captureWidget('hyperlink', { text, url }); }
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
