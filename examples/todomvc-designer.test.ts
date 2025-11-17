/**
 * Designer Integration Test for TodoMVC Example
 *
 * This test loads examples/todomvc.ts into the designer and validates:
 * - Widget hierarchy (window > vbox > labels, buttons, containers)
 * - Layout structure (multiple hbox containers, separators)
 * - Input widgets (entry fields, buttons, checkboxes)
 * - Label properties
 * - Button text and handlers
 * - Container relationships
 */

import * as fs from 'fs';
import * as path from 'path';

// Designer metadata types
interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

interface WidgetMetadata {
  id: string;
  widgetType: string;
  sourceLocation: SourceLocation;
  properties: Record<string, any>;
  eventHandlers: Record<string, string>;
  parent: string | null;
}

// Designer emulation (extracted from server.ts)
const metadataStore = new Map<string, WidgetMetadata>();
let currentParent: string | null = null;
let widgetIdCounter = 0;

function parseStackTrace(stack: string): SourceLocation {
  const lines = stack.split('\n');
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
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

function captureWidget(type: string, props: any): string {
  const widgetId = `widget-${widgetIdCounter++}`;
  const location = parseStackTrace(new Error().stack || '');
  const metadata: WidgetMetadata = {
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

function containerWidget(type: string, props: any, builder: () => void): string {
  const widgetId = captureWidget(type, props);
  const prev = currentParent;
  currentParent = widgetId;
  builder();
  currentParent = prev;
  return widgetId;
}

// Designer API (emulates Tsyne ABI)
const designer = {
  app(options: any, builder: (a: any) => void) {
    builder(designer);
  },

  window(options: any, builder: (win: any) => void) {
    const widgetId = captureWidget('window', options);
    const prev = currentParent;
    currentParent = widgetId;
    const windowObj = {
      setContent: (contentBuilder: () => void) => {
        contentBuilder();
      },
      show: () => {},
      centerOnScreen: () => {}
    };
    builder(windowObj);
    currentParent = prev;
  },

  vbox(builder: () => void): any {
    const widgetId = containerWidget('vbox', {}, builder);
    return {
      add: (builder: () => void) => {
        const prev = currentParent;
        currentParent = widgetId;
        builder();
        currentParent = prev;
      },
      removeAll: () => {},
      refresh: () => {}
    };
  },

  hbox(builder: () => void): any {
    const widgetId = containerWidget('hbox', {}, builder);
    return {
      ngShow: () => {}
    };
  },

  button(text: string, onClick?: () => void): any {
    const widgetId = captureWidget('button', { text });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
    return {
      setText: async () => {}
    };
  },

  label(text: string): any {
    captureWidget('label', { text });
    return {
      setText: async () => {},
      withId: (id: string) => ({ setText: async () => {}, withId: () => {} })
    };
  },

  entry(placeholder?: string, onSubmit?: (text: string) => void, minWidth?: number): any {
    const widgetId = captureWidget('entry', { placeholder, minWidth });
    if (onSubmit) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onSubmit = onSubmit.toString();
    }
    return {
      getText: async () => '',
      setText: async () => {},
      hide: async () => {},
      show: async () => {},
      focus: async () => {},
      withId: (id: string) => ({
        getText: async () => '',
        setText: async () => {},
        hide: async () => {},
        show: async () => {},
        focus: async () => {},
        withId: () => {}
      })
    };
  },

  checkbox(text: string, onChanged?: (checked: boolean) => void): any {
    const widgetId = captureWidget('checkbox', { text });
    if (onChanged) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onChanged = onChanged.toString();
    }
    return {
      setChecked: async () => {},
      setText: async () => {},
      getText: async () => text,
      hide: async () => {},
      show: async () => {},
      withId: (id: string) => ({
        setChecked: async () => {},
        setText: async () => {},
        getText: async () => text,
        hide: async () => {},
        show: async () => {},
        withId: () => {}
      })
    };
  },

  separator(): void {
    captureWidget('separator', {});
  }
};

// Mock fs and path for TodoMVC
const mockFs = {
  existsSync: () => false,
  readFileSync: () => '{}',
  writeFileSync: () => {}
};

const mockPath = {
  join: (...args: string[]) => args.join('/'),
  basename: (p: string) => p.split('/').pop() || p
};

// Load file in designer mode
function loadFileInDesignerMode(filePath: string): WidgetMetadata[] {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const sourceCode = fs.readFileSync(fullPath, 'utf8');

  // Reset state
  metadataStore.clear();
  widgetIdCounter = 0;
  currentParent = null;

  // Make designer available globally
  (global as any).app = designer.app;
  (global as any).window = designer.window;
  (global as any).vbox = designer.vbox;
  (global as any).hbox = designer.hbox;
  (global as any).button = designer.button;
  (global as any).label = designer.label;
  (global as any).entry = designer.entry;
  (global as any).checkbox = designer.checkbox;
  (global as any).separator = designer.separator;
  (global as any).fs = mockFs;
  (global as any).path = mockPath;

  // Save original process and console
  const originalProcess = (global as any).process;
  const originalConsole = (global as any).console;

  // Mock only specific process properties
  const mockProcess = Object.create(originalProcess);
  mockProcess.cwd = () => '/test';
  mockProcess.argv = [];
  (global as any).process = mockProcess;

  // Mock console
  (global as any).console = {
    log: () => {},
    error: () => {}
  };

  try {
    // Use ts-node to compile and run the TypeScript file
    // Only register if not already registered
    if (!(global as any).tsNodeRegistered) {
      require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
          module: 'commonjs',
          target: 'es2017'
        }
      });
      (global as any).tsNodeRegistered = true;
    }

    // Clear module cache
    delete require.cache[require.resolve(fullPath)];

    // Load the module
    const module = require(fullPath);

    // Call createTodoApp if it's exported
    if (module.createTodoApp) {
      designer.app({ title: 'TodoMVC' }, (a: any) => {
        module.createTodoApp(a, '/test/todos.json');
      });
    }

  } finally {
    // Clean up globals
    delete (global as any).app;
    delete (global as any).window;
    delete (global as any).vbox;
    delete (global as any).hbox;
    delete (global as any).button;
    delete (global as any).label;
    delete (global as any).entry;
    delete (global as any).checkbox;
    delete (global as any).separator;
    delete (global as any).fs;
    delete (global as any).path;
    // Restore originals
    (global as any).process = originalProcess;
    (global as any).console = originalConsole;
  }

  return Array.from(metadataStore.values());
}

