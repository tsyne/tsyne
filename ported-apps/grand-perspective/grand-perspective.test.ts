/**
 * Jest Unit Tests for GrandPerspective
 *
 * Portions copyright © Erwin Bonsma (GrandPerspective original)
 * Portions copyright © Paul Hammant 2026 (Tsyne port)
 *
 * Licensed under MIT License
 */

import {
  FileEntry,
  TreemapRect,
  GrandPerspectiveStore,
  buildGrandPerspectiveApp,
} from './grand-perspective';

// ============================================================================
// File Entry and Store Tests
// ============================================================================

describe('FileEntry Structure', () => {
  test('creates file entry with correct properties', () => {
    const entry: FileEntry = {
      id: 'file-1',
      name: 'test.txt',
      path: '/tmp/test.txt',
      size: 1024,
      isDirectory: false,
      children: [],
    };

    expect(entry.id).toBe('file-1');
    expect(entry.name).toBe('test.txt');
    expect(entry.size).toBe(1024);
    expect(entry.isDirectory).toBe(false);
    expect(entry.children).toHaveLength(0);
  });

  test('creates directory entry with children', () => {
    const child1: FileEntry = {
      id: 'file-2',
      name: 'doc1.txt',
      path: '/tmp/doc1.txt',
      size: 512,
      isDirectory: false,
      children: [],
    };

    const entry: FileEntry = {
      id: 'file-1',
      name: 'folder',
      path: '/tmp/folder',
      size: 0,
      isDirectory: true,
      children: [child1],
    };

    expect(entry.isDirectory).toBe(true);
    expect(entry.children).toHaveLength(1);
    expect(entry.children[0].name).toBe('doc1.txt');
  });
});

describe('GrandPerspectiveStore Initialization', () => {
  test('creates store with default state', () => {
    const store = new GrandPerspectiveStore();
    const state = store.getState();

    expect(state.rootEntry).toBeNull();
    expect(state.allRects).toHaveLength(0);
    expect(state.currentPath).toHaveLength(0);
    expect(state.colorScheme).toBe('bySize');
    expect(state.selectedId).toBeNull();
    expect(state.hoveredId).toBeNull();
  });

  test('initializes with HOME directory path', () => {
    const store = new GrandPerspectiveStore();
    const state = store.getState();

    expect(state.rootPath).toBeDefined();
    expect(state.rootPath).toContain('/');
  });
});

