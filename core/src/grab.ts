/**
 * @grab Directive Handling
 *
 * Scans source files for @grab directives and resolves dependencies.
 * This abstracts the package manager - currently uses npm/pnpm under the hood,
 * but could use bun, custom fetcher, or pre-bundled deps in the future.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * A parsed @grab directive
 */
export interface GrabDirective {
  /** Package name (e.g., 'lodash', '@types/node') */
  package: string;
  /** Version specification (e.g., '4.17.21', '^4.0.0') */
  version: string;
  /** Original line from source */
  raw: string;
  /** Line number in source file */
  line: number;
}

/**
 * Result of dependency resolution
 */
export interface GrabResult {
  /** Successfully resolved packages */
  resolved: GrabDirective[];
  /** Failed to resolve */
  failed: { directive: GrabDirective; error: string }[];
  /** Cache directory where packages are installed */
  cacheDir: string;
}

/**
 * Get the default cache directory for @grab packages
 */
export function getGrabCacheDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return path.join(home, '.tsyne', 'packages');
}

/**
 * Parse @grab directives from a source file
 *
 * Supports two formats:
 * - // @Grab('package@version')  (Groovy-style)
 * - // @grab package@version     (simpler)
 */
export function parseGrabDirectives(sourceFile: string): GrabDirective[] {
  if (!fs.existsSync(sourceFile)) {
    return [];
  }

  const content = fs.readFileSync(sourceFile, 'utf-8');
  const lines = content.split('\n');
  const directives: GrabDirective[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: // @Grab('package@version')
    let match = line.match(/\/\/\s*@Grab\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (match) {
      const spec = match[1];
      const atIndex = spec.lastIndexOf('@');
      if (atIndex > 0) {
        directives.push({
          package: spec.slice(0, atIndex),
          version: spec.slice(atIndex + 1),
          raw: line,
          line: i + 1,
        });
      }
      continue;
    }

    // Match: // @grab package@version
    match = line.match(/\/\/\s*@grab\s+(\S+)/i);
    if (match) {
      const spec = match[1];
      const atIndex = spec.lastIndexOf('@');
      if (atIndex > 0) {
        directives.push({
          package: spec.slice(0, atIndex),
          version: spec.slice(atIndex + 1),
          raw: line,
          line: i + 1,
        });
      } else {
        // No version specified, use latest
        directives.push({
          package: spec,
          version: 'latest',
          raw: line,
          line: i + 1,
        });
      }
    }
  }

  return directives;
}

/**
 * Ensure package.json exists in cache directory
 */
function ensureCachePackageJson(cacheDir: string): void {
  const packageJsonPath = path.join(cacheDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'tsyne-grab-cache',
          version: '1.0.0',
          private: true,
          description: 'Cache for @grab dependencies',
        },
        null,
        2
      )
    );
  }
}

/**
 * Check if a package is already installed in cache
 */
function isPackageInstalled(cacheDir: string, pkg: string, version: string): boolean {
  const packageDir = path.join(cacheDir, 'node_modules', pkg);
  if (!fs.existsSync(packageDir)) {
    return false;
  }

  // Check version matches (for non-latest)
  if (version !== 'latest') {
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));
      // Simple check: installed version should satisfy the requested version
      // For exact versions, they should match
      if (version.match(/^\d+\.\d+\.\d+$/)) {
        return pkgJson.version === version;
      }
      // For ranges, just check it's installed (let npm handle version resolution)
      return true;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Install @grab dependencies to cache
 */
export function resolveGrabDirectives(
  directives: GrabDirective[],
  options: {
    cacheDir?: string;
    offline?: boolean;
    update?: boolean;
    verbose?: boolean;
  } = {}
): GrabResult {
  const cacheDir = options.cacheDir || getGrabCacheDir();
  const result: GrabResult = {
    resolved: [],
    failed: [],
    cacheDir,
  };

  if (directives.length === 0) {
    return result;
  }

  ensureCachePackageJson(cacheDir);

  for (const directive of directives) {
    const spec = `${directive.package}@${directive.version}`;

    // Check if already installed (skip in update mode)
    if (!options.update && isPackageInstalled(cacheDir, directive.package, directive.version)) {
      result.resolved.push(directive);
      continue;
    }

    // Skip installation in offline mode
    if (options.offline) {
      if (isPackageInstalled(cacheDir, directive.package, directive.version)) {
        result.resolved.push(directive);
      } else {
        result.failed.push({ directive, error: 'Not in cache (offline mode)' });
      }
      continue;
    }

    // Install package
    try {
      if (options.verbose) {
        console.log(`[tsyne] Installing ${spec}...`);
      }
      execSync(`npm install ${spec}`, {
        cwd: cacheDir,
        stdio: options.verbose ? 'inherit' : 'pipe',
      });
      result.resolved.push(directive);
    } catch (err) {
      result.failed.push({
        directive,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}

/**
 * Get NODE_PATH entries for resolved @grab packages
 */
export function getGrabNodePath(cacheDir?: string): string {
  const dir = cacheDir || getGrabCacheDir();
  return path.join(dir, 'node_modules');
}

/**
 * Scan file and install all @grab dependencies
 * Returns the node_modules path to add to NODE_PATH
 */
export function processGrabDirectives(
  sourceFile: string,
  options: {
    offline?: boolean;
    update?: boolean;
    verbose?: boolean;
  } = {}
): { nodePath: string; errors: string[] } {
  const directives = parseGrabDirectives(sourceFile);
  const errors: string[] = [];

  if (directives.length === 0) {
    return { nodePath: '', errors: [] };
  }

  if (options.verbose) {
    console.log(`[tsyne] Found ${directives.length} @grab dependencies`);
  }

  const result = resolveGrabDirectives(directives, options);

  for (const { directive, error } of result.failed) {
    errors.push(`Failed to install ${directive.package}@${directive.version}: ${error}`);
  }

  return {
    nodePath: getGrabNodePath(result.cacheDir),
    errors,
  };
}
