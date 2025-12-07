/**
 * Desktop App Metadata Parser
 *
 * Parses @tsyne-app metadata comments from TypeScript source files.
 * Similar to @Grab pattern for dependencies.
 *
 * Supported directives:
 *   // @tsyne-app:name Calculator
 *   // @tsyne-app:icon <svg>...</svg>
 *   // @tsyne-app:icon calculate
 *   // @tsyne-app:category utilities
 *   // @tsyne-app:builder buildCalculator
 *   // @tsyne-app:args app,resources
 *
 * The icon can be:
 *   - An inline SVG (for custom icons)
 *   - A Fyne theme icon name (confirm, delete, home, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import { executeInSandbox, SandboxRuntimeType } from './sandbox-runtime';

export interface AppMetadata {
  /** File path to the app source */
  filePath: string;
  /** Display name for the desktop icon */
  name: string;
  /** SVG string or theme icon name */
  icon: string;
  /** Whether icon is an SVG (vs theme icon name) */
  iconIsSvg: boolean;
  /** Optional category for grouping */
  category?: string;
  /** The exported builder function name (creates window) */
  builder: string;
  /** The exported content builder function name (creates content only, for desktop) */
  contentBuilder?: string;
  /** Instance count: 'one' (default), 'many', or 'desktop-many' (multi on desktop only) */
  count: 'one' | 'many' | 'desktop-many';
  /** Builder function arguments in order (e.g., ['app', 'resources']) - poor man's reflection */
  args: string[];
}

/**
 * Default SVG icons for apps that don't specify one
 */
const DEFAULT_ICONS: Record<string, string> = {
  calculator: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="12" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></svg>`,
  default: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>`,
};

/**
 * Parse @tsyne-app metadata from a TypeScript source file
 */
export function parseAppMetadata(filePath: string): AppMetadata | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let name: string | null = null;
    let icon: string | null = null;
    let iconIsSvg = false;
    let category: string | undefined;
    let builder: string | null = null;
    let contentBuilder: string | undefined;
    let count: 'one' | 'many' | 'desktop-many' = 'one';
    let args: string[] = ['app'];  // Default: just app

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse @tsyne-app:name
      const nameMatch = trimmed.match(/^\/\/\s*@tsyne-app:name\s+(.+)$/);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }

      // Parse @tsyne-app:icon (can be SVG or icon name)
      const iconMatch = trimmed.match(/^\/\/\s*@tsyne-app:icon\s+(.+)$/);
      if (iconMatch) {
        const iconValue = iconMatch[1].trim();
        if (iconValue.startsWith('<svg') || iconValue.startsWith('<SVG')) {
          icon = iconValue;
          iconIsSvg = true;
        } else {
          icon = iconValue;
          iconIsSvg = false;
        }
        continue;
      }

      // Parse @tsyne-app:category
      const categoryMatch = trimmed.match(/^\/\/\s*@tsyne-app:category\s+(.+)$/);
      if (categoryMatch) {
        category = categoryMatch[1].trim();
        continue;
      }

      // Parse @tsyne-app:builder
      const builderMatch = trimmed.match(/^\/\/\s*@tsyne-app:builder\s+(.+)$/);
      if (builderMatch) {
        builder = builderMatch[1].trim();
        continue;
      }

      // Parse @tsyne-app:contentBuilder
      const contentBuilderMatch = trimmed.match(/^\/\/\s*@tsyne-app:contentBuilder\s+(.+)$/);
      if (contentBuilderMatch) {
        contentBuilder = contentBuilderMatch[1].trim();
        continue;
      }

      // Parse @tsyne-app:count (one, many, or desktop-many)
      const countMatch = trimmed.match(/^\/\/\s*@tsyne-app:count\s+(.+)$/);
      if (countMatch) {
        const countValue = countMatch[1].trim().toLowerCase();
        if (countValue === 'many') {
          count = 'many';
        } else if (countValue === 'desktop-many') {
          count = 'desktop-many';
        }
        continue;
      }

      // Parse @tsyne-app:args (comma-separated list of argument names)
      const argsMatch = trimmed.match(/^\/\/\s*@tsyne-app:args\s+(.+)$/);
      if (argsMatch) {
        args = argsMatch[1].split(',').map(a => a.trim());
        continue;
      }
    }

    // If no name specified, not a desktop app
    if (!name) {
      return null;
    }

    // Require explicit @tsyne-app:builder - no inference
    if (!builder) {
      return null;
    }

    // Try to infer contentBuilder if not specified
    if (!contentBuilder) {
      const contentMatch = content.match(/export\s+function\s+(build\w+Content)\s*\(/);
      if (contentMatch) {
        contentBuilder = contentMatch[1];
      }
    }

    // Set default icon based on name if not specified
    if (!icon) {
      const nameLower = name.toLowerCase();
      if (nameLower in DEFAULT_ICONS) {
        icon = DEFAULT_ICONS[nameLower];
        iconIsSvg = true;
      } else {
        icon = DEFAULT_ICONS.default;
        iconIsSvg = true;
      }
    }

    return {
      filePath,
      name,
      icon,
      iconIsSvg,
      category,
      builder,
      contentBuilder,
      count,
      args
    };
  } catch (error) {
    console.error(`Error parsing metadata from ${filePath}:`, error);
    return null;
  }
}

