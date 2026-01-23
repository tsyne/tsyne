/**
 * App Version Requirements
 *
 * Parses and validates app version requirements against the installed Tsyne version.
 * Apps can declare requirements in package.json or via inline directive.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TSYNE_VERSION } from './version';

/**
 * Version requirement parsed from app
 */
export interface VersionRequirement {
  /** Minimum version (inclusive), e.g., "17.0.0" */
  minVersion?: string;
  /** Maximum version (exclusive), e.g., "<18.0.0" or "18.0.0" */
  maxVersion?: string;
  /** Raw range string if using semver syntax, e.g., ">=17.0.0 <18.0.0" */
  range?: string;
  /** Source of the requirement */
  source: 'package.json' | 'directive' | 'none';
}

/**
 * Result of version validation
 */
export interface VersionValidation {
  valid: boolean;
  requirement: VersionRequirement;
  installedVersion: string;
  message?: string;
}

/**
 * Parse a semver version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two versions: returns -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;

  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}

/**
 * Check if version satisfies a simple range
 * Supports: >=X.Y.Z, >X.Y.Z, <=X.Y.Z, <X.Y.Z, X.Y.Z (exact), ^X.Y.Z, ~X.Y.Z
 */
function satisfiesRange(version: string, range: string): boolean {
  const trimmed = range.trim();

  // Handle compound ranges like ">=17.0.0 <18.0.0"
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    return parts.every((part) => satisfiesRange(version, part));
  }

  // Handle operators
  if (trimmed.startsWith('>=')) {
    return compareVersions(version, trimmed.slice(2)) >= 0;
  }
  if (trimmed.startsWith('>')) {
    return compareVersions(version, trimmed.slice(1)) > 0;
  }
  if (trimmed.startsWith('<=')) {
    return compareVersions(version, trimmed.slice(2)) <= 0;
  }
  if (trimmed.startsWith('<')) {
    return compareVersions(version, trimmed.slice(1)) < 0;
  }
  if (trimmed.startsWith('^')) {
    // Caret: allows changes that do not modify the left-most non-zero digit
    const target = parseVersion(trimmed.slice(1));
    const actual = parseVersion(version);
    if (!target || !actual) return false;
    if (target.major !== 0) {
      // ^1.2.3 means >=1.2.3 <2.0.0
      return actual.major === target.major && compareVersions(version, trimmed.slice(1)) >= 0;
    } else if (target.minor !== 0) {
      // ^0.2.3 means >=0.2.3 <0.3.0
      return (
        actual.major === 0 && actual.minor === target.minor && compareVersions(version, trimmed.slice(1)) >= 0
      );
    } else {
      // ^0.0.3 means >=0.0.3 <0.0.4
      return (
        actual.major === 0 &&
        actual.minor === 0 &&
        actual.patch === target.patch
      );
    }
  }
  if (trimmed.startsWith('~')) {
    // Tilde: allows patch-level changes
    const target = parseVersion(trimmed.slice(1));
    const actual = parseVersion(version);
    if (!target || !actual) return false;
    return (
      actual.major === target.major &&
      actual.minor === target.minor &&
      compareVersions(version, trimmed.slice(1)) >= 0
    );
  }

  // Exact match
  return compareVersions(version, trimmed) === 0;
}

/**
 * Parse version requirement from package.json
 */
function parsePackageJson(packageJsonPath: string): VersionRequirement | null {
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    // Check for tsyne section with minVersion/maxVersion
    if (pkg.tsyne) {
      const req: VersionRequirement = { source: 'package.json' };
      if (pkg.tsyne.minVersion) req.minVersion = pkg.tsyne.minVersion;
      if (pkg.tsyne.maxVersion) req.maxVersion = pkg.tsyne.maxVersion;
      if (req.minVersion || req.maxVersion) {
        return req;
      }
    }

    // Check for peerDependencies.tsyne
    if (pkg.peerDependencies?.tsyne) {
      return {
        range: pkg.peerDependencies.tsyne,
        source: 'package.json',
      };
    }

    // Check for engines.tsyne
    if (pkg.engines?.tsyne) {
      return {
        range: pkg.engines.tsyne,
        source: 'package.json',
      };
    }
  } catch {
    // Invalid JSON, ignore
  }

  return null;
}

/**
 * Parse version requirement from inline directive in source file
 * Format: // @tsyne-version >=17.0.0 <18.0.0
 */
function parseDirective(sourceFile: string): VersionRequirement | null {
  if (!fs.existsSync(sourceFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(sourceFile, 'utf-8');
    // Match: // @tsyne-version <range>
    const match = content.match(/\/\/\s*@tsyne-version\s+([^\n\r]+)/);
    if (match) {
      return {
        range: match[1].trim(),
        source: 'directive',
      };
    }
  } catch {
    // Can't read file, ignore
  }

  return null;
}

/**
 * Get version requirement for an app
 * Checks both package.json (in app's directory) and inline directive
 */
export function getVersionRequirement(appPath: string): VersionRequirement {
  const absPath = path.resolve(appPath);
  const appDir = path.dirname(absPath);

  // First check inline directive (takes precedence)
  const directive = parseDirective(absPath);
  if (directive) {
    return directive;
  }

  // Then check package.json in same directory
  const packageJsonPath = path.join(appDir, 'package.json');
  const packageReq = parsePackageJson(packageJsonPath);
  if (packageReq) {
    return packageReq;
  }

  // No requirement found
  return { source: 'none' };
}

/**
 * Validate that installed Tsyne version satisfies app requirements
 */
export function validateVersion(requirement: VersionRequirement): VersionValidation {
  const result: VersionValidation = {
    valid: true,
    requirement,
    installedVersion: TSYNE_VERSION,
  };

  if (requirement.source === 'none') {
    // No requirement, always valid
    return result;
  }

  // Build effective range
  let range = requirement.range;
  if (!range && (requirement.minVersion || requirement.maxVersion)) {
    const parts: string[] = [];
    if (requirement.minVersion) parts.push(`>=${requirement.minVersion}`);
    if (requirement.maxVersion) {
      // If maxVersion starts with <, use as-is; otherwise treat as exclusive
      if (requirement.maxVersion.startsWith('<')) {
        parts.push(requirement.maxVersion);
      } else {
        parts.push(`<${requirement.maxVersion}`);
      }
    }
    range = parts.join(' ');
  }

  if (range && !satisfiesRange(TSYNE_VERSION, range)) {
    result.valid = false;
    result.message = `This app requires Tsyne ${range}\n` +
      `       You have Tsyne ${TSYNE_VERSION}\n\n` +
      `       To upgrade: npm install -g tsyne@latest\n` +
      `       To run anyway (risky): tsyne --ignore-version ${requirement.source === 'directive' ? '<app.ts>' : '<app.ts>'}`;
  }

  return result;
}

/**
 * Check app version and return error message if incompatible
 * Returns null if compatible
 */
export function checkAppVersion(appPath: string): string | null {
  const requirement = getVersionRequirement(appPath);
  const validation = validateVersion(requirement);

  if (!validation.valid && validation.message) {
    return `Error: ${validation.message}`;
  }

  return null;
}
