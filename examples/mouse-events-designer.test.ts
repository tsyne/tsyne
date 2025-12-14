/**
 * Designer Integration Test for Mouse Events Demo
 *
 * This test validates that the designer correctly captures:
 * - Mouse event handlers (onMouseIn, onMouseMoved, onMouseOut, onMouse)
 * - Accessibility properties (label, description, hint, role)
 * - Method chaining for widget configuration
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

  window(options: any, builder: () => void) {
    const widgetId = captureWidget('window', options);
    const prev = currentParent;
    currentParent = widgetId;
    builder();
    currentParent = prev;
  },

  vbox(builder: () => void): string {
    return containerWidget('vbox', {}, builder);
  },

  separator(): void {
    captureWidget('separator', {});
  },

  button(text: string, onClick?: () => void): any {
    const widgetId = captureWidget('button', { text });
    if (onClick) {
      const widget = metadataStore.get(widgetId);
      if (widget) widget.eventHandlers.onClick = onClick.toString();
    }
    return createWidgetProxy(widgetId);
  },

  label(text: string): void {
    captureWidget('label', { text });
  }
};

// Module interceptor - mocks the src imports
const mockModule = {
  app: designer.app,
  window: designer.window,
  vbox: designer.vbox,
  button: designer.button,
  label: designer.label,
  separator: designer.separator
};

// Load file in designer mode
function loadFileInDesignerMode(filePath: string): WidgetMetadata[] {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  // Reset state
  metadataStore.clear();
  widgetIdCounter = 0;
  currentParent = null;

  try {
    // Use tsx to compile and run the TypeScript file
    require('tsx/cjs');

    // Mock the '../src' module
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function(id: string) {
      if (id === '../src') {
        return mockModule;
      }
      return originalRequire.apply(this, arguments);
    };

    // Clear module cache
    delete require.cache[require.resolve(fullPath)];

    // Load the module - it will execute and call app()
    require(fullPath);

    // Restore original require
    Module.prototype.require = originalRequire;

  } catch (error) {
    console.error('Error loading file:', error);
    throw error;
  }

  return Array.from(metadataStore.values());
}

describe('Mouse Events Demo Designer Integration', () => {
  let widgets: WidgetMetadata[];

  beforeAll(() => {
    // Load the mouse events demo into designer mode
    widgets = loadFileInDesignerMode('examples/mouse-events-demo.ts');
  });

  test('should load demo and capture all widgets', () => {
    expect(widgets.length).toBeGreaterThan(0);
    console.log(`Captured ${widgets.length} widgets`);
  });

  describe('Widget Hierarchy', () => {
    test('should have window as root widget', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      expect(windowWidget).toBeDefined();
      expect(windowWidget?.parent).toBeNull();
      expect(windowWidget?.properties.title).toBe('Mouse Events Demo');
    });

    test('should have vbox as child of window', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      expect(vboxWidget).toBeDefined();
      expect(vboxWidget?.parent).toBe(windowWidget?.id);
    });

    test('should have 4 demo buttons', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');
      expect(buttons.length).toBe(4);
    });
  });

  describe('Mouse Event Handlers - Individual Events Button', () => {
    let individualButton: WidgetMetadata | undefined;

    beforeAll(() => {
      individualButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Individual Events'
      );
    });

    test('should capture Individual Events button', () => {
      expect(individualButton).toBeDefined();
      expect(individualButton?.properties.text).toBe('Individual Events');
    });

    test('should have onMouseIn handler', () => {
      expect(individualButton?.mouseEventHandlers.onMouseIn).toBeDefined();
      expect(individualButton?.mouseEventHandlers.onMouseIn).toContain('position');
      expect(individualButton?.mouseEventHandlers.onMouseIn).toContain('Individual');
    });

    test('should have onMouseMoved handler', () => {
      expect(individualButton?.mouseEventHandlers.onMouseMoved).toBeDefined();
      expect(individualButton?.mouseEventHandlers.onMouseMoved).toContain('position');
      expect(individualButton?.mouseEventHandlers.onMouseMoved).toContain('Individual');
    });

    test('should have onMouseOut handler', () => {
      expect(individualButton?.mouseEventHandlers.onMouseOut).toBeDefined();
      expect(individualButton?.mouseEventHandlers.onMouseOut).toContain('Individual');
    });

    test('should have onClick handler', () => {
      expect(individualButton?.eventHandlers.onClick).toBeDefined();
      expect(individualButton?.eventHandlers.onClick).toContain('Clicked!');
    });
  });

  describe('Mouse Event Handlers - Combined Events Button', () => {
    let combinedButton: WidgetMetadata | undefined;

    beforeAll(() => {
      combinedButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Combined Events'
      );
    });

    test('should capture Combined Events button', () => {
      expect(combinedButton).toBeDefined();
      expect(combinedButton?.properties.text).toBe('Combined Events');
    });

    test('should have onMouseIn handler via onMouse()', () => {
      expect(combinedButton?.mouseEventHandlers.onMouseIn).toBeDefined();
      expect(combinedButton?.mouseEventHandlers.onMouseIn).toContain('Combined');
    });

    test('should have onMouseMoved handler via onMouse()', () => {
      expect(combinedButton?.mouseEventHandlers.onMouseMoved).toBeDefined();
      expect(combinedButton?.mouseEventHandlers.onMouseMoved).toContain('Combined');
    });

    test('should have onMouseOut handler via onMouse()', () => {
      expect(combinedButton?.mouseEventHandlers.onMouseOut).toBeDefined();
      expect(combinedButton?.mouseEventHandlers.onMouseOut).toContain('Combined');
    });
  });

  describe('Mouse Event Handlers - Selective Events Button', () => {
    let selectiveButton: WidgetMetadata | undefined;

    beforeAll(() => {
      selectiveButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'Enter/Exit Only'
      );
    });

    test('should capture Enter/Exit Only button', () => {
      expect(selectiveButton).toBeDefined();
      expect(selectiveButton?.properties.text).toBe('Enter/Exit Only');
    });

    test('should have onMouseIn handler', () => {
      expect(selectiveButton?.mouseEventHandlers.onMouseIn).toBeDefined();
      expect(selectiveButton?.mouseEventHandlers.onMouseIn).toContain('Selective');
    });

    test('should have onMouseOut handler', () => {
      expect(selectiveButton?.mouseEventHandlers.onMouseOut).toBeDefined();
      expect(selectiveButton?.mouseEventHandlers.onMouseOut).toContain('Selective');
    });

    test('should NOT have onMouseMoved handler', () => {
      expect(selectiveButton?.mouseEventHandlers.onMouseMoved).toBeUndefined();
    });
  });

  describe('Accessibility Properties - With Accessibility Button', () => {
    let accessibleButton: WidgetMetadata | undefined;

    beforeAll(() => {
      accessibleButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'With Accessibility'
      );
    });

    test('should capture With Accessibility button', () => {
      expect(accessibleButton).toBeDefined();
      expect(accessibleButton?.properties.text).toBe('With Accessibility');
    });

    test('should have accessibility label', () => {
      expect(accessibleButton?.accessibility).toBeDefined();
      expect(accessibleButton?.accessibility?.label).toBe('Accessible Button');
    });

    test('should have accessibility description', () => {
      expect(accessibleButton?.accessibility?.description).toBe(
        'This button has both custom mouse events and accessibility'
      );
    });

    test('should have accessibility hint', () => {
      expect(accessibleButton?.accessibility?.hint).toBe(
        'Hover to see mouse events and accessibility announcements'
      );
    });

    test('should have mouse event handlers', () => {
      expect(accessibleButton?.mouseEventHandlers.onMouseIn).toBeDefined();
      expect(accessibleButton?.mouseEventHandlers.onMouseOut).toBeDefined();
    });
  });

  describe('Complete Widget Coverage', () => {
    test('should have all expected widget types', () => {
      const widgetTypes = new Set(widgets.map(w => w.widgetType));
      expect(widgetTypes.has('window')).toBe(true);
      expect(widgetTypes.has('vbox')).toBe(true);
      expect(widgetTypes.has('button')).toBe(true);
      expect(widgetTypes.has('label')).toBe(true);
      expect(widgetTypes.has('separator')).toBe(true);
    });

    test('should have correct parent-child relationships', () => {
      const windowWidget = widgets.find(w => w.widgetType === 'window');
      const vboxWidget = widgets.find(w => w.widgetType === 'vbox');
      const buttons = widgets.filter(w => w.widgetType === 'button');

      // Window has no parent
      expect(windowWidget?.parent).toBeNull();

      // VBox is child of window
      expect(vboxWidget?.parent).toBe(windowWidget?.id);

      // All buttons are children of vbox
      buttons.forEach(button => {
        expect(button.parent).toBe(vboxWidget?.id);
      });
    });

    test('should capture all 4 demo buttons with correct text', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');
      const buttonTexts = buttons.map(b => b.properties.text);

      expect(buttonTexts).toContain('Individual Events');
      expect(buttonTexts).toContain('Combined Events');
      expect(buttonTexts).toContain('Enter/Exit Only');
      expect(buttonTexts).toContain('With Accessibility');
    });
  });

  describe('Round-Trip Capability', () => {
    test('should preserve all mouse event handlers for round-trip', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');

      buttons.forEach(button => {
        // Each button should have at least one mouse event handler
        const hasMouseEvents =
          button.mouseEventHandlers.onMouseIn ||
          button.mouseEventHandlers.onMouseMoved ||
          button.mouseEventHandlers.onMouseOut;

        expect(hasMouseEvents).toBeTruthy();
      });
    });

    test('should preserve accessibility properties for round-trip', () => {
      const accessibleButton = widgets.find(w =>
        w.widgetType === 'button' &&
        w.properties.text === 'With Accessibility'
      );

      // Should be able to reconstruct accessibility() call from stored metadata
      expect(accessibleButton?.accessibility).toMatchObject({
        label: 'Accessible Button',
        description: 'This button has both custom mouse events and accessibility',
        hint: 'Hover to see mouse events and accessibility announcements'
      });
    });

    test('should preserve all event handlers for round-trip', () => {
      const buttons = widgets.filter(w => w.widgetType === 'button');

      buttons.forEach(button => {
        // All buttons have onClick handlers
        expect(button.eventHandlers.onClick).toBeDefined();
      });
    });
  });
});