/**
 * Scan a directory for TypeScript files with @tsyne-app metadata
 */
export function scanForApps(directory: string): AppMetadata[] {
  const apps: AppMetadata[] = [];

  try {
    const files = fs.readdirSync(directory);

    for (const file of files) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts') || file.endsWith('.d.ts')) {
        continue;
      }

      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        const metadata = parseAppMetadata(filePath);
        if (metadata) {
          apps.push(metadata);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scan ported-apps directory where each subdirectory contains an app
 * Looks for <appname>.ts in each subdirectory (e.g., chess/chess.ts, terminal/terminal.ts)
 */
export function scanPortedApps(portedAppsDir: string): AppMetadata[] {
  const apps: AppMetadata[] = [];

  try {
    if (!fs.existsSync(portedAppsDir)) {
      return apps;
    }

    const subdirs = fs.readdirSync(portedAppsDir);

    for (const subdir of subdirs) {
      const subdirPath = path.join(portedAppsDir, subdir);
      const stats = fs.statSync(subdirPath);

      if (stats.isDirectory()) {
        // Look for <subdir>.ts file (e.g., chess/chess.ts)
        const mainFile = path.join(subdirPath, `${subdir}.ts`);
        if (fs.existsSync(mainFile)) {
          const metadata = parseAppMetadata(mainFile);
          if (metadata) {
            apps.push(metadata);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning ported-apps directory ${portedAppsDir}:`, error);
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Load and execute an app's builder function
 * The builder function signature depends on @tsyne-app:args metadata.
 * Desktop will build the argument array based on args declaration.
 */
export async function loadAppBuilder(metadata: AppMetadata): Promise<((...args: any[]) => void | Promise<void>) | null> {
  try {
    // Use require to load the module
    const modulePath = metadata.filePath;
    const module = require(modulePath);

    const builder = module[metadata.builder];
    if (typeof builder !== 'function') {
      console.error(`Builder function '${metadata.builder}' not found in ${metadata.filePath}`);
      return null;
    }

    return builder;
  } catch (error) {
    console.error(`Error loading app builder from ${metadata.filePath}:`, error);
    return null;
  }
}

/**
 * Load an app's content builder function (for desktop inner windows)
 * Falls back to regular builder if no content builder is specified
 */
export async function loadContentBuilder(metadata: AppMetadata): Promise<((...args: any[]) => void | Promise<void>) | null> {
  try {
    const modulePath = metadata.filePath;
    const module = require(modulePath);

    // Try contentBuilder first
    if (metadata.contentBuilder) {
      const contentBuilder = module[metadata.contentBuilder];
      if (typeof contentBuilder === 'function') {
        return contentBuilder;
      }
      console.warn(`ContentBuilder '${metadata.contentBuilder}' not found, falling back to builder`);
    }

    // Fall back to regular builder (will need window handling)
    const builder = module[metadata.builder];
    if (typeof builder !== 'function') {
      console.error(`Builder function '${metadata.builder}' not found in ${metadata.filePath}`);
      return null;
    }

    return builder;
  } catch (error) {
    console.error(`Error loading content builder from ${metadata.filePath}:`, error);
    return null;
  }
}

/**
 * Configuration for sandbox mode
 */
export interface SandboxConfig {
  /** Whether to enable sandbox transformation (default: false for development) */
  enabled: boolean;
  /** Which sandbox runtime to use: 'vm' (fast) or 'isolated-vm' (secure) */
  runtime?: SandboxRuntimeType;
  /** Memory limit in MB (isolated-vm only) */
  memoryLimitMB?: number;
  /** Execution timeout in milliseconds */
  timeoutMs?: number;
  /** List of npm modules the app is allowed to require */
  allowedModules?: string[];
}

/** Global sandbox configuration */
let sandboxConfig: SandboxConfig = { enabled: false, runtime: 'vm' };

/**
 * Set sandbox configuration for app loading
 * Call this before loading apps to enable/disable transformation
 *
 * Examples:
 *   // Development mode (default) - no sandboxing
 *   setSandboxConfig({ enabled: false });
 *
 *   // Fast sandbox with AST transform + vm
 *   setSandboxConfig({ enabled: true, runtime: 'vm' });
 *
 *   // Secure sandbox with AST transform + isolated-vm
 *   setSandboxConfig({ enabled: true, runtime: 'isolated-vm', memoryLimitMB: 64 });
 */
export function setSandboxConfig(config: SandboxConfig): void {
  sandboxConfig = { runtime: 'vm', ...config };
}

/**
 * Get current sandbox configuration
 */
export function getSandboxConfig(): SandboxConfig {
  return sandboxConfig;
}

/**
 * Load an app's builder function with optional sandbox transformation.
 *
 * When sandbox is disabled (development mode):
 *   - Uses normal require() for fast loading
 *   - Apps have full Node.js access
 *   - Best for development and debugging
 *
 * When sandbox is enabled (production/untrusted mode):
 *   - Reads source file and transforms with TypeScript AST
 *   - Dangerous identifiers rewritten with unguessable tokens
 *   - Apps cannot access real require, eval, process, etc.
 *   - Each app gets its own unique token - can't call each other's functions
 *   - Choice of 'vm' (fast) or 'isolated-vm' (secure) runtime
 */
export async function loadAppBuilderSandboxed(
  metadata: AppMetadata,
  _tsyneExports: any  // The tsyne module exports to inject (for future use)
): Promise<{ builder: ((...args: any[]) => void | Promise<void>) | null; token: string | null }> {
  if (!sandboxConfig.enabled) {
    // Development mode: use normal require
    const builder = await loadAppBuilder(metadata);
    return { builder, token: null };
  }

  try {
    // Read source file
    const source = fs.readFileSync(metadata.filePath, 'utf-8');

    // Execute in sandbox using pluggable runtime
    const result = await executeInSandbox(source, metadata.name, {
      runtime: sandboxConfig.runtime || 'vm',
      memoryLimitMB: sandboxConfig.memoryLimitMB,
      timeoutMs: sandboxConfig.timeoutMs || 5000,
      allowedModules: sandboxConfig.allowedModules || [],
    });

    // Extract the builder function
    const builder = result.exports[metadata.builder];

    if (typeof builder !== 'function') {
      console.error(`Builder function '${metadata.builder}' not found in sandboxed module ${metadata.filePath}`);
      return { builder: null, token: result.token };
    }

    return { builder, token: result.token };
  } catch (error) {
    console.error(`Error loading sandboxed app from ${metadata.filePath}:`, error);
    return { builder: null, token: null };
  }
}
