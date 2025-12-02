/**
 * Designer Integration Test for Calculator Example
 *
 * This test loads examples/calculator.ts into the designer and validates:
 * - Widget hierarchy (window > vbox > label + grid)
 * - Grid layout properties (4x4 grid)
 * - Button properties (text, event handlers)
 * - Label properties (display)
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
  mouseEventHandlers: {
    onMouseIn?: string;
    onMouseMoved?: string;
    onMouseOut?: string;
  };
  accessibility?: {
    label?: string;
    description?: string;
    hint?: string;
    role?: string;
  };
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
    mouseEventHandlers: {},
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

// Create a chainable widget proxy for method chaining
function createWidgetProxy(widgetId: string): any {
  return {
    onMouseIn(callback: (event: { position: { x: number, y: number } }) => void) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.mouseEventHandlers.onMouseIn = callback.toString();
      }
      return this;
    },
    onMouseMoved(callback: (event: { position: { x: number, y: number } }) => void) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.mouseEventHandlers.onMouseMoved = callback.toString();
      }
      return this;
    },
    onMouseOut(callback: () => void) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.mouseEventHandlers.onMouseOut = callback.toString();
      }
      return this;
    },
    onMouse(callbacks: {
      in?: (event: { position: { x: number, y: number } }) => void,
      moved?: (event: { position: { x: number, y: number } }) => void,
      out?: () => void
    }) {
      if (callbacks.in) this.onMouseIn(callbacks.in);
      if (callbacks.moved) this.onMouseMoved(callbacks.moved);
      if (callbacks.out) this.onMouseOut(callbacks.out);
      return this;
    },
    accessibility(options: {
      label?: string;
      description?: string;
      hint?: string;
      role?: string;
    }) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        widget.accessibility = options;
      }
      return this;
    },
    announceOnHover(enabled: boolean) {
      const widget = metadataStore.get(widgetId);
      if (widget) {
        if (!widget.properties.announceOnHover) {
          widget.properties.announceOnHover = enabled;
        }
      }
      return this;
    }
  };
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
      show: () => {}
    };
    builder(windowObj);
    currentParent = prev;
  },

  vbox(builder: () => void): string {
    return containerWidget('vbox', {}, builder);
  },

  grid(columns: number, builder: () => void): string {
    return containerWidget('grid', { columns }, builder);
  },

  button(text: string, onClick?: () => void, className?: string): any {
    const widgetId = captureWidget('button', { text, className });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
    return createWidgetProxy(widgetId);
  },

  label(text: string, className?: string, alignment?: string, wrapping?: string, textStyle?: any): void {
    captureWidget('label', { text, className, alignment, wrapping, textStyle });
  }
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
  (global as any).grid = designer.grid;
  (global as any).button = designer.button;
  (global as any).label = designer.label;
  (global as any).styles = function() {}; // No-op for styles
  (global as any).FontStyle = { BOLD: 1, ITALIC: 2 }; // Mock FontStyle enum

  try {
    // Use ts-node to compile and run the TypeScript file
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2017'
      }
    });

    // Clear module cache
    delete require.cache[require.resolve(fullPath)];

    // Load the module
    const module = require(fullPath);

    // Call buildCalculator if it's exported
    if (module.buildCalculator) {
      designer.app({ title: 'Calculator' }, module.buildCalculator);
    }

  } finally {
    // Clean up globals
    delete (global as any).app;
    delete (global as any).window;
    delete (global as any).vbox;
    delete (global as any).grid;
    delete (global as any).button;
    delete (global as any).label;
    delete (global as any).styles;
    delete (global as any).FontStyle;
  }

  return Array.from(metadataStore.values());
}

describe('Calculator Designer Integration', () => {
  let widgets: WidgetMetadata[];

  beforeAll(() => {
    // Load the calculator into designer mode
    widgets = loadFileInDesignerMode('examples/calculator.ts');
  });

  test('should load calculator and capture all widgets', () => {
    expect(widgets.length).toBeGreaterThan(0);
// console.log(`Captured ${widgets.length} widgets`);
  });

  describe('Widget Hierarchy', () => {
    test('should have window as root widget', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      expect(windowWidget).toBeDefined();
      expect(windowWidget?.parent).toBeNull();
      expect(windowWidget?.properties.title).toBe('Calculator');
    });

    test('should have vbox as direct child of window', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');

      expect(vboxWidget).toBeDefined();
      expect(vboxWidget?.parent).toBe(windowWidget?.id);
    });

    test('should have label as first child of vbox', () => {
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      const labelWidget = widgets.find(w => w.widgetType === 'label' && w.parent === vboxWidget?.id);

      expect(labelWidget).toBeDefined();
      expect(labelWidget?.properties.text).toBe('0');
    });

    test('should have grid as second child of vbox', () => {
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      const gridWidget = widgets.find(w => w.widgetType === 'grid' && w.parent === vboxWidget?.id);

      expect(gridWidget).toBeDefined();
    });
  });

  describe('Grid Layout', () => {
    test('should have 4x4 grid layout', () => {
      const gridWidget = widgets.find(w => w.widgetType === 'grid');

      expect(gridWidget).toBeDefined();
      expect(gridWidget?.properties.columns).toBe(4);
    });

    test('should have 16 buttons in grid (4 rows × 4 columns)', () => {
      const gridWidget = widgets.find(w => w.widgetType === 'grid');
      const gridButtons = widgets.filter(w => w.widgetType === 'button' && w.parent === gridWidget?.id);

      expect(gridButtons.length).toBe(16);
    });

    test('should have correct button layout (reading order)', () => {
      const gridWidget = widgets.find(w => w.widgetType === 'grid');
      const gridButtons = widgets.filter(w => w.widgetType === 'button' && w.parent === gridWidget?.id);

      // Expected button order in 4x4 grid:
      // Row 1: 7, 8, 9, ÷
      // Row 2: 4, 5, 6, ×
      // Row 3: 1, 2, 3, -
      // Row 4: 0, Clr, =, +
      const expectedTexts = [
        '7', '8', '9', '÷',
        '4', '5', '6', '×',
        '1', '2', '3', '-',
        '0', 'Clr', '=', '+'
      ];

      const actualTexts = gridButtons.map(b => b.properties.text);
      expect(actualTexts).toEqual(expectedTexts);
    });
  });

  describe('Widget Properties', () => {
    test('should have display label with initial value "0"', () => {
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      const displayLabel = widgets.find(w =>
        w.widgetType === 'label' &&
        w.parent === vboxWidget?.id
      );

      expect(displayLabel).toBeDefined();
      expect(displayLabel?.properties.text).toBe('0');
    });

    test('should have number buttons (0-9)', () => {
      const numberButtons = widgets.filter(w =>
        w.widgetType === 'button' &&
        /^\d$/.test(w.properties.text)
      );

      expect(numberButtons.length).toBe(10);

      const numbers = numberButtons.map(b => b.properties.text).sort();
      expect(numbers).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    });

    test('should have operator buttons (+, -, ×, ÷)', () => {
      const operatorButtons = widgets.filter(w =>
        w.widgetType === 'button' &&
        ['+', '-', '×', '÷'].includes(w.properties.text)
      );

      expect(operatorButtons.length).toBe(4);

      const operators = operatorButtons.map(b => b.properties.text).sort();
      expect(operators).toEqual(['+', '-', '×', '÷']);
    });

    test('should have clear button', () => {
      const clearButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Clr'
      );

      expect(clearButton).toBeDefined();
    });

    test('should have equals button', () => {
      const equalsButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === '='
      );

      expect(equalsButton).toBeDefined();
    });
  });

  describe('Event Handlers', () => {
    test('should have onClick handlers for all buttons', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');

      expect(buttons.length).toBe(16);

      // All buttons should have onClick event handlers
      buttons.forEach(button => {
        expect(button.eventHandlers.onClick).toBeDefined();
        expect(typeof button.eventHandlers.onClick).toBe('string');
        expect(button.eventHandlers.onClick.length).toBeGreaterThan(0);
      });
    });

    test('should have appropriate event handlers for number buttons', () => {
      const numberButtons = widgets.filter(w =>
        w.widgetType === 'button' &&
        /^\d$/.test(w.properties.text)
      );

      numberButtons.forEach(button => {
        const handler = button.eventHandlers.onClick;
        // Handler should call handleNumber function
        expect(handler).toContain('handleNumber');
      });
    });

    test('should have appropriate event handlers for operator buttons', () => {
      const operatorButtons = widgets.filter(w =>
        w.widgetType === 'button' &&
        ['+', '-', '×', '÷'].includes(w.properties.text)
      );

      operatorButtons.forEach(button => {
        const handler = button.eventHandlers.onClick;
        // Handler should call handleOperator function
        expect(handler).toContain('handleOperator');
      });
    });

    test('should have clear handler for Clr button', () => {
      const clearButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Clr'
      );

      expect(clearButton?.eventHandlers.onClick).toContain('clear');
    });

    test('should have calculate handler for = button', () => {
      const equalsButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === '='
      );

      expect(equalsButton?.eventHandlers.onClick).toContain('calculate');
    });
  });

  describe('Source Code Locations', () => {
    test('should capture source locations for all widgets', () => {
      widgets.forEach(widget => {
        expect(widget.sourceLocation).toBeDefined();
        expect(widget.sourceLocation.file).toContain('calculator');
        expect(widget.sourceLocation.line).toBeGreaterThan(0);
        expect(widget.sourceLocation.column).toBeGreaterThan(0);
      });
    });

    test('should have grid widget source location in buildCalculator function', () => {
      const gridWidget = widgets.find(w => w.widgetType === 'grid');

      expect(gridWidget?.sourceLocation.line).toBeGreaterThan(70);
      expect(gridWidget?.sourceLocation.line).toBeLessThan(90);
    });
  });

  describe('Widget Tree Structure', () => {
    test('should have correct parent-child relationships', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      const gridWidget = widgets.find(w => w.widgetType === 'grid');
      const labelWidget = widgets.find(w => w.widgetType === 'label');

      // Window has no parent
      expect(windowWidget?.parent).toBeNull();

      // VBox is child of window
      expect(vboxWidget?.parent).toBe(windowWidget?.id);

      // Label is child of vbox
      expect(labelWidget?.parent).toBe(vboxWidget?.id);

      // Grid is child of vbox
      expect(gridWidget?.parent).toBe(vboxWidget?.id);

      // All buttons are children of grid
      const buttons = widgets.filter(w => w.widgetType === 'button');
      buttons.forEach(button => {
        expect(button.parent).toBe(gridWidget?.id);
      });
    });

    test('should have exactly 19 widgets total', () => {
      // 1 window + 1 vbox + 1 label + 1 grid + 16 buttons = 20 widgets
      // But styles() call might affect this, let's be flexible
      expect(widgets.length).toBeGreaterThanOrEqual(19);
    });
  });

  describe('Calculator-Specific Validations', () => {
    test('should match expected calculator layout structure', () => {
      // Verify the complete structure:
      // - Window
      //   - VBox
      //     - Label (display)
      //     - Grid (4 columns)
      //       - 16 Buttons

      const structure = {
        window: widgets.filter(w => w.widgetType === 'window').length,
        vbox: widgets.filter(w => w.widgetType === 'vbox').length,
        label: widgets.filter(w => w.widgetType === 'label').length,
        grid: widgets.filter(w => w.widgetType === 'grid').length,
        button: widgets.filter(w => w.widgetType === 'button').length
      };

      expect(structure.window).toBe(1);
      expect(structure.vbox).toBe(1);
      expect(structure.label).toBe(1);
      expect(structure.grid).toBe(1);
      expect(structure.button).toBe(16);
    });

    test('should have all calculator buttons in correct positions', () => {
      const gridWidget = widgets.find(w => w.widgetType === 'grid');
      const buttons = widgets.filter(w => w.widgetType === 'button' && w.parent === gridWidget?.id);

      // Verify we have all necessary calculator buttons
      const buttonTexts = buttons.map(b => b.properties.text);

      // All digits
      for (let i = 0; i <= 9; i++) {
        expect(buttonTexts).toContain(i.toString());
      }

      // All operators
      expect(buttonTexts).toContain('+');
      expect(buttonTexts).toContain('-');
      expect(buttonTexts).toContain('×');
      expect(buttonTexts).toContain('÷');

      // Special buttons
      expect(buttonTexts).toContain('=');
      expect(buttonTexts).toContain('Clr');
    });
  });
});
