/**
 * Tests for transpile-cache module
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  generateCacheKey,
  lookupCache,
  storeInCache,
  transpileTypeScript,
  loadWithCache,
  clearCache,
  getCacheStats,
} from './transpile-cache';

describe('transpile-cache', () => {
  // Use a test-specific cache directory
  const originalCacheDir = process.env.TSYNE_CACHE_DIR;

  beforeAll(() => {
    process.env.TSYNE_CACHE_DIR = path.join(os.tmpdir(), 'tsyne-cache-test-' + Date.now());
  });

  afterAll(() => {
    // Clean up test cache
    const testCacheDir = process.env.TSYNE_CACHE_DIR!;
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true });
    }
    if (originalCacheDir) {
      process.env.TSYNE_CACHE_DIR = originalCacheDir;
    } else {
      delete process.env.TSYNE_CACHE_DIR;
    }
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same source', () => {
      const source = 'const x = 1;';
      const key1 = generateCacheKey(source);
      const key2 = generateCacheKey(source);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different source', () => {
      const key1 = generateCacheKey('const x = 1;');
      const key2 = generateCacheKey('const x = 2;');
      expect(key1).not.toBe(key2);
    });

    it('should return a 16-character hex string', () => {
      const key = generateCacheKey('test');
      expect(key).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('lookupCache', () => {
    it('should return miss for uncached source', () => {
      const result = lookupCache('const unique = ' + Date.now() + ';');
      expect(result.hit).toBe(false);
      expect(result.code).toBeUndefined();
    });
  });

  describe('storeInCache and lookupCache', () => {
    it('should store and retrieve compiled code', () => {
      const source = 'const cached = "test-' + Date.now() + '";';
      const compiled = '"use strict"; var cached = "test";';

      storeInCache(source, compiled, 'test.ts');

      const result = lookupCache(source);
      expect(result.hit).toBe(true);
      expect(result.code).toBe(compiled);
    });
  });

  describe('transpileTypeScript', () => {
    it('should transpile simple TypeScript to JavaScript', async () => {
      const source = `
        const greeting: string = "hello";
        export function greet(): string {
          return greeting;
        }
      `;

      const code = await transpileTypeScript(source, 'test.ts');

      expect(code).toContain('greeting');
      expect(code).toContain('greet');
      // Should not contain TypeScript type annotations
      expect(code).not.toContain(': string');
    });

    it('should handle arrow functions', async () => {
      const source = `
        export const add = (a: number, b: number): number => a + b;
      `;

      const code = await transpileTypeScript(source);
      expect(code).toContain('add');
    });

    it('should handle imports', async () => {
      const source = `
        import * as path from 'path';
        export const sep = path.sep;
      `;

      const code = await transpileTypeScript(source);
      expect(code).toContain('require');
      expect(code).toContain('path');
    });
  });

  describe('loadWithCache', () => {
    it('should transpile and cache on first load', async () => {
      const source = `
        export const value = "first-load-${Date.now()}";
      `;

      const result1 = await loadWithCache(source, 'test.ts');
      expect(result1.cached).toBe(false);
      expect(result1.code).toContain('value');

      // Second load should be cached
      const result2 = await loadWithCache(source, 'test.ts');
      expect(result2.cached).toBe(true);
      expect(result2.code).toBe(result1.code);
    });
  });

  describe('clearCache', () => {
    it('should clear cached files', async () => {
      const source = `export const clear = "clear-test-${Date.now()}";`;
      await loadWithCache(source, 'test.ts');

      const statsBefore = getCacheStats();
      expect(statsBefore.fileCount).toBeGreaterThan(0);

      const cleared = clearCache();
      expect(cleared).toBeGreaterThan(0);

      const statsAfter = getCacheStats();
      expect(statsAfter.fileCount).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty('cacheDir');
      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('coreVersion');
    });
  });
});
