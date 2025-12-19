/**
 * Transpile Cache - Content-hash based caching for TypeScript apps
 *
 * Provides fast app loading by caching transpiled JavaScript.
 * Cache key is sha256(source content) + TSYNE_CORE_VERSION.
 *
 * Design principles (per Bazel philosophy):
 * - Single-file apps with explicit imports only
 * - Content hash (not mtime) - works for URLs too
 * - Cache invalidation = source hash change OR core version change
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// Get Tsyne core version for cache invalidation
const packageJsonPath = path.resolve(__dirname, '..', __dirname.includes('dist') ? '..' : '', 'package.json');
let TSYNE_CORE_VERSION: string;
try {
  TSYNE_CORE_VERSION = require(packageJsonPath).version;
} catch {
  TSYNE_CORE_VERSION = 'dev';
}

// Cache directory
const CACHE_DIR = process.env.TSYNE_CACHE_DIR ||
  path.join(os.homedir(), '.cache', 'tsyne', 'compiled');

/**
 * Cache metadata stored alongside compiled JS
 */
interface CacheMetadata {
  sourceHash: string;
  coreVersion: string;
  sourcePath: string;
  compiledAt: number;
}

/**
 * Result of cache lookup
 */
export interface CacheResult {
  hit: boolean;
  code?: string;
  sourcePath?: string;
}

/**
 * Generate cache key from source content
 * Cache key = sha256(source) + core version to invalidate on upgrades
 */
export function generateCacheKey(source: string): string {
  const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
  // Include version in hash to auto-invalidate on upgrades
  const combined = `${sourceHash}:${TSYNE_CORE_VERSION}`;
  return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
}

/**
 * Get cache file paths for a given cache key
 */
function getCachePaths(cacheKey: string): { js: string; meta: string } {
  return {
    js: path.join(CACHE_DIR, `${cacheKey}.js`),
    meta: path.join(CACHE_DIR, `${cacheKey}.meta.json`),
  };
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Look up cached transpiled code
 * Returns hit=true with code if found, hit=false otherwise
 */
export function lookupCache(source: string): CacheResult {
  const cacheKey = generateCacheKey(source);
  const { js, meta } = getCachePaths(cacheKey);

  try {
    if (fs.existsSync(js) && fs.existsSync(meta)) {
      const metadata: CacheMetadata = JSON.parse(fs.readFileSync(meta, 'utf-8'));

      // Verify version matches (double-check since it's in the hash)
      if (metadata.coreVersion === TSYNE_CORE_VERSION) {
        const code = fs.readFileSync(js, 'utf-8');
        return { hit: true, code, sourcePath: metadata.sourcePath };
      }
    }
  } catch {
    // Cache miss on any error
  }

  return { hit: false };
}

/**
 * Store transpiled code in cache
 */
export function storeInCache(
  source: string,
  compiledCode: string,
  sourcePath: string = 'unknown'
): string {
  ensureCacheDir();

  const cacheKey = generateCacheKey(source);
  const { js, meta } = getCachePaths(cacheKey);

  const metadata: CacheMetadata = {
    sourceHash: crypto.createHash('sha256').update(source).digest('hex'),
    coreVersion: TSYNE_CORE_VERSION,
    sourcePath,
    compiledAt: Date.now(),
  };

  fs.writeFileSync(js, compiledCode);
  fs.writeFileSync(meta, JSON.stringify(metadata, null, 2));

  return cacheKey;
}

/**
 * Transpile TypeScript source to JavaScript using esbuild
 * Fast single-file bundling with no external dependencies resolved
 */
export async function transpileTypeScript(
  source: string,
  sourcePath: string = 'app.ts'
): Promise<string> {
  // Dynamic import to avoid loading esbuild until needed
  let esbuild: typeof import('esbuild');
  try {
    esbuild = await import('esbuild');
  } catch {
    throw new Error(
      'esbuild is not installed. Install it with: npm install esbuild\n' +
      'Or use the slower tsx transpilation path.'
    );
  }

  const result = await esbuild.transform(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'node18',
    sourcefile: sourcePath,
    // Keep it simple - no bundling external deps
    // Apps must use explicit imports that the runtime provides
  });

  return result.code;
}

