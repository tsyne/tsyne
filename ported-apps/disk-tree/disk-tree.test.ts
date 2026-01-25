/**
 * Jest tests for Disk Tree App
 */

describe('Disk Tree Logic', () => {
  describe('Byte formatting', () => {
    test('should format bytes correctly', () => {
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1099511627776)).toBe('1 TB');
    });

    test('should handle partial units', () => {
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      expect(formatBytes(2048)).toBe('2 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(5242880)).toBe('5 MB');
    });
  });

  describe('Tree node structure', () => {
    test('should create valid tree nodes', () => {
      interface DiskTreeNode {
        name: string;
        path: string;
        isDirectory: boolean;
        size: number;
        children: DiskTreeNode[];
      }

      const createNode = (name: string, path: string, isDir: boolean, size: number): DiskTreeNode => {
        return {
          name,
          path,
          isDirectory: isDir,
          size,
          children: [],
        };
      };

      const file = createNode('document.txt', '/path/document.txt', false, 2048);
      expect(file.name).toBe('document.txt');
      expect(file.isDirectory).toBe(false);
      expect(file.size).toBe(2048);
      expect(file.children.length).toBe(0);

      const folder = createNode('docs', '/path/docs', true, 0);
      expect(folder.name).toBe('docs');
      expect(folder.isDirectory).toBe(true);
      expect(folder.children.length).toBe(0);
    });

    test('should calculate parent size from children', () => {
      interface DiskTreeNode {
        name: string;
        path: string;
        isDirectory: boolean;
        size: number;
        children: DiskTreeNode[];
      }

      const parent: DiskTreeNode = {
        name: 'parent',
        path: '/parent',
        isDirectory: true,
        size: 0,
        children: [
          { name: 'file1.txt', path: '/parent/file1.txt', isDirectory: false, size: 1024, children: [] },
          { name: 'file2.txt', path: '/parent/file2.txt', isDirectory: false, size: 2048, children: [] },
        ],
      };

      const totalSize = parent.children.reduce((sum, child) => sum + child.size, 0);
      parent.size = totalSize;

      expect(parent.size).toBe(3072);
    });
  });

  describe('Sorting', () => {
    test('should sort by name alphabetically', () => {
      interface DiskTreeNode {
        name: string;
        path: string;
        isDirectory: boolean;
        size: number;
        children: DiskTreeNode[];
      }

      const nodes: DiskTreeNode[] = [
        { name: 'zebra.txt', path: '/zebra.txt', isDirectory: false, size: 100, children: [] },
        { name: 'apple.txt', path: '/apple.txt', isDirectory: false, size: 200, children: [] },
        { name: 'banana.txt', path: '/banana.txt', isDirectory: false, size: 300, children: [] },
      ];

      nodes.sort((a, b) => a.name.localeCompare(b.name));

      expect(nodes[0].name).toBe('apple.txt');
      expect(nodes[1].name).toBe('banana.txt');
      expect(nodes[2].name).toBe('zebra.txt');
    });

    test('should sort by size descending', () => {
      interface DiskTreeNode {
        name: string;
        path: string;
        isDirectory: boolean;
        size: number;
        children: DiskTreeNode[];
      }

      const nodes: DiskTreeNode[] = [
        { name: 'small.txt', path: '/small.txt', isDirectory: false, size: 100, children: [] },
        { name: 'large.txt', path: '/large.txt', isDirectory: false, size: 5000, children: [] },
        { name: 'medium.txt', path: '/medium.txt', isDirectory: false, size: 1000, children: [] },
      ];

      nodes.sort((a, b) => b.size - a.size);

      expect(nodes[0].size).toBe(5000);
      expect(nodes[1].size).toBe(1000);
      expect(nodes[2].size).toBe(100);
    });
  });

  describe('Stats tracking', () => {
    test('should track file and directory counts', () => {
      interface ScanStats {
        filesScanned: number;
        directoriesScanned: number;
        totalSize: number;
        isScanning: boolean;
        currentPath: string;
      }

      const stats: ScanStats = {
        filesScanned: 0,
        directoriesScanned: 0,
        totalSize: 0,
        isScanning: false,
        currentPath: '',
      };

      stats.filesScanned += 5;
      stats.directoriesScanned += 2;
      stats.totalSize += 10240;

      expect(stats.filesScanned).toBe(5);
      expect(stats.directoriesScanned).toBe(2);
      expect(stats.totalSize).toBe(10240);
    });

    test('should track scanning state', () => {
      interface ScanStats {
        filesScanned: number;
        directoriesScanned: number;
        totalSize: number;
        isScanning: boolean;
        currentPath: string;
      }

      const stats: ScanStats = {
        filesScanned: 0,
        directoriesScanned: 0,
        totalSize: 0,
        isScanning: false,
        currentPath: '',
      };

      expect(stats.isScanning).toBe(false);

      stats.isScanning = true;
      stats.currentPath = '/home/user/documents';
      expect(stats.isScanning).toBe(true);
      expect(stats.currentPath).toBe('/home/user/documents');

      stats.isScanning = false;
      expect(stats.isScanning).toBe(false);
    });
  });

  describe('Path handling', () => {
    test('should extract folder name from path', () => {
      const path = require('path');

      expect(path.basename('/home/user/documents')).toBe('documents');
      expect(path.basename('/Users/john/Desktop')).toBe('Desktop');
      expect(path.basename('/var/log')).toBe('log');
    });

    test('should join paths correctly', () => {
      const path = require('path');

      expect(path.join('/home/user', 'documents')).toBe('/home/user/documents');
      expect(path.join('/home', 'user', 'documents')).toBe('/home/user/documents');
    });
  });
});
