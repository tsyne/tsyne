/**
 * Fyles Tree Expansion Persistence Tests
 *
 * Test suite for tree expansion state persistence:
 * - Expand/collapse folders in navigation panel
 * - Persist expanded state to disk
 * - Restore expanded state on app restart
 *
 * Usage:
 *   npm test examples/fyles/fyles-tree-persistence.test.ts
 *   TSYNE_HEADED=1 npm test examples/fyles/fyles-tree-persistence.test.ts
 */

import { FylesStore } from './fyles-store';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Fyles Tree Expansion Persistence (Unit Tests)', () => {
  let testDir: string;
  let stateFile: string;
  let store: FylesStore;

  beforeEach(() => {
    // Create a unique test directory structure
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-tree-test-'));
    stateFile = path.join(testDir, 'fyles-state.json');

    // Create test folder structure:
    // testDir/
    //   folder1/
    //     subfolder1a/
    //     subfolder1b/
    //   folder2/
    //     subfolder2a/
    //   folder3/
    fs.mkdirSync(path.join(testDir, 'folder1'));
    fs.mkdirSync(path.join(testDir, 'folder1', 'subfolder1a'));
    fs.mkdirSync(path.join(testDir, 'folder1', 'subfolder1b'));
    fs.mkdirSync(path.join(testDir, 'folder2'));
    fs.mkdirSync(path.join(testDir, 'folder2', 'subfolder2a'));
    fs.mkdirSync(path.join(testDir, 'folder3'));
    fs.writeFileSync(path.join(testDir, 'test-file.txt'), 'Test content');

    // Create store with custom state file
    store = new FylesStore(testDir, stateFile);
  });

  afterEach(() => {
    // Clean up
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up test directory:', err);
    }
  });

  describe('Expansion State Management', () => {
    test('should start with no folders expanded', () => {
      expect(store.getExpandedDirs()).toEqual([]);
      expect(store.isExpanded(path.join(testDir, 'folder1'))).toBe(false);
    });

    test('should expand a folder', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.expandDir(folder1Path);

      expect(store.isExpanded(folder1Path)).toBe(true);
      expect(store.getExpandedDirs()).toContain(folder1Path);
    });

    test('should collapse an expanded folder', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.expandDir(folder1Path);
      await store.collapseDir(folder1Path);

      expect(store.isExpanded(folder1Path)).toBe(false);
      expect(store.getExpandedDirs()).not.toContain(folder1Path);
    });

    test('should toggle expansion state', async () => {
      const folder1Path = path.join(testDir, 'folder1');

      // Toggle on
      await store.toggleExpanded(folder1Path);
      expect(store.isExpanded(folder1Path)).toBe(true);

      // Toggle off
      await store.toggleExpanded(folder1Path);
      expect(store.isExpanded(folder1Path)).toBe(false);
    });

    test('should expand multiple folders', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      const folder2Path = path.join(testDir, 'folder2');

      await store.expandDir(folder1Path);
      await store.expandDir(folder2Path);

      expect(store.isExpanded(folder1Path)).toBe(true);
      expect(store.isExpanded(folder2Path)).toBe(true);
      expect(store.getExpandedDirs()).toHaveLength(2);
    });

    test('should collapse all expanded folders', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      const folder2Path = path.join(testDir, 'folder2');

      await store.expandDir(folder1Path);
      await store.expandDir(folder2Path);
      await store.collapseAll();

      expect(store.getExpandedDirs()).toEqual([]);
      expect(store.isExpanded(folder1Path)).toBe(false);
      expect(store.isExpanded(folder2Path)).toBe(false);
    });
  });

  describe('Subdirectory Retrieval', () => {
    test('should get subdirectories of a folder', () => {
      const folder1Path = path.join(testDir, 'folder1');
      const subdirs = store.getSubdirectories(folder1Path);

      expect(subdirs).toHaveLength(2);
      expect(subdirs.map((d) => d.fullName).sort()).toEqual(['subfolder1a', 'subfolder1b']);
    });

    test('should return empty array for folder with no subdirectories', () => {
      const subfolder1aPath = path.join(testDir, 'folder1', 'subfolder1a');
      const subdirs = store.getSubdirectories(subfolder1aPath);

      expect(subdirs).toEqual([]);
    });

    test('should handle non-existent directory gracefully', () => {
      const subdirs = store.getSubdirectories('/nonexistent/path');
      expect(subdirs).toEqual([]);
    });
  });

  describe('State Persistence', () => {
    test('should save state to file when expanding a folder', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.expandDir(folder1Path);

      // State file should exist
      expect(fs.existsSync(stateFile)).toBe(true);

      // Read and verify state
      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(stateData.expandedDirs).toContain(folder1Path);
      expect(stateData.version).toBe(1);
    });

    test('should save state to file when collapsing a folder', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.expandDir(folder1Path);
      await store.collapseDir(folder1Path);

      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(stateData.expandedDirs).not.toContain(folder1Path);
    });

    test('should save showHidden state', async () => {
      await store.toggleShowHidden();

      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(stateData.showHidden).toBe(true);
    });

    test('should save currentDir in state', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.navigateToDir(folder1Path);

      // Need to trigger a save by changing expansion state
      await store.toggleShowHidden();

      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      expect(stateData.currentDir).toBe(folder1Path);
    });

    test('should restore expanded state from file on new store creation', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      const folder2Path = path.join(testDir, 'folder2');

      // Expand folders in first store
      await store.expandDir(folder1Path);
      await store.expandDir(folder2Path);

      // Create new store with same state file
      const newStore = new FylesStore(testDir, stateFile);

      // Should restore expanded state
      expect(newStore.isExpanded(folder1Path)).toBe(true);
      expect(newStore.isExpanded(folder2Path)).toBe(true);
      expect(newStore.getExpandedDirs()).toHaveLength(2);
    });

    test('should restore showHidden state from file', async () => {
      await store.toggleShowHidden();
      expect(store.isShowingHidden()).toBe(true);

      // Create new store with same state file
      const newStore = new FylesStore(testDir, stateFile);

      expect(newStore.isShowingHidden()).toBe(true);
    });

    test('should use initialDir over persisted currentDir when provided', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.navigateToDir(folder1Path);
      await store.toggleShowHidden(); // Trigger save

      // Create new store with explicit initial directory
      const newStore = new FylesStore(testDir, stateFile);

      // Should use the provided initialDir, not persisted currentDir
      expect(newStore.getCurrentDir()).toBe(testDir);
    });

    test('should clear persisted state', async () => {
      const folder1Path = path.join(testDir, 'folder1');
      await store.expandDir(folder1Path);

      expect(fs.existsSync(stateFile)).toBe(true);

      store.clearPersistedState();

      expect(fs.existsSync(stateFile)).toBe(false);
    });

    test('should handle corrupted state file gracefully', async () => {
      // Write invalid JSON to state file
      fs.writeFileSync(stateFile, 'not valid json {{{', 'utf8');

      // Should not throw, should use defaults
      const newStore = new FylesStore(testDir, stateFile);

      expect(newStore.getExpandedDirs()).toEqual([]);
      expect(newStore.isShowingHidden()).toBe(false);
    });

    test('should handle missing state file gracefully', () => {
      // Delete state file if it exists
      if (fs.existsSync(stateFile)) {
        fs.unlinkSync(stateFile);
      }

      // Should work fine with missing state file
      const newStore = new FylesStore(testDir, stateFile);

      expect(newStore.getExpandedDirs()).toEqual([]);
      expect(newStore.getCurrentDir()).toBe(testDir);
    });
  });

  describe('Change Notifications', () => {
    test('should notify listeners when expanding a folder', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      await store.expandDir(path.join(testDir, 'folder1'));

      expect(listener).toHaveBeenCalled();
    });

    test('should notify listeners when collapsing a folder', async () => {
      await store.expandDir(path.join(testDir, 'folder1'));

      const listener = jest.fn();
      store.subscribe(listener);

      await store.collapseDir(path.join(testDir, 'folder1'));

      expect(listener).toHaveBeenCalled();
    });

    test('should notify listeners when toggling expansion', async () => {
      const listener = jest.fn();
      store.subscribe(listener);

      await store.toggleExpanded(path.join(testDir, 'folder1'));

      expect(listener).toHaveBeenCalled();
    });

    test('should notify listeners when collapsing all', async () => {
      await store.expandDir(path.join(testDir, 'folder1'));

      const listener = jest.fn();
      store.subscribe(listener);

      await store.collapseAll();

      expect(listener).toHaveBeenCalled();
    });
  });
});