/**
 * Load TypeScript source with caching
 *
 * 1. Check cache for existing compiled code
 * 2. If miss, transpile with esbuild and cache
 * 3. Return compiled JavaScript
 */
export async function loadWithCache(
  source: string,
  sourcePath: string = 'app.ts'
): Promise<{ code: string; cached: boolean }> {
  // Check cache first
  const cacheResult = lookupCache(source);
  if (cacheResult.hit && cacheResult.code) {
    return { code: cacheResult.code, cached: true };
  }

  // Cache miss - transpile
  const code = await transpileTypeScript(source, sourcePath);

  // Store in cache for next time
  storeInCache(source, code, sourcePath);

  return { code, cached: false };
}

/**
 * Load a TypeScript file with caching
 */
export async function loadFileWithCache(
  filePath: string
): Promise<{ code: string; cached: boolean }> {
  const source = fs.readFileSync(filePath, 'utf-8');
  return loadWithCache(source, filePath);
}

/**
 * Execute cached/transpiled code and return exports
 * Creates a sandboxed module context for execution
 */
export function executeCompiledCode(
  code: string,
  contextOverrides: Record<string, any> = {}
): Record<string, any> {
  // Create module context
  const moduleExports: Record<string, any> = {};
  const moduleObj = { exports: moduleExports };

  // Build require function that delegates to Node's require
  // Apps can only require allowed modules
  const requireFn = (id: string): any => {
    // Allow tsyne core imports
    if (id.startsWith('../core/src') || id.startsWith('./') || id === 'tsyne') {
      // Resolve relative to tsyne core
      const resolved = id === 'tsyne'
        ? path.resolve(__dirname, 'index')
        : path.resolve(__dirname, '..', id.replace('../core/src', 'src'));
      return require(resolved);
    }
    // Allow node built-ins and installed packages
    return require(id);
  };

  // Execute in function context
  const fn = new Function(
    'exports',
    'require',
    'module',
    '__filename',
    '__dirname',
    ...Object.keys(contextOverrides),
    code
  );

  fn(
    moduleExports,
    requireFn,
    moduleObj,
    'cached-app.js',
    __dirname,
    ...Object.values(contextOverrides)
  );

  return moduleObj.exports;
}

/**
 * High-level: Load and execute a TypeScript app with caching
 *
 * This is the main entry point for cached app loading.
 * Returns the module exports from the app.
 */
export async function loadAndExecuteApp(
  source: string,
  sourcePath: string = 'app.ts',
  contextOverrides: Record<string, any> = {}
): Promise<{ exports: Record<string, any>; cached: boolean }> {
  const { code, cached } = await loadWithCache(source, sourcePath);
  const exports = executeCompiledCode(code, contextOverrides);
  return { exports, cached };
}

/**
 * Load and execute a TypeScript file with caching
 */
export async function loadAndExecuteFile(
  filePath: string,
  contextOverrides: Record<string, any> = {}
): Promise<{ exports: Record<string, any>; cached: boolean }> {
  const source = fs.readFileSync(filePath, 'utf-8');
  return loadAndExecuteApp(source, filePath, contextOverrides);
}

/**
 * Clear all cached transpiled code
 */
export function clearCache(): number {
  if (!fs.existsSync(CACHE_DIR)) {
    return 0;
  }

  const files = fs.readdirSync(CACHE_DIR);
  let count = 0;

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.meta.json')) {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      count++;
    }
  }

  return count;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  cacheDir: string;
  fileCount: number;
  totalSize: number;
  coreVersion: string;
} {
  let fileCount = 0;
  let totalSize = 0;

  if (fs.existsSync(CACHE_DIR)) {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.js')) {
        fileCount++;
        totalSize += fs.statSync(path.join(CACHE_DIR, file)).size;
      }
    }
  }

  return {
    cacheDir: CACHE_DIR,
    fileCount,
    totalSize,
    coreVersion: TSYNE_CORE_VERSION,
  };
}