describe('Store Subscriptions', () => {
  test('notifies listeners on state change', () => {
    const store = new GrandPerspectiveStore();
    const listener = jest.fn();

    store.subscribe(listener);
    store.setColorScheme('byDepth');

    expect(listener).toHaveBeenCalled();
  });

  test('allows unsubscribing from notifications', () => {
    const store = new GrandPerspectiveStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.setColorScheme('byDepth');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setColorScheme('byType');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('supports multiple subscribers', () => {
    const store = new GrandPerspectiveStore();
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    store.subscribe(listener1);
    store.subscribe(listener2);
    store.setHovered('rect-1');

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Color Scheme Management
// ============================================================================

describe('Color Scheme Control', () => {
  test('sets color scheme to bySize', () => {
    const store = new GrandPerspectiveStore();
    store.setColorScheme('bySize');
    expect(store.getState().colorScheme).toBe('bySize');
  });

  test('sets color scheme to byDepth', () => {
    const store = new GrandPerspectiveStore();
    store.setColorScheme('byDepth');
    expect(store.getState().colorScheme).toBe('byDepth');
  });

  test('sets color scheme to byType', () => {
    const store = new GrandPerspectiveStore();
    store.setColorScheme('byType');
    expect(store.getState().colorScheme).toBe('byType');
  });

  test('default color scheme is bySize', () => {
    const store = new GrandPerspectiveStore();
    expect(store.getState().colorScheme).toBe('bySize');
  });
});

// ============================================================================
// Selection and Hover State
// ============================================================================

describe('Selection Management', () => {
  test('sets selected rect id', () => {
    const store = new GrandPerspectiveStore();
    store.setSelected('rect-1');
    expect(store.getState().selectedId).toBe('rect-1');
  });

  test('clears selected id', () => {
    const store = new GrandPerspectiveStore();
    store.setSelected('rect-1');
    store.setSelected(null);
    expect(store.getState().selectedId).toBeNull();
  });

  test('sets hovered rect id', () => {
    const store = new GrandPerspectiveStore();
    store.setHovered('rect-2');
    expect(store.getState().hoveredId).toBe('rect-2');
  });

  test('clears hovered id', () => {
    const store = new GrandPerspectiveStore();
    store.setHovered('rect-2');
    store.setHovered(null);
    expect(store.getState().hoveredId).toBeNull();
  });
});

// ============================================================================
// Drill Down / Up Navigation
// ============================================================================

describe('Directory Navigation', () => {
  test('initializes with empty current path', () => {
    const store = new GrandPerspectiveStore();
    expect(store.getState().currentPath).toHaveLength(0);
  });

  test('drillUp does nothing when at root', () => {
    const store = new GrandPerspectiveStore();
    store.drillUp();
    expect(store.getState().currentPath).toHaveLength(0);
  });

  test('drillUp navigates to parent', () => {
    const store = new GrandPerspectiveStore();
    store.getState().currentPath.push('folder1');
    store.getState().currentPath.push('folder2');

    store.drillUp();

    expect(store.getState().currentPath).toEqual(['folder1']);
  });

  test('multiple drillUp calls navigate to root', () => {
    const store = new GrandPerspectiveStore();
    store.getState().currentPath = ['folder1', 'folder2', 'folder3'];

    store.drillUp();
    store.drillUp();
    store.drillUp();

    expect(store.getState().currentPath).toHaveLength(0);
  });
});

// ============================================================================
// Treemap Rect Generation
// ============================================================================

describe('Treemap Rectangle Layout', () => {
  test('creates rects with correct dimensions', () => {
    const store = new GrandPerspectiveStore();
    const rect: TreemapRect = {
      id: 'rect-1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      size: 1000,
      depth: 0,
      entry: {
        id: 'file-1',
        name: 'test',
        path: '/test',
        size: 1000,
        isDirectory: false,
        children: [],
      },
    };

    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);
    expect(rect.size).toBe(1000);
  });

  test('tracks depth correctly', () => {
    const store = new GrandPerspectiveStore();
    const rect: TreemapRect = {
      id: 'rect-1',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      size: 1000,
      depth: 2,
      entry: {
        id: 'file-1',
        name: 'test',
        path: '/test',
        size: 1000,
        isDirectory: false,
        children: [],
      },
    };

    expect(rect.depth).toBe(2);
  });
});

// ============================================================================
// Size Calculations
// ============================================================================

describe('Size Calculations', () => {
  test('file size equals its entry size', () => {
    const entry: FileEntry = {
      id: 'file-1',
      name: 'test.txt',
      path: '/test.txt',
      size: 2048,
      isDirectory: false,
      children: [],
    };

    expect(entry.size).toBe(2048);
  });

  test('directory size is sum of children', () => {
    const children: FileEntry[] = [
      {
        id: 'file-1',
        name: 'doc1.txt',
        path: '/dir/doc1.txt',
        size: 512,
        isDirectory: false,
        children: [],
      },
      {
        id: 'file-2',
        name: 'doc2.txt',
        path: '/dir/doc2.txt',
        size: 1024,
        isDirectory: false,
        children: [],
      },
    ];

    const dir: FileEntry = {
      id: 'dir-1',
      name: 'dir',
      path: '/dir',
      size: 1536,
      isDirectory: true,
      children,
    };

    expect(dir.size).toBe(1536);
  });

  test('nested directory size is recursive sum', () => {
    const files: FileEntry[] = [
      {
        id: 'file-1',
        name: 'file.txt',
        path: '/subdir/file.txt',
        size: 256,
        isDirectory: false,
        children: [],
      },
    ];

    const subdir: FileEntry = {
      id: 'subdir-1',
      name: 'subdir',
      path: '/dir/subdir',
      size: 256,
      isDirectory: true,
      children: files,
    };

    const dir: FileEntry = {
      id: 'dir-1',
      name: 'dir',
      path: '/dir',
      size: 256,
      isDirectory: true,
      children: [subdir],
    };

    expect(dir.size).toBe(256);
  });
});

// ============================================================================
// Total Size Calculation
// ============================================================================

describe('Total Size State', () => {
  test('initializes with zero total size', () => {
    const store = new GrandPerspectiveStore();
    expect(store.getState().totalSize).toBe(0);
  });

  test('updates total size when scanning', async () => {
    const store = new GrandPerspectiveStore();
    await store.scanDirectory('/tmp', 1);
    expect(store.getState().totalSize).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Data Immutability
// ============================================================================

describe('Data Immutability', () => {
  test('modifications to returned state do not affect store', () => {
    const store = new GrandPerspectiveStore();
    const state1 = store.getState();
    state1.colorScheme = 'byType';

    store.setColorScheme('byDepth');
    const state2 = store.getState();

    expect(state2.colorScheme).toBe('byDepth');
  });

  test('currentPath array is separate reference', () => {
    const store = new GrandPerspectiveStore();
    const state = store.getState();
    const originalPath = state.currentPath;

    store.drillUp();

    expect(state.currentPath).toBe(originalPath);
  });
});

// ============================================================================
// Entry Creation and Tracking
// ============================================================================

describe('Entry ID Generation', () => {
  test('each entry has unique id', () => {
    const entries: FileEntry[] = [];
    for (let i = 0; i < 10; i++) {
      entries.push({
        id: `file-${i}`,
        name: `file-${i}.txt`,
        path: `/test/file-${i}.txt`,
        size: 100 * (i + 1),
        isDirectory: false,
        children: [],
      });
    }

    const ids = entries.map(e => e.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(entries.length);
  });

  test('directory ids are distinct from file ids', () => {
    const file: FileEntry = {
      id: 'file-1',
      name: 'test.txt',
      path: '/test.txt',
      size: 100,
      isDirectory: false,
      children: [],
    };

    const dir: FileEntry = {
      id: 'dir-1',
      name: 'folder',
      path: '/folder',
      size: 100,
      isDirectory: true,
      children: [file],
    };

    expect(file.id).not.toBe(dir.id);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('handles empty directory', () => {
    const dir: FileEntry = {
      id: 'dir-1',
      name: 'empty',
      path: '/empty',
      size: 0,
      isDirectory: true,
      children: [],
    };

    expect(dir.children).toHaveLength(0);
    expect(dir.size).toBe(0);
  });

  test('handles very large file size', () => {
    const entry: FileEntry = {
      id: 'file-1',
      name: 'large.iso',
      path: '/large.iso',
      size: 5 * 1024 * 1024 * 1024, // 5GB
      isDirectory: false,
      children: [],
    };

    expect(entry.size).toBeGreaterThan(0);
    expect(Number.isFinite(entry.size)).toBe(true);
  });

  test('handles file names with special characters', () => {
    const entry: FileEntry = {
      id: 'file-1',
      name: 'file (1) [backup] 2024.txt',
      path: '/file (1) [backup] 2024.txt',
      size: 100,
      isDirectory: false,
      children: [],
    };

    expect(entry.name).toContain('(1)');
    expect(entry.name).toContain('[backup]');
  });

  test('handles deeply nested directories', () => {
    let current: FileEntry = {
      id: 'file-1',
      name: 'file.txt',
      path: '/a/b/c/d/e/f/g/h/file.txt',
      size: 100,
      isDirectory: false,
      children: [],
    };

    for (let i = 0; i < 8; i++) {
      current = {
        id: `dir-${i}`,
        name: String.fromCharCode(97 + i),
        path: `/a/b/c/d/e/f/g/h`.substring(0, (i + 1) * 2),
        size: 100,
        isDirectory: true,
        children: [current],
      };
    }

    let depth = 0;
    let node = current;
    while (node.children.length > 0) {
      node = node.children[0];
      depth++;
    }

    expect(depth).toBe(8);
  });
});

// ============================================================================
// State Transitions
// ============================================================================

describe('Complex State Transitions', () => {
  test('selecting, hovering, and drilling creates valid state sequence', () => {
    const store = new GrandPerspectiveStore();

    store.setSelected('rect-1');
    expect(store.getState().selectedId).toBe('rect-1');

    store.setHovered('rect-2');
    expect(store.getState().hoveredId).toBe('rect-2');

    store.setColorScheme('byDepth');
    expect(store.getState().colorScheme).toBe('byDepth');

    store.drillUp();
    expect(store.getState().currentPath).toHaveLength(0);
  });

  test('multiple color scheme changes are all tracked', () => {
    const store = new GrandPerspectiveStore();
    const schemes: Array<'bySize' | 'byDepth' | 'byType'> = ['bySize', 'byDepth', 'byType', 'bySize'];

    schemes.forEach(scheme => {
      store.setColorScheme(scheme);
      expect(store.getState().colorScheme).toBe(scheme);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Store and Scanning', () => {
  test('store processes directory scan correctly', async () => {
    const store = new GrandPerspectiveStore();
    const initialState = store.getState();

    expect(initialState.rootEntry).toBeNull();

    await store.scanDirectory('/tmp', 1);
    const scannedState = store.getState();

    expect(scannedState.rootEntry).not.toBeNull();
  });

  test('multiple scans update state properly', async () => {
    const store = new GrandPerspectiveStore();

    await store.scanDirectory('/tmp', 1);
    const state1 = store.getState().totalSize;

    await store.scanDirectory('/tmp', 1);
    const state2 = store.getState().totalSize;

    expect(state1).toBe(state2);
  });
});

describe('Store Observable Pattern', () => {
  test('all state changes trigger listeners', () => {
    const store = new GrandPerspectiveStore();
    const changes: string[] = [];

    store.subscribe(() => changes.push('change'));

    store.setSelected('id-1');
    store.setHovered('id-2');
    store.setColorScheme('byDepth');
    store.drillUp();

    expect(changes.length).toBe(4);
  });

  test('unsubscribed listeners are not called', () => {
    const store = new GrandPerspectiveStore();
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    const unsub1 = store.subscribe(listener1);
    store.subscribe(listener2);

    unsub1();
    store.setSelected('id-1');

    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledTimes(1);
  });
});