describe('Fyles File Operations (Unit Tests)', () => {
  let testDir: string;
  let stateFile: string;
  let store: FylesStore;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fyles-fileops-test-'));
    stateFile = path.join(testDir, 'fyles-state.json');

    // Create test structure
    fs.mkdirSync(path.join(testDir, 'source'));
    fs.mkdirSync(path.join(testDir, 'dest'));
    fs.writeFileSync(path.join(testDir, 'source', 'file.txt'), 'Test content');
    fs.mkdirSync(path.join(testDir, 'source', 'folder'));
    fs.writeFileSync(path.join(testDir, 'source', 'folder', 'nested.txt'), 'Nested content');

    store = new FylesStore(testDir, stateFile);
  });

  afterEach(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up:', err);
    }
  });

  describe('moveItem', () => {
    test('should move a file to destination directory', async () => {
      const sourcePath = path.join(testDir, 'source', 'file.txt');
      const destDir = path.join(testDir, 'dest');

      await store.moveItem(sourcePath, destDir);

      expect(fs.existsSync(path.join(destDir, 'file.txt'))).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(false);
    });

    test('should move a folder to destination directory', async () => {
      const sourcePath = path.join(testDir, 'source', 'folder');
      const destDir = path.join(testDir, 'dest');

      await store.moveItem(sourcePath, destDir);

      expect(fs.existsSync(path.join(destDir, 'folder'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'folder', 'nested.txt'))).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(false);
    });

    test('should throw if source does not exist', async () => {
      const sourcePath = path.join(testDir, 'nonexistent');
      const destDir = path.join(testDir, 'dest');

      await expect(store.moveItem(sourcePath, destDir)).rejects.toThrow('Source does not exist');
    });

    test('should throw if destination already has file with same name', async () => {
      const sourcePath = path.join(testDir, 'source', 'file.txt');
      const destDir = path.join(testDir, 'dest');

      // Create existing file at destination
      fs.writeFileSync(path.join(destDir, 'file.txt'), 'Existing');

      await expect(store.moveItem(sourcePath, destDir)).rejects.toThrow('Destination already exists');
    });
  });

  describe('copyItem', () => {
    test('should copy a file to destination directory', async () => {
      const sourcePath = path.join(testDir, 'source', 'file.txt');
      const destDir = path.join(testDir, 'dest');

      await store.copyItem(sourcePath, destDir);

      expect(fs.existsSync(path.join(destDir, 'file.txt'))).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(true); // Original still exists
    });

    test('should copy a folder recursively', async () => {
      const sourcePath = path.join(testDir, 'source', 'folder');
      const destDir = path.join(testDir, 'dest');

      await store.copyItem(sourcePath, destDir);

      expect(fs.existsSync(path.join(destDir, 'folder'))).toBe(true);
      expect(fs.existsSync(path.join(destDir, 'folder', 'nested.txt'))).toBe(true);
      expect(fs.existsSync(sourcePath)).toBe(true); // Original still exists
    });

    test('should throw if destination already has file with same name', async () => {
      const sourcePath = path.join(testDir, 'source', 'file.txt');
      const destDir = path.join(testDir, 'dest');

      // Create existing file at destination
      fs.writeFileSync(path.join(destDir, 'file.txt'), 'Existing');

      await expect(store.copyItem(sourcePath, destDir)).rejects.toThrow('Destination already exists');
    });
  });
});
