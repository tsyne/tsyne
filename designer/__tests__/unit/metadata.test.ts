import { MetadataStore, WidgetMetadata, SourceLocation } from '../../src/metadata';

describe('MetadataStore', () => {
  let store: MetadataStore;

  beforeEach(() => {
    store = new MetadataStore();
  });

  test('should store and retrieve widget metadata', () => {
    const metadata: WidgetMetadata = {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 10, column: 5 },
      properties: { text: 'Click Me' },
      eventHandlers: {},
      children: [],
      parent: null
    };

    store.set('button-1', metadata);
    const retrieved = store.get('button-1');

    expect(retrieved).toEqual(metadata);
  });

  test('should return undefined for non-existent widget', () => {
    const result = store.get('nonexistent');
    expect(result).toBeUndefined();
  });

  test('should get all widgets', () => {
    const widget1: WidgetMetadata = {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 10, column: 5 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: null
    };

    const widget2: WidgetMetadata = {
      widgetId: 'label-1',
      widgetType: 'label',
      sourceLocation: { file: 'test.ts', line: 11, column: 5 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: null
    };

    store.set('button-1', widget1);
    store.set('label-1', widget2);

    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(widget1);
    expect(all).toContainEqual(widget2);
  });

  test('should clear all widgets', () => {
    store.set('button-1', {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 10, column: 5 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: null
    });

    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });

  test('should get widget tree (root widgets)', () => {
    const root: WidgetMetadata = {
      widgetId: 'vbox-1',
      widgetType: 'vbox',
      sourceLocation: { file: 'test.ts', line: 5, column: 5 },
      properties: {},
      eventHandlers: {},
      children: ['button-1'],
      parent: null
    };

    const child: WidgetMetadata = {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 6, column: 7 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: 'vbox-1'
    };

    store.set('vbox-1', root);
    store.set('button-1', child);

    const tree = store.getTree();
    expect(tree).toHaveLength(1);
    expect(tree[0]).toEqual(root);
  });

  test('should get children of a widget', () => {
    const parent: WidgetMetadata = {
      widgetId: 'vbox-1',
      widgetType: 'vbox',
      sourceLocation: { file: 'test.ts', line: 5, column: 5 },
      properties: {},
      eventHandlers: {},
      children: ['button-1', 'label-1'],
      parent: null
    };

    const child1: WidgetMetadata = {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 6, column: 7 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: 'vbox-1'
    };

    const child2: WidgetMetadata = {
      widgetId: 'label-1',
      widgetType: 'label',
      sourceLocation: { file: 'test.ts', line: 7, column: 7 },
      properties: {},
      eventHandlers: {},
      children: [],
      parent: 'vbox-1'
    };

    store.set('vbox-1', parent);
    store.set('button-1', child1);
    store.set('label-1', child2);

    const children = store.getChildren('vbox-1');
    expect(children).toHaveLength(2);
    expect(children).toContainEqual(child1);
    expect(children).toContainEqual(child2);
  });

  test('should export to JSON format', () => {
    const widget: WidgetMetadata = {
      widgetId: 'button-1',
      widgetType: 'button',
      sourceLocation: { file: 'test.ts', line: 10, column: 5 },
      properties: { text: 'Click Me' },
      eventHandlers: {},
      children: [],
      parent: null
    };

    store.set('button-1', widget);
    const json = store.toJSON();

    expect(json).toHaveProperty('widgets');
    expect(json.widgets).toHaveLength(1);
    expect(json.widgets[0]).toMatchObject({
      id: 'button-1',
      widgetId: 'button-1',
      widgetType: 'button'
    });
  });
});
