#!/usr/bin/env npx tsx
/**
 * App Manifest Generator
 *
 * Reads the canonical app list from launchers/all-apps.ts and generates a
 * static manifest file with all app imports and metadata. This avoids runtime
 * reflection/scanning and enables static bundling for Android/iOS deployments.
 *
 * The source of truth for which apps exist is launchers/all-apps.ts (and its
 * component files bsd-mit-apps.ts and gpl-apps.ts). This generator extracts
 * the metadata from those files and creates the static imports needed for bundling.
 *
 * Usage:
 *   npx tsx phone-apps/generate-app-manifest.ts
 *
 * Output:
 *   phone-apps/all-apps.generated.ts
 *
 * Supported metadata (in JSDoc or // comments):
 *   - name        Display name
 *   - icon        SVG string or theme icon name
 *   - category    Category for grouping (phone, utilities, games, etc.)
 *   - builder     Exported builder function name
 *   - args        Comma-separated argument names (app, win, contacts, etc.)
 *   - count       Instance count: one, many, desktop-many
 *   - platforms   Comma-separated platforms: phone, tablet, desktop, all (default: all)
 *
 * All metadata prefixed with @tsyne-app: (e.g., @tsyne-app:name MyApp)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ALL_APPS } from '../launchers/all-apps';

// Platform types
export type Platform = 'phone' | 'tablet' | 'desktop';

interface ParsedAppMetadata {
  filePath: string;
  name: string;
  icon: string;
  iconIsSvg: boolean;
  category?: string;
  builder: string;
  args: string[];
  count: 'one' | 'many' | 'desktop-many';
  platforms: Platform[];
}

// Apps to exclude from the generated manifest (even if in ALL_APPS)
// These are apps with bundling issues (native deps, missing packages, etc.)
const EXCLUDE_PATTERNS = [
  /\.test\.ts$/,
  /\.d\.ts$/,
  /^index\.ts$/,
  /^phonetop\.ts$/,
  /^phonetop-android\.ts$/,
  /^phonetop-groups\.ts$/,
  /^services\.ts$/,
  /^generate-app-manifest\.ts$/,
  /^all-apps\.generated\.ts$/,
  /keyboard\//,  // Exclude keyboard subdirectory
  // Apps with bundling issues (native deps, missing packages, etc.)
  /[\/\\]telegram($|[\/\\])/,   // Requires 'telegram' and 'qrcode' npm packages
  /[\/\\]terminal($|[\/\\])/,   // Requires node-pty native module
  /[\/\\]signal($|[\/\\])/,     // Requires 'signal' package
  /[\/\\]solitaire($|[\/\\])/,  // Has nested @resvg dependency issues
  /nomad\.ts$/,                  // Has require('./index') issue
];

// Default icon for apps without one
const DEFAULT_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="6" r="1"/><circle cx="9" cy="6" r="1"/></svg>`;

/**
 * Parse @tsyne-app metadata from a TypeScript source file
 */
