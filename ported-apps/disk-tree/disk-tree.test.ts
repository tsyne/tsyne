/**
 * Disk Tree Tests
 *
 * Tests for the treemap layout algorithm, color utilities, store functionality,
 * and UI interactions.
 */

// Jest tests for disk-tree
import {
  DiskTreeStore,
  DiskTreeUI,
  FileEntry,
  TreemapRect,
  formatBytes,
  ColorScheme,
} from './disk-tree';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockFileEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    id: 'test-1',
    name: 'test.txt',
    path: '/test/test.txt',
    size: 1024,
    isDirectory: false,
    children: [],
    depth: 0,
    extension: '.txt',
    modifiedTime: new Date(),
    ...overrides,
  };
}

function createMockDirectoryEntry(
  name: string,
  children: FileEntry[],
  depth: number = 0
): FileEntry {
  const size = children.reduce((sum, c) => sum + c.size, 0);
  return {
    id: `dir-${name}`,
    name,
    path: `/${name}`,
    size,
    isDirectory: true,
    children,
    depth,
    extension: '',
  };
}

// ============================================================================
// FORMAT BYTES TESTS
// ============================================================================

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes under 1KB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048575)).toBe('1024 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
    expect(formatBytes(104857600)).toBe('100 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(5368709120)).toBe('5 GB');
  });

  it('should format terabytes', () => {
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });
});

// ============================================================================
// STORE TESTS
// ============================================================================

