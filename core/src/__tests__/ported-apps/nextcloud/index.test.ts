/**
 * Jest Tests for NextCloud Store
 *
 * Tests for the NextCloudStore model, including file management,
 * account handling, sync operations, and analytics.
 */

import { NextCloudStore, CloudFile, Account, SyncItem } from '../../../../../ported-apps/nextcloud/index';

describe('NextCloudStore', () => {
  let store: NextCloudStore;

  beforeEach(() => {
    store = new NextCloudStore();
  });

  describe('Account Management', () => {
    it('should return current account', () => {
      const account = store.getAccount();
      expect(account).toHaveProperty('username');
      expect(account).toHaveProperty('server');
      expect(account).toHaveProperty('isConnected');
    });

    it('should connect to account', () => {
      const result = store.connectAccount(
        'https://mycloud.com',
        'testuser',
        'password123'
      );
      expect(result).toBe(true);

      const account = store.getAccount();
      expect(account.server).toBe('https://mycloud.com');
      expect(account.username).toBe('testuser');
      expect(account.isConnected).toBe(true);
    });

    it('should disconnect account', () => {
      store.disconnectAccount();
      const account = store.getAccount();
      expect(account.isConnected).toBe(false);
    });

    it('should toggle sync setting', () => {
      const initialSync = store.getAccount().syncEnabled;
      store.toggleSync(!initialSync);
      expect(store.getAccount().syncEnabled).toBe(!initialSync);
    });
  });

  describe('File Management', () => {
    it('should get files in root directory', () => {
      const files = store.getFiles('/');
      expect(files.length).toBeGreaterThan(0);
    });

    it('should sort folders before files', () => {
      const files = store.getFiles('/');
      if (files.length > 1) {
        let lastFolderIndex = -1;
        let firstFileIndex = -1;

        for (let i = 0; i < files.length; i++) {
          if (files[i].isFolder && lastFolderIndex < i) {
            lastFolderIndex = i;
          }
          if (!files[i].isFolder && firstFileIndex === -1) {
            firstFileIndex = i;
          }
        }

        if (lastFolderIndex !== -1 && firstFileIndex !== -1) {
          expect(lastFolderIndex).toBeLessThan(firstFileIndex);
        }
      }
    });

    it('should get all files', () => {
      const allFiles = store.getAllFiles();
      expect(allFiles.length).toBeGreaterThan(0);
      expect(Array.isArray(allFiles)).toBe(true);
    });

    it('should get recent files sorted by modification date', () => {
      const recent = store.getRecentFiles(5);
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].modified.getTime()).toBeGreaterThanOrEqual(
          recent[i + 1].modified.getTime()
        );
      }
    });

    it('should get shared files only', () => {
      const shared = store.getSharedFiles();
      expect(shared.every((f) => f.shared && !f.isFolder)).toBe(true);
    });

    it('should search files by name', () => {
      const results = store.searchFiles('Budget');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((f) => f.name.toLowerCase().includes('budget'))).toBe(true);
    });

    it('should delete a file', () => {
      const allFiles = store.getAllFiles();
      const fileToDelete = allFiles[0];
      const initialCount = allFiles.length;

      store.deleteFile(fileToDelete.id);

      expect(store.getAllFiles()).toHaveLength(initialCount - 1);
      expect(store.getAllFiles().find((f) => f.id === fileToDelete.id)).toBeUndefined();
    });

    it('should toggle file sharing', () => {
      const files = store.getAllFiles();
      const fileToShare = files.find((f) => !f.isFolder);

      if (fileToShare) {
        const initialState = fileToShare.shared;
        const result = store.shareFile(fileToShare.id);

        expect(result).toBe(true);
        const updated = store.getAllFiles().find((f) => f.id === fileToShare.id);
        expect(updated?.shared).toBe(!initialState);
      }
    });

    it('should create a new folder', () => {
      const initialCount = store.getAllFiles().length;
      const newFolder = store.createFolder('/', 'New Test Folder');

      expect(newFolder.isFolder).toBe(true);
      expect(newFolder.name).toBe('New Test Folder');
      expect(store.getAllFiles()).toHaveLength(initialCount + 1);
    });
  });

  describe('Sync Operations', () => {
    it('should get sync items', () => {
      const items = store.getSyncItems();
      expect(Array.isArray(items)).toBe(true);
    });

    it('should get active sync items only', () => {
      const active = store.getActiveSyncItems();
      expect(active.every((item) =>
        item.status === 'in-progress' || item.status === 'pending'
      )).toBe(true);
    });

    it('should add sync item', () => {
      const initialCount = store.getSyncItems().length;
      const item = store.addSyncItem('test.txt', 'upload');

      expect(item).toHaveProperty('id');
      expect(item.fileName).toBe('test.txt');
      expect(item.action).toBe('upload');
      expect(item.status).toBe('pending');
      expect(store.getSyncItems()).toHaveLength(initialCount + 1);
    });

    it('should update sync progress', () => {
      const item = store.addSyncItem('file.pdf', 'download');
      store.updateSyncProgress(item.id, 50);

      const updated = store.getSyncItems().find((s) => s.id === item.id);
      expect(updated?.progress).toBe(50);
      expect(updated?.status).toBe('in-progress');
    });

    it('should mark sync as completed when progress reaches 100', () => {
      const item = store.addSyncItem('archive.zip', 'sync');
      store.updateSyncProgress(item.id, 100);

      const completed = store.getSyncItems().find((s) => s.id === item.id);
      expect(completed?.progress).toBe(100);
      expect(completed?.status).toBe('completed');
    });
  });

  describe('Storage Analytics', () => {
    it('should count total files (excluding folders)', () => {
      const count = store.getTotalFileCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should count total folders', () => {
      const count = store.getTotalFolderCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThan(0);
    });

    it('should calculate total storage used', () => {
      const total = store.getTotalStorageUsed();
      expect(typeof total).toBe('number');
      expect(total).toBeGreaterThan(0);
    });

    it('should calculate storage percentage (0-100)', () => {
      const percentage = store.getStoragePercentage();
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should format bytes correctly', () => {
      expect(store.formatBytes(0)).toBe('0 B');
      expect(store.formatBytes(1024)).toContain('KB');
      expect(store.formatBytes(1048576)).toContain('MB');
      expect(store.formatBytes(1073741824)).toContain('GB');
    });
  });

  describe('Observable Pattern', () => {
    it('should notify listeners on account connection', () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.connectAccount('https://test.com', 'user', 'pass');

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on file deletion', () => {
      const files = store.getAllFiles();
      const listener = jest.fn();
      store.subscribe(listener);

      store.deleteFile(files[0].id);

      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on sync progress', () => {
      const item = store.addSyncItem('test.txt', 'upload');
      const listener = jest.fn();
      store.subscribe(listener);

      store.updateSyncProgress(item.id, 50);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      unsubscribe();

      store.connectAccount('https://test.com', 'user', 'pass');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate returned account', () => {
      const account1 = store.getAccount();
      const account2 = store.getAccount();

      expect(account1).not.toBe(account2);
      expect(account1).toEqual(account2);
    });

    it('should not mutate returned files array', () => {
      const files1 = store.getAllFiles();
      const files2 = store.getAllFiles();

      expect(files1).not.toBe(files2);
    });

    it('should not mutate returned sync items', () => {
      const items1 = store.getSyncItems();
      const items2 = store.getSyncItems();

      expect(items1).not.toBe(items2);
    });

    it('should generate unique sync IDs', () => {
      const item1 = store.addSyncItem('file1.txt', 'upload');
      const item2 = store.addSyncItem('file2.txt', 'download');

      expect(item1.id).not.toBe(item2.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results', () => {
      const results = store.searchFiles('xyznonexistent12345');
      expect(results).toEqual([]);
    });

    it('should handle file delete for non-existent ID', () => {
      const initialCount = store.getAllFiles().length;
      store.deleteFile('nonexistent-id');
      expect(store.getAllFiles()).toHaveLength(initialCount);
    });

    it('should handle share toggle for non-existent file', () => {
      const result = store.shareFile('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should handle sync progress update for non-existent item', () => {
      const initialItems = store.getSyncItems().length;
      store.updateSyncProgress('nonexistent-id', 50);
      expect(store.getSyncItems()).toHaveLength(initialItems);
    });

    it('should handle file retrieval from non-existent path', () => {
      const files = store.getFiles('/nonexistent/path');
      expect(files).toEqual([]);
    });

    it('should limit recent files to specified count', () => {
      const recent3 = store.getRecentFiles(3);
      expect(recent3.length).toBeLessThanOrEqual(3);
    });
  });
});