function parseAppMetadata(filePath: string): ParsedAppMetadata | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let name: string | null = null;
    let icon: string | null = null;
    let iconIsSvg = false;
    let category: string | undefined;
    let builder: string | null = null;
    let count: 'one' | 'many' | 'desktop-many' = 'one';
    let args: string[] = ['app'];
    let platforms: Platform[] = ['phone', 'tablet', 'desktop']; // Default: all

    // Heredoc state
    let heredocField: string | null = null;
    let heredocTag: string | null = null;
    let heredocLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Heredoc handling
      if (heredocTag) {
        const closingMatch = trimmed.match(/^\*?\s*(\w+)\s*$/);
        if (closingMatch && closingMatch[1] === heredocTag) {
          const value = heredocLines.join('\n').trim();
          if (heredocField === 'icon') {
            icon = value;
            iconIsSvg = value.startsWith('<svg') || value.startsWith('<SVG');
          }
          heredocField = null;
          heredocTag = null;
          heredocLines = [];
          continue;
        }

        let contentLine = trimmed;
        if (contentLine.startsWith('*')) {
          contentLine = contentLine.substring(1).trimStart();
        }
        heredocLines.push(contentLine);
        continue;
      }

      // Heredoc start
      const heredocMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:(\w+)\s+<<(\w+)\s*$/);
      if (heredocMatch) {
        heredocField = heredocMatch[1];
        heredocTag = heredocMatch[2];
        heredocLines = [];
        continue;
      }

      // @tsyne-app:name
      const nameMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:name\s+(.+)$/);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }

      // @tsyne-app:icon (single line)
      const iconMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:icon\s+(.+)$/);
      if (iconMatch) {
        const iconValue = iconMatch[1].trim();
        if (iconValue.startsWith('<svg') || iconValue.startsWith('<SVG')) {
          icon = iconValue;
          iconIsSvg = true;
        } else if (!iconValue.startsWith('<<')) {
          icon = iconValue;
          iconIsSvg = false;
        }
        continue;
      }

      // @tsyne-app:category
      const categoryMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:category\s+(.+)$/);
      if (categoryMatch) {
        category = categoryMatch[1].trim().toLowerCase();
        continue;
      }

      // @tsyne-app:builder (must be a valid function name - letters, numbers, underscores)
      const builderMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:builder\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
      if (builderMatch) {
        builder = builderMatch[1];
        continue;
      }

      // @tsyne-app:count
      const countMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:count\s+(.+)$/);
      if (countMatch) {
        const countValue = countMatch[1].trim().toLowerCase();
        if (countValue === 'many') count = 'many';
        else if (countValue === 'desktop-many') count = 'desktop-many';
        continue;
      }

      // @tsyne-app:args
      const argsMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:args\s+(.+)$/);
      if (argsMatch) {
        args = argsMatch[1].split(',').map(a => a.trim());
        continue;
      }

      // @tsyne-app:platforms
      const platformsMatch = trimmed.match(/^(?:\/\/|\*)\s*@tsyne-app:platforms\s+(.+)$/);
      if (platformsMatch) {
        const platformValues = platformsMatch[1].split(',').map(p => p.trim().toLowerCase());
        if (platformValues.includes('all')) {
          platforms = ['phone', 'tablet', 'desktop'];
        } else {
          platforms = platformValues.filter(p =>
            p === 'phone' || p === 'tablet' || p === 'desktop'
          ) as Platform[];
        }
        continue;
      }
    }

    // Require name and builder
    if (!name || !builder) {
      return null;
    }

    // Default icon
    if (!icon) {
      icon = DEFAULT_ICON;
      iconIsSvg = true;
    }

    return {
      filePath,
      name,
      icon,
      iconIsSvg,
      category,
      builder,
      args,
      count,
      platforms,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Check if a file should be excluded
 */
function shouldExclude(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  const fileName = path.basename(filePath);
  // Check against both relative path and filename
  return EXCLUDE_PATTERNS.some(pattern =>
    pattern.test(relativePath) || pattern.test(fileName)
  );
}

/**
 * Generate import path relative to phone-apps/
 */
function generateImportPath(filePath: string): string {
  const projectRoot = process.cwd();
  const phoneAppsDir = path.join(projectRoot, 'phone-apps');
  const relativePath = path.relative(phoneAppsDir, filePath);

  // Remove .ts extension
  let importPath = relativePath.replace(/\.ts$/, '');

  // Handle paths that go up (../) vs paths within phone-apps (./)
  if (importPath.startsWith('..')) {
    // Path goes outside phone-apps (e.g., ported-apps, examples)
    // Already has correct relative prefix
  } else {
    // Path is within phone-apps directory
    importPath = './' + importPath;
  }

  return importPath;
}

/**
 * Generate a safe JavaScript identifier from app name
 */
function generateIdentifier(name: string): string {
  // Convert to camelCase, remove non-alphanumeric
  let identifier = name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');

  // Ensure it doesn't start with a number (invalid JS identifier)
  if (/^\d/.test(identifier)) {
    identifier = 'app' + identifier.charAt(0).toUpperCase() + identifier.slice(1);
  }

  return identifier;
}

/**
 * Escape string for TypeScript template literal
 */
function escapeForTemplate(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

/**
 * Generate the all-apps.generated.ts file
 */
function generateManifest(apps: ParsedAppMetadata[]): string {
  const imports: string[] = [];
  const definitions: string[] = [];
  const builderMap: string[] = [];

  // Track identifiers to avoid collisions
  const usedIdentifiers = new Set<string>();

  for (const app of apps) {
    let identifier = generateIdentifier(app.name);

    // Handle collisions
    let suffix = 1;
    let uniqueIdentifier = identifier;
    while (usedIdentifiers.has(uniqueIdentifier)) {
      uniqueIdentifier = `${identifier}${suffix++}`;
    }
    usedIdentifiers.add(uniqueIdentifier);

    const importPath = generateImportPath(app.filePath);
    const importName = `${uniqueIdentifier}Builder`;

    // Generate import
    imports.push(`import { ${app.builder} as ${importName} } from '${importPath}';`);

    // Generate definition
    const iconStr = app.iconIsSvg
      ? `\`${escapeForTemplate(app.icon)}\``
      : `'${app.icon}'`;

    const platformsStr = app.platforms.map(p => `'${p}'`).join(', ');

    definitions.push(`  {
    name: '${app.name.replace(/'/g, "\\'")}',
    builder: ${importName},
    icon: ${iconStr},
    category: ${app.category ? `'${app.category}'` : 'undefined'},
    args: [${app.args.map(a => `'${a}'`).join(', ')}],
    count: '${app.count}',
    platforms: [${platformsStr}],
  }`);

    // Add to builder map
    builderMap.push(`  '${uniqueIdentifier}': ${importName}`);
  }

  return `// AUTO-GENERATED by generate-app-manifest.ts - DO NOT EDIT
// Generated: ${new Date().toISOString()}
// Apps: ${apps.length}

import type { App } from 'tsyne';

/** Platform types for targeting specific form factors */
export type Platform = 'phone' | 'tablet' | 'desktop';

/** Static app definition with all metadata */
export interface GeneratedAppDefinition {
  /** Display name for the app */
  name: string;
  /** The builder function (pre-imported) */
  builder: (...args: any[]) => void | Promise<void>;
  /** SVG icon content or theme icon name */
  icon: string;
  /** App category for grouping */
  category?: string;
  /** Builder function arguments in order */
  args: string[];
  /** Instance count: 'one' (default), 'many', or 'desktop-many' */
  count: 'one' | 'many' | 'desktop-many';
  /** Supported platforms */
  platforms: Platform[];
}

// App builder imports
${imports.join('\n')}

/**
 * All discovered apps with metadata
 */
export const allApps: GeneratedAppDefinition[] = [
${definitions.join(',\n')}
];

/**
 * Builder functions by identifier (for lookup)
 */
export const appBuilders: Record<string, (...args: any[]) => void | Promise<void>> = {
${builderMap.join(',\n')}
};

/**
 * Filter apps by platform
 */
export function getAppsForPlatform(platform: Platform): GeneratedAppDefinition[] {
  return allApps.filter(app => app.platforms.includes(platform));
}

/**
 * Filter apps by category
 */
export function getAppsByCategory(category: string): GeneratedAppDefinition[] {
  return allApps.filter(app => app.category === category);
}

/**
 * Get unique categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  for (const app of allApps) {
    if (app.category) {
      categories.add(app.category);
    }
  }
  return Array.from(categories).sort();
}
`;
}

/**
 * Main entry point
 */
function main() {
  console.log('Reading apps from launchers/all-apps.ts...\n');
  console.log(`  Found ${ALL_APPS.length} app paths in registry`);

  const allApps: ParsedAppMetadata[] = [];
  const seenNames = new Set<string>();
  let skipped = 0;
  let excluded = 0;

  for (const filePath of ALL_APPS) {
    // Check exclusion patterns
    if (shouldExclude(filePath)) {
      excluded++;
      continue;
    }

    // Parse metadata from the file
    const metadata = parseAppMetadata(filePath);
    if (!metadata) {
      console.log(`    Skipped (no metadata): ${path.basename(filePath)}`);
      skipped++;
      continue;
    }

    // Dedupe by name (first wins)
    if (seenNames.has(metadata.name)) {
      console.log(`    Skipped (duplicate name): ${metadata.name}`);
      skipped++;
      continue;
    }

    seenNames.add(metadata.name);
    allApps.push(metadata);
  }

  // Sort by name
  allApps.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\n  Parsed: ${allApps.length} apps`);
  if (skipped > 0) console.log(`  Skipped: ${skipped} (no metadata or duplicates)`);
  if (excluded > 0) console.log(`  Excluded: ${excluded} (matched exclusion patterns)`);

  console.log(`\nTotal: ${allApps.length} apps\n`);

  // Show breakdown by platform
  const phoneApps = allApps.filter(a => a.platforms.includes('phone'));
  const tabletApps = allApps.filter(a => a.platforms.includes('tablet'));
  const desktopApps = allApps.filter(a => a.platforms.includes('desktop'));

  console.log('Platform breakdown:');
  console.log(`  Phone:   ${phoneApps.length} apps`);
  console.log(`  Tablet:  ${tabletApps.length} apps`);
  console.log(`  Desktop: ${desktopApps.length} apps`);

  // Generate manifest
  const manifest = generateManifest(allApps);

  // Write to file
  const outputPath = path.join(process.cwd(), 'phone-apps', 'all-apps.generated.ts');
  fs.writeFileSync(outputPath, manifest);

  console.log(`\nGenerated: ${outputPath}`);

  // List apps
  console.log('\nApps included:');
  for (const app of allApps) {
    const platforms = app.platforms.join(', ');
    console.log(`  - ${app.name} (${app.category || 'uncategorized'}) [${platforms}]`);
  }
}

// Run if executed directly
main();