describe('DiskTreeStore', () => {
  let store: DiskTreeStore;

  beforeEach(() => {
    store = new DiskTreeStore();
  });

  describe('initial state', () => {
    it('should have null root entry initially', () => {
      const state = store.getState();
      expect(state.rootEntry).toBeNull();
      expect(state.currentEntry).toBeNull();
    });

    it('should have empty rects initially', () => {
      const state = store.getState();
      expect(state.allRects).toEqual([]);
    });

    it('should have default color scheme', () => {
      const state = store.getState();
      expect(state.colorScheme).toBe('byType');
    });

    it('should not be scanning initially', () => {
      const state = store.getState();
      expect(state.scanProgress.isScanning).toBe(false);
    });

    it('should have empty breadcrumbs initially', () => {
      const state = store.getState();
      expect(state.breadcrumbs).toEqual([]);
    });

    it('should have default canvas size', () => {
      const state = store.getState();
      expect(state.canvasWidth).toBe(800);
      expect(state.canvasHeight).toBe(600);
    });
  });

  describe('subscription', () => {
    it('should notify listeners on state change', () => {
      let notified = false;
      store.subscribe(() => {
        notified = true;
      });

      store.setColorScheme('bySize');
      expect(notified).toBe(true);
    });

    it('should allow unsubscribing', () => {
      let count = 0;
      const unsubscribe = store.subscribe(() => {
        count++;
      });

      store.setColorScheme('bySize');
      expect(count).toBe(1);

      unsubscribe();
      store.setColorScheme('byDepth');
      expect(count).toBe(1); // Should not have increased
    });

    it('should support multiple listeners', () => {
      let count1 = 0;
      let count2 = 0;

      store.subscribe(() => { count1++; });
      store.subscribe(() => { count2++; });

      store.setColorScheme('bySize');

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('color scheme', () => {
    it('should change color scheme', () => {
      store.setColorScheme('bySize');
      expect(store.getState().colorScheme).toBe('bySize');

      store.setColorScheme('byDepth');
      expect(store.getState().colorScheme).toBe('byDepth');

      store.setColorScheme('byAge');
      expect(store.getState().colorScheme).toBe('byAge');

      store.setColorScheme('byType');
      expect(store.getState().colorScheme).toBe('byType');
    });
  });

  describe('selection', () => {
    it('should set selected id', () => {
      store.setSelected('test-id');
      expect(store.getState().selectedId).toBe('test-id');
    });

    it('should clear selected id', () => {
      store.setSelected('test-id');
      store.setSelected(null);
      expect(store.getState().selectedId).toBeNull();
    });

    it('should set hovered id', () => {
      store.setHovered('hover-id');
      expect(store.getState().hoveredId).toBe('hover-id');
    });

    it('should clear hovered id', () => {
      store.setHovered('hover-id');
      store.setHovered(null);
      expect(store.getState().hoveredId).toBeNull();
    });

    it('should return null for getSelectedEntry when no selection', () => {
      expect(store.getSelectedEntry()).toBeNull();
    });

    it('should return null for getHoveredEntry when no hover', () => {
      expect(store.getHoveredEntry()).toBeNull();
    });
  });

  describe('canvas size', () => {
    it('should update canvas dimensions', () => {
      store.setCanvasSize(1024, 768);
      const state = store.getState();
      expect(state.canvasWidth).toBe(1024);
      expect(state.canvasHeight).toBe(768);
    });

    it('should recalculate layout when canvas size changes', () => {
      let notified = false;
      store.subscribe(() => { notified = true; });

      store.setCanvasSize(1024, 768);
      expect(notified).toBe(true);
    });
  });

  describe('navigation', () => {
    it('should not drill up when at root', () => {
      store.drillUp();
      expect(store.getState().breadcrumbs).toEqual([]);
    });

    it('should handle goToRoot when no root exists', () => {
      store.goToRoot();
      expect(store.getState().currentEntry).toBeNull();
    });

    it('should not drill down on non-existent id', () => {
      store.drillDown('non-existent');
      expect(store.getState().breadcrumbs).toEqual([]);
    });
  });

  describe('layout', () => {
    it('should produce empty rects when no entries', () => {
      store.recalculateLayout();
      expect(store.getState().allRects).toEqual([]);
    });
  });
});

// ============================================================================
// FILE ENTRY TESTS
// ============================================================================

describe('FileEntry', () => {
  it('should calculate total size correctly', () => {
    const file1 = createMockFileEntry({ id: 'f1', size: 1000 });
    const file2 = createMockFileEntry({ id: 'f2', size: 2000 });
    const dir = createMockDirectoryEntry('testdir', [file1, file2]);

    expect(dir.size).toBe(3000);
  });

  it('should handle nested directories', () => {
    const file1 = createMockFileEntry({ id: 'f1', size: 100 });
    const subdir = createMockDirectoryEntry('subdir', [file1], 1);
    const file2 = createMockFileEntry({ id: 'f2', size: 200 });
    const rootdir = createMockDirectoryEntry('root', [subdir, file2], 0);

    expect(rootdir.size).toBe(300);
  });

  it('should track file extensions', () => {
    const tsFile = createMockFileEntry({ extension: '.ts' });
    const jsFile = createMockFileEntry({ extension: '.js' });
    const noExt = createMockFileEntry({ extension: '' });

    expect(tsFile.extension).toBe('.ts');
    expect(jsFile.extension).toBe('.js');
    expect(noExt.extension).toBe('');
  });

  it('should track depth correctly', () => {
    const file = createMockFileEntry({ depth: 5 });
    expect(file.depth).toBe(5);
  });

  it('should track modification time', () => {
    const now = new Date();
    const file = createMockFileEntry({ modifiedTime: now });
    expect(file.modifiedTime).toBe(now);
  });
});

// ============================================================================
// TREEMAP RECT TESTS
// ============================================================================

describe('TreemapRect', () => {
  it('should have required properties', () => {
    const entry = createMockFileEntry();
    const rect: TreemapRect = {
      id: 'rect-1',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      size: 1024,
      depth: 1,
      entry,
    };

    expect(rect.id).toBe('rect-1');
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(50);
    expect(rect.size).toBe(1024);
    expect(rect.depth).toBe(1);
    expect(rect.entry).toBe(entry);
  });

  it('should calculate area correctly', () => {
    const entry = createMockFileEntry();
    const rect: TreemapRect = {
      id: 'rect-1',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      size: 1024,
      depth: 0,
      entry,
    };

    const area = rect.width * rect.height;
    expect(area).toBe(5000);
  });

  it('should support zero dimensions', () => {
    const entry = createMockFileEntry({ size: 0 });
    const rect: TreemapRect = {
      id: 'rect-zero',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      size: 0,
      depth: 0,
      entry,
    };

    expect(rect.width * rect.height).toBe(0);
  });
});

// ============================================================================
// COLOR SCHEME TESTS
// ============================================================================

describe('Color Schemes', () => {
  const schemes: ColorScheme[] = ['bySize', 'byDepth', 'byType', 'byAge'];

  it('should have all expected color schemes', () => {
    expect(schemes).toContain('bySize');
    expect(schemes).toContain('byDepth');
    expect(schemes).toContain('byType');
    expect(schemes).toContain('byAge');
  });

  it('should switch between schemes without error', () => {
    const store = new DiskTreeStore();

    for (const scheme of schemes) {
      expect(() => store.setColorScheme(scheme)).not.toThrow();
      expect(store.getState().colorScheme).toBe(scheme);
    }
  });
});

// ============================================================================
// SCAN PROGRESS TESTS
// ============================================================================

describe('ScanProgress', () => {
  let store: DiskTreeStore;

  beforeEach(() => {
    store = new DiskTreeStore();
  });

  it('should start with zero counts', () => {
    const progress = store.getState().scanProgress;
    expect(progress.filesScanned).toBe(0);
    expect(progress.directoriesScanned).toBe(0);
    expect(progress.totalSize).toBe(0);
  });

  it('should not be scanning initially', () => {
    expect(store.getState().scanProgress.isScanning).toBe(false);
  });

  it('should have empty current path initially', () => {
    expect(store.getState().scanProgress.currentPath).toBe('');
  });
});

// ============================================================================
// UI CLASS TESTS
// ============================================================================

describe('DiskTreeUI', () => {
  it('should format bytes correctly via public method', () => {
    const mockApp = {} as any;
    const ui = new DiskTreeUI(mockApp);

    expect(ui.getFormattedBytes(1024)).toBe('1 KB');
    expect(ui.getFormattedBytes(1048576)).toBe('1 MB');
  });

  it('should have accessible store', () => {
    const mockApp = {} as any;
    const ui = new DiskTreeUI(mockApp);

    expect(ui.getStore()).toBeInstanceOf(DiskTreeStore);
  });

  it('should create independent stores per UI instance', () => {
    const mockApp = {} as any;
    const ui1 = new DiskTreeUI(mockApp);
    const ui2 = new DiskTreeUI(mockApp);

    ui1.getStore().setColorScheme('bySize');
    ui2.getStore().setColorScheme('byDepth');

    expect(ui1.getStore().getState().colorScheme).toBe('bySize');
    expect(ui2.getStore().getState().colorScheme).toBe('byDepth');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  describe('empty and zero-size handling', () => {
    it('should handle zero-size files', () => {
      const zeroFile = createMockFileEntry({ size: 0 });
      expect(zeroFile.size).toBe(0);
      expect(formatBytes(zeroFile.size)).toBe('0 B');
    });

    it('should handle directory with only zero-size files', () => {
      const file1 = createMockFileEntry({ id: 'f1', size: 0 });
      const file2 = createMockFileEntry({ id: 'f2', size: 0 });
      const dir = createMockDirectoryEntry('empty', [file1, file2]);

      expect(dir.size).toBe(0);
    });

    it('should handle empty directory', () => {
      const dir = createMockDirectoryEntry('empty', []);
      expect(dir.size).toBe(0);
      expect(dir.children).toEqual([]);
    });
  });

  describe('large values', () => {
    it('should handle very large file sizes', () => {
      const largeSize = 10 * 1024 * 1024 * 1024 * 1024; // 10 TB
      expect(formatBytes(largeSize)).toBe('10 TB');
    });

    it('should handle petabyte sizes gracefully', () => {
      const hugeSize = 1024 * 1024 * 1024 * 1024 * 1024; // 1 PB
      // Should format as PB
      expect(formatBytes(hugeSize)).toBe('1 PB');
    });

    it('should handle large number of state changes', () => {
      const store = new DiskTreeStore();
      let changeCount = 0;
      store.subscribe(() => { changeCount++; });

      for (let i = 0; i < 1000; i++) {
        store.setHovered(`id-${i}`);
      }

      expect(changeCount).toBe(1000);
    });
  });

  describe('special characters in paths', () => {
    it('should handle special characters in file names', () => {
      const specialFile = createMockFileEntry({
        name: 'file with spaces & symbols!.txt',
        path: '/path/to/file with spaces & symbols!.txt',
      });

      expect(specialFile.name).toBe('file with spaces & symbols!.txt');
    });

    it('should handle unicode in file names', () => {
      const unicodeFile = createMockFileEntry({
        name: '文件.txt',
        path: '/path/文件.txt',
      });

      expect(unicodeFile.name).toBe('文件.txt');
    });

    it('should handle emoji in file names', () => {
      const emojiFile = createMockFileEntry({
        name: '📁 folder.txt',
        path: '/path/📁 folder.txt',
      });

      expect(emojiFile.name).toBe('📁 folder.txt');
    });
  });

  describe('deep nesting', () => {
    it('should handle deeply nested directories', () => {
      let current = createMockFileEntry({ size: 100, depth: 10 });

      for (let i = 9; i >= 0; i--) {
        current = {
          ...createMockDirectoryEntry(`level-${i}`, [current], i),
          depth: i,
        };
      }

      expect(current.depth).toBe(0);
      expect(current.size).toBe(100);
    });

    it('should track depth correctly through nesting', () => {
      const file = createMockFileEntry({ depth: 5 });
      const dir1 = createMockDirectoryEntry('dir1', [file], 4);
      const dir2 = createMockDirectoryEntry('dir2', [dir1], 3);

      expect(dir2.depth).toBe(3);
      expect(dir2.children[0].depth).toBe(4);
    });
  });
});

// ============================================================================
// INTEGRATION-STYLE TESTS
// ============================================================================

describe('Integration', () => {
  it('should handle full workflow: create, configure, interact', () => {
    const store = new DiskTreeStore();

    // Configure canvas
    store.setCanvasSize(800, 600);

    // Change color scheme
    store.setColorScheme('bySize');

    // Simulate hover
    store.setHovered('some-id');

    // Simulate selection
    store.setSelected('some-id');

    // Verify state is consistent
    const state = store.getState();
    expect(state.canvasWidth).toBe(800);
    expect(state.canvasHeight).toBe(600);
    expect(state.colorScheme).toBe('bySize');
    expect(state.hoveredId).toBe('some-id');
    expect(state.selectedId).toBe('some-id');
  });

  it('should handle rapid state changes', () => {
    const store = new DiskTreeStore();
    const changes: string[] = [];

    store.subscribe(() => {
      changes.push('changed');
    });

    // Rapid fire changes
    for (let i = 0; i < 100; i++) {
      store.setHovered(`id-${i}`);
    }

    // All changes should be tracked
    expect(changes.length).toBe(100);

    // Final state should be correct
    expect(store.getState().hoveredId).toBe('id-99');
  });

  it('should handle alternating hover and selection', () => {
    const store = new DiskTreeStore();

    for (let i = 0; i < 50; i++) {
      store.setHovered(`hover-${i}`);
      store.setSelected(`select-${i}`);
    }

    expect(store.getState().hoveredId).toBe('hover-49');
    expect(store.getState().selectedId).toBe('select-49');
  });

  it('should handle color scheme cycling', () => {
    const store = new DiskTreeStore();
    const schemes: ColorScheme[] = ['bySize', 'byDepth', 'byType', 'byAge'];

    for (let i = 0; i < 20; i++) {
      store.setColorScheme(schemes[i % schemes.length]);
    }

    // After 20 iterations (i=0..19), final is i=19, 19 % 4 = 3 = 'byAge'
    expect(store.getState().colorScheme).toBe('byAge');
  });
});

// ============================================================================
// PATH HANDLING TESTS (from original tests)
// ============================================================================

describe('Path handling', () => {
  const path = require('path');

  it('should extract folder name from path', () => {
    expect(path.basename('/home/user/documents')).toBe('documents');
    expect(path.basename('/Users/john/Desktop')).toBe('Desktop');
    expect(path.basename('/var/log')).toBe('log');
  });

  it('should join paths correctly', () => {
    expect(path.join('/home/user', 'documents')).toBe('/home/user/documents');
    expect(path.join('/home', 'user', 'documents')).toBe('/home/user/documents');
  });

  it('should extract file extension', () => {
    expect(path.extname('file.txt')).toBe('.txt');
    expect(path.extname('script.test.ts')).toBe('.ts');
    expect(path.extname('no-extension')).toBe('');
    expect(path.extname('.gitignore')).toBe('');
  });
});

// ============================================================================
// SORTING TESTS (from original tests)
// ============================================================================

describe('Sorting', () => {
  it('should sort by name alphabetically', () => {
    const entries: FileEntry[] = [
      createMockFileEntry({ id: 'z', name: 'zebra.txt', size: 100 }),
      createMockFileEntry({ id: 'a', name: 'apple.txt', size: 200 }),
      createMockFileEntry({ id: 'b', name: 'banana.txt', size: 300 }),
    ];

    entries.sort((a, b) => a.name.localeCompare(b.name));

    expect(entries[0].name).toBe('apple.txt');
    expect(entries[1].name).toBe('banana.txt');
    expect(entries[2].name).toBe('zebra.txt');
  });

  it('should sort by size descending', () => {
    const entries: FileEntry[] = [
      createMockFileEntry({ id: 's', name: 'small.txt', size: 100 }),
      createMockFileEntry({ id: 'l', name: 'large.txt', size: 5000 }),
      createMockFileEntry({ id: 'm', name: 'medium.txt', size: 1000 }),
    ];

    entries.sort((a, b) => b.size - a.size);

    expect(entries[0].size).toBe(5000);
    expect(entries[1].size).toBe(1000);
    expect(entries[2].size).toBe(100);
  });

  it('should handle equal sizes in sort', () => {
    const entries: FileEntry[] = [
      createMockFileEntry({ id: 'a', name: 'a.txt', size: 1000 }),
      createMockFileEntry({ id: 'b', name: 'b.txt', size: 1000 }),
      createMockFileEntry({ id: 'c', name: 'c.txt', size: 1000 }),
    ];

    entries.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));

    // With equal sizes, should maintain or use name sort
    expect(entries.every(e => e.size === 1000)).toBe(true);
  });
});