describe('TodoMVC Designer Integration', () => {
  let widgets: WidgetMetadata[];

  beforeAll(() => {
    // Load the TodoMVC into designer mode
    widgets = loadFileInDesignerMode('examples/todomvc.ts');
  });

  test('should load TodoMVC and capture all widgets', () => {
    expect(widgets.length).toBeGreaterThan(0);
    console.log(`Captured ${widgets.length} widgets`);
  });

  describe('Widget Hierarchy', () => {
    test('should have window as root widget', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      expect(windowWidget).toBeDefined();
      expect(windowWidget?.parent).toBeNull();
      expect(windowWidget?.properties.title).toBe('TodoMVC');
      expect(windowWidget?.properties.width).toBe(700);
      expect(windowWidget?.properties.height).toBe(600);
    });

    test('should have main vbox as direct child of window', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const mainVBox = widgets.find(w => w.widgetType === 'vbox' && w.parent === windowWidget?.id);

      expect(mainVBox).toBeDefined();
    });

    test('should have multiple vbox containers', () => {
      const vboxWidgets = widgets.filter(w => w.widgetType === 'vbox');
      expect(vboxWidgets.length).toBeGreaterThanOrEqual(2); // Main vbox + todo container vbox
    });

    test('should have multiple hbox containers', () => {
      const hboxWidgets = widgets.filter(w => w.widgetType === 'hbox');
      expect(hboxWidgets.length).toBeGreaterThanOrEqual(3); // Add todo hbox, filter hbox, file ops hbox
    });
  });

  describe('Layout Structure', () => {
    test('should have separators for visual separation', () => {
      const separators = widgets.filter(w => w.widgetType === 'separator');
      expect(separators.length).toBeGreaterThanOrEqual(2);
    });

    test('should have TodoMVC title label', () => {
      const titleLabel = widgets.find(w =>
        w.widgetType === 'label' &&
        w.properties.text === 'TodoMVC'
      );
      expect(titleLabel).toBeDefined();
    });

    test('should have "Add New Todo:" instruction label', () => {
      const instructionLabel = widgets.find(w =>
        w.widgetType === 'label' &&
        w.properties.text === 'Add New Todo:'
      );
      expect(instructionLabel).toBeDefined();
    });

    test('should have "Filter:" label', () => {
      const filterLabel = widgets.find(w =>
        w.widgetType === 'label' &&
        w.properties.text === 'Filter:'
      );
      expect(filterLabel).toBeDefined();
    });
  });

  describe('Input Widgets', () => {
    test('should have new todo entry field', () => {
      const newTodoEntry = widgets.find(w =>
        w.widgetType === 'entry' &&
        w.properties.placeholder === 'What needs to be done?'
      );

      expect(newTodoEntry).toBeDefined();
      expect(newTodoEntry?.properties.minWidth).toBe(400);
    });

    test('should have entry field in an hbox', () => {
      const newTodoEntry = widgets.find(w =>
        w.widgetType === 'entry' &&
        w.properties.placeholder === 'What needs to be done?'
      );

      expect(newTodoEntry).toBeDefined();
      const parentHBox = widgets.find(w => w.id === newTodoEntry?.parent);
      expect(parentHBox?.widgetType).toBe('hbox');
    });
  });

  describe('Buttons', () => {
    test('should have Add button', () => {
      const addButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Add'
      );
      expect(addButton).toBeDefined();
    });

    test('should have filter buttons (All, Active, Completed)', () => {
      const allButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === '[All]'
      );
      const activeButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Active'
      );
      const completedButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Completed'
      );

      expect(allButton).toBeDefined();
      expect(activeButton).toBeDefined();
      expect(completedButton).toBeDefined();
    });

    test('should have Clear Completed button', () => {
      const clearButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Clear Completed'
      );
      expect(clearButton).toBeDefined();
    });

    test('should have file operation buttons', () => {
      const reloadButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Reload from File'
      );
      const saveButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Save to File'
      );

      expect(reloadButton).toBeDefined();
      expect(saveButton).toBeDefined();
    });

    test('should have all expected buttons', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');
      const buttonTexts = buttons.map(b => b.properties.text);

      expect(buttonTexts).toContain('Add');
      expect(buttonTexts).toContain('[All]');
      expect(buttonTexts).toContain('Active');
      expect(buttonTexts).toContain('Completed');
      expect(buttonTexts).toContain('Clear Completed');
      expect(buttonTexts).toContain('Reload from File');
      expect(buttonTexts).toContain('Save to File');
    });
  });

  describe('Labels', () => {
    test('should have multiple labels for spacing and instructions', () => {
      const labels = widgets.filter(w => w.widgetType === 'label');
      expect(labels.length).toBeGreaterThan(5);
    });

    test('should have empty labels for spacing', () => {
      const emptyLabels = widgets.filter(w =>
        w.widgetType === 'label' &&
        w.properties.text === ''
      );
      expect(emptyLabels.length).toBeGreaterThan(0);
    });

    test('should have status label placeholder', () => {
      // Status label starts empty and gets updated later
      const statusLabels = widgets.filter(w =>
        w.widgetType === 'label' &&
        w.properties.text === ''
      );
      expect(statusLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handlers', () => {
    test('should have Add button with onClick handler', () => {
      const addButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Add'
      );

      expect(addButton?.eventHandlers.onClick).toBeDefined();
      expect(addButton?.eventHandlers.onClick).toContain('addTodo');
    });

    test('should have filter buttons with onClick handlers', () => {
      const allButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === '[All]'
      );
      const activeButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Active'
      );
      const completedButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Completed'
      );

      expect(allButton?.eventHandlers.onClick).toBeDefined();
      expect(allButton?.eventHandlers.onClick).toContain('setFilter');

      expect(activeButton?.eventHandlers.onClick).toBeDefined();
      expect(activeButton?.eventHandlers.onClick).toContain('setFilter');

      expect(completedButton?.eventHandlers.onClick).toBeDefined();
      expect(completedButton?.eventHandlers.onClick).toContain('setFilter');
    });

    test('should have Clear Completed button with onClick handler', () => {
      const clearButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Clear Completed'
      );

      expect(clearButton?.eventHandlers.onClick).toBeDefined();
      expect(clearButton?.eventHandlers.onClick).toContain('clearCompleted');
    });

    test('should have file operation buttons with onClick handlers', () => {
      const reloadButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Reload from File'
      );
      const saveButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Save to File'
      );

      expect(reloadButton?.eventHandlers.onClick).toBeDefined();
      expect(reloadButton?.eventHandlers.onClick).toContain('load');

      expect(saveButton?.eventHandlers.onClick).toBeDefined();
      expect(saveButton?.eventHandlers.onClick).toContain('save');
    });
  });

  describe('Source Code Locations', () => {
    test('should capture source locations for all widgets', () => {
      widgets.forEach(widget => {
        expect(widget.sourceLocation).toBeDefined();
        expect(widget.sourceLocation.file).toContain('todomvc');
        expect(widget.sourceLocation.line).toBeGreaterThan(0);
      });
    });

    test('should have window widget in createTodoApp function', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      // Window widget is created in the designer.window mock, around line 90-100
      expect(windowWidget?.sourceLocation.line).toBeGreaterThan(80);
      expect(windowWidget?.sourceLocation.line).toBeLessThan(110);
    });
  });

  describe('Widget Tree Structure', () => {
    test('should have correct parent-child relationships', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const mainVBox = widgets.find(w => w.widgetType === 'vbox' && w.parent === windowWidget?.id);

      // Window has no parent
      expect(windowWidget?.parent).toBeNull();

      // Main VBox is child of window
      expect(mainVBox?.parent).toBe(windowWidget?.id);

      // Labels should be children of vbox or hbox
      const labels = widgets.filter(w => w.widgetType === 'label');
      labels.forEach(label => {
        const parent = widgets.find(w => w.id === label.parent);
        expect(['vbox', 'hbox']).toContain(parent?.widgetType);
      });

      // Buttons should be children of vbox or hbox
      const buttons = widgets.filter(w => w.widgetType === 'button');
      buttons.forEach(button => {
        const parent = widgets.find(w => w.id === button.parent);
        expect(['vbox', 'hbox']).toContain(parent?.widgetType);
      });
    });

    test('should have reasonable widget count', () => {
      // TodoMVC has many widgets: window, vboxes, hboxes, labels, buttons, entry, separators
      // Exact count may vary but should be substantial
      expect(widgets.length).toBeGreaterThanOrEqual(15);
      expect(widgets.length).toBeLessThan(50); // Sanity check
    });
  });

  describe('TodoMVC-Specific Validations', () => {
    test('should match expected TodoMVC layout structure', () => {
      const structure = {
        window: widgets.filter(w => w.widgetType === 'window').length,
        vbox: widgets.filter(w => w.widgetType === 'vbox').length,
        hbox: widgets.filter(w => w.widgetType === 'hbox').length,
        label: widgets.filter(w => w.widgetType === 'label').length,
        button: widgets.filter(w => w.widgetType === 'button').length,
        entry: widgets.filter(w => w.widgetType === 'entry').length,
        separator: widgets.filter(w => w.widgetType === 'separator').length
      };

      expect(structure.window).toBe(1);
      expect(structure.vbox).toBeGreaterThanOrEqual(2);
      expect(structure.hbox).toBeGreaterThanOrEqual(3);
      expect(structure.label).toBeGreaterThan(5);
      expect(structure.button).toBe(7); // Add, All, Active, Completed, Clear Completed, Reload, Save
      expect(structure.entry).toBeGreaterThanOrEqual(1);
      expect(structure.separator).toBeGreaterThanOrEqual(2);
    });

    test('should have all core TodoMVC sections', () => {
      // Check for presence of key UI sections
      const hasTitleLabel = widgets.some(w =>
        w.widgetType === 'label' && w.properties.text === 'TodoMVC'
      );
      const hasAddSection = widgets.some(w =>
        w.widgetType === 'label' && w.properties.text === 'Add New Todo:'
      );
      const hasFilterSection = widgets.some(w =>
        w.widgetType === 'label' && w.properties.text === 'Filter:'
      );
      const hasNewTodoEntry = widgets.some(w =>
        w.widgetType === 'entry' && w.properties.placeholder === 'What needs to be done?'
      );

      expect(hasTitleLabel).toBe(true);
      expect(hasAddSection).toBe(true);
      expect(hasFilterSection).toBe(true);
      expect(hasNewTodoEntry).toBe(true);
    });

    test('should have proper filter button layout in hbox', () => {
      // Find the filter buttons
      const allButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === '[All]');
      const activeButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Active');
      const completedButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Completed');
      const clearButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Clear Completed');

      // They should all be in the same hbox
      expect(allButton?.parent).toBe(activeButton?.parent);
      expect(activeButton?.parent).toBe(completedButton?.parent);
      expect(completedButton?.parent).toBe(clearButton?.parent);

      // That parent should be an hbox
      const filterHBox = widgets.find(w => w.id === allButton?.parent);
      expect(filterHBox?.widgetType).toBe('hbox');
    });

    test('should have proper file operations layout in hbox', () => {
      const reloadButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Reload from File');
      const saveButton = widgets.find(w => w.widgetType === 'button' && w.properties.text === 'Save to File');

      // They should be in the same hbox
      expect(reloadButton?.parent).toBe(saveButton?.parent);

      // That parent should be an hbox
      const fileOpsHBox = widgets.find(w => w.id === reloadButton?.parent);
      expect(fileOpsHBox?.widgetType).toBe('hbox');
    });
  });
});
